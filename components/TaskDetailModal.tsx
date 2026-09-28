
import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, Circle, Plus, Trash2, Sparkles, Calendar, Tag, Layers, ChevronDown, Check, Clock, TrendingUp, ChevronRight, AlertTriangle, ArrowUp, ArrowDown, SortAsc, Briefcase } from 'lucide-react';
import { Task, SubTask, Project, Priority, Status, User } from '../types.ts';
import { PRIORITY_MAP, STATUS_COLUMNS, DEPARTMENTS, TEAM_MEMBERS } from '../constants.tsx';
import { suggestSubtasks } from '../services/geminiService.ts';

interface TaskDetailModalProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  user?: User | null;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, projects, onClose, onUpdate, onDelete, user }) => {
  const [editedTask, setEditedTask] = useState<Task>(JSON.parse(JSON.stringify(task)));
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const timelineSpan = (() => {
    if (!editedTask.dueDate || !editedTask.startDate) return null;
    const start = new Date(editedTask.startDate);
    const due = new Date(editedTask.dueDate);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) return null;
    const diffDays = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Due before start";
    if (diffDays === 0) return "1 day";
    return `${diffDays + 1} days`;
  })();

  const autoResizeDescription = () => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${Math.max(120, descriptionRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    const timer = setTimeout(autoResizeDescription, 10);
    return () => clearTimeout(timer);
  }, [editedTask.description]);

  const handleChange = (fields: Partial<Task>) => {
    const updated = { ...editedTask, ...fields };
    setEditedTask(updated);
    onUpdate(updated);
  };

  const toggleSubTask = (id: string) => {
    const subTasks = editedTask.subTasks.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    );
    handleChange({ subTasks });
  };

  const updateSubTask = (id: string, fields: Partial<SubTask>) => {
    const subTasks = editedTask.subTasks.map(st => 
      st.id === id ? { ...st, ...fields } : st
    );
    handleChange({ subTasks });
  };

  const addSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    const newST: SubTask = {
      id: `st-${Date.now()}`,
      title: newSubTaskTitle,
      completed: false
    };
    handleChange({ subTasks: [...editedTask.subTasks, newST] });
    setNewSubTaskTitle("");
  };

  const removeSubTask = (id: string) => {
    handleChange({ subTasks: editedTask.subTasks.filter(st => st.id !== id) });
  };

  const moveSubTask = (index: number, direction: 'up' | 'down') => {
    const newSubTasks = [...editedTask.subTasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSubTasks.length) return;
    [newSubTasks[index], newSubTasks[targetIndex]] = [newSubTasks[targetIndex], newSubTasks[index]];
    handleChange({ subTasks: newSubTasks });
  };

  const sortSubTasksByDate = () => {
    const sorted = [...editedTask.subTasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
    handleChange({ subTasks: sorted });
  };

  const handleAiSuggest = async () => {
    setIsGenerating(true);
    try {
      const suggestions = await suggestSubtasks(editedTask.title, editedTask.description);
      const newSTs = suggestions.map((s: any, idx: number) => ({
        id: `st-ai-${Date.now()}-${idx}`,
        title: s.title,
        completed: false
      }));
      handleChange({ subTasks: [...editedTask.subTasks, ...newSTs] });
    } catch (e) {
      console.error(e);
    }
    setIsGenerating(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalSubtasks = editedTask.subTasks.length;
  const completedSubtasks = editedTask.subTasks.filter(st => st.completed).length;
  const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const currentProject = projects.find(p => p.id === editedTask.projectId) || projects[0];
  const currentMember = currentProject ? TEAM_MEMBERS.find(m => m.id === currentProject.id || m.name.toLowerCase() === currentProject.name.toLowerCase()) : null;

  const getProjectAvatar = (proj: Project) => {
    if (user?.name && proj.name.toLowerCase() === user.name.toLowerCase()) {
      return user.avatar || '/avatars/1.png';
    }
    const member = TEAM_MEMBERS.find(
      m => m.id === proj.id || m.name.toLowerCase() === proj.name.toLowerCase()
    );
    return member ? member.avatar : null;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in md:zoom-in duration-300 dark:border dark:border-slate-800">
        
        {/* Header - Optimized for touch */}
        <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4 md:p-6 pb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${PRIORITY_MAP[editedTask.priority].bg} border-2 border-white dark:border-slate-800 shadow-sm`} />
              <input
                type="text"
                className="text-lg md:text-2xl font-black text-slate-800 dark:text-white bg-transparent border-none focus:ring-0 outline-none w-full truncate"
                value={editedTask.title}
                onChange={(e) => handleChange({ title: e.target.value })}
                placeholder="Task Title"
              />
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-400 transition-all active:scale-95">
              <X size={24} />
            </button>
          </div>
          
          <div className="px-6 md:px-12 pb-4 md:pb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Global Progress</span>
              <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-400 uppercase tracking-widest">{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-yellow-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row custom-scrollbar">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 p-6 md:p-8 space-y-10">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Strategic Description</label>
              <textarea
                ref={descriptionRef}
                className="w-full text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 focus:border-yellow-300 dark:focus:border-yellow-500/40 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-yellow-500/5 rounded-3xl p-5 md:p-6 min-h-[120px] outline-none transition-[border-color,box-shadow] resize-none text-sm font-medium leading-relaxed overflow-hidden"
                placeholder="What is this task about? Add some details..."
                value={editedTask.description}
                onInput={autoResizeDescription}
                onChange={(e) => {
                  handleChange({ description: e.target.value });
                  autoResizeDescription();
                }}
              />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Milestones Breakdowns ({totalSubtasks})</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={sortSubTasksByDate}
                    className="flex-1 sm:flex-initial text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-yellow-700 dark:hover:text-yellow-400 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-slate-100 dark:border-slate-700 active:scale-95"
                  >
                    <SortAsc size={14} /> Sort
                  </button>
                  <button 
                    onClick={handleAiSuggest}
                    disabled={isGenerating}
                    className="flex-1 sm:flex-initial text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 flex items-center justify-center gap-2 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-2.5 rounded-xl transition-all border border-yellow-200 dark:border-yellow-500/30 active:scale-95"
                  >
                    <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
                    {isGenerating ? "Gemini..." : "Gemini AI"}
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {editedTask.subTasks.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] bg-slate-50/50 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">No Milestones Added</p>
                  </div>
                ) : (
                  editedTask.subTasks.map((st, idx) => (
                    <div key={st.id} className="group flex flex-col p-4 md:p-5 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-3xl hover:border-yellow-300 dark:hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/5 transition-all gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          <div className="hidden md:flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveSubTask(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-300 hover:text-yellow-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                            <button onClick={() => moveSubTask(idx, 'down')} disabled={idx === editedTask.subTasks.length - 1} className="p-1 text-slate-300 hover:text-yellow-600 disabled:opacity-30"><ArrowDown size={14} /></button>
                          </div>
                          <button onClick={() => toggleSubTask(st.id)} className="shrink-0 active:scale-90 transition-transform">
                            {st.completed ? (
                              <CheckCircle size={26} className="text-yellow-500" />
                            ) : (
                              <Circle size={26} className="text-slate-200 dark:text-slate-600 hover:text-yellow-400" />
                            )}
                          </button>
                          <input 
                            type="text"
                            className={`text-sm md:text-[15px] bg-transparent border-none focus:ring-0 outline-none w-full font-bold transition-all ${st.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}
                            value={st.title}
                            onChange={(e) => updateSubTask(st.id, { title: e.target.value })}
                          />
                        </div>
                        <button onClick={() => removeSubTask(st.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 ml-10 md:ml-11">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Due</span>
                          <input
                            type="date"
                            className="text-[11px] px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-yellow-500/5 outline-none font-bold text-slate-600 dark:text-slate-300"
                            value={st.dueDate || ""}
                            onChange={(e) => updateSubTask(st.id, { dueDate: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Slot</span>
                           <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-2 py-1 gap-1">
                             <input type="time" className="text-[11px] bg-transparent border-none focus:ring-0 font-bold p-0 w-16 text-slate-700 dark:text-slate-200" value={st.startTime || ""} onChange={(e) => updateSubTask(st.id, { startTime: e.target.value })} />
                             <span className="text-slate-200 dark:text-slate-600">-</span>
                             <input type="time" className="text-[11px] bg-transparent border-none focus:ring-0 font-bold p-0 w-16 text-slate-700 dark:text-slate-200" value={st.endTime || ""} onChange={(e) => updateSubTask(st.id, { endTime: e.target.value })} />
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-3 sticky bottom-4 md:static">
                <input
                  type="text"
                  placeholder="New Milestone..."
                  className="flex-1 pl-6 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] text-sm outline-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-yellow-500/30 transition-all font-bold shadow-lg md:shadow-none text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                />
                <button 
                  onClick={addSubTask}
                  disabled={!newSubTaskTitle.trim()}
                  className="w-14 h-14 bg-yellow-500 text-slate-900 rounded-[24px] flex items-center justify-center hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-100 dark:shadow-none active:scale-95 disabled:opacity-50"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Area - Responsive */}
          <div className="w-full md:w-80 lg:w-84 shrink-0 p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50 space-y-8 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Workflow Status</label>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
                {STATUS_COLUMNS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleChange({ status: col.id as Status })}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                      editedTask.status === col.id 
                      ? 'bg-white dark:bg-slate-800 border-yellow-500 text-yellow-700 dark:text-yellow-400 font-bold ring-4 ring-yellow-500/5' 
                      : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {col.icon}
                    {col.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handleChange({ priority: p })}
                    className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl border transition-all ${
                      editedTask.priority === p 
                      ? `${PRIORITY_MAP[p].bg} ${PRIORITY_MAP[p].color} border-current shadow-md` 
                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-2">
              <div ref={projectDropdownRef} className="relative">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Assigned Team</label>
                <button
                  onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-3 hover:border-yellow-300 dark:hover:border-yellow-500 transition-colors"
                >
                  {getProjectAvatar(currentProject) ? (
                    <img src={getProjectAvatar(currentProject)!} alt={currentProject.name} className="w-6 h-6 rounded-full object-cover shadow-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" />
                  ) : (
                    <div className={`w-3 h-3 rounded-full ${currentProject.color}`} />
                  )}
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span className="truncate">{currentProject.name}</span>
                    {currentMember?.role && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                        {currentMember.role}
                      </span>
                    )}
                  </div>
                  <ChevronDown size={16} className={`ml-auto transition-transform shrink-0 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProjectMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[24px] shadow-2xl z-[100] overflow-hidden">
                    {projects.map(p => {
                      const avatar = getProjectAvatar(p);
                      const member = TEAM_MEMBERS.find(m => m.id === p.id || m.name.toLowerCase() === p.name.toLowerCase());
                      const isSelected = editedTask.projectId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => { handleChange({ projectId: p.id }); setIsProjectMenuOpen(false); }}
                          className={`w-full px-5 py-3 text-xs font-bold flex items-center justify-between gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {avatar ? (
                              <img src={avatar} alt={p.name} className="w-6 h-6 rounded-full object-cover shadow-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0" />
                            ) : (
                              <div className={`w-3 h-3 rounded-full shrink-0 ${p.color}`} />
                            )}
                            <div className="flex flex-col text-left min-w-0">
                              <span className="truncate">{p.name}</span>
                              {member?.role && (
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                                  {member.role}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  <Briefcase size={12} className="text-slate-400" /> Supporting Dept.
                </label>
                <div className="relative">
                  <select 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 pr-10 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-sm hover:border-yellow-300 dark:hover:border-yellow-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 appearance-none cursor-pointer transition-all"
                    value={editedTask.department || ""}
                    onChange={(e) => handleChange({ department: e.target.value })}
                  >
                    <option value="">None</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Calendar size={13} className="text-yellow-500" /> Start Date
                  </label>
                  {!editedTask.startDate && (
                    <button
                      type="button"
                      onClick={() => handleChange({ startDate: new Date().toISOString().split('T')[0] })}
                      className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline transition-colors"
                    >
                      Set Today
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-sm hover:border-yellow-300 dark:hover:border-yellow-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all cursor-pointer"
                    value={editedTask.startDate || ""}
                    onChange={(e) => handleChange({ startDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Overall Deadline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Clock size={13} className="text-amber-500" /> Overall Deadline
                  </label>
                  {timelineSpan && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-500/20">
                      {timelineSpan}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-sm hover:border-yellow-300 dark:hover:border-yellow-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all cursor-pointer"
                    value={editedTask.dueDate}
                    onChange={(e) => handleChange({ dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-10 pb-12 md:pb-0 space-y-4">
              {onDelete && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  {showDeleteConfirm ? (
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-[24px] p-5 space-y-4">
                      <p className="text-[10px] font-black text-red-800 dark:text-red-300 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} /> Confirm Deletion?
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-600">Delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-[10px] font-black uppercase rounded-xl">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 py-4 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <Trash2 size={16} />
                      Remove Task
                    </button>
                  )}
                </div>
              )}
               <div className="p-5 bg-yellow-50 dark:bg-yellow-950/30 rounded-[24px] border border-yellow-200 dark:border-yellow-500/20 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400 shadow-sm">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-yellow-800 dark:text-yellow-300 uppercase tracking-widest leading-none mb-1">Live Sync</p>
                    <p className="text-[9px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-widest opacity-70 leading-none">Auto-Saving</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;