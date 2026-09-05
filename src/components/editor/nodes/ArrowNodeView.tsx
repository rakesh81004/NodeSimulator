import React from 'react';
import { ArrowVisualNode } from '../../../types/simulation';

interface Props {
  node: ArrowVisualNode;
  isSelected: boolean;
  isInteractive?: boolean;
}

export const ArrowNodeView: React.FC<Props> = ({ node, isSelected }) => {
  const { color = '#38bdf8', label = '', curved = false } = node.data;
  const w = Math.max(node.width || 120, 40);
  const h = Math.max(node.height || 40, 20);

  const startX = 10;
  const startY = h / 2;
  const endX = w - 10;
  const endY = h / 2;

  const pathD = curved
    ? `M ${startX} ${startY} Q ${w / 2} ${startY - 25} ${endX} ${endY}`
    : `M ${startX} ${startY} L ${endX} ${endY}`;

  return (
    <div
      className={`relative select-none pointer-events-auto ${
        isSelected ? 'ring-2 ring-indigo-500 rounded' : ''
      }`}
      style={{ width: `${w}px`, height: `${h}px` }}
    >
      <svg className="w-full h-full overflow-visible">
        <defs>
          <marker
            id={`arrowhead-${node.id}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill={color} />
          </marker>
        </defs>

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          markerEnd={`url(#arrowhead-${node.id})`}
          strokeDasharray={isSelected ? '4 2' : 'none'}
        />

        {label && (
          <text
            x={w / 2}
            y={curved ? startY - 15 : startY - 8}
            textAnchor="middle"
            fill={color}
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
};
