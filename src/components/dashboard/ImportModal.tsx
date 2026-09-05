import React, { useState } from 'react';
import { api } from '../../persistence/api';
import { useSimulationStore } from '../../store/simulationStore';
import { Upload, FileJson, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (simId: string) => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { setSimulation } = useSimulationStore();
  const [jsonText, setJsonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        setError(null);
      } catch (err) {
        setError('Failed to read file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const parsed = JSON.parse(jsonText);
      const { simulation } = await api.importSimulation(parsed);
      setSimulation(simulation);
      onSuccess(simulation.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid simulation JSON. Please verify schema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Import DSA Simulation</h3>
            <p className="text-xs text-slate-400">Upload a saved JSON simulation export</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          {/* File drag / picker */}
          <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-sky-500/5 transition-all">
            <FileJson className="w-8 h-8 text-sky-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300 mb-0.5">
              Click to select simulation JSON file
            </span>
            <span className="text-[11px] text-slate-500">Supports .json simulation exports</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-2">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Or Paste JSON</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <textarea
            rows={4}
            placeholder='{"name": "My Simulation", "schemaVersion": 2, "steps": [...]}'
            value={jsonText}
            onChange={(e) => {
              setError(null);
              setJsonText(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:border-sky-400 outline-none resize-none"
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || !jsonText.trim()}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-glow-cyan transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? 'Importing...' : 'Import Simulation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
