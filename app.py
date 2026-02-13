
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from google.oauth2 import id_token
from google.auth.transport import requests
import datetime
import os

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pinboard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-this-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=7)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=True)
    google_id = db.Column(db.String(200), nullable=True)
    profile_pic = db.Column(db.String(500), nullable=True)
    auth_provider = db.Column(db.String(20), default='email')
    tasks = db.relationship('Task', backref='user', lazy=True)

class Task(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    deadline = db.Column(db.String(100))
    priority = db.Column(db.String(20))
    status = db.Column(db.String(20), default='Pending')
    created_at = db.Column(db.String(100))
    completed_at = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "description": self.description,
            "deadline": self.deadline,
            "priority": self.priority,
            "status": self.status,
            "createdAt": self.created_at,
            "completedAt": self.completed_at
        }

with app.app_context():
    db.create_all()

# Auth Routes
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "User already exists"}), 400
    
    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        auth_provider='email'
    )
    db.session.add(new_user)
    db.session.commit()
    
    token = create_access_token(identity=new_user.id)
    return jsonify({
        "token": token,
        "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name, "auth_provider": "email"}
    })

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({"message": "Invalid credentials"}), 401
    
    token = create_access_token(identity=user.id)
    return jsonify({
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "profile_pic": user.profile_pic, "auth_provider": user.auth_provider}
    })

@app.route('/auth/google', methods=['POST'])
def google_auth():
    token_id = request.json.get('id_token')
    try:
        # CLIENT_ID should be provided in frontend
        idinfo = id_token.verify_oauth2_token(token_id, requests.Request())
        
        user = User.query.filter_by(email=idinfo['email']).first()
        if not user:
            user = User(
                name=idinfo.get('name', 'Google User'),
                email=idinfo['email'],
                google_id=idinfo['sub'],
                profile_pic=idinfo.get('picture'),
                auth_provider='google'
            )
            db.session.add(user)
            db.session.commit()
        
        token = create_access_token(identity=user.id)
        return jsonify({
            "token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "profile_pic": user.profile_pic, "auth_provider": "google"}
        })
    except ValueError:
        return jsonify({"message": "Invalid token"}), 400

# Task Routes
@app.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    user_id = get_jwt_identity()
    tasks = Task.query.filter_by(user_id=user_id).all()
    return jsonify([t.to_dict() for t in tasks])

@app.route('/tasks', methods=['POST'])
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    data = request.json
    import uuid
    new_task = Task(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=data.get('title', 'Untitled'),
        description=data.get('description', ''),
        deadline=data.get('deadline'),
        priority=data.get('priority', 'Medium'),
        status='Pending',
        created_at=datetime.datetime.now().isoformat()
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict())

@app.route('/tasks/<id>', methods=['PUT'])
@jwt_required()
def update_task(id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=id, user_id=user_id).first_or_404()
    data = request.json
    
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.deadline = data.get('deadline', task.deadline)
    task.priority = data.get('priority', task.priority)
    task.status = data.get('status', task.status)
    if task.status == 'Completed':
        task.completed_at = datetime.datetime.now().isoformat()
    
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/tasks/<id>', methods=['DELETE'])
@jwt_required()
def delete_task(id):
    user_id = get_jwt_identity()
    task = Task.query.filter_by(id=id, user_id=user_id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Deleted"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
