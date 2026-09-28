import React, { useState, useRef, useEffect } from 'react';
import { Layout, Calendar, BarChart2, Settings, Plus, Folder, Hash, X, Check, PieChart, Pencil } from 'lucide-react';
import { Project, User } from '../types.ts';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  activeView: 'dashboard' | 'schedule';
  onSelectProject: (id: string | null) => void;
  onSelectView: (view: 'dashboard' | 'schedule') => void;
  onAddProject: (name: string) => void;
  onUpdateProject?: (id: string, name: string) => void;
  onOpenSummary?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  user?: User;
}

const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, activeView, onSelectProject, onSelectView, onAddProject, onUpdateProject, onOpenSummary, onOpenSettings }) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingProject && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingProject]);

  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  // Ensure teams in sidebar are unique by ID and name to prevent duplicate rendering
  const displayedProjects = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return projects.filter((project) => {
      const normName = project.name ? project.name.trim().toLowerCase() : '';
      if (seenIds.has(project.id) || (normName && seenNames.has(normName))) {
        return false;
      }
      seenIds.add(project.id);
      if (normName) seenNames.add(normName);
      return true;
    });
  }, [projects]);

  const handleAddSubmit = () => {
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName("");
      setIsAddingProject(false);
    }
  };

  const handleEditSubmit = (id: string) => {
    if (editProjectName.trim() && onUpdateProject) {
      onUpdateProject(id, editProjectName.trim());
      setEditingProjectId(null);
      setEditProjectName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddSubmit();
    if (e.key === 'Escape') {
      setIsAddingProject(false);
      setNewProjectName("");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleEditSubmit(id);
    if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditProjectName("");
    }
  };

  const startEditing = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
  };

  return (
    <aside className="w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-200 dark:shadow-none">
          <Layout size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">Creative<span className="text-yellow-600 dark:text-yellow-400">Timeline</span></span>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">Menu</div>
        
        <button 
          onClick={() => {
              onSelectView('dashboard');
              onSelectProject(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeView === 'dashboard' && !activeProjectId ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
        >
          <BarChart2 size={20} className={activeView === 'dashboard' && !activeProjectId ? 'text-yellow-600 dark:text-yellow-400' : ''} />
          <span className="font-medium">Dashboard</span>
        </button>

        <button 
          onClick={() => onSelectView('schedule')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeView === 'schedule' ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
        >
          <Calendar size={20} className={activeView === 'schedule' ? 'text-yellow-600 dark:text-yellow-400' : ''} />
          <span className="font-medium">My Schedule</span>
        </button>

        <button 
          onClick={onOpenSummary}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
        >
          <PieChart size={20} />
          <span className="font-medium">Summary Report</span>
        </button>
        
        {/* Teams */}
        <div className="pt-8 mb-2 px-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Teams</span>
          <button 
            onClick={() => setIsAddingProject(true)}
            className="p-1 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {isAddingProject && (
          <div className="px-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-yellow-100 dark:border-yellow-500/30">
              <input
                ref={inputRef}
                type="text"
                placeholder="Team name..."
                className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none px-1"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button 
                onClick={handleAddSubmit}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700"
              >
                <Check size={16} />
              </button>
              <button 
                onClick={() => setIsAddingProject(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {displayedProjects.map((project) => (
          <div key={project.id} className="relative group/team">
            {editingProjectId === project.id ? (
               <div className="px-2 mb-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-yellow-400 shadow-sm ring-2 ring-yellow-500/10">
                  <input
                    ref={editInputRef}
                    type="text"
                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-100 outline-none px-1"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                    onBlur={() => handleEditSubmit(project.id)}
                  />
                  <button 
                    onMouseDown={(e) => { e.preventDefault(); handleEditSubmit(project.id); }}
                    className="text-green-500 hover:text-green-600"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${activeView === 'dashboard' && activeProjectId === project.id ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className="flex items-center gap-3 overflow-hidden flex-1 text-left focus:outline-none"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${project.color}`} />
                  <span className="font-medium truncate">{project.name}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => startEditing(e, project)}
                  className="opacity-0 group-hover/team:opacity-100 p-1 text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all shrink-0 ml-1"
                  title="Edit Team Name"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all font-medium text-sm"
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;