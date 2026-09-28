import React, { useState } from 'react';
import { 
  X, Bell, User, Shield, Database, Info, Moon, Sun, Check, Download, 
  AlertCircle, ChevronRight, Palette, Settings, Sparkles, Lock, Eye, 
  EyeOff, CheckCircle2, Search, FileSpreadsheet, Copy, ExternalLink, 
  RefreshCw, CheckCheck, Sliders, Laptop
} from 'lucide-react';
import { User as UserType, Task } from '../types.ts';
import { supabase } from '../services/supabase.ts';
import { AVATAR_LIST } from '../constants.tsx';

interface SettingsModalProps {
  user: UserType | null;
  tasks: Task[];
  onClose: () => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
  initialTab?: 'account' | 'avatars' | 'sheets' | 'ai' | 'appearance' | 'notifications' | 'data';
}

// Reusable Consistent Toggle Switch Component
interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleProps> = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between py-2 group cursor-pointer" onClick={() => onChange(!enabled)}>
    {(label || description) && (
      <div className="pr-4 select-none">
        {label && <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">{label}</p>}
        {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
    )}
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500/30 ${
        enabled ? 'bg-yellow-500' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, 
  tasks, 
  onClose,
  onUpdateAvatar,
  initialTab = 'account'
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'avatars' | 'sheets' | 'ai' | 'appearance' | 'notifications' | 'data'>(initialTab);
  
  // Appearance & Theme State
  const [accentColor, setAccentColor] = useState(() => (
    typeof localStorage !== 'undefined' ? localStorage.getItem('ct_accent') || 'yellow' : 'yellow'
  ));
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ct_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ct_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ct_accent', color);
    }
  };

  // Privacy & Notifications Toggles
  const [publicProfile, setPublicProfile] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    reminders: true,
    aiInsights: true,
    teamUpdates: false,
  });

  // Change Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      if (error) {
        setPasswordError(error.message || 'Failed to update password.');
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch {
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Gemini AI Key State
  const [geminiKey, setGeminiKey] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''));
  const [keySaved, setKeySaved] = useState(false);

  const saveGeminiKey = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gemini_api_key', geminiKey.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
    }
  };

  // Google Sheets Integration State
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState(() => (
    typeof localStorage !== 'undefined' ? localStorage.getItem('ct_sheets_webhook_url') || '' : ''
  ));
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncSuccess, setSheetsSyncSuccess] = useState<string | null>(null);
  const [sheetsSyncError, setSheetsSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => (
    typeof localStorage !== 'undefined' ? localStorage.getItem('ct_sheets_last_synced') || null : null
  ));
  const [isScriptCopied, setIsScriptCopied] = useState(false);

  const saveSheetsUrl = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ct_sheets_webhook_url', sheetsWebhookUrl.trim());
      setIsUrlSaved(true);
      setTimeout(() => setIsUrlSaved(false), 2500);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!sheetsWebhookUrl.trim()) {
      setSheetsSyncError('Please enter your Google Apps Script Web App URL first.');
      return;
    }
    setIsSyncingSheets(true);
    setSheetsSyncError(null);
    setSheetsSyncSuccess(null);

    try {
      const payload = tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        department: t.department || 'General',
        subTasks: t.subTasks || []
      }));

      await fetch(sheetsWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(now);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ct_sheets_last_synced', now);
      }
      setSheetsSyncSuccess(`Successfully transmitted ${tasks.length} tasks to Google Sheets!`);
      setTimeout(() => setSheetsSyncSuccess(null), 5000);
    } catch (err: any) {
      setSheetsSyncError(err.message || 'Failed to sync with Google Sheets. Please check your Web App URL.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const exportTasksCSV = () => {
    const headers = ['Task ID', 'Title', 'Department', 'Priority', 'Status', 'Due Date', 'Progress', 'Description'];
    const rows = tasks.map(t => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.department || 'General').replace(/"/g, '""')}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.dueDate}"`,
      `"${t.subTasks ? t.subTasks.filter(s => s.completed).length + '/' + t.subTasks.length : '0/0'}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `creative_timeline_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `creative_timeline_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const googleAppsScriptCode = `function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    const tasks = Array.isArray(data) ? data : [data];

    // Clear previous tasks (preserves row 1 header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
    }

    // Write task rows
    const rows = tasks.map(task => [
      task.id || '',
      task.title || '',
      task.department || 'General',
      task.priority || 'medium',
      task.status || 'todo',
      task.dueDate || '',
      task.subTasks ? task.subTasks.filter(s => s.completed).length + '/' + task.subTasks.length : '0/0',
      task.description || ''
    ]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', synced: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScriptCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(googleAppsScriptCode);
      setIsScriptCopied(true);
      setTimeout(() => setIsScriptCopied(false), 2500);
    }
  };

  // Avatar Management State
  const [currentAvatar, setCurrentAvatar] = useState(user?.avatar || '/avatars/1.png');
  const [avatarFilter, setAvatarFilter] = useState<'all' | '1-15' | '16-30' | '31-45'>('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const handleSelectAvatar = async (url: string) => {
    setCurrentAvatar(url);
    setAvatarSaving(true);
    setAvatarSuccess(false);

    try {
      await supabase.auth.updateUser({
        data: { avatar_url: url }
      });

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ct_local_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.user) {
              parsed.user.avatar = url;
              if (parsed.user.user_metadata) parsed.user.user_metadata.avatar_url = url;
              localStorage.setItem('ct_local_session', JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      }

      onUpdateAvatar?.(url);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating avatar:', err);
      onUpdateAvatar?.(url);
    } finally {
      setAvatarSaving(false);
    }
  };

  const filteredAvatars = AVATAR_LIST.filter((avatarUrl, idx) => {
    const num = idx + 1;
    if (avatarSearch.trim()) {
      return num.toString().includes(avatarSearch.trim());
    }
    if (avatarFilter === '1-15') return num <= 15;
    if (avatarFilter === '16-30') return num >= 16 && num <= 30;
    if (avatarFilter === '31-45') return num >= 31 && num <= 45;
    return true;
  });

  const tabs = [
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'avatars', label: '3D Avatars', badge: '45', icon: <Sparkles size={18} /> },
    { id: 'sheets', label: 'Google Sheets', badge: sheetsWebhookUrl ? 'Live' : undefined, icon: <FileSpreadsheet size={18} /> },
    { id: 'ai', label: 'Gemini AI', badge: geminiKey ? 'Active' : undefined, icon: <Sparkles size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'data', label: 'Data & Backup', icon: <Database size={18} /> }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[80] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-w-5xl md:max-h-[88vh] md:rounded-[36px] shadow-2xl flex flex-col overflow-hidden dark:border dark:border-slate-800 transition-all">
        
        {/* Modal Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-500/20 shrink-0">
              <Settings size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">System Settings</h2>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Manage preferences, integrations, security, and appearance</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-95"
            title="Close Settings (Esc)"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Navigation Tabs */}
          <div className="w-full md:w-64 bg-slate-50/70 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-3 md:p-4 space-y-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar flex md:flex-col shrink-0">
            <div className="hidden md:block px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Categories
            </div>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 md:py-3 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap md:w-full group text-left ${
                    isActive 
                      ? 'bg-yellow-500 text-slate-900 shadow-md shadow-yellow-500/15' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400'} transition-colors shrink-0`}>
                    {tab.icon}
                  </span>
                  <span className="flex-1 truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                      isActive 
                        ? 'bg-slate-900/15 text-slate-900' 
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} className="ml-auto hidden md:block opacity-60" />}
                </button>
              );
            })}
          </div>

          {/* Content Panels */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar bg-white dark:bg-slate-900">
            
            {/* 1. Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Account Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    <div 
                      onClick={() => setActiveTab('avatars')} 
                      className="relative group/avatar cursor-pointer shrink-0"
                      title="Click to change 3D Avatar"
                    >
                      <img 
                        src={currentAvatar} 
                        className="w-20 h-20 rounded-2xl border-2 border-white dark:border-slate-700 shadow-md object-contain bg-white dark:bg-slate-800 p-1 group-hover/avatar:scale-105 transition-transform" 
                        alt="User Profile Avatar" 
                      />
                      <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white">{user?.name || 'Workspace Member'}</h3>
                        <span className="px-2.5 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Active Account
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{user?.email || 'user@creativetimeline.internal'}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('avatars')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
                      >
                        <Sparkles size={13} />
                        <span>Pick from 45 3D Memojis</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('avatars')}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Avatar Studio
                    </button>
                  </div>
                </div>

                {/* Quick Avatar Row */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Quick Avatar Switcher</h4>
                      <p className="text-[11px] text-slate-400">Click any avatar to switch your persona instantly</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('avatars')}
                      className="text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                    >
                      <span>All 45</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {AVATAR_LIST.slice(0, 10).map((avatarUrl, idx) => {
                      const isCurrent = currentAvatar === avatarUrl;
                      return (
                        <button
                          key={avatarUrl}
                          type="button"
                          onClick={() => handleSelectAvatar(avatarUrl)}
                          className={`relative w-12 h-12 rounded-2xl p-1 shrink-0 transition-all border-2 active:scale-95 ${
                            isCurrent
                              ? 'border-yellow-500 bg-yellow-500/10 shadow-sm ring-2 ring-yellow-400/40'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-yellow-400'
                          }`}
                          title={`Avatar #${idx + 1}`}
                        >
                          <img src={avatarUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-contain" />
                          {isCurrent && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Privacy & Account Settings */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Privacy & Collaboration</h4>
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    <ToggleSwitch 
                      enabled={publicProfile} 
                      onChange={setPublicProfile}
                      label="Workspace Visibility"
                      description="Allow team members across projects to see your active tasks and schedule"
                    />
                    <ToggleSwitch 
                      enabled={twoFactor} 
                      onChange={setTwoFactor}
                      label="Enhanced Account Protection"
                      description="Require confirmation when logging in from unknown browsers"
                    />
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-700 dark:text-yellow-400 shrink-0">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Security & Password</h4>
                      <p className="text-xs text-slate-400">Update your account login credentials</p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Password successfully updated!</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-2xl text-xs font-bold border border-red-200 dark:border-red-800 flex items-center gap-2 animate-in fade-in">
                      <AlertCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="At least 6 characters"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                            className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-yellow-500 transition-all shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Confirm Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-yellow-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordLoading || !newPassword}
                        className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-slate-900 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm flex items-center gap-2"
                      >
                        {passwordLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Save New Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. Avatars Tab */}
            {activeTab === 'avatars' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={currentAvatar}
                        alt="Active Avatar"
                        className="w-20 h-20 rounded-2xl object-contain border-2 border-white dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 p-1"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                        <Sparkles size={12} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
                        Current Avatar
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {currentAvatar.replace('/avatars/', 'Memoji #').replace('.png', '')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click any of the 45 3D Memojis below to update your profile immediately.
                      </p>
                    </div>
                  </div>

                  {avatarSuccess && (
                    <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in self-start sm:self-auto">
                      <CheckCircle2 size={16} />
                      <span>Avatar Updated!</span>
                    </div>
                  )}

                  {avatarSaving && (
                    <div className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in self-start sm:self-auto">
                      <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {(['all', '1-15', '16-30', '31-45'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setAvatarFilter(f); setAvatarSearch(''); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          avatarFilter === f && !avatarSearch
                            ? 'bg-yellow-500 text-slate-900 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {f === 'all' ? 'All 45 Memojis' : `Pack ${f}`}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={avatarSearch}
                      onChange={(e) => setAvatarSearch(e.target.value)}
                      placeholder="Search # (1-45)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Avatars Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                  {filteredAvatars.map((avatarUrl) => {
                    const isCurrent = currentAvatar === avatarUrl;
                    const num = avatarUrl.replace('/avatars/', '').replace('.png', '');
                    return (
                      <button
                        key={avatarUrl}
                        type="button"
                        onClick={() => handleSelectAvatar(avatarUrl)}
                        className={`group relative aspect-square rounded-2xl p-1.5 transition-all flex flex-col items-center justify-center border-2 active:scale-95 ${
                          isCurrent
                            ? 'border-yellow-500 bg-yellow-500/10 shadow-md ring-2 ring-yellow-400/40'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-yellow-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                        title={`Select Avatar #${num}`}
                      >
                        <img
                          src={avatarUrl}
                          alt={`Avatar ${num}`}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                        />
                        {isCurrent && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 text-[8px] font-black text-slate-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 px-1 rounded bg-white/80 dark:bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity">
                          #{num}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Google Sheets Tab */}
            {activeTab === 'sheets' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Google Sheets Synchronization</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          sheetsWebhookUrl 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' 
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sheetsWebhookUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {sheetsWebhookUrl ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Transmit your tasks, priorities, departments, deadlines, and milestone statuses directly to a Google Spreadsheet.
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm self-start sm:self-auto shrink-0">
                    {tasks.length} Tasks in Workspace
                  </span>
                </div>

                {sheetsSyncSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{sheetsSyncSuccess}</span>
                  </div>
                )}

                {sheetsSyncError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-red-800 dark:text-red-300 animate-in fade-in">
                    <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span>{sheetsSyncError}</span>
                  </div>
                )}

                {/* Webhook Endpoint Input */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-5 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Apps Script Webhook URL</h4>
                    {lastSyncedTime && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        Last synced: {lastSyncedTime}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={sheetsWebhookUrl}
                      onChange={(e) => setSheetsWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={saveSheetsUrl}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-2xl transition-all shrink-0 active:scale-95"
                    >
                      {isUrlSaved ? 'Saved!' : 'Save URL'}
                    </button>
                    <button
                      type="button"
                      onClick={syncToGoogleSheets}
                      disabled={isSyncingSheets}
                      className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-slate-900 text-xs font-bold rounded-2xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshCw size={14} className={isSyncingSheets ? 'animate-spin' : ''} />
                      <span>{isSyncingSheets ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Export Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white">Export CSV File</h5>
                      <p className="text-[11px] text-slate-400">Download formatted CSV ready for manual import</p>
                    </div>
                    <button
                      type="button"
                      onClick={exportTasksCSV}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-yellow-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={13} />
                      <span>CSV</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white">Blank Google Sheet</h5>
                      <p className="text-[11px] text-slate-400">Launch a new spreadsheet in a new tab</p>
                    </div>
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink size={13} />
                      <span>sheets.new</span>
                    </a>
                  </div>
                </div>

                {/* Step-by-Step Setup Guide */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Quick Setup Instructions
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    {[
                      { step: 1, title: 'Create Sheet', desc: 'Open sheets.new and name your spreadsheet' },
                      { step: 2, title: 'Apps Script', desc: 'Click Extensions > Apps Script in Google Sheets' },
                      { step: 3, title: 'Paste Code', desc: 'Copy the code below into Code.gs and save' },
                      { step: 4, title: 'Deploy Web App', desc: 'Click Deploy > New deployment > Web app with Anyone access' }
                    ].map(s => (
                      <div key={s.step} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                        <div className="w-5 h-5 rounded-full bg-yellow-500 text-slate-900 font-black text-[10px] flex items-center justify-center mb-1.5">
                          {s.step}
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white mb-0.5">{s.title}</p>
                        <p className="text-[11px] text-slate-400 leading-normal">{s.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Copyable Script Code */}
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-mono text-slate-400">Code.gs</span>
                      <button
                        type="button"
                        onClick={copyScriptCode}
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        {isScriptCopied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                        <span>{isScriptCopied ? 'Copied!' : 'Copy Script'}</span>
                      </button>
                    </div>

                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-1 leading-relaxed custom-scrollbar max-h-48">
                      {googleAppsScriptCode}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Gemini AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-lg shadow-yellow-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Google Gemini AI Engine</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        geminiKey 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                      }`}>
                        {geminiKey ? 'API Key Configured' : 'Using Smart Fallbacks'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Powers automated task breakdowns, subtask generation, smart descriptions, and team progress insights using the Gemini 3 Flash model.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Gemini API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm font-mono text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-yellow-500 transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={saveGeminiKey}
                        className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-2xl text-xs transition-all active:scale-95 shadow-sm shrink-0"
                      >
                        {keySaved ? 'Saved!' : 'Save Key'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300">💡 How to obtain a Gemini API Key:</p>
                    <p>1. Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-yellow-600 dark:text-yellow-400 underline font-semibold">Google AI Studio</a>.</p>
                    <p>2. Create a free API key and paste it above, or declare <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">GEMINI_API_KEY</code> in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code>.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-lg shadow-yellow-500/20">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Theme & Personalization</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Customize interface themes, contrast levels, and workspace accents to fit your creative workflow.
                    </p>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Interface Mode</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                        theme === 'light'
                          ? 'border-yellow-500 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-yellow-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-yellow-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                          <Sun size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Light Mode</p>
                          <p className="text-xs text-slate-400">Crisp, high clarity for daylight work</p>
                        </div>
                      </div>
                      {theme === 'light' && (
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                        theme === 'dark'
                          ? 'border-yellow-500 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-yellow-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-yellow-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 dark:bg-slate-700 rounded-xl flex items-center justify-center text-yellow-400">
                          <Moon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</p>
                          <p className="text-xs text-slate-400">Deep, focused contrast for long sessions</p>
                        </div>
                      </div>
                      {theme === 'dark' && (
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Accent Style */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Palette Style</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: 'yellow', label: 'Yellow Amber', color: 'bg-yellow-500' },
                      { id: 'blue', label: 'Ocean Blue', color: 'bg-blue-500' },
                      { id: 'teal', label: 'Teal Mint', color: 'bg-teal-500' },
                      { id: 'purple', label: 'Royal Purple', color: 'bg-purple-500' },
                      { id: 'rose', label: 'Rose Pink', color: 'bg-rose-500' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAccentChange(item.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          accentColor === item.id
                            ? 'border-yellow-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-2 ring-yellow-400/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-sm`} />
                        <span>{item.label}</span>
                        {accentColor === item.id && <Check size={12} className="text-yellow-600 dark:text-yellow-400 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-lg shadow-yellow-500/20">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Notification Preferences</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Choose which milestone reminders, deadline updates, and strategic summaries you wish to receive.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 divide-y divide-slate-200/70 dark:divide-slate-800">
                  <ToggleSwitch
                    enabled={notifications.email}
                    onChange={(val) => setNotifications(prev => ({ ...prev, email: val }))}
                    label="Weekly Summary Digests"
                    description="Receive email analytics recapping team milestones, completed tasks, and upcoming deadlines"
                  />
                  <ToggleSwitch
                    enabled={notifications.reminders}
                    onChange={(val) => setNotifications(prev => ({ ...prev, reminders: val }))}
                    label="Due Date Alerts"
                    description="Browser and in-app alerts when tasks reach within 24 hours of their scheduled end time"
                  />
                  <ToggleSwitch
                    enabled={notifications.aiInsights}
                    onChange={(val) => setNotifications(prev => ({ ...prev, aiInsights: val }))}
                    label="Gemini AI Strategy Alerts"
                    description="Suggestions for workflow reallocations and bottleneck resolution"
                  />
                  <ToggleSwitch
                    enabled={notifications.teamUpdates}
                    onChange={(val) => setNotifications(prev => ({ ...prev, teamUpdates: val }))}
                    label="Team Milestone Broadcasts"
                    description="Notifications when team members mark high-priority branch items completed"
                  />
                </div>
              </div>
            )}

            {/* 7. Data & Backup Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-lg shadow-yellow-500/20">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Data Portability & Workspace Backup</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Download full snapshots of your projects and task deliverables in JSON or CSV format.
                    </p>
                  </div>
                </div>

                {/* Export Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 flex items-center justify-center mb-3">
                        <Download size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Full JSON Backup</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Download raw structured JSON including all tasks, subtasks, priorities, and project metadata.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportData}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 mt-4"
                    >
                      <Download size={14} />
                      <span>Download JSON ({tasks.length} Items)</span>
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                        <FileSpreadsheet size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Spreadsheet CSV Export</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Download formatted spreadsheet rows compatible with Microsoft Excel, Google Sheets, or Apple Numbers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportTasksCSV}
                      className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 mt-4"
                    >
                      <Download size={14} />
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-5 md:p-6 bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                    <AlertCircle size={18} />
                    <h4 className="text-xs font-black uppercase tracking-wider">Danger Zone</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Reset local cached workspace tokens and user session data. If you need to re-seed demo tasks or clear locally stored projects, you can reset your local cache.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Reset local cache and reload? Any unsynced offline changes will be refreshed.')) {
                          localStorage.removeItem('ct_local_tasks');
                          localStorage.removeItem('ct_local_projects');
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Reset Local Workspace Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 md:px-8 md:py-4.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">Creative Timeline v2.4</span>
            <span>•</span>
            <span>All changes saved live</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-yellow-500/10 flex items-center justify-center gap-2"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Done</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;