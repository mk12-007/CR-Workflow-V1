
import { createClient } from '@supabase/supabase-js';
import { Task, Project, Priority, Status } from '../types.ts';

// Map from Database row (snake_case) to Frontend model (camelCase)
export function mapTaskFromDB(row: any): Task {
  if (!row) return {} as Task;
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || row.userId || ''),
    title: row.title || 'Untitled Action',
    description: row.description || '',
    priority: (row.priority || 'medium') as Priority,
    status: (row.status || 'todo') as Status,
    startDate: row.start_date || row.startDate || '',
    dueDate: row.due_date || row.dueDate || new Date().toISOString().split('T')[0],
    startTime: row.start_time || row.startTime || '09:00',
    endTime: row.end_time || row.endTime || '10:00',
    subTasks: Array.isArray(row.sub_tasks) ? row.sub_tasks : (Array.isArray(row.subTasks) ? row.subTasks : []),
    projectId: String(row.project_id || row.projectId || ''),
    department: row.department || '',
    created_at: row.created_at
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Map from Frontend model (camelCase) to Database row (snake_case)
export function mapTaskToDB(task: Partial<Task>): any {
  const row: any = {};
  if (task.id !== undefined) row.id = task.id;
  if (task.userId !== undefined) {
    row.user_id = UUID_REGEX.test(task.userId) ? task.userId : null;
  }
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.status !== undefined) row.status = task.status;
  if (task.startDate !== undefined) row.start_date = task.startDate;
  if (task.dueDate !== undefined) row.due_date = task.dueDate;
  if (task.startTime !== undefined) row.start_time = task.startTime;
  if (task.endTime !== undefined) row.end_time = task.endTime;
  if (task.projectId !== undefined) row.project_id = task.projectId;
  if (task.department !== undefined) row.department = task.department;
  if (task.subTasks !== undefined) row.sub_tasks = task.subTasks;
  return row;
}

// Map from Database row (snake_case) to Frontend model (camelCase)
export function mapProjectFromDB(row: any): Project {
  if (!row) return {} as Project;
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || row.userId || ''),
    name: row.name || 'Untitled Team',
    color: row.color || 'bg-yellow-500',
    icon: row.icon || 'user'
  };
}

// Map from Frontend model (camelCase) to Database row (snake_case)
export function mapProjectToDB(project: Partial<Project>): any {
  const row: any = {};
  if (project.id !== undefined) row.id = project.id;
  if (project.userId !== undefined) {
    row.user_id = UUID_REGEX.test(project.userId) ? project.userId : null;
  }
  if (project.name !== undefined) row.name = project.name;
  if (project.color !== undefined) row.color = project.color;
  if (project.icon !== undefined) row.icon = project.icon;
  return row;
}

const DEFAULT_SUPABASE_URL = 'https://auiztubaftxesqlvjtqh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aXp0dWJhZnR4ZXNxbHZqdHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NTI1MjksImV4cCI6MjEwNjAyODUyOX0.Fzp6OwVzPsYq99GwrPjl5jE3QfEpx_sgat-h8WsrobM';

// Local persistence storage keys
const LOCAL_STORAGE_USERS = 'ct_local_users';
const LOCAL_STORAGE_SESSION = 'ct_local_session';
const LOCAL_STORAGE_PROJECTS = 'ct_local_projects';
const LOCAL_STORAGE_TASKS = 'ct_local_tasks';

// Default initial tasks for demo users across the 5 teams
const INITIAL_DEMO_TASKS = [
  {
    id: 'demo-task-1',
    userId: 'demo-user-1',
    title: 'Brand Refresh & Design System',
    description: 'Finalize brand guidelines, color palettes, and typography tokens for the upcoming release.',
    priority: 'high',
    status: 'in-progress',
    startDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:30',
    projectId: 'p1', // MengKheang
    department: 'Marketing',
    subTasks: [
      { id: 'st-1', title: 'Audit existing color tokens', completed: true },
      { id: 'st-2', title: 'Update Figma component library', completed: true },
      { id: 'st-3', title: 'Export vector brand assets', completed: false },
    ]
  },
  {
    id: 'demo-task-2',
    userId: 'demo-user-1',
    title: 'Operations Dashboard & Workflow',
    description: 'Review responsive Kanban layouts and schedule timeline views with branch managers.',
    priority: 'medium',
    status: 'todo',
    startDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '14:30',
    projectId: 'p2', // Rotha
    department: 'Operation',
    subTasks: [
      { id: 'st-4', title: 'Mobile viewport testing', completed: false },
      { id: 'st-5', title: 'Drag-and-drop state review', completed: false }
    ]
  },
  {
    id: 'demo-task-3',
    userId: 'demo-user-1',
    title: 'Marketing Campaign & Social Assets',
    description: 'Coordinate promotional materials, social media schedule, and press releases.',
    priority: 'medium',
    status: 'in-progress',
    startDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    startTime: '11:00',
    endTime: '12:30',
    projectId: 'p3', // Theary
    department: 'Marketing',
    subTasks: [
      { id: 'st-6', title: 'Draft campaign copy', completed: true },
      { id: 'st-7', title: 'Produce promotional reels', completed: false }
    ]
  },
  {
    id: 'demo-task-4',
    userId: 'demo-user-1',
    title: 'Storefront UI & Creative Direction',
    description: 'Revamp customer-facing visuals, menu layouts, and banner illustrations.',
    priority: 'high',
    status: 'todo',
    startDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00',
    projectId: 'p4', // Shuan
    department: 'Purchase',
    subTasks: [
      { id: 'st-8', title: 'Design menu board mockups', completed: false },
      { id: 'st-9', title: 'Review high-res assets with marketing', completed: false }
    ]
  },
  {
    id: 'demo-task-5',
    userId: 'demo-user-1',
    title: 'Executive PDF Summary & Financial Audit',
    description: 'Prepare quarterly progress metrics and export downloadable summary reports.',
    priority: 'low',
    status: 'done',
    startDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    projectId: 'p5', // Thaihong
    department: 'Finance',
    subTasks: [
      { id: 'st-10', title: 'Compile milestone completion stats', completed: true },
      { id: 'st-11', title: 'Generate executive summary PDF', completed: true }
    ]
  },
  {
    id: 'demo-task-6',
    userId: 'demo-user-1',
    title: 'Creative Asset Production & Timeline Sync',
    description: 'Coordinate design deliveries, campaign schedule alignment, and production assets.',
    priority: 'medium',
    status: 'in-progress',
    startDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:30',
    projectId: 'p6', // Rithy
    department: 'Operation',
    subTasks: [
      { id: 'st-12', title: 'Align sprint delivery milestones', completed: true },
      { id: 'st-13', title: 'Prepare creative review assets', completed: false }
    ]
  }
];

// Seed initial demo user in local storage if empty
const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load local users:', e);
  }
  const defaultUsers = [
    {
      id: 'demo-user-1',
      email: 'demo@example.com',
      password: 'password123',
      name: 'Alex Rivers',
      avatar: '/avatars/1.png',
    },
    {
      id: 'demo-user-2',
      email: 'mengkheang.studio@gmail.com',
      password: 'password123',
      name: 'Mengkheang',
      avatar: '/avatars/2.png',
    }
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(defaultUsers));
  } catch (e) {}
  return defaultUsers;
};

const getStoredSession = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const setStoredSession = (session: any) => {
  try {
    if (session) {
      localStorage.setItem(LOCAL_STORAGE_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION);
    }
  } catch (e) {}
};

const getStoredData = (key: string, fallback: any[] = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback;
};

const setStoredData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
};

// Event listeners for auth state changes
const authListeners: Array<(event: string, session: any) => void> = [];
const notifyAuth = (event: string, session: any) => {
  authListeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error('Auth state listener error:', e);
    }
  });
};

// Fallback Mock Client that provides seamless local authentication & persistence
class LocalFallbackClient {
  auth = {
    async getSession() {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      const users = getStoredUsers();
      const normalizedInput = email.trim().toLowerCase();
      
      let user = users.find((u: any) => 
        u.email.toLowerCase() === normalizedInput ||
        (u.name && u.name.toLowerCase() === normalizedInput) ||
        (u.name && u.name.toLowerCase().replace(/\s+/g, '') === normalizedInput) ||
        (u.username && u.username.toLowerCase() === normalizedInput)
      );

      if (user) {
        if (password && user.password && user.password !== password) {
          return { data: { user: null, session: null }, error: { message: "Incorrect username or password." } };
        }
      } else {
        // Create new profile for this user
        const displayName = normalizedInput.includes('@')
          ? normalizedInput.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : normalizedInput.replace(/\b\w/g, c => c.toUpperCase());
        const userEmail = normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@creativetimeline.internal`;
        
        user = {
          id: 'user-' + Date.now(),
          email: userEmail,
          password: password || 'password123',
          name: displayName || 'Team Member',
          avatar: '/avatars/1.png',
        };
        users.push(user);
        setStoredData(LOCAL_STORAGE_USERS, users);
      }

      const session = {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            full_name: user.name,
            avatar_url: user.avatar || '/avatars/1.png',
          }
        }
      };

      setStoredSession(session);
      notifyAuth('SIGNED_IN', session);
      return { data: { user: session.user, session }, error: null };
    },

    async signUp({ email, password, options }: { email: string; password?: string; options?: any }) {
      const users = getStoredUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const existing = users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

      if (existing) {
        return { data: { user: null, session: null }, error: { message: "An account with this email already exists." } };
      }

      const newUser = {
        id: 'user-' + Date.now(),
        email: normalizedEmail,
        password: password,
        name: options?.data?.full_name || normalizedEmail.split('@')[0] || 'Team Member',
        avatar: options?.data?.avatar_url || '/avatars/1.png',
      };
      users.push(newUser);
      setStoredData(LOCAL_STORAGE_USERS, users);

      const session = {
        user: {
          id: newUser.id,
          email: newUser.email,
          user_metadata: {
            full_name: newUser.name,
            avatar_url: newUser.avatar,
          }
        }
      };

      setStoredSession(session);
      notifyAuth('SIGNED_IN', session);
      return { data: { user: session.user, session }, error: null };
    },

    async resetPasswordForEmail(email: string) {
      return { data: {}, error: null };
    },

    async signInWithOAuth({ provider, options }: { provider: string; options?: any }) {
      if (provider === 'google') {
        const users = getStoredUsers();
        const googleUser = users.find((u: any) => u.email === 'mengkheang.studio@gmail.com') || users[0];
        const session = {
          user: {
            id: googleUser.id,
            email: googleUser.email,
            user_metadata: {
              full_name: googleUser.name,
              avatar_url: googleUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            }
          }
        };
        setStoredSession(session);
        notifyAuth('SIGNED_IN', session);
        return { data: { user: session.user, session, url: null }, error: null };
      }
      return { data: null, error: { message: `OAuth provider ${provider} not supported in local demo mode` } };
    },

    async signOut() {
      setStoredSession(null);
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },

    async updateUser({ data, password }: { data?: any; password?: string }) {
      const session = getStoredSession();
      if (!session?.user) return { error: { message: 'Not logged in' } };

      const users = getStoredUsers();
      const userIndex = users.findIndex((u: any) => u.id === session.user.id);
      if (userIndex !== -1) {
        if (data?.full_name) users[userIndex].name = data.full_name;
        if (data?.avatar_url) users[userIndex].avatar = data.avatar_url;
        if (password) users[userIndex].password = password;
        setStoredData(LOCAL_STORAGE_USERS, users);
      }

      if (data?.full_name) session.user.user_metadata.full_name = data.full_name;
      if (data?.avatar_url) session.user.user_metadata.avatar_url = data.avatar_url;
      setStoredSession(session);
      notifyAuth('USER_UPDATED', session);
      return { data: { user: session.user }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    }
  };

  channel(name: string) {
    return {
      on(event: string, filter: any, callback: () => void) {
        return this;
      },
      subscribe() {
        return this;
      },
      unsubscribe() {}
    };
  }

  removeChannel(channel: any) {}

  from(tableName: string) {
    const storageKey = tableName === 'projects' ? LOCAL_STORAGE_PROJECTS : LOCAL_STORAGE_TASKS;

    return {
      select(columns = '*') {
        const executeQuery = (filterFn?: (item: any) => boolean) => {
          return new Promise<{ data: any[]; error: any }>((resolve) => {
            const initialFallback = tableName === 'tasks' ? INITIAL_DEMO_TASKS : [];
            let items = getStoredData(storageKey, initialFallback);

            if (tableName === 'tasks' && items.length === 0) {
              items = INITIAL_DEMO_TASKS;
              setStoredData(storageKey, items);
            }

            if (filterFn) {
              items = items.filter(filterFn);
            }
            resolve({ data: items, error: null });
          });
        };

        const result: any = {
          then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
            return executeQuery().then(onfulfilled, onrejected);
          },
          order(columnName: string, { ascending = true }: any = {}) {
            return {
              then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                return executeQuery().then((res) => {
                  if (res.data) {
                    res.data.sort((a: any, b: any) => {
                      if (a[columnName] < b[columnName]) return ascending ? -1 : 1;
                      if (a[columnName] > b[columnName]) return ascending ? 1 : -1;
                      return 0;
                    });
                  }
                  return onfulfilled ? onfulfilled(res) : res;
                }, onrejected);
              }
            };
          },
          eq(columnName: string, value: any) {
            return {
              then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
                return executeQuery((item: any) => item[columnName] === value).then(onfulfilled, onrejected);
              }
            };
          }
        };

        return result;
      },

      insert(records: any[]) {
        return {
          select() {
            return new Promise((resolve) => {
              const items = getStoredData(storageKey, []);
              const inserted: any[] = [];

              for (const r of records) {
                const id = r.id || `${tableName.slice(0, 1)}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const normName = r.name ? String(r.name).trim().toLowerCase() : '';

                if (tableName === 'projects') {
                  const existingIdx = items.findIndex((it: any) => 
                    it.id === id || 
                    (it.userId === r.userId && it.name?.trim().toLowerCase() === normName)
                  );
                  if (existingIdx !== -1) {
                    items[existingIdx] = { ...items[existingIdx], ...r, id: items[existingIdx].id };
                    inserted.push(items[existingIdx]);
                    continue;
                  }
                }

                const newRecord = {
                  id,
                  created_at: new Date().toISOString(),
                  ...r
                };
                items.push(newRecord);
                inserted.push(newRecord);
              }

              setStoredData(storageKey, items);
              resolve({ data: inserted, error: null });
            });
          }
        };
      },

      update(updates: any) {
        return {
          eq(columnName: string, value: any) {
            return new Promise((resolve) => {
              const items = getStoredData(storageKey, []);
              const updated = items.map((item: any) => {
                if (item[columnName] === value) {
                  return { ...item, ...updates };
                }
                return item;
              });
              setStoredData(storageKey, updated);
              resolve({ data: updated, error: null });
            });
          }
        };
      },

      delete() {
        return {
          eq(columnName: string, value: any) {
            return new Promise((resolve) => {
              const items = getStoredData(storageKey, []);
              const remaining = items.filter((item: any) => item[columnName] !== value);
              setStoredData(storageKey, remaining);
              resolve({ data: remaining, error: null });
            });
          }
        };
      }
    };
  }
}

// Determine whether a real Supabase instance is configured via environment variables or default fallback
const rawSupabaseUrl = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  DEFAULT_SUPABASE_URL;

const envSupabaseKey = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  DEFAULT_SUPABASE_ANON_KEY;

// Strip any trailing /rest/v1 or slashes to ensure standard Supabase base URL format
const envSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const isRealSupabaseConfigured = Boolean(envSupabaseUrl && envSupabaseKey && envSupabaseUrl.startsWith('https://'));

// Export either real Supabase client or local resilient fallback
export const supabase = isRealSupabaseConfigured
  ? createClient(envSupabaseUrl, envSupabaseKey)
  : (new LocalFallbackClient() as any);

