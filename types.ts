
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Status = 'Pending' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO format
  priority: Priority;
  status: Status;
  createdAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isToolCall?: boolean;
}

export interface UrgencyMetrics {
  urgencyScore: number;
  label: string;
}
