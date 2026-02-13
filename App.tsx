
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
        // Map initial tasks to include necessary fields for the current state
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
      console.error('Failed to fetch tasks, switching to Demo tasks.', err);
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
    } catch (err) {
      console.error('Add task failed', err);
    }
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
    } catch (err) {
      console.error('Update task failed', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      if (isDemoMode) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return;
      }

      try {
        await api.delete(`/tasks/${id}`, token);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Delete task failed', err);
      }
    }
  };

  const handleAIToolAction = (action: string, args: any) => {
    if (action === 'addTask') handleAddTask(args);
    if (action === 'updateTask') handleUpdateTask(args);
    if (action === 'deleteTask') handleDeleteTask(args.id);
  };

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.length - completed;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, pending, rate };
  }, [tasks]);

  if (!user) return <AuthPage />;

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-thumbtack -rotate-45"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 leading-none">AI Pinboard PA</h1>
                {isDemoMode && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Demo Mode</span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">Hello, {user.name.split(' ')[0]}!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32 md:w-48"
              />
            </div>
            
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
            >
              <i className="fas fa-plus"></i>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden hover:bg-indigo-100 transition-colors"
              >
                {user.profile_pic ? (
                  <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-700 font-bold uppercase">{user.name[0]}</span>
                )}
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-[60] animate-slide-in">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt"></i> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pinboard-bg p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur p-1 rounded-xl border border-gray-200/50 shadow-sm">
              <button onClick={() => setFilterStatus('Pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'Pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>In Progress</button>
              <button onClick={() => setFilterStatus('Completed')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'Completed' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Done</button>
              <button onClick={() => setFilterStatus('All')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>All</button>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600 font-bold"><i className="fas fa-check-circle text-green-500"></i> {stats.completed}</span>
              <span className="flex items-center gap-1.5 text-gray-600 font-bold"><i className="fas fa-hourglass-half text-amber-500"></i> {stats.pending}</span>
              <div className="h-4 w-px bg-gray-300 mx-1"></div>
              <span className="font-bold text-indigo-600">{stats.rate}% Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleUpdateTask} 
                  onDelete={handleDeleteTask}
                  onClick={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="text-gray-400 mb-2"><i className="fas fa-tasks text-4xl opacity-20"></i></div>
                <p className="text-gray-400 font-medium">No tasks found matching your filters.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <aside className="w-[320px] md:w-[400px] shrink-0">
        <ChatSidebar tasks={tasks} onTaskAction={handleAIToolAction} />
      </aside>

      {isModalOpen && (
        <TaskModal 
          task={editingTask}
          onClose={() => setIsModalOpen(false)}
          onSave={editingTask ? handleUpdateTask : handleAddTask}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <PinboardApp />
  </AuthProvider>
);

export default App;
