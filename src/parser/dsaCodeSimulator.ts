import {
  StepModel,
  ArrayElement,
  StackVisualNode,
  StringVisualNode,
  ArrayVisualNode,
  PointerVisualNode,
  VariableVisualNode,
  TextVisualNode,
} from '../types/simulation';
import { deepClone } from '../utils/deepClone';

export interface CodeSimulationRequest {
  algorithmType:
    | 'valid-parentheses'
    | 'two-pointers-palindrome'
    | 'two-sum'
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
    return simulateTwoPointersPalindrome(s);
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
    return simulateValidParentheses(s);
  }

  // If Two Sum
  if (
    req.algorithmType === 'two-sum' ||
    codeLower.includes('twosum') ||
    codeLower.includes('two sum')
  ) {
    const nums = req.inputData?.nums || [2, 7, 11, 15];
    const target = req.inputData?.target || 9;
    return simulateTwoSum(nums, target);
  }

  // Default: Solid Block Two Pointers
  return simulateTwoPointersPalindrome(req.inputData?.s || '1, 3, 5, 7, 9, 11');
}
