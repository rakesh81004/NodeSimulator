import React, { useState } from 'react';
import { api } from '../../persistence/api';
import { useSimulationStore } from '../../store/simulationStore';
import { generateSimulationFromCode } from '../../parser/dsaCodeSimulator';
import { Code2, Sparkles, X, FileCode, Layers, ArrowLeftRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (simId: string) => void;
}

export const CodeImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { setSimulation } = useSimulationStore();
  const [selectedAlgo, setSelectedAlgo] = useState<'valid-parentheses' | 'two-pointers-palindrome' | 'two-sum' | 'custom'>('valid-parentheses');
  const [language, setLanguage] = useState<'java' | 'python' | 'cpp'>('java');
  const [code, setCode] = useState(
`// Java Solution for Valid Parentheses (Using Stack)
class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c); // Push into stack
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop(); // Pop off top element
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`
  );

  const [inputDataStr, setInputDataStr] = useState('{[()]}');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (algo: 'valid-parentheses' | 'two-pointers-palindrome' | 'two-sum' | 'custom') => {
    setSelectedAlgo(algo);
    setError(null);

    if (algo === 'valid-parentheses') {
      setCode(
`// Java Solution for Valid Parentheses (Using Stack)
class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c); // Push into stack
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop(); // Pop off top element
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`
      );
      setInputDataStr('{[()]}');
    } else if (algo === 'two-pointers-palindrome') {
      setCode(
`// Java Two Pointers: Valid Palindrome (left & right)
class Solution {
    public boolean isPalindrome(String s) {
        int left = 0;
        int right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}`
      );
      setInputDataStr('radar');
    } else if (algo === 'two-sum') {
      setCode(
`// Java Two Sum Algorithm
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[] {};
    }
}`
      );
      setInputDataStr('2, 7, 11, 15');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let inputData: Record<string, any> = {};
      if (selectedAlgo === 'valid-parentheses') {
        inputData = { s: inputDataStr.trim() || '{[()]}' };
      } else if (selectedAlgo === 'two-pointers-palindrome') {
        inputData = { s: inputDataStr.trim() || 'radar' };
      } else if (selectedAlgo === 'two-sum') {
        const nums = inputDataStr
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => !isNaN(n));
        inputData = { nums: nums.length > 0 ? nums : [2, 7, 11, 15], target: 9 };
      }

      const generated = generateSimulationFromCode({
        algorithmType: selectedAlgo as any,
        code,
        language,
        inputData,
      });

      // Save as new simulation on backend
      const res = await api.createSimulation(
        generated.title,
        generated.description
      );

      const fullSimulation = {
        ...res.simulation,
        name: generated.title,
        description: generated.description,
        steps: generated.steps,
      };

      const { simulation: updated } = await api.updateSimulation(
        fullSimulation.id,
        fullSimulation
      );

      setSimulation(updated);
      onSuccess(updated.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to simulate code');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-surface-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-5 md:p-6 shadow-2xl relative my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-glow-indigo">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Import Java / DSA Code</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Stack & Two Pointers
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Paste DSA code. The engine generates step-by-step visual animation states automatically.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Algorithm Preset Tabs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => handleSelectPreset('valid-parentheses')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
              selectedAlgo === 'valid-parentheses'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stack Push & Pop</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('two-pointers-palindrome')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
              selectedAlgo === 'two-pointers-palindrome'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Two Pointers (Left & Right)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('two-sum')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
              selectedAlgo === 'two-sum'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Two Sum (Array)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
              selectedAlgo === 'custom'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Custom Code</span>
          </button>
        </div>

        {/* Code Editor Box */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 rounded-t-xl border-t border-x border-slate-800 text-[11px] font-mono text-slate-400">
              <span>Java DSA Code</span>
              <span className="text-indigo-400">Auto Simulator</span>
            </div>
            <textarea
              rows={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-b-xl p-3.5 text-xs font-mono text-indigo-100 outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* Test Input Data Field */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              {selectedAlgo === 'valid-parentheses'
                ? 'Input String s (Brackets to test):'
                : (selectedAlgo === 'two-pointers-palindrome' ? 'Input String s (e.g. radar or racecar):' : 'Input Array Values:')}
            </label>
            <input
              type="text"
              value={inputDataStr}
              onChange={(e) => setInputDataStr(e.target.value)}
              placeholder={
                selectedAlgo === 'valid-parentheses'
                  ? 'e.g. {[()]} or ()[]{}'
                  : (selectedAlgo === 'two-pointers-palindrome' ? 'e.g. radar, racecar, hello' : 'e.g. 2, 7, 11, 15')
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isGenerating || !code.trim()}
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-semibold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating Simulation...' : '⚡ Generate Visual Dry Run'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
