
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
      setDeadline(task.deadline.slice(0, 16));
      setPriority(task.priority);
      setStatus(task.status);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      setDeadline(tomorrow.toISOString().slice(0, 16));
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: task?.id, title, description, deadline: new Date(deadline).toISOString(), priority, status });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
        <div className="bg-teal-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><i className="fas fa-times text-xl"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-teal-500 outline-none transition-all" placeholder="What's next?"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-teal-500 outline-none transition-all" placeholder="Details..."/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deadline</label>
              <input required type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-teal-500 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-4 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-teal-500 outline-none text-sm">
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
            <button type="submit" className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all">{task ? 'Update' : 'Pin It'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
