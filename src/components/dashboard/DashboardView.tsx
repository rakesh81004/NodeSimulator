import React, { useEffect, useState } from 'react';
import { api } from '../../persistence/api';
import { Folder as FolderType, SimulationSummary } from '../../types/simulation';
import { useAuthStore } from '../../store/authStore';
import { SimulationCard } from './SimulationCard';
import { CreateSimulationModal } from './CreateSimulationModal';
import { CreateFolderModal } from './CreateFolderModal';
import { FolderSidebar } from './FolderSidebar';
import { ImportModal } from './ImportModal';
import { CodeImportModal } from './CodeImportModal';
import { LoginModal } from '../auth/LoginModal';
import { RegisterModal } from '../auth/RegisterModal';
import { simulateValidParentheses } from '../../parser/dsaCodeSimulator';
import { useSimulationStore } from '../../store/simulationStore';
import {
  Plus,
  Upload,
  Search,
  Sparkles,
  Layers,
  LogOut,
  Zap,
  Code2,
} from 'lucide-react';

interface Props {
  onOpenSimulation: (id: string) => void;
}

export const DashboardView: React.FC<Props> = ({ onOpenSimulation }) => {
  const { user, logout, token } = useAuthStore();
  const { setSimulation } = useSimulationStore();
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = All, 'none' = Uncategorized
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCodeImportOpen, setIsCodeImportOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const fetchSimulations = async () => {
    if (!token) {
      setSimulations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { simulations: data } = await api.listSimulations(
        searchQuery || undefined,
        undefined,
        selectedFolderId || undefined
      );
      setSimulations(data);
      if (!selectedFolderId && !searchQuery) {
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to list simulations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (!token) {
      setFolders([]);
      return;
    }
    try {
      const { folders: data } = await api.listFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to list folders', err);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [token]);

  useEffect(() => {
    fetchSimulations();
  }, [token, searchQuery, selectedFolderId]);

  const handleCreateFolder = (folder: FolderType) => {
    setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleRenameFolder = async (folder: FolderType) => {
    const name = window.prompt('Rename folder', folder.name);
    if (!name || !name.trim() || name.trim() === folder.name) return;
    try {
      await api.renameFolder(folder.id, name.trim());
      await fetchFolders();
    } catch (err) {
      alert('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folder: FolderType) => {
    if (!window.confirm(`Delete "${folder.name}"? Its simulations will move to Uncategorized.`)) return;
    try {
      await api.deleteFolder(folder.id);
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      await fetchFolders();
      await fetchSimulations();
    } catch (err) {
      alert('Failed to delete folder');
    }
  };

  // Only a concrete folder id can be used as a creation target ('none' means Uncategorized).
  const targetFolderId = selectedFolderId && selectedFolderId !== 'none' ? selectedFolderId : undefined;

  const handleMoveFolder = async (id: string, folderId: string | null) => {
    try {
      await api.moveSimulationToFolder(id, folderId);
      await fetchFolders();
      await fetchSimulations();
    } catch (err) {
      alert('Failed to move simulation');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const { simulation } = await api.duplicateSimulation(id);
      await fetchSimulations();
      onOpenSimulation(simulation.id);
    } catch (err) {
      alert('Failed to duplicate simulation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this simulation?')) return;
    try {
      await api.deleteSimulation(id);
      await fetchSimulations();
    } catch (err) {
      alert('Failed to delete simulation');
    }
  };

  const handleQuickCreateTemplate = async (templateId: string, title: string) => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    try {
      const { simulation } = await api.createSimulation(
        title,
        'Quick start template',
        templateId,
        targetFolderId
      );
      onOpenSimulation(simulation.id);
    } catch (err) {
      alert('Failed to create template simulation');
    }
  };

  const handleQuickStackDemo = async () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    try {
      const gen = simulateValidParentheses('{[()]}');
      const { simulation: newSim } = await api.createSimulation(gen.title, gen.description, undefined, targetFolderId);
      const fullSim = {
        ...newSim,
        name: gen.title,
        description: gen.description,
        steps: gen.steps,
      };
      const { simulation: updated } = await api.updateSimulation(fullSim.id, fullSim);
      setSimulation(updated);
      onOpenSimulation(updated.id);
    } catch (err) {
      alert('Failed to create Stack demo');
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col select-none">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-surface-900/80 backdrop-blur sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-glow-indigo">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
              DSA Animator
            </h1>
            <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
              Visual Dry-Run Animation Creator
            </span>
          </div>
        </div>

        {/* User Profile / Auth Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 text-xs font-bold font-mono">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8">
        {/* Hero Banner / Quick Starters */}
        <div className="p-5 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-surface-900 to-sky-950/40 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>State → Diff → Animation Architecture</span>
              </div>
              <h2 className="text-xl md:text-3xl font-black text-slate-100 mb-2">
                Visual Algorithm Dry-Runs Made Effortless
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Paste any Java / DSA code or build step-by-step states manually. The engine animates
                pointers, variable strike-throughs (<code className="text-sky-300 font-mono">sum = ~~1~~ 2</code>), arrays, and <code className="text-indigo-300 font-mono">Stack push & pop</code> automatically.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Primary Code Import Button */}
              <button
                type="button"
                onClick={() => {
                  if (!user) setIsLoginOpen(true);
                  else setIsCodeImportOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center gap-2"
              >
                <Code2 className="w-4 h-4" />
                <span>⚡ Import Java / DSA Code</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) setIsLoginOpen(true);
                  else setIsCreateOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Custom Blank</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) setIsLoginOpen(true);
                  else setIsImportOpen(true);
                }}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors hidden sm:flex"
                title="Import JSON Export"
              >
                <Upload className="w-4 h-4 text-sky-400" />
              </button>
            </div>
          </div>

          {/* Quick Presets Row */}
          <div className="mt-5 pt-5 border-t border-slate-800/60 flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono text-slate-500 font-semibold uppercase">
              Quick Starters:
            </span>
            <button
              type="button"
              onClick={handleQuickStackDemo}
              className="px-3 py-1.5 rounded-lg bg-surface-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-xs font-mono text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Valid Parentheses (Stack Push & Pop)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickCreateTemplate('two-sum', 'Two Sum Dry Run')}
              className="px-3 py-1.5 rounded-lg bg-surface-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-xs font-mono text-sky-300 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Two Sum (Two Pointers)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickCreateTemplate('binary-search', 'Binary Search Dry Run')}
              className="px-3 py-1.5 rounded-lg bg-surface-950/80 hover:bg-sky-950/50 border border-slate-800 hover:border-sky-500/40 text-xs font-mono text-amber-300 flex items-center gap-1.5 transition-colors hidden sm:flex"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Binary Search (Interval Halving)</span>
            </button>
          </div>
        </div>

        {/* Folders + Simulations Layout */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {user && (
            <FolderSidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              totalCount={totalCount}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={() => setIsCreateFolderOpen(true)}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onDropSimulation={handleMoveFolder}
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Section Header: Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-100">
                  {selectedFolderId === null
                    ? 'My Simulations'
                    : selectedFolderId === 'none'
                    ? 'Uncategorized'
                    : folders.find((f) => f.id === selectedFolderId)?.name || 'My Simulations'}
                </h3>
                <p className="text-xs text-slate-400">
                  {simulations.length} {simulations.length === 1 ? 'simulation' : 'simulations'} saved in persistent database
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search simulations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Simulations List */}
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-full bg-surface-900/40 border border-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : simulations.length === 0 ? (
              <div className="py-12 md:py-16 px-4 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center bg-surface-900/20">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-200 mb-1">
                  {searchQuery ? 'No simulations match your search' : 'No simulations here yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-5">
                  Import a Java DSA algorithm or create your first visual dry run.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) setIsLoginOpen(true);
                      else setIsCodeImportOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center gap-2"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Import Code & Run</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) setIsLoginOpen(true);
                      else setIsCreateOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Custom Blank</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {simulations.map((sim) => (
                  <SimulationCard
                    key={sim.id}
                    simulation={sim}
                    folders={folders}
                    onOpen={onOpenSimulation}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onMoveFolder={handleMoveFolder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <CodeImportModal
        isOpen={isCodeImportOpen}
        onClose={() => setIsCodeImportOpen(false)}
        onSuccess={(id) => onOpenSimulation(id)}
      />

      <CreateSimulationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(id) => onOpenSimulation(id)}
        folderId={targetFolderId}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={handleCreateFolder}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={(id) => onOpenSimulation(id)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />
    </div>
  );
};
