import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogIn, UserPlus, Sparkles, Zap } from 'lucide-react';

// Full-page sign-in gate shown whenever there's no authenticated session --
// nothing past this point (dashboard, simulations) renders until the user
// logs in or creates an account, so "your problems" are only ever visible
// to whoever is actually signed in as them.
export const AuthPage: React.FC = () => {
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(email, name, password);
    }
  };

  const handleDemoLogin = async () => {
    await login('developer@dsa.animator', 'password123');
  };

  return (
    <div className="h-screen w-screen bg-surface-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-glow-indigo">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
              DSA Animator
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">Visual Dry-Run Animation Creator</p>
          </div>
        </div>

        <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
              <p className="text-xs text-slate-400">
                {mode === 'login' ? 'Sign in to see your own simulations' : 'Your simulations will be private to you'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Smith"
                  value={name}
                  onChange={(e) => {
                    clearError();
                    setName(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => {
                  clearError();
                  setEmail(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Password{mode === 'register' ? ' (min 6 characters)' : ''}
              </label>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 6 : undefined}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  clearError();
                  setPassword(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {isLoading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3">
            {mode === 'login' && (
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Demo Sign In</span>
              </button>
            )}

            <p className="text-center text-xs text-slate-400">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('register');
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('login');
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
