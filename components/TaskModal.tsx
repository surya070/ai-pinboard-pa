
import React, { useState, useEffect } from 'react';
import { Task, Priority, Status } from '../types';

interface TaskModalProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<Status>('Pending');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDeadline(task.deadline.slice(0, 16)); // Format for datetime-local
      setPriority(task.priority);
      setStatus(task.status);
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      setDeadline(tomorrow.toISOString().slice(0, 16));
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task?.id,
      title,
      description,
      deadline: new Date(deadline).toISOString(),
      priority,
      status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{task ? 'Edit Task' : 'Add New Task'}</h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Title</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes / Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
              placeholder="Add details here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deadline</label>
              <input 
                required
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {task && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setStatus('Pending')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${status === 'Pending' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  Pending
                </button>
                <button 
                  type="button"
                  onClick={() => setStatus('Completed')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${status === 'Completed' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  Completed
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              {task ? 'Update Task' : 'Pin to Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
