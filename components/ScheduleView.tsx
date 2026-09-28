import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Filter, MoreVertical, CheckCircle, Circle, MapPin, Hash, Search, List, Grid3X3, Columns, CalendarDays, X, ChevronDown, Check, Sparkles, AlignLeft, Tag, Layers, Briefcase } from 'lucide-react';
import { Task, Project, Priority, Status, User } from '../types.ts';
import { PRIORITY_MAP, STATUS_COLUMNS, DEPARTMENTS, TEAM_MEMBERS } from '../constants.tsx';
import TaskDetailModal from './TaskDetailModal.tsx';
import ProfileMenu from './ProfileMenu.tsx';
import { generateTaskDescription, suggestSubtasks } from '../services/geminiService.ts';

interface ScheduleViewProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (task: Partial<Task>) => Promise<boolean>;
  user?: User | null;
  onOpenSettings?: () => void;
  onLogoutClick?: () => void;
  onOpenAvatarPicker?: () => void;
}

type ViewMode = 'timeline' | 'month' | 'week' | 'day';

const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  tasks, 
  projects, 
  onUpdateTask, 
  onDeleteTask, 
  onAddTask, 
  user, 
  onOpenSettings, 
  onLogoutClick,
  onOpenAvatarPicker 
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Event Form State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskStartTime, setNewTaskStartTime] = useState("09:00");
  const [newTaskEndTime, setNewTaskEndTime] = useState("10:00");
  const [newTaskDepartment, setNewTaskDepartment] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projects.length > 0 && !newTaskProjectId) {
      setNewTaskProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const projectMatch = filterProject === 'all' || task.projectId === filterProject;
      const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
      return projectMatch && priorityMatch;
    });
  }, [tasks, filterProject, filterPriority]);

  const getTasksForDate = (dateStr: string) => {
    return filteredTasks.filter(t => t.dueDate === dateStr);
  };

  const toDateStr = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleCreateEvent = async (useAi: boolean = false) => {
    if (!newTaskTitle || isSaving) return;
    
    let description = newTaskDescription;
    let subTasks: any[] = [];
    
    setIsSaving(true);
    
    if (useAi) {
      setIsGenerating(true);
      try {
        if (!description) {
          description = await generateTaskDescription(newTaskTitle);
        }
        const subtaskSuggestions = await suggestSubtasks(newTaskTitle, description);
        subTasks = subtaskSuggestions.map((s: any, idx: number) => ({
          id: `st-${Date.now()}-${idx}`,
          title: s.title,
          completed: false
        }));
      } catch (e) {
        console.error("AI Generation failed", e);
      } finally {
        setIsGenerating(false);
      }
    }
    
    const newTask: Partial<Task> = {
      title: newTaskTitle,
      description: description,
      status: 'todo',
      priority: newTaskPriority,
      projectId: newTaskProjectId || (projects.length > 0 ? projects[0].id : ""),
      startDate: newTaskStartDate || "",
      dueDate: newTaskDueDate || toDateStr(currentDate),
      startTime: newTaskStartTime,
      endTime: newTaskEndTime,
      subTasks: subTasks,
      department: newTaskDepartment
    };
    
    const success = await onAddTask(newTask);
    if (success) {
      resetForm();
      setShowAddModal(false);
    }
    setIsSaving(false);
  };

  const resetForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskStartDate("");
    setNewTaskDueDate(toDateStr(currentDate));
    setNewTaskStartTime("09:00");
    setNewTaskEndTime("10:00");
    setNewTaskDepartment("");
    if (projects.length > 0) setNewTaskProjectId(projects[0].id);
  };

  // --- RENDER HELPERS ---

  const renderTimeline = () => {
    const tasksByDate = [...filteredTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const groups: Record<string, Task[]> = {};
    tasksByDate.forEach(t => {
      if (!groups[t.dueDate]) groups[t.dueDate] = [];
      groups[t.dueDate].push(t);
    });

    const entries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center">
          <div className="p-6 bg-white rounded-[40px] shadow-xl shadow-slate-200/50 mb-6">
            <CalendarIcon size={48} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Schedule is clear</h3>
          <p className="text-sm text-slate-400 font-medium">Items with due dates will appear here.</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 md:space-y-12 max-w-4xl mx-auto px-4 md:px-0">
        {entries.map(([date, dateTasks]) => (
          <div key={date} className="relative pl-8 md:pl-12">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100 ml-4 md:ml-6" />
            <div className="flex items-center gap-4 mb-4 md:mb-6 sticky top-0 bg-[#fafafa]/80 backdrop-blur-md py-4 z-10 -ml-4 md:-ml-12 px-4 md:px-12">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-sm md:text-lg font-black text-slate-800 leading-none">
                  {new Date(date).getDate()}
                </span>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                   {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              {dateTasks.map(task => (
                <TaskCard key={task.id} task={task} projects={projects} user={user} onClick={() => setSelectedTask(task)} onUpdate={onUpdateTask} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMonth = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();

    const cells = [];
    const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthEnd - i, current: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthEnd - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ day: i, current: true, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i) });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, current: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i) });
    }

    return (
      <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const dateKey = toDateStr(cell.date);
            const dayTasks = getTasksForDate(dateKey);
            const isToday = toDateStr(new Date()) === dateKey;

            return (
              <div 
                key={idx} 
                className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-r border-b border-slate-50 dark:border-slate-800/60 transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group ${!cell.current ? 'bg-slate-50/30 dark:bg-slate-950/40' : ''}`}
              >
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <span className={`text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-200 dark:shadow-none' : cell.current ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                    {cell.day}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {dayTasks.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTask(t)}
                      className="hidden md:block w-full text-[9px] p-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold truncate transition-all hover:border-yellow-300 dark:hover:border-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400"
                    >
                      {t.title}
                    </div>
                  ))}
                  {/* Mobile Indicator Dots */}
                  <div className="md:hidden flex flex-wrap gap-0.5 mt-1">
                    {dayTasks.map(t => (
                      <div key={t.id} className="w-1 h-1 rounded-full bg-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full pb-8">
        {weekDays.map(day => {
          const dateKey = toDateStr(day);
          const dayTasks = getTasksForDate(dateKey);
          const isToday = toDateStr(new Date()) === dateKey;

          return (
            <div key={dateKey} className={`flex flex-col bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm transition-all ${isToday ? 'ring-2 ring-yellow-500/10 border-yellow-100' : ''}`}>
              <div className={`p-4 text-center border-b border-slate-50 ${isToday ? 'bg-yellow-50' : 'bg-white'}`}>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isToday ? 'text-yellow-700' : 'text-slate-400'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-xl font-black ${isToday ? 'text-yellow-700' : 'text-slate-800'}`}>
                  {day.getDate()}
                </p>
              </div>
              <div className="flex-1 p-3 space-y-3 md:max-h-[60vh] overflow-y-auto custom-scrollbar">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-3 bg-white border border-slate-100 rounded-2xl hover:border-yellow-200 hover:shadow-lg hover:shadow-yellow-500/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_MAP[task.priority].bg.replace('bg-', 'bg-')}`} />
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.priority}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 mb-2 leading-tight group-hover:text-yellow-700">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <Clock size={10} className="text-yellow-500" />
                      <span>{task.startTime || '09:00'}</span>
                    </div>
                  </div>
                ))}
                {dayTasks.length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center opacity-30">
                    <CheckCircle size={20} className="text-slate-300 mb-1" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clear</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDay = () => {
    const dateKey = toDateStr(currentDate);
    const dayTasks = getTasksForDate(dateKey);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="max-w-4xl mx-auto flex gap-4 md:gap-6 h-full min-h-[1440px] px-2 md:px-0">
        <div className="w-12 md:w-20 shrink-0 py-8 space-y-[60px] text-right pr-2 md:pr-4">
          {hours.map(h => (
            <div key={h} className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase">
              {h % 12 || 12} {h < 12 ? 'AM' : 'PM'}
            </div>
          ))}
        </div>
        
        <div className="flex-1 relative bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          {hours.map(h => (
            <div key={h} className="absolute left-0 right-0 border-b border-slate-50" style={{ top: `${h * 70}px`, height: '70px' }} />
          ))}

          {dayTasks.map(task => {
            const startH = task.startTime ? parseInt(task.startTime.split(':')[0]) : 9;
            const startM = task.startTime ? parseInt(task.startTime.split(':')[1]) : 0;
            const endH = task.endTime ? parseInt(task.endTime.split(':')[0]) : startH + 1;
            const duration = (endH - startH) * 70;
            
            return (
              <div 
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="absolute left-2 right-2 md:left-4 md:right-4 bg-yellow-50 border-l-4 border-yellow-500 p-3 md:p-4 rounded-xl shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden z-10"
                style={{ top: `${(startH * 70) + (startM / 60 * 70)}px`, height: `${Math.max(duration, 60)}px` }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
                  <h4 className="font-bold text-slate-800 text-xs md:text-sm truncate">{task.title}</h4>
                  <span className="text-[9px] md:text-[10px] font-black text-yellow-700 shrink-0">{task.startTime} — {task.endTime}</span>
                </div>
                <p className="hidden md:block text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa] dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 shadow-sm z-30">
        <div className="h-auto md:h-20 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-4 md:py-0 gap-4">
          <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-100 dark:shadow-none">
                <CalendarIcon size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1 truncate">
                  {viewMode === 'month' ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
                   viewMode === 'week' ? `Week ${Math.ceil(currentDate.getDate() / 7)}` : 
                   currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h1>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                  {filteredTasks.length} events scheduled
                </p>
              </div>
            </div>

            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all text-slate-500 dark:text-slate-300"><ChevronLeft size={16} /></button>
              <button onClick={() => navigate('today')} className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Today</button>
              <button onClick={() => navigate('next')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all text-slate-500 dark:text-slate-300"><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3">
             <div className="relative" ref={filterRef}>
               <button 
                 onClick={() => setShowFilters(!showFilters)}
                 className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border ${showFilters || filterProject !== 'all' || filterPriority !== 'all' ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-bold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
               >
                 <Filter size={16} />
                 <span className="hidden sm:inline">Filters</span>
                 {(filterProject !== 'all' || filterPriority !== 'all') && (
                   <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse ml-0.5" />
                 )}
               </button>

               {showFilters && (
                 <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-2xl z-[50] p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Team</label>
                      <div className="space-y-1">
                        <button 
                          onClick={() => {setFilterProject('all'); setShowFilters(false);}}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${filterProject === 'all' ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          All Teams
                          {filterProject === 'all' && <Check size={14} />}
                        </button>
                        {projects.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => {setFilterProject(p.id); setShowFilters(false);}}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${filterProject === p.id ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${p.color}`} />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => { setFilterProject('all'); setFilterPriority('all'); setShowFilters(false); }}
                      className="w-full py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-yellow-700 dark:hover:text-yellow-400 uppercase tracking-widest border-t border-slate-50 dark:border-slate-800 pt-4"
                    >
                      Reset All
                    </button>
                 </div>
               )}
             </div>

             <div className="flex items-center bg-slate-50/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                {[
                  { id: 'timeline', icon: <List size={16} /> },
                  { id: 'month', icon: <Grid3X3 size={16} /> },
                  { id: 'week', icon: <Columns size={16} /> },
                  { id: 'day', icon: <CalendarDays size={16} /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as ViewMode)}
                    className={`p-2.5 rounded-lg transition-all ${viewMode === mode.id ? 'bg-white dark:bg-slate-700 text-yellow-700 dark:text-yellow-400 shadow-sm border border-yellow-100 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    title={mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}
                  >
                    {mode.icon}
                  </button>
                ))}
             </div>
             
             <button 
                onClick={() => {
                  setNewTaskDueDate(toDateStr(currentDate));
                  setShowAddModal(true);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 p-2.5 md:px-5 md:py-2.5 rounded-xl font-bold shadow-lg shadow-yellow-100 dark:shadow-none transition-all active:scale-95"
                title="Add Event"
             >
                <Plus size={20} />
             </button>

             {user && (
               <div className="hidden md:block pl-2 border-l border-slate-200 dark:border-slate-700">
                 <ProfileMenu 
                   user={user} 
                   onOpenProfile={onOpenSettings || (() => {})} 
                   onOpenSettings={onOpenSettings || (() => {})} 
                   onLogoutClick={onLogoutClick || (() => {})} 
                   onOpenAvatarPicker={onOpenAvatarPicker}
                 />
               </div>
             )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {viewMode === 'timeline' && renderTimeline()}
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'week' && renderWeek()}
        {viewMode === 'day' && renderDay()}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-[40px] rounded-t-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 h-[85vh] md:h-auto dark:border dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-100 dark:shadow-none">
                  <Plus size={20} />
                </div>
                Schedule Event
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Event Title</label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Sync Meeting"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all text-lg font-bold text-slate-800"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <CalendarIcon size={14} /> Start Date
                  </label>
                  <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <CalendarIcon size={14} /> Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <Layers size={14} /> Team
                  </label>
                  <select 
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none"
                  >
                    {projects.map(p => {
                      const member = TEAM_MEMBERS.find(m => m.id === p.id || m.name.toLowerCase() === p.name.toLowerCase());
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name}{member?.role ? ` (${member.role})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <Briefcase size={14} /> Supporting Dept.
                  </label>
                  <select 
                    value={newTaskDepartment}
                    onChange={(e) => setNewTaskDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none"
                  >
                    <option value="">None</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <Clock size={14} /> Start
                  </label>
                  <input
                    type="time"
                    value={newTaskStartTime}
                    onChange={(e) => setNewTaskStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    <Clock size={14} /> End
                  </label>
                  <input
                    type="time"
                    value={newTaskEndTime}
                    onChange={(e) => setNewTaskEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => handleCreateEvent(false)}
                disabled={!newTaskTitle || isGenerating || isSaving}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-2xl hover:bg-white active:scale-95 disabled:opacity-50"
              >
                {isSaving && !isGenerating ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" /> : "Manual"}
              </button>
              <button 
                onClick={handleCreateEvent.bind(null, true)}
                disabled={!newTaskTitle || isGenerating || isSaving}
                className="flex-[1.5] py-4 bg-yellow-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-yellow-600 shadow-xl shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating || isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>AI Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projects={projects}
          onClose={() => setSelectedTask(null)}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          user={user}
        />
      )}
    </div>
  );
};

const TaskCard: React.FC<{ task: Task, projects: Project[], user?: User | null, onClick: () => void, onUpdate: (t: Task) => void }> = ({ task, projects, user, onClick, onUpdate }) => {
  const project = projects.find(p => p.id === task.projectId);
  const completedCount = task.subTasks.filter(st => st.completed).length;
  const progress = task.subTasks.length > 0 ? Math.round((completedCount / task.subTasks.length) * 100) : 0;

  const getTaskAvatar = () => {
    if (project) {
      if (user?.name && project.name.toLowerCase() === user.name.toLowerCase()) {
        return user.avatar || '/avatars/1.png';
      }
      const member = TEAM_MEMBERS.find(
        m => m.id === project.id || m.name.toLowerCase() === project.name.toLowerCase()
      );
      if (member) return member.avatar;
    }
    return user?.avatar || '/avatars/1.png';
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-5 md:p-6 shadow-sm hover:shadow-2xl hover:shadow-yellow-500/5 hover:border-yellow-300 dark:hover:border-yellow-500/40 transition-all cursor-pointer transform hover:-translate-y-1"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <img 
                src={getTaskAvatar()} 
                alt="Member Avatar" 
                className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm object-cover bg-white dark:bg-slate-800" 
              />
              <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${PRIORITY_MAP[task.priority].bg} ${PRIORITY_MAP[task.priority].color} border border-current/10`}>
                {task.priority}
              </div>
              {project && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div className={`w-1.5 h-1.5 rounded-full ${project.color}`} />
                  {project.name}
                </div>
              )}
              {task.department && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg text-[8px] font-black text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">
                  <Briefcase size={10} />
                  {task.department}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl shrink-0">
              <Clock size={11} className="text-yellow-600 dark:text-yellow-400" />
              <span>{task.startTime || '09:00'} — {task.endTime || '10:00'}</span>
            </div>
          </div>
          
          <h4 className={`text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-1 leading-tight transition-colors group-hover:text-yellow-700 dark:group-hover:text-yellow-400 ${task.status === 'done' ? 'line-through opacity-40' : ''}`}>
            {task.title}
          </h4>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed font-medium">{task.description}</p>
          
          {task.subTasks.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 whitespace-nowrap uppercase tracking-widest">
                {completedCount}/{task.subTasks.length} DONE
              </span>
            </div>
          )}
        </div>

        <div className="flex md:flex-col items-center justify-end gap-3 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...task, status: task.status === 'done' ? 'todo' : 'done' });
            }}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
              task.status === 'done' 
                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100 dark:shadow-none' 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-200 dark:text-slate-600 hover:border-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:scale-105 active:scale-95'
            }`}
          >
            <CheckCircle size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;