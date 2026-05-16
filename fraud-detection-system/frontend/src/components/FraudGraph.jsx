import { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ShieldAlert, User, MapPin, Laptop } from 'lucide-react';

const initialNodes = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'User: john.doe@email.com', type: 'user' }, type: 'default' },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'IP: 192.168.1.1', type: 'ip' }, type: 'default' },
  { id: '3', position: { x: 400, y: 100 }, data: { label: 'Device: iPhone 13', type: 'device' }, type: 'default' },
  { id: '4', position: { x: 250, y: 200 }, data: { label: 'Transaction: $5,000 (Blocked)', type: 'transaction', isFraud: true }, type: 'default' },
  { id: '5', position: { x: 100, y: 200 }, data: { label: 'User: attacker@proton.me', type: 'user', isFraud: true }, type: 'default' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#ef4444' }, animated: true },
  { id: 'e3-4', source: '3', target: '4', style: { stroke: '#ef4444' } },
  { id: 'e2-5', source: '2', target: '5', label: 'Shared IP', style: { stroke: '#f59e0b', strokeWidth: 2 } },
];

export default function FraudGraph() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const nodeTypes = useMemo(() => ({
    default: ({ data }) => {
      let Icon = User;
      let colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      
      if (data.type === 'ip') { Icon = MapPin; colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20'; }
      if (data.type === 'device') { Icon = Laptop; colorClass = 'text-teal-500 bg-teal-500/10 border-teal-500/20'; }
      if (data.isFraud) { Icon = ShieldAlert; colorClass = 'text-red-500 bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'; }

      return (
        <div className={`px-4 py-2 shadow-md rounded-md border-2 bg-[var(--bg-card)] flex items-center gap-2 ${colorClass}`}>
          <Icon className="w-4 h-4" />
          <div className="font-semibold text-xs text-[var(--text-primary)]">{data.label}</div>
        </div>
      );
    }
  }), []);

  return (
    <div style={{ width: '100%', height: '400px' }} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
