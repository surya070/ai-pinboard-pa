
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Priority, Status } from './types';
import { INITIAL_TASKS } from './constants';
import { sortTasks } from './utils/priority';
import TaskCard from './components/TaskCard';
import ChatSidebar from './components/ChatSidebar';
import TaskModal from './components/TaskModal';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('pinboard_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('Pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    localStorage.setItem('pinboard_tasks', JSON.stringify(tasks));
  }, [tasks]);

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

  const addTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      deadline: taskData.deadline || new Date().toISOString(),
      priority: taskData.priority || 'Medium',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      ...taskData
    };
    setTasks(prev => [newTask, ...prev]);
    setIsModalOpen(false);
  };

  const updateTask = (updated: Partial<Task>) => {
    if (!updated.id) return;
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const deleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  // AI Tool Action Handler
  const handleAIToolAction = (action: string, args: any) => {
    switch (action) {
      case 'addTask':
        addTask(args);
        break;
      case 'updateTask':
        updateTask(args);
        break;
      case 'deleteTask':
        setTasks(prev => prev.filter(t => t.id !== args.id));
        break;
      default:
        console.warn('Unknown tool action:', action);
    }
  };

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.length - completed;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, pending, rate };
  }, [tasks]);

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      {/* Left: Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-thumbtack -rotate-45"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">AI Pinboard PA</h1>
              <p className="text-xs text-gray-500 font-medium mt-1">Productivity visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input 
                type="text" 
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48 md:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all whitespace-nowrap"
            >
              <i className="fas fa-plus"></i> Add Task
            </button>
          </div>
        </header>

        {/* Board Area */}
        <main className="flex-1 overflow-y-auto pinboard-bg p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur p-1 rounded-xl border border-gray-200/50 shadow-sm">
              <button 
                onClick={() => setFilterStatus('Pending')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'Pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                In Progress
              </button>
              <button 
                onClick={() => setFilterStatus('Completed')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'Completed' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Done
              </button>
              <button 
                onClick={() => setFilterStatus('All')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                All
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600"><i className="fas fa-check-circle text-green-500"></i> {stats.completed} Done</span>
                <span className="flex items-center gap-1.5 text-gray-600"><i className="fas fa-hourglass-half text-amber-500"></i> {stats.pending} Left</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="font-bold text-indigo-600">{stats.rate}% Efficiency</span>
              </div>
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="bg-white/80 backdrop-blur border border-gray-200/50 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {filteredTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdate={updateTask} 
                  onDelete={deleteTask}
                  onClick={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
              <div className="w-24 h-24 border-4 border-dashed border-gray-400 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-clipboard-list text-4xl text-gray-400"></i>
              </div>
              <p className="text-xl font-bold text-gray-600">No tasks found</p>
              <p className="text-sm">Try changing your filters or pinning a new task.</p>
            </div>
          )}
        </main>
      </div>

      {/* Right: AI Sidebar */}
      <aside className="w-[320px] md:w-[400px] shrink-0">
        <ChatSidebar 
          tasks={tasks} 
          onTaskAction={handleAIToolAction} 
        />
      </aside>

      {/* Modals */}
      {isModalOpen && (
        <TaskModal 
          task={editingTask}
          onClose={() => setIsModalOpen(false)}
          onSave={editingTask ? updateTask : addTask}
        />
      )}
    </div>
  );
};

export default App;
