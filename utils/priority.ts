
import { Task, UrgencyMetrics } from '../types';
import { PRIORITY_WEIGHTS } from '../constants';

export function calculateUrgency(task: Task): UrgencyMetrics {
  if (task.status === 'Completed') {
    return { urgencyScore: -1, label: 'Completed' };
  }

  const deadlineDate = new Date(task.deadline).getTime();
  const now = Date.now();
  const diffMs = deadlineDate - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  let timeWeight = 0;
  let label = '';

  if (diffHours < 0) {
    timeWeight = 20;
    label = 'Overdue';
  } else if (diffHours < 24) {
    timeWeight = 10;
    label = 'Due Today';
  } else if (diffHours < 48) {
    timeWeight = 5;
    label = 'Due Tomorrow';
  } else if (diffHours < 168) {
    timeWeight = 2;
    label = 'Due This Week';
  } else {
    timeWeight = 0;
    label = 'Upcoming';
  }

  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 0;
  const totalScore = timeWeight + priorityWeight;

  return { urgencyScore: totalScore, label };
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const urgencyA = calculateUrgency(a).urgencyScore;
    const urgencyB = calculateUrgency(b).urgencyScore;
    return urgencyB - urgencyA;
  });
}

export function getCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
