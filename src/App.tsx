import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useSimulationStore } from './store/simulationStore';
import { DashboardView } from './components/dashboard/DashboardView';
import { EditorView } from './components/editor/EditorView';

export const App: React.FC = () => {
  const { user, token, checkAuth, login, register, isLoading: authLoading } = useAuthStore();
  const { loadSimulation, setSimulation } = useSimulationStore();

  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeSimId, setActiveSimId] = useState<string | null>(null);

  // Auto-authenticate default developer profile on first startup if no token
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      const currentToken = localStorage.getItem('dsa_animator_token');
      if (!currentToken) {
        // Automatically create/login default developer account for instant out-of-the-box usage
        const regOk = await register('developer@dsa.animator', 'Demo Developer', 'password123');
        if (!regOk) {
          await login('developer@dsa.animator', 'password123');
        }
      }
    };
    initAuth();
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

  if (authLoading && !token) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex flex-col items-center justify-center text-slate-400 font-mono text-sm gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Initializing DSA Animator...</span>
      </div>
    );
  }

  if (currentView === 'editor' && activeSimId) {
    return <EditorView onBackToDashboard={handleBackToDashboard} />;
  }

  return <DashboardView onOpenSimulation={handleOpenSimulation} />;
};

export default App;
