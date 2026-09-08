import React, { useState } from 'react';
import { api } from '../../persistence/api';
import { useSimulationStore } from '../../store/simulationStore';
import { Sparkles, Plus, X, Layers, Code, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (simId: string) => void;
  folderId?: string | null;
}

export const CreateSimulationModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, folderId }) => {
  const { setSimulation } = useSimulationStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const templates = [
    {
      id: '',
      title: 'Blank Canvas',
      desc: 'Start with a clean Step 1. Add your own Arrays, Strings, Variables and Pointers.',
      icon: Plus,
      badge: 'CUSTOM',
      color: 'border-slate-700 bg-surface-950/60',
    },
    {
      id: 'two-sum',
      title: 'Two Sum (Two Pointers)',
      desc: 'Array [2, 7, 11, 15], target = 9, pointers i and j, sum = ~~2~~ 9/13 variable transitions.',
      icon: Sparkles,
      badge: 'POPULAR',
      color: 'border-indigo-500/40 bg-indigo-950/20',
    },
    {
      id: 'binary-search',
      title: 'Binary Search',
      desc: 'Sorted array with low, mid, and high pointers actively halving the search space.',
      icon: Zap,
      badge: 'ALGO',
      color: 'border-sky-500/40 bg-sky-950/20',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { simulation } = await api.createSimulation(
        name.trim(),
        description.trim(),
        selectedTemplate || undefined,
        folderId || undefined
      );
      setSimulation(simulation);
      onSuccess(simulation.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create simulation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Create New DSA Simulation</h3>
            <p className="text-xs text-slate-400">Define visual states and generate dry-run animations</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Simulation Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Two Sum, Reverse Linked List, Kadane's Algorithm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none font-sans"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="Brief explanation of the algorithm dry-run"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none font-sans"
            />
          </div>

          {/* Starter Template Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Choose Starter Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-950/40 shadow-glow-indigo'
                        : `${tpl.color} hover:border-slate-600`
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`} />
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800/80 text-slate-400">
                          {tpl.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1">{tpl.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {tpl.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Simulation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
