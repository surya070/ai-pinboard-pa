
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Priority, Status, User } from './types';
import { sortTasks } from './utils/priority';
import TaskCard from './components/TaskCard';
import ChatSidebar from './components/ChatSidebar';
import TaskModal from './components/TaskModal';
import AuthPage from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { INITIAL_TASKS } from './constants';

const PinboardApp: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('Pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isDemoMode = useMemo(() => token?.startsWith('demo-'), [token]);

  useEffect(() => {
    if (token) {
      if (isDemoMode) {
        setTasks(INITIAL_TASKS.map(t => ({ ...t, userId: 0 } as Task)));
      } else {
        fetchTasks();
      }
    }
  }, [token, isDemoMode]);

  const fetchTasks = async () => {
    try {
      const data = await api.get('/tasks', token);
      setTasks(data);
    } catch (err) {
      setTasks(INITIAL_TASKS.map(t => ({ ...t, userId: 0 } as Task)));
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      return matchesSearch && matchesPriority && matchesStatus;
    });
    return sortTasks(result);
  }, [tasks, searchQuery, filterPriority, filterStatus]);

  const handleAddTask = async (taskData: Partial<Task>) => {
    if (isDemoMode) {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        userId: 0,
        title: taskData.title || 'Untitled',
        description: taskData.description || '',
        deadline: taskData.deadline || new Date().toISOString(),
        priority: taskData.priority || 'Medium',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
      setIsModalOpen(false);
      return;
    }
    try {
      const savedTask = await api.post('/tasks', taskData, token);
      setTasks(prev => [savedTask, ...prev]);
      setIsModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleUpdateTask = async (updated: Partial<Task>) => {
    if (!updated.id) return;
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } as Task : t));
      setEditingTask(null);
      setIsModalOpen(false);
      return;
    }
    try {
      const savedTask = await api.put(`/tasks/${updated.id}`, updated, token);
      setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
      setEditingTask(null);
      setIsModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Delete this task?')) {
      if (isDemoMode) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return;
      }
      try {
        await api.delete(`/tasks/${id}`, token);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) { console.error(err); }
    }
  };

  const handleAIToolAction = (action: string, args: any) => {
    if (action === 'addTask') handleAddTask(args);
    if (action === 'updateTask') handleUpdateTask(args);
    if (action === 'deleteTask') handleDeleteTask(args.id);
  };

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, pending: tasks.length - completed, rate };
  }, [tasks]);

  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
              <i className="fas fa-thumbtack -rotate-45"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 leading-none">AI Pinboard PA</h1>
                {isDemoMode && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Demo</span>}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Hello, {user.name.split(' ')[0]}!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none w-32 md:w-48"/>
            </div>
            <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-100 transition-all"><i className="fas fa-plus"></i></button>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center overflow-hidden hover:bg-teal-100 transition-colors">
                {user.profile_pic ? <img src={user.profile_pic} className="w-full h-full object-cover" /> : <span className="text-teal-700 font-bold uppercase">{user.name[0]}</span>}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-[60] animate-slide-in">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-500 font-bold hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"><i className="fas fa-sign-out-alt"></i> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pinboard-bg p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur p-1 rounded-xl border border-gray-200/50 shadow-sm">
              {['Pending', 'Completed', 'All'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>{s === 'Pending' ? 'In Progress' : s}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-gray-600"><i className="fas fa-check-circle text-green-500 mr-1"></i> {stats.completed}</span>
              <span className="text-gray-600"><i className="fas fa-hourglass-half text-amber-500 mr-1"></i> {stats.pending}</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="text-teal-600">{stats.rate}% Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {filteredTasks.length > 0 ? filteredTasks.map(task => (<TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} onClick={(t) => { setEditingTask(t); setIsModalOpen(true); }}/>)) : (
              <div className="col-span-full py-20 text-center text-gray-400 font-medium">No tasks found.</div>
            )}
          </div>
        </main>
      </div>

      <aside className="w-[320px] md:w-[400px] shrink-0">
        <ChatSidebar tasks={tasks} onTaskAction={handleAIToolAction} />
      </aside>

      {isModalOpen && <TaskModal task={editingTask} onClose={() => setIsModalOpen(false)} onSave={editingTask ? handleUpdateTask : handleAddTask}/>}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <PinboardApp />
  </AuthProvider>
);

export default App;
