import React, { useState } from 'react';
import { api } from '../../persistence/api';
import { Folder as FolderType } from '../../types/simulation';
import { FolderPlus, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folder: FolderType) => void;
}

const COLOR_OPTIONS = [
  '#6366f1', // indigo
  '#38bdf8', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#a855f7', // violet
];

export const CreateFolderModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { folder } = await api.createFolder(name.trim(), color);
      onSuccess(folder);
      setName('');
      setColor(COLOR_OPTIONS[0]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">New Folder</h3>
            <p className="text-xs text-slate-400">Group related simulations together</p>
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
              Folder Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Arrays, Two Pointers, Graphs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none font-sans"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Color</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface-900 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
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
              <FolderPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
