import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface FlowTask {
  id: string;
  title: string;
  category: string;
  dependsOn: string[];
}

interface Props {
  tasks: FlowTask[];
  onNodeClick?: (id: string) => void;
  selectedId?: string | null;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const X_GAP = 80;
const Y_GAP = 28;

function computeLayers(tasks: FlowTask[]): Map<string, number> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map<string, number>();

  const visit = (id: string, stack: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    const task = byId.get(id);
    if (!task || task.dependsOn.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    if (stack.has(id)) return 0;
    stack.add(id);
    const d =
      1 +
      Math.max(
        ...task.dependsOn.map((dep) => (byId.has(dep) ? visit(dep, stack) : -1))
      );
    stack.delete(id);
    depth.set(id, Math.max(0, d));
    return depth.get(id)!;
  };

  for (const t of tasks) visit(t.id, new Set());
  return depth;
}

export default function CorridorFlowchart({ tasks, onNodeClick, selectedId }: Props) {
  const { nodes, edges } = useMemo(() => {
    const layers = computeLayers(tasks);
    const perLayerCount = new Map<number, number>();

    const nodes: Node[] = tasks.map((t) => {
      const layer = layers.get(t.id) ?? 0;
      const indexInLayer = perLayerCount.get(layer) ?? 0;
      perLayerCount.set(layer, indexInLayer + 1);
      const isSelected = selectedId === t.id;
      return {
        id: t.id,
        position: {
          x: layer * (NODE_WIDTH + X_GAP),
          y: indexInLayer * (NODE_HEIGHT + Y_GAP),
        },
        data: { label: t.title },
        style: {
          width: NODE_WIDTH,
          fontSize: 13,
          border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
          borderRadius: 8,
          padding: 8,
          background: isSelected ? '#eff6ff' : '#ffffff',
          cursor: onNodeClick ? 'pointer' : 'default',
          fontWeight: isSelected ? 600 : 400,
        },
      };
    });

    const taskIds = new Set(tasks.map((t) => t.id));
    const edges: Edge[] = [];
    for (const t of tasks) {
      for (const dep of t.dependsOn) {
        if (!taskIds.has(dep)) continue;
        edges.push({
          id: `${dep}->${t.id}`,
          source: dep,
          target: t.id,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    }

    return { nodes, edges };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, selectedId]);

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-500">No tasks to display for this corridor yet.</p>
    );
  }

  const handleNodeClick: NodeMouseHandler = (_e, node) => {
    onNodeClick?.(node.id);
  };

  return (
    <div style={{ width: '100%', height: '100%' }} role="img" aria-label="Corridor task flowchart">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={onNodeClick ? handleNodeClick : undefined}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
