import { useMemo } from 'react';
import type { Task, Agent } from '@/lib/supabase';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import { Bot, User, AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';

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

      // Calculate capacity score (0-100+)
      const maxCapacity = 5;
      const capacity = Math.min(100, (active.length / maxCapacity) * 100);
      const utilization = active.length;
      const status = capacity > 100 ? 'overloaded' : capacity > 60 ? 'busy' : capacity > 0 ? 'active' : 'idle';

      return { agent, active, completed, overdue, capacity, utilization, status };
    });

    const unassigned = tasks.filter((t) => !t.assignee_agent_id);
    const unassignedActive = unassigned.filter((t) => !t.completed);

    return { agentWorkloads, unassigned, unassignedActive };
  }, [tasks, agents]);

  const statusConfig = {
    overloaded: { label: 'Overloaded', color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    busy: { label: 'Busy', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    active: { label: 'Active', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    idle: { label: 'Idle', color: '#94a3b8', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Capacity overview */}
        <div className="card p-6 animate-slide-up">
          <h2 className="font-bold text-slate-900 mb-4">Team Capacity Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['overloaded', 'busy', 'active', 'idle'] as const).map((status) => {
              const count = workload.agentWorkloads.filter((w) => w.status === status).length;
              const cfg = statusConfig[status];
              return (
                <div key={status} className={cn('rounded-xl p-4 border', cfg.bg, cfg.border)}>
                  <p className={cn('text-2xl font-bold', cfg.text)}>{count}</p>
                  <p className={cn('text-sm', cfg.text)}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {workload.agentWorkloads.map(({ agent, active, completed, overdue, capacity, utilization, status }, i) => {
            const cfg = statusConfig[status as keyof typeof statusConfig];
            return (
              <div key={agent.id} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate">{agent.name}</h3>
                      <span className={cn('badge', cfg.bg, cfg.text, cfg.border)}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">{agent.role} · {agent.model}</p>
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Capacity</span>
                    <span className={cn('font-semibold', capacity > 100 ? 'text-rose-600' : capacity > 60 ? 'text-amber-600' : 'text-emerald-600')}>
                      {utilization} / 5 tasks
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, capacity)}%`,
                        backgroundColor: capacity > 100 ? '#f43f5e' : capacity > 60 ? '#f59e0b' : agent.color,
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-slate-700">{active.length}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Active</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-50">
                    <p className="text-lg font-bold text-emerald-600">{completed.length}</p>
                    <p className="text-[10px] text-emerald-600 uppercase">Done</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-rose-50">
                    <p className="text-lg font-bold text-rose-600">{overdue.length}</p>
                    <p className="text-[10px] text-rose-600 uppercase">Overdue</p>
                  </div>
                </div>

                {/* Active tasks */}
                {active.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Tasks</p>
                    {active.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm group">
                        <button onClick={() => onToggleComplete(task)} className="flex-shrink-0">
                          <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-400" />
                        </button>
                        <span className="flex-1 truncate text-slate-600">{task.title}</span>
                        {task.due_date && (
                          <span className={cn(
                            'text-[11px] flex items-center gap-0.5',
                            isOverdue(task.due_date) ? 'text-rose-600' : 'text-slate-400'
                          )}>
                            <Clock className="w-3 h-3" />
                            {formatRelative(task.due_date)}
                          </span>
                        )}
                      </div>
                    ))}
                    {active.length > 5 && (
                      <p className="text-xs text-slate-400 pl-6">+ {active.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned */}
          <div className="card p-5 border-dashed border-2 border-slate-200 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700">Unassigned</h3>
                <p className="text-xs text-slate-500">Tasks without an agent</p>
              </div>
            </div>
            {workload.unassignedActive.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">All tasks are assigned</p>
            ) : (
              <div className="space-y-1.5">
                {workload.unassignedActive.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span className="flex-1 truncate text-slate-600">{task.title}</span>
                    {task.due_date && isOverdue(task.due_date) && (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
                {workload.unassignedActive.length > 5 && (
                  <p className="text-xs text-slate-400 pl-6">+ {workload.unassignedActive.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
