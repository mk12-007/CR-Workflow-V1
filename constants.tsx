
import React from 'react';
import { Layout, CheckCircle, Clock, AlertCircle, Inbox, Plus, Settings, BarChart2, Calendar, Search } from 'lucide-react';
import { Project } from './types';

// Initial team projects with designated team members
export const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', userId: '', name: 'MengKheang', color: 'bg-yellow-500', icon: 'user' },
  { id: 'p2', userId: '', name: 'Rotha', color: 'bg-blue-500', icon: 'user' },
  { id: 'p3', userId: '', name: 'Theary', color: 'bg-green-500', icon: 'user' },
  { id: 'p4', userId: '', name: 'Shuan', color: 'bg-purple-500', icon: 'user' },
  { id: 'p5', userId: '', name: 'Thaihong', color: 'bg-pink-500', icon: 'user' },
  { id: 'p6', userId: '', name: 'Rithy', color: 'bg-teal-500', icon: 'user' },
];

// 45 3D Memoji avatars available in the public/avatars folder
export const AVATAR_LIST: string[] = Array.from({ length: 45 }, (_, i) => `/avatars/${i + 1}.png`);

export const TEAM_MEMBERS = [
  { id: 'p1', name: 'MengKheang', role: 'Team Lead and Designer', avatar: '/avatars/1.png', color: 'bg-yellow-500' },
  { id: 'p2', name: 'Rotha', role: 'Senior Designer', avatar: '/avatars/2.png', color: 'bg-blue-500' },
  { id: 'p3', name: 'Theary', role: 'Designer', avatar: '/avatars/3.png', color: 'bg-green-500' },
  { id: 'p4', name: 'Shuan', role: 'Team Lead and Media', avatar: '/avatars/4.png', color: 'bg-purple-500' },
  { id: 'p5', name: 'Thaihong', role: 'Media', avatar: '/avatars/5.png', color: 'bg-pink-500' },
  { id: 'p6', name: 'Rithy', role: 'Designer', avatar: '/avatars/6.png', color: 'bg-teal-500' },
];

export const DEPARTMENTS = ['Marketing', 'Operation', 'HR', 'Purchase', 'Finance'];

export const PRIORITY_MAP = {
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-100', icon: <Inbox size={14} /> },
  medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <Clock size={14} /> },
  high: { label: 'High', color: 'text-red-600', bg: 'bg-red-50', icon: <AlertCircle size={14} /> },
};

export const STATUS_COLUMNS = [
  { id: 'todo', title: 'To Do', icon: <Inbox size={18} className="text-slate-400" /> },
  { id: 'in-progress', title: 'In Progress', icon: <Clock size={18} className="text-yellow-400" /> },
  { id: 'done', title: 'Completed', icon: <CheckCircle size={18} className="text-green-400" /> },
];