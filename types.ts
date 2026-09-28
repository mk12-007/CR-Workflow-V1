
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in-progress' | 'done';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  startDate?: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  subTasks: SubTask[];
  projectId: string;
  department?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  activeProjectId: string | null;
  isSidebarOpen: boolean;
  selectedTask: Task | null;
}
