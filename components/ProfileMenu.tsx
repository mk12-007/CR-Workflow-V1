import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Sliders, LogOut, ChevronDown, Check, Sparkles } from 'lucide-react';
import { User as UserType } from '../types.ts';

interface ProfileMenuProps {
  user: UserType;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogoutClick: () => void;
  onOpenAvatarPicker?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  onOpenProfile,
  onOpenSettings,
  onLogoutClick,
  onOpenAvatarPicker,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const defaultAvatar = '/avatars/1.png';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.98] group"
      >
        <img
          src={user.avatar || defaultAvatar}
          alt={user.name}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
        />
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-navy dark:text-slate-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors line-clamp-1">
            {user.name || 'Team Member'}
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
            Creative Team
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Preview */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 sm:hidden">
            <p className="text-xs font-bold text-navy dark:text-slate-100 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy dark:hover:text-yellow-400 transition-colors"
            >
              <User size={15} className="text-slate-400" />
              <span>Profile</span>
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                if (onOpenAvatarPicker) {
                  onOpenAvatarPicker();
                } else {
                  onOpenSettings();
                }
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy dark:hover:text-yellow-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={15} className="text-yellow-500" />
                <span>3D Avatar Studio</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-black">
                45
              </span>
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy dark:hover:text-yellow-400 transition-colors"
            >
              <Settings size={15} className="text-slate-400" />
              <span>Account Settings</span>
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy dark:hover:text-yellow-400 transition-colors"
            >
              <Sliders size={15} className="text-slate-400" />
              <span>Preferences</span>
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onLogoutClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={15} className="text-red-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
