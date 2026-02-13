
import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { PRIORITY_COLORS } from '../constants';
import { calculateUrgency, getCountdown } from '../utils/priority';

interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onClick }) => {
  const [countdown, setCountdown] = useState(getCountdown(task.deadline));
  const { label, urgencyScore } = calculateUrgency(task);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown(task.deadline));
    }, 60000);
    return () => clearInterval(timer);
  }, [task.deadline]);

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      ...task,
      status: task.status === 'Completed' ? 'Pending' : 'Completed',
      completedAt: task.status === 'Pending' ? new Date().toISOString() : undefined,
    });
  };

  const priorityStyles = PRIORITY_COLORS[task.priority];
  const isCompleted = task.status === 'Completed';

  return (
    <div 
      onClick={() => onClick(task)}
      className={`sticky-note p-4 rounded-xl border-2 shadow-sm cursor-pointer relative ${priorityStyles} ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''} hover:shadow-md h-fit`}
    >
      {/* Push-pin visual */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm z-10"></div>
      
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-bold text-lg leading-tight ${isCompleted ? 'line-through' : ''}`}>
          {task.title}
        </h3>
        <button 
          onClick={toggleComplete}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-600 border-green-600 text-white' : 'border-current'}`}
        >
          {isCompleted && <i className="fas fa-check text-xs"></i>}
        </button>
      </div>

      <p className="text-sm opacity-80 mb-3 line-clamp-3">
        {task.description || "No notes..."}
      </p>

      <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-black/10">
        <div className="flex items-center text-xs font-semibold gap-2">
          <i className="far fa-clock"></i>
          <span>{countdown}</span>
        </div>
        <div className="flex items-center text-xs opacity-70 gap-2">
          <i className="fas fa-calendar-day"></i>
          <span>{label}</span>
        </div>
      </div>
      
      {/* Delete button (hidden by default, shown on hover/focus) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        className="absolute bottom-2 right-2 text-red-500/30 hover:text-red-600 transition-colors p-1"
      >
        <i className="fas fa-trash-alt text-xs"></i>
      </button>
    </div>
  );
};

export default TaskCard;
