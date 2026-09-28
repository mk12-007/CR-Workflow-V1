import React, { useState } from 'react';
import { Layout, Mail, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase.ts';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthViewProps {
  onLogin: (user: any) => void;
  initialMode?: AuthMode;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  // Form fields (initialized completely empty without demo values)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const clearErrors = () => setErrorMessage('');

  // Switch modes cleanly
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage('');
    setForgotSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Google OAuth sign-in / sign-up
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    clearErrors();
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setErrorMessage('Unable to connect to Google. Please try again.');
        return;
      }

      if (data?.user) {
        onLogin(data.user);
      }
    } catch {
      setErrorMessage('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Mode-specific validation
    if (mode === 'login') {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();

      if (!trimmedUser) {
        setErrorMessage('Email or username is required.');
        return;
      }
      if (!trimmedPass) {
        setErrorMessage('Password is required.');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedUser,
          password: trimmedPass,
        });

        if (error) {
          if (!trimmedUser.includes('@')) {
            setErrorMessage('Invalid credentials. If you registered with an email, please use your email address to sign in.');
          } else {
            setErrorMessage('Incorrect email or password. Please check your details and try again.');
          }
          return;
        }

        if (data?.user) {
          onLogin(data.user);
        }
      } catch {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signup') {
      const trimmedUser = username.trim();
      const trimmedEmail = email.trim();
      const trimmedPass = password.trim();
      const trimmedConfirm = confirmPassword.trim();

      if (!trimmedUser) {
        setErrorMessage('Username is required.');
        return;
      }
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!trimmedPass) {
        setErrorMessage('Password is required.');
        return;
      }
      if (trimmedPass.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (trimmedPass !== trimmedConfirm) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPass,
          options: {
            data: {
              full_name: trimmedUser,
              username: trimmedUser,
            },
          },
        });

        if (error) {
          if (error.message?.toLowerCase().includes('already exists')) {
            setErrorMessage('An account with this email already exists.');
          } else {
            setErrorMessage('Something went wrong. Please try again.');
          }
          return;
        }

        if (data?.user) {
          onLogin(data.user);
        }
      } catch {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      setLoading(true);
      try {
        if (typeof supabase.auth.resetPasswordForEmail === 'function') {
          const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo: window.location.origin,
          });
          if (error) {
            setErrorMessage(error.message || 'Unable to send reset email. Please try again.');
            return;
          }
        }
        setForgotSuccess(true);
      } catch {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-yellow-500/5 border border-slate-100 overflow-hidden">
        
        {/* ================= LEFT: BRAND / MARKETING PANEL ================= */}
        <div className="hidden md:flex flex-col justify-between p-10 lg:p-12 bg-yellow-500 text-navy relative overflow-hidden select-none">
          {/* Subtle brand ambient accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600/40 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center text-yellow-500 shadow-xl shadow-navy/20">
                <Layout size={26} />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-navy">
                Creative<span className="text-yellow-700">Timeline</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-5 leading-tight tracking-tight text-navy">
              Focus on what<br />
              matters, automate<br />
              the rest.
            </h1>

            {/* Supporting Text */}
            <p className="text-navy/80 text-sm lg:text-base mb-10 font-medium leading-relaxed">
              Manage your creative workflow, projects, tasks, and timelines in one place.
            </p>

            {/* Feature List */}
            <div className="space-y-4">
              {[
                'Smart task management',
                'Kanban boards & timelines',
                'Executive summary & reporting'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-navy font-semibold text-sm">
                  <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-navy" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="relative z-10 pt-8 border-t border-navy/10">
            <p className="text-xs font-semibold text-navy/70">
              © 2026 Creative Timeline. All rights reserved.
            </p>
          </div>
        </div>

        {/* ================= RIGHT: AUTHENTICATION PANEL ================= */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          
          {/* Mobile Brand Header */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center text-yellow-500 shadow-md">
              <Layout size={22} />
            </div>
            <span className="font-black text-xl tracking-tight text-navy">
              Creative<span className="text-yellow-600">Timeline</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Forgot your password?'}
            </h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {mode === 'login' && 'Sign in to continue to Creative Timeline.'}
              {mode === 'signup' && 'Start managing your creative workflow with Creative Timeline.'}
              {mode === 'forgot' && 'Enter your email address and we\'ll send you a password reset link.'}
            </p>
          </div>

          {/* Forgot Password Success View */}
          {mode === 'forgot' && forgotSuccess ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3.5">
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-green-900 mb-1">Check your email</h3>
                  <p className="text-xs text-green-700 font-medium leading-relaxed">
                    We've sent password reset instructions to your email address.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-navy font-bold rounded-2xl transition-all active:scale-[0.98] shadow-md shadow-yellow-500/10 flex items-center justify-center gap-2 text-xs uppercase tracking-wider min-h-[44px]"
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </button>
            </div>
          ) : (
            <>
              {/* Google Button (for Login and Signup) */}
              {mode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={googleLoading || loading}
                    className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-navy font-bold rounded-2xl flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 min-h-[44px]"
                  >
                    {googleLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        <span className="text-sm">Connecting...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span className="text-sm">Continue with Google</span>
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 absolute">
                      {mode === 'login' ? 'OR WITH USERNAME' : 'OR WITH EMAIL'}
                    </span>
                  </div>
                </>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Error Banner */}
                {errorMessage && (
                  <div 
                    role="alert" 
                    className="flex items-center gap-2.5 p-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100 animate-in fade-in duration-150"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Username / Email Input (Login & Signup) */}
                {(mode === 'login' || mode === 'signup') && (
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="username" 
                      className="block text-[11px] font-bold text-navy uppercase tracking-wider"
                    >
                      {mode === 'login' ? 'EMAIL OR USERNAME' : 'USERNAME'}
                    </label>
                    <div className="relative group">
                      <UserIcon 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-600 transition-colors pointer-events-none" 
                      />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete={mode === 'login' ? 'username email' : 'username'}
                        placeholder={mode === 'login' ? 'Enter your email or username' : 'Enter your username'}
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); clearErrors(); }}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-navy text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-150 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {/* Email Input (Signup & Forgot) */}
                {(mode === 'signup' || mode === 'forgot') && (
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="email" 
                      className="block text-[11px] font-bold text-navy uppercase tracking-wider"
                    >
                      EMAIL ADDRESS
                    </label>
                    <div className="relative group">
                      <Mail 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-600 transition-colors pointer-events-none" 
                      />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-navy text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-150 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {/* Password Input (Login & Signup) */}
                {(mode === 'login' || mode === 'signup') && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor="password" 
                        className="block text-[11px] font-bold text-navy uppercase tracking-wider"
                      >
                        PASSWORD
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-yellow-700 hover:text-yellow-800 transition-colors hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-600 transition-colors pointer-events-none" 
                      />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-navy text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-150 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Password Input (Signup only) */}
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-[11px] font-bold text-navy uppercase tracking-wider"
                    >
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative group">
                      <Lock 
                        size={18} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-600 transition-colors pointer-events-none" 
                      />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-navy text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-150 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full mt-2 py-4 bg-yellow-500 hover:bg-yellow-600 text-navy rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-yellow-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                      <span>
                        {mode === 'login' && 'Signing in...'}
                        {mode === 'signup' && 'Creating account...'}
                        {mode === 'forgot' && 'Sending link...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {mode === 'login' && 'SIGN IN'}
                        {mode === 'signup' && 'CREATE ACCOUNT'}
                        {mode === 'forgot' && 'SEND RESET LINK'}
                      </span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Switch Links */}
              <div className="mt-8 text-center">
                {mode === 'login' && (
                  <p className="text-slate-500 text-sm font-medium">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="text-yellow-700 font-bold hover:underline hover:text-yellow-800 transition-colors ml-1"
                    >
                      Sign up free
                    </button>
                  </p>
                )}

                {mode === 'signup' && (
                  <p className="text-slate-500 text-sm font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-yellow-700 font-bold hover:underline hover:text-yellow-800 transition-colors ml-1"
                    >
                      Sign in
                    </button>
                  </p>
                )}

                {mode === 'forgot' && (
                  <p className="text-slate-500 text-sm font-medium">
                    Remembered your password?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-yellow-700 font-bold hover:underline hover:text-yellow-800 transition-colors ml-1"
                    >
                      Back to sign in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthView;
