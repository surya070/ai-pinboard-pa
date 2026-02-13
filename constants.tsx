
import React from 'react';
import { Priority } from './types';

export const PRIORITY_COLORS: Record<Priority, string> = {
  'Low': 'bg-blue-100 border-blue-200 text-blue-800',
  'Medium': 'bg-green-100 border-green-200 text-green-800',
  'High': 'bg-orange-100 border-orange-200 text-orange-800',
  'Urgent': 'bg-red-100 border-red-200 text-red-800',
};

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  'Low': 1,
  'Medium': 2,
  'High': 4,
  'Urgent': 8,
};

export const INITIAL_TASKS = [
  {
    id: '1',
    title: 'Complete Project Proposal',
    description: 'Finalize the AI Pinboard PA functional requirements and tech stack overview.',
    deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    priority: 'High' as Priority,
    status: 'Pending' as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Weekly Grocery Shopping',
    description: 'Buy fresh vegetables, milk, and coffee beans.',
    deadline: new Date(Date.now() + 172800000).toISOString(), // 2 days
    priority: 'Medium' as Priority,
    status: 'Pending' as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Urgent System Update',
    description: 'Update all production servers to the latest security patch.',
    deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    priority: 'Urgent' as Priority,
    status: 'Pending' as const,
    createdAt: new Date().toISOString(),
  }
];
