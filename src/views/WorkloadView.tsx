import { useMemo } from 'react';
import type { Task, Agent } from '@/lib/supabase';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import { User, AlertCircle, Circle, Clock } from 'lucide-react';

type WorkloadViewProps = {
  tasks: Task[];
  agents: Agent[];
  onToggleComplete: (task: Task) => void;
};

export function WorkloadView({ tasks, agents, onToggleComplete }: WorkloadViewProps) {
  const workload = useMemo(() => {
    const agentWorkloads = agents.map((agent) => {
      const agentTasks = tasks.filter((t) => t.assignee_agent_id === agent.id);
      const active = agentTasks.filter((t) => !t.completed);
      const completed = agentTasks.filter((t) => t.completed);
      const overdue = active.filter((t) => isOverdue(t.due_date));
      return { agent, active, completed, overdue, status: active.length > 0 ? 'active' : 'idle' };
    });
    const unassignedActive = tasks.filter((t) => !t.assignee_agent_id && !t.completed);
    return { agentWorkloads, unassignedActive };
  }, [tasks, agents]);

  const activeAgents = workload.agentWorkloads.filter((w) => w.status === 'active').length;
  const idleAgents = workload.agentWorkloads.filter((w) => w.status === 'idle').length;
  const activeTaskCount = workload.agentWorkloads.reduce((sum, w) => sum + w.active.length, 0);
  const overdueTaskCount = workload.agentWorkloads.reduce((sum, w) => sum + w.overdue.length, 0);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card p-6 animate-slide-up">
          <h2 className="font-bold text-slate-900 mb-1">Verified Workload Overview</h2>
          <p className="text-xs text-slate-500 mb-4">Counts are derived directly from assigned task records. Productiv does not invent capacity limits or utilization scores.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Fact label="Agents with active work" value={activeAgents} tone="text-emerald-700 bg-emerald-50 border-emerald-200" />
            <Fact label="Agents with no active work" value={idleAgents} tone="text-slate-600 bg-slate-50 border-slate-200" />
            <Fact label="Assigned active tasks" value={activeTaskCount} tone="text-blue-700 bg-blue-50 border-blue-200" />
            <Fact label="Assigned overdue tasks" value={overdueTaskCount} tone="text-rose-700 bg-rose-50 border-rose-200" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {workload.agentWorkloads.map(({ agent, active, completed, overdue, status }, i) => (
            <div key={agent.id} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: agent.color }}>
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate">{agent.name}</h3>
                    <span className={cn('badge', status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200')}>{status === 'active' ? 'Active work' : 'No active work'}</span>
                  </div>
                  <p className="text-xs text-slate-500">{agent.role} · {agent.model}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-slate-50"><p className="text-lg font-bold text-slate-700">{active.length}</p><p className="text-[10px] text-slate-500 uppercase">Active</p></div>
                <div className="text-center p-2 rounded-lg bg-emerald-50"><p className="text-lg font-bold text-emerald-600">{completed.length}</p><p className="text-[10px] text-emerald-600 uppercase">Done</p></div>
                <div className="text-center p-2 rounded-lg bg-rose-50"><p className="text-lg font-bold text-rose-600">{overdue.length}</p><p className="text-[10px] text-rose-600 uppercase">Overdue</p></div>
              </div>

              {active.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Tasks</p>
                  {active.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm group">
                      <button onClick={() => onToggleComplete(task)} className="flex-shrink-0"><Circle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-400" /></button>
                      <span className="flex-1 truncate text-slate-600">{task.title}</span>
                      {task.due_date && <span className={cn('text-[11px] flex items-center gap-0.5', isOverdue(task.due_date) ? 'text-rose-600' : 'text-slate-400')}><Clock className="w-3 h-3" />{formatRelative(task.due_date)}</span>}
                    </div>
                  ))}
                  {active.length > 5 && <p className="text-xs text-slate-400 pl-6">+ {active.length - 5} more</p>}
                </div>
              )}
            </div>
          ))}

          <div className="card p-5 border-dashed border-2 border-slate-200 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0"><User className="w-6 h-6" /></div>
              <div><h3 className="font-bold text-slate-700">Unassigned</h3><p className="text-xs text-slate-500">Active tasks without an agent</p></div>
            </div>
            {workload.unassignedActive.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No unassigned active tasks</p> : (
              <div className="space-y-1.5">
                {workload.unassignedActive.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-2 text-sm"><Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" /><span className="flex-1 truncate text-slate-600">{task.title}</span>{task.due_date && isOverdue(task.due_date) && <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}</div>)}
                {workload.unassignedActive.length > 5 && <p className="text-xs text-slate-400 pl-6">+ {workload.unassignedActive.length - 5} more</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={cn('rounded-xl p-4 border', tone)}><p className="text-2xl font-bold">{value}</p><p className="text-sm">{label}</p></div>;
}
