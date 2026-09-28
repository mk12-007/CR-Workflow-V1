
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import ScheduleView from './components/ScheduleView.tsx';
import AuthView from './components/AuthView.tsx';
import LogoutModal from './components/LogoutModal.tsx';
import ProfileMenu from './components/ProfileMenu.tsx';
import ResetPasswordModal from './components/ResetPasswordModal.tsx';
import { Task, Project, Status, User } from './types.ts';
import { INITIAL_PROJECTS } from './constants.tsx';
import { supabase, mapTaskFromDB, mapTaskToDB, mapProjectFromDB, mapProjectToDB } from './services/supabase.ts';
import { Menu, X, AlertCircle, CheckCircle2, Layout } from 'lucide-react';

// Lazy load heavy components to improve initial page load speed
const SummaryReportModal = lazy(() => import('./components/SummaryReportModal.tsx'));
const SettingsModal = lazy(() => import('./components/SettingsModal.tsx'));
const TaskDetailModal = lazy(() => import('./components/TaskDetailModal.tsx'));
const AvatarPickerModal = lazy(() => import('./components/AvatarPickerModal.tsx'));

type ViewType = 'dashboard' | 'schedule';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const isLoadingDataRef = useRef<string | null>(null);

  useEffect(() => {
    // Detect if user landed via a password reset / recovery email link
    const isRecovery = typeof window !== 'undefined' && (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery') ||
      (window.location.hash.includes('access_token=') && window.location.hash.includes('type=recovery'))
    );
    if (isRecovery) {
      setIsResetPasswordOpen(true);
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || 'User',
          avatar: session.user.user_metadata.avatar_url,
        };
        setUser(u);
        await loadUserData(u.id);
      }
      setIsAppLoaded(true);
      setIsInitialLoad(false);
    };

    checkSession();

    // Realtime channel subscriptions so all users see task and project changes instantly
    const tasksChannel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          loadUserData();
        }
      )
      .subscribe();

    const projectsChannel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          loadUserData();
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true);
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || 'User',
            avatar: session.user.user_metadata.avatar_url,
          };
          setUser(u);
        }
      } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const u: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || 'User',
          avatar: session.user.user_metadata.avatar_url,
        };
        setUser(u);
        await loadUserData(u.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setTasks([]);
        setProjects([]);
        setActiveProjectId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      try {
        if (typeof (supabase as any).removeChannel === 'function') {
          (supabase as any).removeChannel(tasksChannel);
          (supabase as any).removeChannel(projectsChannel);
        }
      } catch (e) {}
    };
  }, []);

  const loadUserData = async (currentUserId?: string) => {
    try {
      // PERFORMANCE: Fetch all shared projects and tasks in parallel across the workspace
      const [projectsResponse, tasksResponse] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*')
      ]);

      if (projectsResponse.error) throw projectsResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;

      let rawProjects = (projectsResponse.data || []).map(mapProjectFromDB) as Project[];

      // Deduplicate loaded projects by ID and by normalized name
      const uniqueProjects: Project[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      for (const p of rawProjects) {
        const normName = p.name ? p.name.trim().toLowerCase() : '';
        if (!seenIds.has(p.id) && (!normName || !seenNames.has(normName))) {
          seenIds.add(p.id);
          if (normName) seenNames.add(normName);
          uniqueProjects.push(p);
        }
      }

      let finalProjects = uniqueProjects;
      const oldDefaultNames = ['Product Launch', 'Web Redesign', 'Marketing Campaign'];

      // Seed or synchronize designated team members if workspace has no projects yet
      if (finalProjects.length === 0) {
        const seedData = INITIAL_PROJECTS.map((p) => mapProjectToDB({ ...p, userId: currentUserId || 'team' }));
        const { data: seeded, error: sError } = await supabase
          .from('projects')
          .insert(seedData)
          .select();
        
        if (!sError && seeded) {
          finalProjects = seeded.map(mapProjectFromDB) as Project[];
        }
      } else {
        // Upgrade any legacy default names and ensure all designated team members exist
        const hasLegacy = finalProjects.some(p => oldDefaultNames.includes(p.name));
        const missingInitial = INITIAL_PROJECTS.some(ip => !finalProjects.some(fp => fp.id === ip.id || fp.name.trim().toLowerCase() === ip.name.trim().toLowerCase()));
        if (hasLegacy || missingInitial || finalProjects.length < INITIAL_PROJECTS.length) {
          for (let i = 0; i < INITIAL_PROJECTS.length; i++) {
            const teamDef = INITIAL_PROJECTS[i];
            const existingById = finalProjects.find(p => p.id === teamDef.id);
            const existingByName = finalProjects.find(p => p.name.trim().toLowerCase() === teamDef.name.trim().toLowerCase());

            if (existingById) {
              if (oldDefaultNames.includes(existingById.name)) {
                await supabase.from('projects').update({ name: teamDef.name }).eq('id', existingById.id);
                existingById.name = teamDef.name;
              }
            } else if (!existingByName) {
              const projectPayload = mapProjectToDB({
                id: teamDef.id,
                userId: currentUserId || 'team',
                name: teamDef.name,
                color: teamDef.color,
                icon: teamDef.icon
              });
              const { data: created } = await supabase.from('projects').insert([projectPayload]).select();
              if (created && created[0]) {
                finalProjects.push(mapProjectFromDB(created[0]));
              }
            }
          }
        }
      }

      // Final deduplication pass to guarantee strictly 1 item per team
      const cleanedProjects: Project[] = [];
      const finalSeenIds = new Set<string>();
      const finalSeenNames = new Set<string>();

      for (const p of finalProjects) {
        const normName = p.name ? p.name.trim().toLowerCase() : '';
        if (!finalSeenIds.has(p.id) && (!normName || !finalSeenNames.has(normName))) {
          finalSeenIds.add(p.id);
          if (normName) finalSeenNames.add(normName);
          cleanedProjects.push(p);
        }
      }

      setProjects(cleanedProjects);
      if (cleanedProjects.length > 0 && (!activeProjectId || !cleanedProjects.some(p => p.id === activeProjectId))) {
        setActiveProjectId(cleanedProjects[0].id);
      }

      const mappedTasks = (tasksResponse.data || []).map(mapTaskFromDB);
      setTasks(mappedTasks);

    } catch (err) {
      console.error("Error loading operational data:", err);
      setAppError("Slow connection detected. Some operational data may take a moment.");
    } finally {
      isLoadingDataRef.current = null;
    }
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleLogin = async (loggedInUser?: any) => {
    if (loggedInUser) {
      const u: User = {
        id: loggedInUser.id,
        email: loggedInUser.email || '',
        name: loggedInUser.user_metadata?.full_name || loggedInUser.name || 'User',
        avatar: loggedInUser.user_metadata?.avatar_url || loggedInUser.avatar,
      };
      setUser(u);
      showToast('Welcome back!');
      await loadUserData(u.id);
    }
  };

  const handleUpdateAvatar = (newAvatarUrl: string) => {
    setUser(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
    showToast('3D Avatar updated successfully!');
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTasks([]);
      setProjects([]);
      setActiveProjectId(null);
      setIsLogoutModalOpen(false);
      showToast('Logged out successfully.');
      // Prevent browser back button from re-exposing authenticated state
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    // OPTIMISTIC UI: Update local state immediately
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    
    const dbPayload = mapTaskToDB(updatedTask);
    delete dbPayload.id;
    delete dbPayload.created_at;

    const { error } = await supabase.from('tasks').update(dbPayload).eq('id', updatedTask.id);
    if (error) {
      setAppError(`Sync failed: ${error.message}`);
      // Fallback: Reload data from server on error
      if (user) loadUserData(user.id);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      setAppError(`Sync failed: ${error.message}`);
      if (user) loadUserData(user.id);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: Status, targetTaskId?: string) => {
    // Optimistic move
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;
      const updatedTask = { ...prev[taskIndex], status: newStatus };
      let newTasks = prev.filter(t => t.id !== taskId);
      if (targetTaskId) {
        const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
        newTasks.splice(targetIndex, 0, updatedTask);
      } else {
        newTasks.push(updatedTask);
      }
      return [...newTasks];
    });

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      setAppError(`Sync failed: ${error.message}`);
      if (user) loadUserData(user.id);
    }
  };

  const handleAddTask = async (newTaskPartial: Partial<Task>) => {
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user.id,
      title: newTaskPartial.title || 'Untitled Action',
      description: newTaskPartial.description || '',
      priority: newTaskPartial.priority || 'medium',
      status: newTaskPartial.status || 'todo',
      dueDate: newTaskPartial.dueDate || today,
      startTime: newTaskPartial.startTime || '09:00',
      endTime: newTaskPartial.endTime || '10:00',
      subTasks: newTaskPartial.subTasks || [],
      projectId: newTaskPartial.projectId || activeProjectId || projects[0]?.id || 'p1',
      department: newTaskPartial.department || 'Marketing'
    };

    const dbPayload = mapTaskToDB(newTask);
    const { data, error } = await supabase.from('tasks').insert([dbPayload]).select();
    if (!error && data && data[0]) {
      const createdTask = mapTaskFromDB(data[0]);
      setTasks(prev => [createdTask, ...prev]);
      return true;
    } else {
      setAppError(`Creation failed: ${error?.message || 'Unknown error'}`);
      return false;
    }
  };

  const handleAddProject = async (name: string) => {
    if (!user) return;
    const colors = ['bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const newProject: Project = {
      id: `p-${Date.now()}`,
      userId: user.id,
      name,
      color: colors[projects.length % colors.length],
      icon: 'folder'
    };
    const dbPayload = mapProjectToDB(newProject);
    const { data, error } = await supabase.from('projects').insert([dbPayload]).select();
    if (!error && data && data[0]) {
      const created = mapProjectFromDB(data[0]);
      setProjects(prev => [...prev, created]);
      setActiveProjectId(created.id);
    } else {
      setAppError(`Branch Team creation failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdateProject = async (id: string, name: string) => {
    const { error } = await supabase.from('projects').update({ name }).eq('id', id);
    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    }
  };

  const handleSelectView = (view: ViewType) => {
    setActiveView(view);
    if (view === 'schedule') setActiveProjectId(null);
    setIsSidebarOpen(false);
  };

  const filteredTasks = activeProjectId ? tasks.filter(t => t.projectId === activeProjectId) : tasks;
  const activeProjectName = activeProjectId ? projects.find(p => p.id === activeProjectId)?.name || 'Operations' : activeView === 'schedule' ? 'Shifts' : 'All Tasks';

  if (!isAppLoaded || isInitialLoad) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F7F8FA] gap-4 select-none">
      <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center text-yellow-500 shadow-xl shadow-navy/10 animate-pulse">
        <Layout size={26} />
      </div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide">
        Checking your session...
      </p>
    </div>
  );

  if (isResetPasswordOpen) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F7F8FA] p-4 select-none">
        <ResetPasswordModal 
          isOpen={true}
          onClose={() => {
            setIsResetPasswordOpen(false);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          onSuccess={() => {
            setIsResetPasswordOpen(false);
            setToastMessage('Password updated successfully! Welcome back.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      </div>
    );
  }

  if (!user) return <AuthView onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {appError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 p-4 rounded-2xl shadow-xl flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-widest mb-1">Ops Alert</p>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">{appError}</p>
            </div>
            <button onClick={() => setAppError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          projects={projects} 
          activeProjectId={activeProjectId} 
          activeView={activeView}
          onSelectProject={(id) => { setActiveProjectId(id); setActiveView('dashboard'); setIsSidebarOpen(false); }} 
          onSelectView={handleSelectView}
          onAddProject={handleAddProject}
          onUpdateProject={handleUpdateProject}
          onOpenSummary={() => { setIsSummaryOpen(true); setIsSidebarOpen(false); }}
          onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
          onLogout={handleLogoutClick}
          user={user}
        />
      </div>

      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"><Menu size={24} /></button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center text-yellow-500 shadow-sm">
              <Layout size={18} />
            </div>
            <span className="font-extrabold text-navy dark:text-white tracking-tight text-base">
              Creative<span className="text-yellow-600 dark:text-yellow-400">Timeline</span>
            </span>
          </div>
          <ProfileMenu 
            user={user} 
            onOpenProfile={() => setIsSettingsOpen(true)} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onLogoutClick={handleLogoutClick} 
            onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
          />
        </div>

        {activeView === 'dashboard' ? (
          <Dashboard 
            tasks={filteredTasks} 
            projects={projects}
            activeProjectName={activeProjectName}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            onAddTask={handleAddTask}
            user={user}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogoutClick={handleLogoutClick}
            onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
          />
        ) : (
          <ScheduleView 
            tasks={tasks}
            projects={projects}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            user={user}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogoutClick={handleLogoutClick}
            onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
          />
        )}
      </main>

      {/* Lazy loaded modals for performance */}
      <Suspense fallback={null}>
        {isSummaryOpen && (
          <SummaryReportModal tasks={tasks} projects={projects} onClose={() => setIsSummaryOpen(false)} />
        )}
        {isSettingsOpen && (
          <SettingsModal 
            user={user} 
            tasks={tasks} 
            onClose={() => setIsSettingsOpen(false)} 
            onUpdateAvatar={handleUpdateAvatar}
          />
        )}
        {isAvatarPickerOpen && (
          <AvatarPickerModal
            isOpen={isAvatarPickerOpen}
            onClose={() => setIsAvatarPickerOpen(false)}
            currentAvatar={user?.avatar}
            userName={user?.name}
            onSelectAvatar={handleUpdateAvatar}
          />
        )}
      </Suspense>

      {/* Accessible Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />

      {/* Password Reset Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        onSuccess={() => {
          setIsResetPasswordOpen(false);
          setToastMessage('Password updated successfully!');
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[130] bg-navy text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200 border border-slate-800">
          <CheckCircle2 size={16} className="text-yellow-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
