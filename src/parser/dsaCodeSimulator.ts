import {
  StepModel,
  ArrayElement,
  StackVisualNode,
  StringVisualNode,
  ArrayVisualNode,
  PointerVisualNode,
  VariableVisualNode,
  TextVisualNode,
  VisualNode,
} from '../types/simulation';
import { deepClone } from '../utils/deepClone';

export interface CodeSimulationRequest {
  algorithmType:
    | 'valid-parentheses'
    | 'two-pointers-palindrome'
    | 'two-sum'
    | 'remove-outer-parentheses'
    | 'rpn-stack'
    | 'container-water'
    | 'binary-search'
    | 'custom';
  code: string;
  language: 'java' | 'python' | 'cpp' | 'javascript';
  inputData?: Record<string, any>;
}

export interface GeneratedSimulationResult {
  title: string;
  description: string;
  steps: StepModel[];
}

/**
 * Builds the visual node(s) for one named, typed input value: a nested/2D
 * array becomes one array node per row (stacked vertically and labeled), a
 * flat array becomes a single array node, and any scalar (number/string/
 * boolean) becomes a variable node. Used both by the generic fallback setup
 * and to render "extra" inputs alongside a recognized algorithm's own steps.
 */
function buildInputNodes(
  name: string,
  value: any,
  x: number,
  y: number
): { nodes: VisualNode[]; nextY: number } {
  const cellSize = 56;

  if (Array.isArray(value) && Array.isArray(value[0])) {
    const nodes: VisualNode[] = value.map((row: any[], rowIdx: number) => {
      const elements: ArrayElement[] = row.map((v, i) => ({
        id: `${name}_${rowIdx}_${i}`,
        value: v,
        highlight: 'none',
      }));
      return {
        id: `arr_${name}_${rowIdx}`,
        type: 'array',
        x,
        y: y + rowIdx * (cellSize + 12),
        width: Math.max(cellSize, elements.length * cellSize),
        height: cellSize,
        zIndex: 5,
        style: { backgroundColor: '#007aff', borderColor: 'transparent', borderWidth: 0, borderRadius: 4, color: '#ffffff', fontSize: 20 },
        data: { name: `${name}[${rowIdx}]`, showIndexes: false, orientation: 'horizontal', cellSize, elements },
      } as ArrayVisualNode;
    });
    return { nodes, nextY: y + value.length * (cellSize + 12) + 16 };
  }

  if (Array.isArray(value)) {
    const elements: ArrayElement[] = value.map((v, i) => ({ id: `${name}_${i}`, value: v, highlight: 'none' }));
    const node: ArrayVisualNode = {
      id: `arr_${name}`,
      type: 'array',
      x,
      y,
      width: Math.max(cellSize, elements.length * cellSize),
      height: cellSize,
      zIndex: 5,
      style: { backgroundColor: '#007aff', borderColor: 'transparent', borderWidth: 0, borderRadius: 4, color: '#ffffff', fontSize: 20 },
      data: { name, showIndexes: true, orientation: 'horizontal', cellSize, elements },
    };
    return { nodes: [node], nextY: y + cellSize + 40 };
  }

  const dataType = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
  const node: VariableVisualNode = {
    id: `var_${name}`,
    type: 'variable',
    x,
    y,
    width: 150,
    height: 48,
    zIndex: 8,
    style: { backgroundColor: '#8b5cf6', borderColor: '#000000', borderWidth: 2, borderRadius: 12, color: '#ffffff', fontSize: 15 },
    data: { name, value, dataType, animationStyle: 'strikethrough' },
  };
  return { nodes: [node], nextY: y + 64 };
}

/**
 * Appends any inputData entries a recognized algorithm's generator doesn't
 * itself consume (e.g. an extra array or variable alongside "nums"/"target")
 * onto every step it produced, so nothing declared in the Import modal gets
 * silently dropped just because the pattern-specific generator ignores it.
 */
function injectExtraInputs(
  steps: StepModel[],
  inputData: Record<string, any> | undefined,
  consumedKeys: string[]
): StepModel[] {
  if (!inputData) return steps;
  const extraKeys = Object.keys(inputData).filter((k) => !consumedKeys.includes(k));
  if (extraKeys.length === 0) return steps;

  const extraNodes: VisualNode[] = [];
  let x = 620;
  let y = 130;
  for (const key of extraKeys) {
    const { nodes, nextY } = buildInputNodes(key, inputData[key], x, y);
    extraNodes.push(...nodes);
    y = nextY;
  }

  return steps.map((step) => ({
    ...step,
    objects: [...step.objects, ...extraNodes.map((n) => deepClone(n))],
  }));
}

/**
 * Generic fallback: builds a single "initial setup" step directly from
 * whatever inputs were declared in the Import modal -- any mix of arrays,
 * nested/2D arrays, and plain variables -- for code that doesn't match one
 * of the specific recognized patterns. The user continues building the
 * dry run manually from here with the canvas's own step tools.
 */
export function simulateGenericSetup(inputData: Record<string, any> = {}): GeneratedSimulationResult {
  const entries = Object.entries(inputData);
  const objects: VisualNode[] = [];

  let x = 100;
  let y = 130;
  let col = 0;
  const colWidth = 280;

  for (const [name, value] of entries) {
    const { nodes, nextY } = buildInputNodes(name, value, x, y);
    objects.push(...nodes);
    y = nextY;
    if (y > 480) {
      col++;
      x = 100 + col * colWidth;
      y = 130;
    }
  }

  const note: TextVisualNode = {
    id: 'text_setup_note',
    type: 'text',
    x: 100,
    y: 560,
    width: 500,
    height: 48,
    zIndex: 4,
    style: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 12, color: '#e2e8f0', fontSize: 14 },
    data: {
      text: 'Initial setup built from your declared inputs. Use "+ Next Step" to build out the dry run manually from here.',
      fontSize: 14,
      fontWeight: 'normal',
      isCallout: true,
      badgeText: 'SETUP',
    },
  };
  objects.push(note);

  return {
    title: 'Custom Input Setup',
    description: 'Initial state built from your declared inputs. Continue building steps manually from here.',
    steps: [
      {
        id: 'step_1',
        name: 'Step 1: Initial Setup',
        description: 'Starting state from your declared inputs.',
        durationMs: 800,
        objects,
      },
    ],
  };
}

/**
 * 1. Java Valid Parentheses (Stack Push & Pop)
 */
export function simulateValidParentheses(inputStr: string = '{[()]}'): GeneratedSimulationResult {
  const s = (inputStr.trim() || '{[()]}').replace(/['"]/g, '');
  const steps: StepModel[] = [];

  const strNodeId = 'str_input';
  const stackNodeId = 'stack_main';
  const ptrNodeId = 'ptr_i';
  const charVarId = 'var_char';
  const resultVarId = 'var_result';
  const noteNodeId = 'text_note';

  const cellSize = 56;
  const characters: ArrayElement[] = s.split('').map((ch, idx) => ({
    id: `ch_${idx}`,
    value: ch,
    highlight: 'none',
  }));

  let currentStackElements: ArrayElement[] = [];

  const baseStringNode: StringVisualNode = {
    id: strNodeId,
    type: 'string',
    x: 100,
    y: 130,
    width: s.length * cellSize,
    height: cellSize,
    zIndex: 5,
    style: {
      backgroundColor: '#007aff',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 4,
      color: '#ffffff',
      fontSize: 24,
    },
    data: {
      name: '',
      showIndexes: false,
      cellSize: cellSize,
      characters: characters.map((c) => ({ ...c })),
    },
  };

  const baseStackNode: StackVisualNode = {
    id: stackNodeId,
    type: 'stack',
    x: 520,
    y: 100,
    width: 160,
    height: 220,
    zIndex: 10,
    style: {
      backgroundColor: 'rgba(24, 16, 42, 0.95)',
      borderColor: '#a855f7',
      borderWidth: 2,
      borderRadius: 16,
    },
    data: {
      name: 'Stack',
      capacity: 10,
      elements: [],
      lastAction: 'none',
    },
  };

  const basePointerNode: PointerVisualNode = {
    id: ptrNodeId,
    type: 'pointer',
    x: 100 + (cellSize / 2) - 22,
    y: 130 + cellSize + 4,
    width: 44,
    height: 54,
    zIndex: 15,
    style: { color: '#00e676' },
    data: {
      label: 'i',
      direction: 'up',
      color: '#00e676',
      targetNodeId: strNodeId,
      targetIndex: 0,
    },
  };

  const baseCharVar: VariableVisualNode = {
    id: charVarId,
    type: 'variable',
    x: 100,
    y: 240,
    width: 120,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: 'rgba(8, 47, 73, 0.95)', borderColor: '#0ea5e9', borderWidth: 1.5, borderRadius: 12, color: '#bae6fd', fontSize: 14 },
    data: { name: 'c', value: s[0], dataType: 'string', animationStyle: 'strikethrough' },
  };

  const baseResultVar: VariableVisualNode = {
    id: resultVarId,
    type: 'variable',
    x: 240,
    y: 240,
    width: 150,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: 'rgba(6, 78, 59, 0.95)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 12, color: '#a7f3d0', fontSize: 14 },
    data: { name: 'isValid', value: 'evaluating...', dataType: 'string', animationStyle: 'strikethrough' },
  };

  const baseNote: TextVisualNode = {
    id: noteNodeId,
    type: 'text',
    x: 100,
    y: 310,
    width: 460,
    height: 44,
    zIndex: 4,
    style: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 12, color: '#e2e8f0', fontSize: 14 },
    data: { text: `Start with an empty stack and read first bracket at index 0.`, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'START' },
  };

  // Step 1: Initial State
  steps.push({
    id: 'step_1',
    name: 'Step 1: Initialize Stack & Read First Bracket',
    description: `Start with an empty stack and examine the first bracket.`,
    durationMs: 900,
    objects: [
      deepClone(baseStringNode),
      deepClone(baseStackNode),
      deepClone(basePointerNode),
      deepClone(baseCharVar),
      deepClone(baseResultVar),
      deepClone(baseNote),
    ],
  });

  const matchingPairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  let isValid = true;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const isOpen = ['(', '{', '['].includes(ch);

    let action: 'push' | 'pop' | 'none' = 'none';
    let poppedVal: string | undefined = undefined;
    let quoteSentence = '';
    let badge = 'STEP';

    if (isOpen) {
      action = 'push';
      currentStackElements.push({
        id: `stk_${currentStackElements.length}_${ch}`,
        value: ch,
        highlight: 'pushing',
      });
      quoteSentence = `${ch} is an opening bracket — push it onto the stack.`;
      badge = 'PUSH';
    } else {
      if (currentStackElements.length === 0) {
        isValid = false;
        quoteSentence = `${ch} is a closing bracket, but the stack is empty — invalid!`;
        badge = 'INVALID';
      } else {
        const topEl = currentStackElements.pop()!;
        poppedVal = String(topEl.value);
        const expectedOpen = matchingPairs[ch];
        if (topEl.value !== expectedOpen) {
          isValid = false;
          quoteSentence = `${ch} does not match the top element ${topEl.value} — invalid!`;
          badge = 'MISMATCH';
        } else {
          action = 'pop';
          quoteSentence = `${ch} matches ${expectedOpen} on top of stack — pop it off!`;
          badge = 'POP OFF';
        }
      }
    }

    const currentChars = characters.map((c, idx) => ({
      ...c,
      highlight: idx === i ? 'found' : (idx < i ? 'visited' : 'none'),
    })) as ArrayElement[];

    const stepStringNode: StringVisualNode = {
      ...baseStringNode,
      data: { ...baseStringNode.data, characters: currentChars },
    };

    const stepStackNode: StackVisualNode = {
      ...baseStackNode,
      height: Math.max(220, (currentStackElements.length * 42) + 70),
      data: {
        ...baseStackNode.data,
        elements: deepClone(currentStackElements),
        lastAction: action,
        lastPoppedValue: poppedVal,
      },
    };

    const stepPointerNode: PointerVisualNode = {
      ...basePointerNode,
      data: { ...basePointerNode.data, targetIndex: i },
    };

    const stepCharVar: VariableVisualNode = {
      ...baseCharVar,
      data: { ...baseCharVar.data, value: ch },
    };

    const stepResultVar: VariableVisualNode = {
      ...baseResultVar,
      data: { ...baseResultVar.data, value: isValid ? 'true (so far)' : 'false' },
    };

    const stepNote: TextVisualNode = {
      ...baseNote,
      data: { text: quoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: badge },
    };

    steps.push({
      id: `step_${i + 2}`,
      name: `Step ${i + 2}: ${badge} ${ch}`,
      description: quoteSentence,
      durationMs: 900,
      objects: [
        stepStringNode,
        stepStackNode,
        stepPointerNode,
        stepCharVar,
        stepResultVar,
        stepNote,
      ],
    });

    if (!isValid) break;
  }

  const finalResult = isValid && currentStackElements.length === 0;
  const finalQuoteSentence = finalResult
    ? 'All brackets matched successfully and the stack is clean. Valid parentheses!'
    : 'Unmatched brackets remain or mismatch occurred. The string is not valid.';

  steps.push({
    id: `step_${steps.length + 1}`,
    name: `Step ${steps.length + 1}: Final Result = ${finalResult ? 'true ✓' : 'false ✗'}`,
    description: finalQuoteSentence,
    durationMs: 1000,
    objects: [
      { ...baseStringNode, data: { ...baseStringNode.data, characters: characters.map((c) => ({ ...c, highlight: 'found' })) } },
      { ...baseStackNode, data: { ...baseStackNode.data, elements: deepClone(currentStackElements), lastAction: 'none' } },
      { ...basePointerNode, data: { ...basePointerNode.data, targetIndex: s.length - 1 } },
      { ...baseCharVar, data: { ...baseCharVar.data, value: 'done' } },
      {
        ...baseResultVar,
        style: { ...baseResultVar.style, backgroundColor: finalResult ? '#064e3b' : '#4c0519', borderColor: finalResult ? '#10b981' : '#f43f5e' },
        data: { ...baseResultVar.data, value: finalResult ? 'true ✓' : 'false ✗' },
      },
      {
        ...baseNote,
        data: { text: finalQuoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'RESULT' },
      },
    ],
  });

  return {
    title: `Valid Parentheses Dry Run (${s})`,
    description: `Visual stack execution of Java Valid Parentheses algorithm on input ${s}.`,
    steps,
  };
}

/**
 * 2. Java Two Pointers: Solid Blue & Green Block Theme (Matching reference image!)
 */
export function simulateTwoPointersPalindrome(inputStr: string = '1, 3, 5, 7, 9, 11'): GeneratedSimulationResult {
  const cleanTokens = inputStr.includes(',')
    ? inputStr.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
    : (inputStr.trim() || '1 3 5 7 9 11').split(/[\s,]+/);

  const tokens = cleanTokens.length > 0 ? cleanTokens : ['1', '3', '5', '7', '9', '11'];
  const steps: StepModel[] = [];
  const arrNodeId = 'arr_strip';

  let left = 0;
  let right = tokens.length - 1;
  const cellSize = 56;

  const elements: ArrayElement[] = tokens.map((val, idx) => {
    const num = Number(val);
    return {
      id: `c_${idx}`,
      value: !isNaN(num) ? num : val,
      highlight: (idx === left || idx === right) ? 'found' : 'none',
    };
  });

  const baseArray: ArrayVisualNode = {
    id: arrNodeId,
    type: 'array',
    x: 100,
    y: 130,
    width: tokens.length * cellSize,
    height: cellSize,
    zIndex: 5,
    style: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 4,
      color: '#ffffff',
      fontSize: 24,
    },
    data: {
      name: '',
      showIndexes: false,
      orientation: 'horizontal',
      cellSize: cellSize,
      elements: elements.map((e) => ({ ...e })),
    },
  };

  const basePtrLeft: PointerVisualNode = {
    id: 'ptr_left',
    type: 'pointer',
    x: 100 + (left * cellSize) + (cellSize / 2) - 22,
    y: 130 + cellSize + 4,
    width: 44,
    height: 54,
    zIndex: 15,
    style: { color: '#00e676' },
    data: { label: 'left', direction: 'up', color: '#00e676', targetNodeId: arrNodeId, targetIndex: left },
  };

  const basePtrRight: PointerVisualNode = {
    id: 'ptr_right',
    type: 'pointer',
    x: 100 + (right * cellSize) + (cellSize / 2) - 22,
    y: 130 + cellSize + 4,
    width: 44,
    height: 54,
    zIndex: 15,
    style: { color: '#00e676' },
    data: { label: 'right', direction: 'up', color: '#00e676', targetNodeId: arrNodeId, targetIndex: right },
  };

  const baseVarLeft: VariableVisualNode = {
    id: 'var_left',
    type: 'variable',
    x: 100,
    y: 250,
    width: 130,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: 'rgba(8, 47, 73, 0.95)', borderColor: '#0ea5e9', borderWidth: 1.5, borderRadius: 12, color: '#bae6fd', fontSize: 14 },
    data: { name: 'left', value: tokens[0], dataType: 'string', animationStyle: 'strikethrough' },
  };

  const baseVarRight: VariableVisualNode = {
    id: 'var_right',
    type: 'variable',
    x: 250,
    y: 250,
    width: 130,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: 'rgba(8, 47, 73, 0.95)', borderColor: '#0ea5e9', borderWidth: 1.5, borderRadius: 12, color: '#bae6fd', fontSize: 14 },
    data: { name: 'right', value: tokens[tokens.length - 1], dataType: 'string', animationStyle: 'strikethrough' },
  };

  const baseNote: TextVisualNode = {
    id: 'note_two_pointers',
    type: 'text',
    x: 100,
    y: 320,
    width: 460,
    height: 44,
    zIndex: 4,
    style: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 12, color: '#e2e8f0', fontSize: 14 },
    data: { text: `Place left at index 0 and right at index ${tokens.length - 1}.`, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'START' },
  };

  // Step 1
  steps.push({
    id: 'step_1',
    name: 'Step 1: Initialize Left & Right Pointers',
    description: `left at index 0 (${tokens[0]}), right at index ${tokens.length - 1} (${tokens[tokens.length - 1]}).`,
    durationMs: 900,
    objects: [
      deepClone(baseArray),
      deepClone(basePtrLeft),
      deepClone(basePtrRight),
      deepClone(baseVarLeft),
      deepClone(baseVarRight),
      deepClone(baseNote),
    ],
  });

  let stepIdx = 2;
  while (left < right) {
    const leftVal = tokens[left];
    const rightVal = tokens[right];
    const match = leftVal === rightVal;

    const currentEls = elements.map((e, i) => ({
      ...e,
      highlight: (i === left || i === right) ? 'found' : 'none',
    })) as ArrayElement[];

    const quoteSentence = `Comparing index ${left} (${leftVal}) and index ${right} (${rightVal}) — moving inward.`;

    steps.push({
      id: `step_${stepIdx}`,
      name: `Step ${stepIdx}: Compare index ${left} & ${right}`,
      description: quoteSentence,
      durationMs: 900,
      objects: [
        { ...baseArray, data: { ...baseArray.data, elements: currentEls } },
        { ...basePtrLeft, data: { ...basePtrLeft.data, targetIndex: left } },
        { ...basePtrRight, data: { ...basePtrRight.data, targetIndex: right } },
        { ...baseVarLeft, data: { ...baseVarLeft.data, value: leftVal } },
        { ...baseVarRight, data: { ...baseVarRight.data, value: rightVal } },
        {
          ...baseNote,
          data: { text: quoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'COMPARE' },
        },
      ],
    });

    left++;
    right--;
    stepIdx++;
  }

  // Final Step
  steps.push({
    id: `step_${steps.length + 1}`,
    name: `Step ${steps.length + 1}: Pointers Met`,
    description: `Two pointers traversed and met.`,
    durationMs: 1000,
    objects: [
      { ...baseArray, data: { ...baseArray.data, elements: elements.map((e) => ({ ...e, highlight: 'found' })) } },
      { ...basePtrLeft, data: { ...basePtrLeft.data, targetIndex: Math.min(left, tokens.length - 1) } },
      { ...basePtrRight, data: { ...basePtrRight.data, targetIndex: Math.max(0, right) } },
      { ...baseVarLeft, data: { ...baseVarLeft.data, value: 'done' } },
      { ...baseVarRight, data: { ...baseVarRight.data, value: 'done' } },
      {
        ...baseNote,
        data: { text: `Traversal complete! All elements processed.`, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'DONE' },
      },
    ],
  });

  return {
    title: `Two Pointers Dry Run ([${tokens.join(', ')}])`,
    description: `Two pointers moving inward over array strip.`,
    steps,
  };
}

/**
 * 3. Java Two Sum (Block Theme)
 */
export function simulateTwoSum(nums: number[] = [2, 7, 11, 15], target: number = 9): GeneratedSimulationResult {
  const steps: StepModel[] = [];
  const arrNodeId = 'arr_nums';
  const cellSize = 56;

  let foundLeft = -1;
  let foundRight = -1;

  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const sum = nums[i] + nums[j];
      const isMatch = sum === target;

      const elements: ArrayElement[] = nums.map((v, idx) => ({
        id: `c_${idx}`,
        value: v,
        highlight: idx === i || idx === j ? 'found' : 'none',
      }));

      const stepNum = steps.length + 1;
      const quoteSentence = isMatch
        ? `nums[${i}] (${nums[i]}) + nums[${j}] (${nums[j]}) = ${sum} equals target ${target} — match found!`
        : `Checking ${nums[i]} + ${nums[j]} = ${sum} (target is ${target}).`;

      steps.push({
        id: `step_${stepNum}`,
        name: `Step ${stepNum}: Check pair (${nums[i]}, ${nums[j]})`,
        description: quoteSentence,
        durationMs: 900,
        objects: [
          {
            id: arrNodeId,
            type: 'array',
            x: 100,
            y: 130,
            width: nums.length * cellSize,
            height: cellSize,
            zIndex: 5,
            style: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 4, color: '#ffffff', fontSize: 24 },
            data: { name: '', showIndexes: false, orientation: 'horizontal', cellSize: cellSize, elements },
          },
          {
            id: 'ptr_i',
            type: 'pointer',
            x: 100 + (i * cellSize) + (cellSize / 2) - 22,
            y: 130 + cellSize + 4,
            width: 44,
            height: 54,
            zIndex: 15,
            style: { color: '#00e676' },
            data: { label: 'i', direction: 'up', color: '#00e676', targetNodeId: arrNodeId, targetIndex: i },
          },
          {
            id: 'ptr_j',
            type: 'pointer',
            x: 100 + (j * cellSize) + (cellSize / 2) - 22,
            y: 130 + cellSize + 4,
            width: 44,
            height: 54,
            zIndex: 15,
            style: { color: '#00e676' },
            data: { label: 'j', direction: 'up', color: '#00e676', targetNodeId: arrNodeId, targetIndex: j },
          },
          {
            id: 'var_target',
            type: 'variable',
            x: 100,
            y: 250,
            width: 120,
            height: 44,
            zIndex: 8,
            style: { backgroundColor: 'rgba(8, 47, 73, 0.95)', borderColor: '#0ea5e9', borderWidth: 1.5, borderRadius: 12, color: '#bae6fd', fontSize: 14 },
            data: { name: 'target', value: target, dataType: 'number', animationStyle: 'strikethrough' },
          },
          {
            id: 'var_sum',
            type: 'variable',
            x: 240,
            y: 250,
            width: 140,
            height: 44,
            zIndex: 8,
            style: {
              backgroundColor: isMatch ? 'rgba(6, 78, 59, 0.95)' : 'rgba(8, 47, 73, 0.95)',
              borderColor: isMatch ? '#10b981' : '#f59e0b',
              borderWidth: 1.5,
              borderRadius: 12,
              color: isMatch ? '#a7f3d0' : '#fde68a',
              fontSize: 14,
            },
            data: { name: 'sum', value: sum, dataType: 'number', animationStyle: 'strikethrough' },
          },
          {
            id: 'text_note',
            type: 'text',
            x: 100,
            y: 320,
            width: 460,
            height: 44,
            zIndex: 4,
            style: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 12, color: '#e2e8f0', fontSize: 14 },
            data: { text: quoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: isMatch ? 'MATCH' : 'COMPARE' },
          },
        ],
      });

      if (isMatch) {
        foundLeft = i;
        foundRight = j;
        break;
      }
    }
    if (foundLeft !== -1) break;
  }

  return {
    title: `Two Sum Dry Run ([${nums.join(', ')}], target=${target})`,
    description: `Generated step-by-step pair search for Two Sum algorithm.`,
    steps,
  };
}

/**
 * 4. Java Remove Outer Parentheses (Counter-based String Building)
 */
export function simulateRemoveOuterParentheses(inputStr: string = '(()())(())'): GeneratedSimulationResult {
  const s = ((inputStr.trim() || '(()())(())').match(/[()]/g) || []).join('');
  const steps: StepModel[] = [];

  const strNodeId = 'str_input';
  const ptrNodeId = 'ptr_i';
  const countVarId = 'var_count';
  const ansVarId = 'var_ans';
  const noteNodeId = 'text_note';

  const cellSize = 56;
  const characters: ArrayElement[] = s.split('').map((ch, idx) => ({
    id: `ch_${idx}`,
    value: ch,
    highlight: 'none',
  }));

  const baseStringNode: StringVisualNode = {
    id: strNodeId,
    type: 'string',
    x: 100,
    y: 130,
    width: s.length * cellSize,
    height: cellSize,
    zIndex: 5,
    style: {
      backgroundColor: '#007aff',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 4,
      color: '#ffffff',
      fontSize: 24,
    },
    data: {
      name: '',
      showIndexes: true,
      cellSize: cellSize,
      characters: characters.map((c) => ({ ...c })),
    },
  };

  const basePointerNode: PointerVisualNode = {
    id: ptrNodeId,
    type: 'pointer',
    x: 100 + (cellSize / 2) - 22,
    y: 130 + cellSize + 12,
    width: 44,
    height: 54,
    zIndex: 15,
    style: { color: '#00e676' },
    data: {
      label: 'i',
      direction: 'up',
      color: '#00e676',
      targetNodeId: strNodeId,
      targetIndex: 0,
    },
  };

  const baseCountVar: VariableVisualNode = {
    id: countVarId,
    type: 'variable',
    x: 100,
    y: 250,
    width: 130,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: '#007aff', borderColor: '#000000', borderWidth: 2, borderRadius: 12, color: '#ffffff', fontSize: 14 },
    data: { name: 'count', value: 0, dataType: 'number', animationStyle: 'strikethrough' },
  };

  const baseAnsVar: VariableVisualNode = {
    id: ansVarId,
    type: 'variable',
    x: 250,
    y: 250,
    width: 200,
    height: 44,
    zIndex: 8,
    style: { backgroundColor: '#00c853', borderColor: '#000000', borderWidth: 2, borderRadius: 12, color: '#ffffff', fontSize: 14 },
    data: { name: 'ans', value: '""', dataType: 'string', animationStyle: 'strikethrough' },
  };

  const baseNote: TextVisualNode = {
    id: noteNodeId,
    type: 'text',
    x: 100,
    y: 310,
    width: 500,
    height: 44,
    zIndex: 4,
    style: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 12, color: '#e2e8f0', fontSize: 14 },
    data: { text: `Start with count = 0 and an empty result string.`, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'START' },
  };

  // Step 1: Initial State
  steps.push({
    id: 'step_1',
    name: 'Step 1: Initialize Count & Result',
    description: `Start with count = 0 and read the first character.`,
    durationMs: 900,
    objects: [
      deepClone(baseStringNode),
      deepClone(basePointerNode),
      deepClone(baseCountVar),
      deepClone(baseAnsVar),
      deepClone(baseNote),
    ],
  });

  let count = 0;
  let ans = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let appended = false;
    let quoteSentence = '';
    let badge = 'STEP';

    if (ch === '(') {
      appended = count > 0;
      if (appended) ans += ch;
      quoteSentence = appended
        ? `'(' at index ${i}: count is ${count} (> 0), so it's an inner bracket — keep it and append to result.`
        : `'(' at index ${i}: count is 0, so this is an OUTER opening bracket — skip it.`;
      count++;
    } else {
      count--;
      appended = count > 0;
      if (appended) ans += ch;
      quoteSentence = appended
        ? `')' at index ${i}: count is now ${count} (> 0), so it's an inner bracket — keep it and append to result.`
        : `')' at index ${i}: count is now 0, so this is an OUTER closing bracket — skip it.`;
    }
    badge = appended ? 'KEEP' : 'SKIP';

    const currentChars = characters.map((c, idx) => ({
      ...c,
      highlight: idx === i ? (appended ? 'found' : 'dimmed') : (idx < i ? 'visited' : 'none'),
    })) as ArrayElement[];

    steps.push({
      id: `step_${i + 2}`,
      name: `Step ${i + 2}: ${badge} '${ch}' at index ${i}`,
      description: quoteSentence,
      durationMs: 900,
      objects: [
        { ...baseStringNode, data: { ...baseStringNode.data, characters: currentChars } },
        { ...basePointerNode, data: { ...basePointerNode.data, targetIndex: i } },
        { ...baseCountVar, data: { ...baseCountVar.data, value: count } },
        { ...baseAnsVar, data: { ...baseAnsVar.data, value: ans.length > 0 ? ans : '""' } },
        { ...baseNote, data: { text: quoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: badge } },
      ],
    });
  }

  const finalQuoteSentence = `Every outer bracket has been skipped. Final result: "${ans}"`;

  steps.push({
    id: `step_${steps.length + 1}`,
    name: `Step ${steps.length + 1}: Final Result = "${ans}"`,
    description: finalQuoteSentence,
    durationMs: 1000,
    objects: [
      { ...baseStringNode, data: { ...baseStringNode.data, characters: characters.map((c) => ({ ...c, highlight: 'visited' })) } },
      { ...basePointerNode, data: { ...basePointerNode.data, targetIndex: Math.max(0, s.length - 1) } },
      { ...baseCountVar, data: { ...baseCountVar.data, value: count } },
      {
        ...baseAnsVar,
        style: { ...baseAnsVar.style, backgroundColor: '#10b981' },
        data: { ...baseAnsVar.data, value: `"${ans}"` },
      },
      { ...baseNote, data: { text: finalQuoteSentence, fontSize: 14, fontWeight: 'normal', isCallout: true, badgeText: 'RESULT' } },
    ],
  });

  return {
    title: `Remove Outer Parentheses Dry Run (${s})`,
    description: `Visual counter-based execution of removeOuterParentheses on input "${s}".`,
    steps,
  };
}

/**
 * Universal Code Simulator Router
 */
export function generateSimulationFromCode(req: CodeSimulationRequest): GeneratedSimulationResult {
  const codeLower = req.code.toLowerCase();

  // If two pointers / palindrome
  if (
    req.algorithmType === 'two-pointers-palindrome' ||
    codeLower.includes('palindrome') ||
    (codeLower.includes('left') && codeLower.includes('right') && !codeLower.includes('stack'))
  ) {
    const s = req.inputData?.s || '1, 3, 5, 7, 9, 11';
    const result = simulateTwoPointersPalindrome(s);
    return { ...result, steps: injectExtraInputs(result.steps, req.inputData, ['s']) };
  }

  // If removing outer parentheses (counter-based, no stack)
  if (
    req.algorithmType === 'remove-outer-parentheses' ||
    codeLower.includes('removeouterparenthes') ||
    codeLower.includes('remove outer parenthes')
  ) {
    const s = req.inputData?.s || '(()())(())';
    const result = simulateRemoveOuterParentheses(s);
    return { ...result, steps: injectExtraInputs(result.steps, req.inputData, ['s']) };
  }

  // If Stack algorithm
  if (
    req.algorithmType === 'valid-parentheses' ||
    req.algorithmType === 'rpn-stack' ||
    codeLower.includes('stack') ||
    codeLower.includes('isvalid') ||
    codeLower.includes('parenthes')
  ) {
    const s = req.inputData?.s || '{[()]}';
    const result = simulateValidParentheses(s);
    return { ...result, steps: injectExtraInputs(result.steps, req.inputData, ['s']) };
  }

  // If Two Sum
  if (
    req.algorithmType === 'two-sum' ||
    codeLower.includes('twosum') ||
    codeLower.includes('two sum')
  ) {
    const nums = req.inputData?.nums || [2, 7, 11, 15];
    const target = req.inputData?.target || 9;
    const result = simulateTwoSum(nums, target);
    return { ...result, steps: injectExtraInputs(result.steps, req.inputData, ['nums', 'target']) };
  }

  // No recognized pattern: build a generic setup directly from whatever
  // inputs were declared (arrays, nested arrays, variables) instead of
  // guessing a default algorithm that may not match the input shape at all.
  return simulateGenericSetup(req.inputData);
}
