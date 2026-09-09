import React, { useState } from 'react';
import { api } from '../../persistence/api';
import { useSimulationStore } from '../../store/simulationStore';
import { generateSimulationFromCode } from '../../parser/dsaCodeSimulator';
import { Code2, Sparkles, X, FileCode, Layers, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (simId: string) => void;
}

type InputFieldType = 'array' | 'array2d' | 'number' | 'string' | 'boolean';

interface InputField {
  id: string;
  name: string;
  type: InputFieldType;
  value: string;
}

let inputFieldCounter = 0;
const nextInputFieldId = () => `input_${Date.now()}_${inputFieldCounter++}`;

function makeInputField(name: string, type: InputFieldType, value: string): InputField {
  return { id: nextInputFieldId(), name, type, value };
}

/** Turns one raw text field into the actual JS value its declared type implies. */
function parseInputFieldValue(field: InputField): any {
  const raw = field.value.trim();
  switch (field.type) {
    case 'array':
      return raw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => {
          const n = Number(t);
          return !isNaN(n) && t !== '' ? n : t.replace(/^['"]|['"]$/g, '');
        });
    case 'array2d': {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through to the row-based fallback below
      }
      return raw
        .split(';')
        .map((row) => row.trim())
        .filter((row) => row.length > 0)
        .map((row) =>
          row.split(',').map((t) => {
            const trimmed = t.trim();
            const n = Number(trimmed);
            return !isNaN(n) && trimmed !== '' ? n : trimmed;
          })
        );
    }
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? 0 : n;
    }
    case 'boolean':
      return raw.toLowerCase() === 'true';
    case 'string':
    default:
      return raw;
  }
}

export const CodeImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { setSimulation } = useSimulationStore();
  const [selectedAlgo, setSelectedAlgo] = useState<'valid-parentheses' | 'two-pointers-palindrome' | 'two-sum' | 'remove-outer-parentheses' | 'custom'>('valid-parentheses');
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

  const [inputs, setInputs] = useState<InputField[]>([makeInputField('s', 'string', '{[()]}')]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateInput = (id: string, patch: Partial<InputField>) => {
    setInputs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addInput = () => {
    setInputs((prev) => [...prev, makeInputField(`value${prev.length + 1}`, 'number', '0')]);
  };

  const removeInput = (id: string) => {
    setInputs((prev) => prev.filter((f) => f.id !== id));
  };

  if (!isOpen) return null;

  const handleSelectPreset = (algo: 'valid-parentheses' | 'two-pointers-palindrome' | 'two-sum' | 'remove-outer-parentheses' | 'custom') => {
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
      setInputs([makeInputField('s', 'string', '{[()]}')]);
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
      setInputs([makeInputField('s', 'string', 'radar')]);
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
      setInputs([
        makeInputField('nums', 'array', '2, 7, 11, 15'),
        makeInputField('target', 'number', '9'),
      ]);
    } else if (algo === 'remove-outer-parentheses') {
      setCode(
`// Java Remove Outer Parentheses (Counter-based)
class Solution {
    public String removeOuterParentheses(String s) {
        StringBuilder ans = new StringBuilder();
        int count = 0;

        for (char x : s.toCharArray()) {
            if (x == '(') {
                if (count > 0) {
                    ans.append(x);
                }
                count++;
            } else if (x == ')') {
                if (count > 1) {
                    ans.append(x);
                }
                count--;
            }
        }

        return ans.toString();
    }
}`
      );
      setInputs([makeInputField('s', 'string', '(()())(())')]);
    } else if (algo === 'custom') {
      setInputs([makeInputField('nums', 'array', '1, 2, 3')]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Every named input becomes one entry in the inputData bag, parsed
      // according to its declared type (array, 2D array, number, string,
      // boolean). Known presets read out the key(s) they expect (e.g. "s",
      // or "nums" + "target"); anything else present rides along as an
      // extra node in the generated Step 1, and fully custom code that
      // doesn't match a known pattern gets a generic setup built from
      // whatever inputs were declared here -- arrays, nested arrays, and
      // plain variables together.
      const inputData: Record<string, any> = {};
      for (const field of inputs) {
        const name = field.name.trim();
        if (!name) continue;
        inputData[name] = parseInputFieldValue(field);
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
        sourceAlgorithmType: selectedAlgo,
        sourceCode: code,
        sourceLanguage: language,
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
            onClick={() => handleSelectPreset('remove-outer-parentheses')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
              selectedAlgo === 'remove-outer-parentheses'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Remove Outer Parentheses</span>
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

          {/* Inputs Builder: any mix of arrays, nested arrays, and variables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Inputs</label>
              <button
                type="button"
                onClick={addInput}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Input
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {inputs.map((field) => (
                <div key={field.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateInput(field.id, { name: e.target.value })}
                    placeholder="name"
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateInput(field.id, { type: e.target.value as InputFieldType })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1.5 text-[11px] font-mono text-slate-300 outline-none focus:border-indigo-500"
                  >
                    <option value="array">Array</option>
                    <option value="array2d">2D Array</option>
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  {field.type === 'boolean' ? (
                    <select
                      value={field.value}
                      onChange={(e) => updateInput(field.id, { value: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateInput(field.id, { value: e.target.value })}
                      placeholder={
                        field.type === 'array'
                          ? 'e.g. 2, 7, 11, 15'
                          : field.type === 'array2d'
                          ? 'e.g. [[1,2],[3,4]] or 1,2;3,4'
                          : field.type === 'number'
                          ? 'e.g. 9'
                          : 'e.g. hello'
                      }
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeInput(field.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"
                    title="Remove input"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {inputs.length === 0 && (
                <p className="text-[11px] text-slate-500 italic py-1">
                  No inputs declared -- click "Add Input" for arrays, 2D/nested arrays, or plain variables.
                </p>
              )}
            </div>
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
