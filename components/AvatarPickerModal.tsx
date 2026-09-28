import React, { useState } from 'react';
import { X, Check, Sparkles, User, Search } from 'lucide-react';
import { AVATAR_LIST } from '../constants.tsx';
import { supabase } from '../services/supabase.ts';

interface AvatarPickerModalProps {
  currentAvatar?: string;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  currentAvatar,
  userName = 'User',
  isOpen,
  onClose,
  onSelectAvatar,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '/avatars/1.png');
  const [filter, setFilter] = useState<'all' | '1-15' | '16-30' | '31-45'>('all');
  const [searchNumber, setSearchNumber] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const filteredAvatars = AVATAR_LIST.filter((avatarUrl, index) => {
    const num = index + 1;
    if (searchNumber.trim()) {
      return num.toString().includes(searchNumber.trim());
    }
    if (filter === '1-15') return num <= 15;
    if (filter === '16-30') return num >= 16 && num <= 30;
    if (filter === '31-45') return num >= 31 && num <= 45;
    return true;
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update in Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: selectedAvatar }
      });

      // 2. Also persist in localStorage for instant reload
      if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('ct_local_session');
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed?.user) {
              parsed.user.avatar = selectedAvatar;
              if (parsed.user.user_metadata) {
                parsed.user.user_metadata.avatar_url = selectedAvatar;
              }
              localStorage.setItem('ct_local_session', JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      }

      // 3. Notify parent app state
      onSelectAvatar(selectedAvatar);
      setSaveSuccess(true);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 400);
    } catch (err) {
      console.error('Failed to save avatar:', err);
      // Even if network fails, update local state
      onSelectAvatar(selectedAvatar);
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-[36px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Choose 3D Avatar
              </h2>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                45 Exclusive 3D Avatars Collection
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Preview Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={selectedAvatar}
                alt="Selected Avatar Preview"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover bg-white dark:bg-slate-800 border-2 border-yellow-500 shadow-md shadow-yellow-500/10 p-0.5"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow-sm border-2 border-white dark:border-slate-900">
                <Check size={11} strokeWidth={3} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selected For</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white">{userName}</h3>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                {selectedAvatar.replace('/avatars/', 'Avatar #').replace('.png', '')}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
            {(['all', '1-15', '16-30', '31-45'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => { setFilter(f); setSearchNumber(''); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filter === f && !searchNumber
                    ? 'bg-white dark:bg-slate-700 text-yellow-700 dark:text-yellow-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'All (45)' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input for Mobile & Quick Filter */}
        <div className="px-5 pt-3 shrink-0 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="Search avatar by number (1-45)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-yellow-500/20"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Showing {filteredAvatars.length} of 45
          </span>
        </div>

        {/* Avatars Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
            {filteredAvatars.map((avatarUrl, idx) => {
              const isCurrent = selectedAvatar === avatarUrl;
              const avatarNumber = avatarUrl.replace('/avatars/', '').replace('.png', '');

              return (
                <button
                  key={avatarUrl}
                  type="button"
                  onClick={() => setSelectedAvatar(avatarUrl)}
                  className={`group relative aspect-square rounded-2xl p-1.5 sm:p-2 transition-all flex flex-col items-center justify-center border-2 active:scale-95 ${
                    isCurrent
                      ? 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/50'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-yellow-300 dark:hover:border-yellow-500/50 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={avatarUrl}
                    alt={`Avatar ${avatarNumber}`}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                  />
                  {isCurrent && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-[9px] font-black text-slate-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 px-1 rounded bg-white/70 dark:bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    #{avatarNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Click any avatar to select and save to your profile.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-yellow-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} strokeWidth={3} />
                  <span>Applied!</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Set as My Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
