
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Sparkles, MoreHorizontal, ArrowRight, Calendar, Clock, Check, X, Tag, Layers, AlignLeft, Filter, Briefcase } from 'lucide-react';
import { Task, Status, Project, Priority, User } from '../types.ts';
import { STATUS_COLUMNS, PRIORITY_MAP, DEPARTMENTS, TEAM_MEMBERS } from '../constants.tsx';
import { analyzeProgress, generateTaskDescription } from '../services/geminiService.ts';
import TaskDetailModal from './TaskDetailModal.tsx';
import ProfileMenu from './ProfileMenu.tsx';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  activeProjectName: string;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newStatus: Status, targetTaskId?: string) => void;
  onAddTask: (task: Partial<Task>) => Promise<boolean>;
  user?: User | null;
  onOpenSettings?: () => void;
  onLogoutClick?: () => void;
  onOpenAvatarPicker?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  tasks, 
  projects, 
  activeProjectName, 
  onUpdateTask, 
  onDeleteTask, 
  onMoveTask, 
  onAddTask, 
  user, 
  onOpenSettings, 
  onLogoutClick,
  onOpenAvatarPicker 
}) => {
  const [aiInsight, setAiInsight] = useState<string>("Analyzing branch efficiency...");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<Status>('todo');
  
  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [newTaskDepartment, setNewTaskDepartment] = useState("");
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  const newTaskDescRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeNewTaskDescription = () => {
    if (newTaskDescRef.current) {
      newTaskDescRef.current.style.height = 'auto';
      newTaskDescRef.current.style.height = `${Math.max(76, newTaskDescRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(autoResizeNewTaskDescription, 20);
      return () => clearTimeout(timer);
    }
  }, [newTaskDescription, showAddModal]);

  // Performance Optimization: Cache task subsets to avoid re-calculating on every UI interaction
  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      done: tasks.filter(t => t.status === 'done'),
    };
  }, [tasks]);

  useEffect(() => {
    if (projects.length > 0 && !newTaskProjectId) {
      setNewTaskProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    let isMounted = true;
    const fetchInsight = async () => {
      if (tasks.length > 0) {
        const insight = await analyzeProgress(tasks);
        if (isMounted) setAiInsight(insight);
      } else {
        if (isMounted) setAiInsight("Start by adding branch tasks to see AI insights!");
      }
    };
    fetchInsight();
    return () => { isMounted = false; };
  }, [tasks]);

  useEffect(() => {
    if (editingTaskId && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editingTaskId]);

  const handleGenerateAiDescription = async () => {
    if (!newTaskTitle.trim() || isGeneratingDesc) return;
    setIsGeneratingDesc(true);
    try {
      const generated = await generateTaskDescription(newTaskTitle.trim());
      if (generated) setNewTaskDescription(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || isSaving) return;
    
    setIsSaving(true);
    
    const newTask: Partial<Task> = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      status: 'todo',
      priority: newTaskPriority,
      projectId: newTaskProjectId || (projects.length > 0 ? projects[0].id : ""),
      startDate: newTaskStartDate || "",
      dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
      subTasks: [],
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
    setNewTaskStartDate(new Date().toISOString().split('T')[0]);
    setNewTaskDueDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setNewTaskDepartment("");
    if (projects.length > 0) setNewTaskProjectId(projects[0].id);
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    if (editingTaskId) {
      e.preventDefault();
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, status: Status, targetTaskId?: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, status, targetTaskId);
    }
    setDraggedTaskId(null);
  };

  const handleStartEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setTempDescription(task.description);
  };

  const handleSaveEdit = (task: Task) => {
    if (tempDescription !== task.description) {
      onUpdateTask({ ...task, description: tempDescription });
    }
    setEditingTaskId(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(task);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCardClick = (task: Task) => {
    if (!editingTaskId) {
      setSelectedTask(task);
    }
  };

  const getTaskAvatar = (task: Task) => {
    // If the task belongs to a project corresponding to a specific team member
    const project = projects.find(p => p.id === task.projectId);
    if (project) {
      if (user?.name && project.name.toLowerCase() === user.name.toLowerCase()) {
        return user.avatar || '/avatars/1.png';
      }
      const member = TEAM_MEMBERS.find(
        m => m.id === project.id || m.name.toLowerCase() === project.name.toLowerCase()
      );
      if (member) {
        return member.avatar;
      }
    }
    // Consistent fallback to the current logged-in user's profile avatar
    return user?.avatar || '/avatars/1.png';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-auto md:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-6 py-4 md:py-0 shrink-0 gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">{activeProjectName}</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {tasks.filter(t => t.status !== 'done').length} branch actions pending
          </p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search branch logs..." 
              className="pl-9 pr-4 py-2 md:py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border-none rounded-xl text-sm focus:ring-2 focus:ring-yellow-500/20 outline-none w-full md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 p-2.5 md:px-5 md:py-2.5 rounded-xl font-bold shadow-lg shadow-yellow-100 dark:shadow-none transition-all active:scale-95"
            aria-label="Add New Task"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Action</span>
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
      </header>

      {/* AI Insight Bar */}
      <div className="px-4 md:px-8 mt-4 md:mt-6 shrink-0">
        <div className="p-3 md:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-amber-950/20 rounded-2xl border border-yellow-200 dark:border-yellow-500/20 flex items-center gap-3 md:gap-4 shadow-sm">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shrink-0 shadow-sm">
            <Sparkles size={16} className="md:size-5" />
          </div>
          <p className="text-[11px] md:text-sm font-medium text-yellow-800 dark:text-yellow-300 leading-relaxed line-clamp-2 md:line-clamp-none">
            <span className="font-bold">Operational AI:</span> {aiInsight}
          </p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden px-4 mt-6 gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {STATUS_COLUMNS.map(col => (
          <button
            key={col.id}
            onClick={() => setActiveTab(col.id as Status)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all border-2 ${activeTab === col.id ? 'bg-white dark:bg-slate-800 border-yellow-500 text-yellow-700 dark:text-yellow-400 shadow-sm' : 'bg-transparent border-transparent text-slate-400'}`}
          >
            <div className={`p-2 rounded-lg ${activeTab === col.id ? 'bg-yellow-50 dark:bg-yellow-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {col.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{col.title}</span>
            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {tasksByStatus[col.id as keyof typeof tasksByStatus].length}
            </span>
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-4 md:p-8 flex md:gap-6 overflow-x-hidden md:overflow-x-auto custom-scrollbar">
        {STATUS_COLUMNS.map((col) => {
          const statusTasks = tasksByStatus[col.id as keyof typeof tasksByStatus];
          return (
            <div 
              key={col.id} 
              className={`w-full md:w-80 shrink-0 flex-col ${activeTab === col.id ? 'flex' : 'hidden md:flex'}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.id as Status)}
            >
              <div className="hidden md:flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-widest">{col.title}</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 md:pr-2 pb-8 min-h-[100px]">
                {statusTasks.map(task => (
                  <div 
                    key={task.id} 
                    draggable={editingTaskId === task.id ? "false" : "true"}
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onClick={() => handleCardClick(task)}
                    className={`bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-yellow-300 dark:hover:border-yellow-500/40 transition-all cursor-pointer active:cursor-grabbing group ${draggedTaskId === task.id ? 'opacity-40 grayscale-[0.5]' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3 pointer-events-none">
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-lg ${PRIORITY_MAP[task.priority].bg} ${PRIORITY_MAP[task.priority].color} border border-current/10`}>
                        {task.priority}
                      </span>
                      <button className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 transition-opacity">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    <div className="pointer-events-none">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-snug">{task.title}</h4>
                      {task.department && (
                        <div className="flex items-center gap-1 mb-2">
                          <Briefcase size={10} className="text-yellow-600 dark:text-yellow-400" />
                          <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{task.department}</span>
                        </div>
                      )}
                    </div>
                    
                    {editingTaskId === task.id ? (
                      <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <textarea
                          ref={editRef}
                          className="w-full text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-yellow-300 dark:border-yellow-500/40 rounded-xl p-3 focus:ring-4 focus:ring-yellow-500/5 outline-none resize-none min-h-[70px]"
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          onBlur={() => handleSaveEdit(task)}
                          onKeyDown={(e) => handleKeyDown(e, task)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <p 
                        className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed cursor-text hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        onClick={(e) => handleStartEdit(e, task)}
                      >
                        {task.description || "No description provided..."}
                      </p>
                    )}
                    
                    {task.subTasks.length > 0 && (
                      <div className="mb-4 pointer-events-none">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">
                          <span>Milestones</span>
                          <span>{Math.round((task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-yellow-500 h-full rounded-full transition-all duration-700" 
                            style={{ width: `${(task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100}%` }} 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800 pointer-events-none">
                      <div className="flex items-center gap-2">
                        <img 
                          src={getTaskAvatar(task)} 
                          alt="Member Avatar" 
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover bg-white dark:bg-slate-800" 
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <Calendar size={12} className="text-yellow-600 dark:text-yellow-400" />
                        <span>{task.startDate ? `${task.startDate} → ${task.dueDate}` : task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {statusTasks.length === 0 && (
                  <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl h-32 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2 bg-slate-50/50 dark:bg-slate-900/40">
                    <Plus size={20} className="opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Clear Log</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] md:rounded-[36px] shadow-2xl flex flex-col overflow-hidden dark:border dark:border-slate-800 animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 md:px-7 md:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-500/20 shrink-0">
                  <Plus size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    Log Branch Action
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Assign a new action item to your branch timeline</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-95"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-7 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar bg-white dark:bg-slate-900">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Action Title
                </label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Q4 Brand Refresh & Production Kickoff"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm md:text-base font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-yellow-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                  autoFocus
                />
              </div>

              {/* Description + AI Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <AlignLeft size={13} /> Description
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={!newTaskTitle.trim() || isGeneratingDesc}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 disabled:opacity-40 transition-colors"
                  >
                    <Sparkles size={12} className={isGeneratingDesc ? 'animate-spin' : ''} />
                    <span>{isGeneratingDesc ? 'Generating...' : 'Auto-write with AI'}</span>
                  </button>
                </div>
                <textarea 
                  ref={newTaskDescRef}
                  value={newTaskDescription}
                  onChange={(e) => {
                    setNewTaskDescription(e.target.value);
                    autoResizeNewTaskDescription();
                  }}
                  onInput={autoResizeNewTaskDescription}
                  placeholder="Specific requirements, deliverables, or objectives for this action..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-yellow-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none min-h-[76px] max-h-[260px] overflow-y-auto custom-scrollbar"
                />
              </div>

              {/* Timeline & Dates (Start Date & Deadline) */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={13} /> Schedule & Timeline
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setNewTaskStartDate(today);
                    }}
                    className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    Set Start to Today
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newTaskStartDate}
                      onChange={(e) => setNewTaskStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all cursor-pointer shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Deadline / Due Date
                    </label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all cursor-pointer shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  <Tag size={13} /> Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                    const isSelected = newTaskPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`py-2.5 px-3 text-xs font-bold uppercase rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isSelected 
                            ? `${PRIORITY_MAP[p].bg} ${PRIORITY_MAP[p].color} border-current shadow-sm ring-2 ring-yellow-400/20` 
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {PRIORITY_MAP[p].icon}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team and Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    <Layers size={13} /> Assigned Team
                  </label>
                  <select 
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all cursor-pointer"
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
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    <Briefcase size={13} /> Department
                  </label>
                  <select 
                    value={newTaskDepartment}
                    onChange={(e) => setNewTaskDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-yellow-500 transition-all cursor-pointer"
                  >
                    <option value="">None (General)</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 md:px-7 md:py-4 bg-slate-50/70 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim() || isSaving}
                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-slate-900 font-bold text-xs rounded-xl shadow-md shadow-yellow-500/15 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Create Branch Action</span>
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

export default Dashboard;
