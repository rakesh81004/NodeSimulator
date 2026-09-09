import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useSimulationStore } from './store/simulationStore';
import { DashboardView } from './components/dashboard/DashboardView';
import { EditorView } from './components/editor/EditorView';
import { AuthPage } from './components/auth/AuthPage';

export const App: React.FC = () => {
  const { user, checkAuth, isLoading: authLoading } = useAuthStore();
  const { loadSimulation, setSimulation } = useSimulationStore();

  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeSimId, setActiveSimId] = useState<string | null>(null);

  // Restore the session from a saved token, if any -- no more silent
  // auto-login, so a signed-out visitor actually lands on AuthPage below.
  useEffect(() => {
    checkAuth();
  }, []);

  const handleOpenSimulation = async (id: string) => {
    setActiveSimId(id);
    const success = await loadSimulation(id);
    if (success) {
      setCurrentView('editor');
    } else {
      alert('Could not load simulation.');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setActiveSimId(null);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400 font-mono text-sm gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Initializing DSA Animator...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (currentView === 'editor' && activeSimId) {
    return <EditorView onBackToDashboard={handleBackToDashboard} />;
  }

  return <DashboardView onOpenSimulation={handleOpenSimulation} />;
};

export default App;
