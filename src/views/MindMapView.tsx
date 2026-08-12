import { useMemo, useState, useRef } from 'react';
import type { Task, Agent } from '@/lib/supabase';
import { CheckCircle2, Bot } from 'lucide-react';

type MindMapViewProps = {
  tasks: Task[];
  agents: Agent[];
  projectColor: string;
  projectName: string;
  onToggleComplete: (task: Task) => void;
};

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'root' | 'agent' | 'task';
  color: string;
  completed?: boolean;
  parentId?: string;
};

type Edge = { from: string; to: string };

export function MindMapView({ tasks, agents, projectColor, projectName, onToggleComplete }: MindMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(() => {
    const result: { nodes: Node[]; edges: Edge[] } = { nodes: [], edges: [] };
    const rootX = 0;
    const rootY = 0;
    result.nodes.push({ id: 'root', label: projectName, x: rootX, y: rootY, type: 'root', color: projectColor });
    const agentTasks = new Map<string, Task[]>();
    const unassignedTasks: Task[] = [];
    tasks.forEach((task) => {
      if (task.assignee_agent_id) {
        const existing = agentTasks.get(task.assignee_agent_id) ?? [];
        agentTasks.set(task.assignee_agent_id, [...existing, task]);
      } else unassignedTasks.push(task);
    });
    const allAgents = agents.filter((a) => agentTasks.has(a.id));
    const agentCount = allAgents.length;
    const agentRadius = 250;
    allAgents.forEach((agent, i) => {
      const angle = (i / Math.max(agentCount, 1)) * Math.PI * 2 - Math.PI / 2;
      const ax = rootX + Math.cos(angle) * agentRadius;
      const ay = rootY + Math.sin(angle) * agentRadius;
      const agentId = `agent-${agent.id}`;
      result.nodes.push({ id: agentId, label: agent.name, x: ax, y: ay, type: 'agent', color: agent.color });
      result.edges.push({ from: 'root', to: agentId });
      const aTasks = agentTasks.get(agent.id)!;
      const taskRadius = 140;
      aTasks.forEach((task, j) => {
        const tAngle = (j / Math.max(aTasks.length, 1)) * Math.PI * 1.4 - Math.PI * 0.7 + angle;
        const tx = ax + Math.cos(tAngle) * taskRadius;
        const ty = ay + Math.sin(tAngle) * taskRadius;
        const taskId = `task-${task.id}`;
        result.nodes.push({ id: taskId, label: task.title, x: tx, y: ty, type: 'task', color: agent.color, completed: task.completed, parentId: agentId });
        result.edges.push({ from: agentId, to: taskId });
      });
    });
    if (unassignedTasks.length > 0) {
      const unassignedId = 'unassigned';
      const angle = agentCount > 0 ? (agentCount / Math.max(agentCount, 1)) * Math.PI * 2 - Math.PI / 2 : Math.PI / 2;
      const ux = rootX + Math.cos(angle) * agentRadius;
      const uy = rootY + Math.sin(angle) * agentRadius;
      result.nodes.push({ id: unassignedId, label: 'Unassigned', x: ux, y: uy, type: 'agent', color: '#94a3b8' });
      result.edges.push({ from: 'root', to: unassignedId });
      const taskRadius = 120;
      unassignedTasks.forEach((task, j) => {
        const tAngle = (j / Math.max(unassignedTasks.length, 1)) * Math.PI * 1.4 - Math.PI * 0.7 + angle;
        const tx = ux + Math.cos(tAngle) * taskRadius;
        const ty = uy + Math.sin(tAngle) * taskRadius;
        const taskId = `task-${task.id}`;
        result.nodes.push({ id: taskId, label: task.title, x: tx, y: ty, type: 'task', color: '#94a3b8', completed: task.completed, parentId: unassignedId });
        result.edges.push({ from: unassignedId, to: taskId });
      });
    }
    return result;
  }, [tasks, agents, projectColor, projectName]);

  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); const delta = e.deltaY > 0 ? 0.9 : 1.1; setZoom((z) => Math.max(0.3, Math.min(2.5, z * delta))); };
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-slate-50 relative cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white rounded-lg shadow-card border border-slate-200 p-1">
        <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))} className="p-1.5 hover:bg-slate-100 rounded transition-colors text-sm font-bold">+</button>
        <span className="text-xs text-slate-500 px-1">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} className="p-1.5 hover:bg-slate-100 rounded transition-colors text-sm font-bold">-</button>
        <div className="w-px h-5 bg-slate-200 mx-0.5" />
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-1.5 hover:bg-slate-100 rounded transition-colors text-xs">Reset</button>
      </div>
      {nodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center"><p className="text-slate-400">Add tasks to see the mind map</p></div>}
      <div className="absolute inset-0" style={{ transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${zoom})`, transformOrigin: 'center' }}>
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
          {edges.map((edge, i) => { const from = nodeById.get(edge.from); const to = nodeById.get(edge.to); if (!from || !to) return null; return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={from.color} strokeWidth={from.type === 'root' ? 2 : 1.5} strokeOpacity={0.3} strokeDasharray={to.type === 'task' ? '4 2' : '0'} />; })}
        </svg>
        {nodes.map((node) => {
          const isRoot = node.type === 'root'; const isAgent = node.type === 'agent'; const size = isRoot ? 80 : isAgent ? 56 : 40;
          return <div key={node.id} className="absolute flex items-center justify-center rounded-full font-medium text-center transition-all hover:scale-110 cursor-pointer" style={{ width: size, height: size, left: node.x - size / 2, top: node.y - size / 2, backgroundColor: node.completed ? '#e2e8f0' : node.color, color: 'white', fontSize: isRoot ? '13px' : isAgent ? '11px' : '9px', boxShadow: isRoot ? '0 4px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)', border: node.completed ? '2px solid #94a3b8' : '2px solid white', lineHeight: 1.1, padding: '4px', opacity: node.completed ? 0.6 : 1 }} onClick={(e) => { e.stopPropagation(); if (node.type === 'task') { const taskId = node.id.replace('task-', ''); const task = tasks.find((t) => t.id === taskId); if (task) onToggleComplete(task); } }}>
            {isRoot && <span className="line-clamp-2">{node.label}</span>}
            {isAgent && <div className="flex flex-col items-center gap-1"><Bot className={isRoot ? 'w-5 h-5' : 'w-4 h-4'} /><span className="line-clamp-1 px-1">{node.label}</span></div>}
            {node.type === 'task' && <div className="flex items-center justify-center w-full h-full">{node.completed ? <CheckCircle2 className="w-4 h-4 text-slate-500" /> : <span className="line-clamp-2 px-1">{node.label}</span>}</div>}
          </div>;
        })}
      </div>
    </div>
  );
}
