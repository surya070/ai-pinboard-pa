
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

declare const google: any;

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
        callback: handleGoogleResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: "100%", shape: "pill" }
      );
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/google', { id_token: response.credential });
      login(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { name, email, password };
      const data = await api.post(endpoint, body);
      login(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    login({ id: 0, name: "Guest User", email: "guest@example.com", auth_provider: 'email' }, 'demo-' + Date.now());
  };

  return (
    <div className="min-h-screen pinboard-bg flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 md:p-12 animate-slide-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-200 mx-auto mb-4">
            <i className="fas fa-thumbtack text-2xl -rotate-45"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI Pinboard PA</h1>
          <p className="text-gray-500 mt-2 font-medium">Your personal visual workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Full Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-teal-100 hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            {loading ? <i className="fas fa-circle-notch animate-spin"></i> : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4">
          <button onClick={handleDemoMode} className="w-full py-3 bg-white text-teal-600 border-2 border-teal-600 font-bold rounded-2xl hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
            Try Demo Mode
          </button>
        </div>

        <div className="my-6 flex items-center gap-4 text-gray-400">
          <div className="flex-1 h-px bg-gray-100"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Or</span>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        <div id="googleBtn" className="w-full"></div>

        <p className="mt-8 text-center text-sm text-gray-500 font-medium">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-teal-600 font-bold hover:underline ml-1">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
