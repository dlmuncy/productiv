import { useMemo } from 'react';
import type { Task, Agent, Project } from '@/lib/supabase';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Clock, Bot, Calendar, TrendingUp, AlertTriangle, FileText } from 'lucide-react';

type ExecutiveViewProps = {
  tasks: Task[];
  agents: Agent[];
  project: Project;
};

export function ExecutiveView({ tasks, agents, project }: ExecutiveViewProps) {
  const report = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress' && !t.completed).length;
    const blocked = tasks.filter((t) => t.status === 'blocked' && !t.completed).length;
    const todo = tasks.filter((t) => t.status === 'todo' && !t.completed).length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date) && !t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const healthScore = Math.max(0, Math.min(100,
      completionRate - (overdue * 5) - (blocked * 3)
    ));

    const healthStatus = healthScore >= 75 ? 'on-track' : healthScore >= 50 ? 'at-risk' : 'critical';

    const upcomingTasks = tasks
      .filter((t) => !t.completed && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);

    const criticalTasks = tasks
      .filter((t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high'))
      .sort((a, b) => (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1))
      .slice(0, 5);

    const agentWorkload = agents.map((a) => ({
      agent: a,
      total: tasks.filter((t) => t.assignee_agent_id === a.id).length,
      completed: tasks.filter((t) => t.assignee_agent_id === a.id && t.completed).length,
      active: tasks.filter((t) => t.assignee_agent_id === a.id && !t.completed).length,
    }));

    return { total, completed, inProgress, blocked, todo, overdue, completionRate, healthScore, healthStatus, upcomingTasks, criticalTasks, agentWorkload };
  }, [tasks, agents]);

  const healthConfig = {
    'on-track': { label: 'On Track', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: TrendingUp },
    'at-risk': { label: 'At Risk', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
    'critical': { label: 'Critical', color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', icon: AlertCircle },
  };
  const health = healthConfig[report.healthStatus as keyof typeof healthConfig];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Executive Summary Header */}
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executive Summary</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{project.name}</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className={cn('rounded-xl p-4', health.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <health.icon className={cn('w-4 h-4', health.text)} />
                <span className="text-xs font-semibold text-slate-500">Project Health</span>
              </div>
              <p className={cn('text-2xl font-bold', health.text)}>{report.healthScore}/100</p>
              <p className={cn('text-sm font-medium', health.text)}>{health.label}</p>
            </div>

            {/* Completion */}
            <div className="rounded-xl p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-500">Completion</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{report.completionRate}%</p>
              <p className="text-sm text-blue-600">{report.completed}/{report.total} tasks</p>
            </div>

            {/* Active */}
            <div className="rounded-xl p-4 bg-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-500">In Progress</span>
              </div>
              <p className="text-2xl font-bold text-slate-700">{report.inProgress}</p>
              <p className="text-sm text-slate-500">{report.todo} in backlog</p>
            </div>

            {/* Overdue */}
            <div className={cn('rounded-xl p-4', report.overdue > 0 ? 'bg-rose-50' : 'bg-slate-100')}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className={cn('w-4 h-4', report.overdue > 0 ? 'text-rose-600' : 'text-slate-500')} />
                <span className="text-xs font-semibold text-slate-500">Overdue</span>
              </div>
              <p className={cn('text-2xl font-bold', report.overdue > 0 ? 'text-rose-700' : 'text-slate-700')}>{report.overdue}</p>
              <p className={cn('text-sm', report.overdue > 0 ? 'text-rose-600' : 'text-slate-500')}>
                {report.blocked > 0 ? `${report.blocked} blocked` : 'No blockers'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Critical Tasks */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900">Critical Items</h3>
            </div>
            {report.criticalTasks.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No critical tasks. Everything is under control.</p>
            ) : (
              <div className="space-y-2">
                {report.criticalTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      task.priority === 'urgent' ? 'bg-rose-500' : 'bg-amber-400'
                    )} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{task.title}</span>
                    {task.due_date && (
                      <span className={cn(
                        'text-xs flex items-center gap-1',
                        isOverdue(task.due_date) ? 'text-rose-600 font-medium' : 'text-slate-400'
                      )}>
                        <Calendar className="w-3 h-3" />
                        {formatRelative(task.due_date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-900">Upcoming Deadlines</h3>
            </div>
            {report.upcomingTasks.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No upcoming deadlines scheduled.</p>
            ) : (
              <div className="space-y-2">
                {report.upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{task.title}</span>
                    <span className={cn(
                      'text-xs font-medium',
                      isOverdue(task.due_date) ? 'text-rose-600' : 'text-slate-400'
                    )}>
                      {formatRelative(task.due_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Workload */}
        {report.agentWorkload.length > 0 && (
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-900">Agent Workload Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Agent</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Total</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Active</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Completed</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Throughput</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agentWorkload.map(({ agent, total, completed, active }) => (
                    <tr key={agent.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: agent.color }}>
                            {agent.name[0]}
                          </div>
                          <span className="font-medium text-slate-700">{agent.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-3 text-slate-600">{total}</td>
                      <td className="text-center py-2.5 px-3">
                        <span className={cn('badge', active > 3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>
                          {active}
                        </span>
                      </td>
                      <td className="text-center py-2.5 px-3 text-emerald-600 font-medium">{completed}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full rounded-full" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, backgroundColor: agent.color }} />
                          </div>
                          <span className="text-xs text-slate-500">{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-bold text-slate-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {report.overdue > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rose-700">
                  <span className="font-semibold">{report.overdue} task{report.overdue !== 1 ? 's' : ''} overdue.</span> Immediate attention required to maintain project timeline.
                </p>
              </div>
            )}
            {report.blocked > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  <span className="font-semibold">{report.blocked} blocked task{report.blocked !== 1 ? 's' : ''}.</span> Consider reassigning or unblocking to maintain flow.
                </p>
              </div>
            )}
            {report.completionRate >= 75 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700">
                  <span className="font-semibold">Project is {report.completionRate}% complete</span> and on track for delivery.
                </p>
              </div>
            )}
            {report.completionRate < 50 && report.total > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Project is {report.completionRate}% complete</span> with {report.todo + report.inProgress} tasks remaining.
                </p>
              </div>
            )}
            {report.total === 0 && (
              <p className="text-sm text-slate-500 py-2">No tasks yet. Add tasks to see insights.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
