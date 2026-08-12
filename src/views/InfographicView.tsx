import { useMemo } from 'react';
import type { Task, Agent } from '@/lib/supabase';
import { isOverdue } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, AlertCircle, Bot, TrendingUp, Target } from 'lucide-react';

type InfographicViewProps = {
  tasks: Task[];
  agents: Agent[];
  projectColor: string;
  projectName: string;
};

export function InfographicView({ tasks, agents, projectColor, projectName }: InfographicViewProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const todo = tasks.filter((t) => t.status === 'todo' && !t.completed).length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date) && !t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byPriority = {
      urgent: tasks.filter((t) => t.priority === 'urgent' && !t.completed).length,
      high: tasks.filter((t) => t.priority === 'high' && !t.completed).length,
      medium: tasks.filter((t) => t.priority === 'medium' && !t.completed).length,
      low: tasks.filter((t) => t.priority === 'low' && !t.completed).length,
    };

    const byAgent = agents.map((a) => ({
      agent: a,
      total: tasks.filter((t) => t.assignee_agent_id === a.id).length,
      completed: tasks.filter((t) => t.assignee_agent_id === a.id && t.completed).length,
    }));

    return { total, completed, inProgress, todo, overdue, completionRate, byPriority, byAgent };
  }, [tasks, agents]);

  const statusData = [
    { label: 'Completed', value: stats.completed, color: '#10b981', icon: CheckCircle2 },
    { label: 'In Progress', value: stats.inProgress, color: '#3b82f6', icon: Clock },
    { label: 'To Do', value: stats.todo, color: '#94a3b8', icon: Circle },
    { label: 'Overdue', value: stats.overdue, color: '#f43f5e', icon: AlertCircle },
  ];

  const maxPriority = Math.max(...Object.values(stats.byPriority), 1);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card p-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -mr-20 -mt-20" style={{ backgroundColor: projectColor }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5" style={{ color: projectColor }} /><h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{projectName} Overview</h2></div>
            <div className="flex items-end gap-8"><div><p className="text-5xl font-bold text-slate-900">{stats.completionRate}%</p><p className="text-sm text-slate-500 mt-1">Project Completion</p></div><div className="flex gap-6 pb-2"><div><p className="text-2xl font-bold text-slate-900">{stats.total}</p><p className="text-xs text-slate-500">Total Tasks</p></div><div><p className="text-2xl font-bold text-emerald-600">{stats.completed}</p><p className="text-xs text-slate-500">Done</p></div><div><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p><p className="text-xs text-slate-500">Active</p></div></div></div>
            <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 flex" style={{ width: `${stats.completionRate}%` }}><div className="flex-1" style={{ backgroundColor: projectColor }} /></div></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}><h3 className="font-bold text-slate-900 mb-4">Task Status Distribution</h3><div className="flex items-center gap-6"><div className="relative w-40 h-40 flex-shrink-0"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">{(() => {const total = stats.total || 1;let offset = 0;return statusData.map((s) => {const pct = (s.value / total) * 100;const dash = (pct / 100) * 314;const el = (<circle key={s.label} cx="60" cy="60" r="50" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${dash} 314`} strokeDashoffset={-offset} />);offset += dash;return el;});})()}</svg><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><p className="text-2xl font-bold text-slate-900">{stats.total}</p><p className="text-xs text-slate-400">tasks</p></div></div></div><div className="space-y-2.5 flex-1">{statusData.map((s) => (<div key={s.label} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm text-slate-600 flex-1">{s.label}</span><span className="text-sm font-semibold text-slate-900">{s.value}</span></div>))}</div></div></div>
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}><h3 className="font-bold text-slate-900 mb-4">Open Tasks by Priority</h3><div className="space-y-3">{[{ label: 'Urgent', value: stats.byPriority.urgent, color: '#f43f5e' },{ label: 'High', value: stats.byPriority.high, color: '#f59e0b' },{ label: 'Medium', value: stats.byPriority.medium, color: '#3b82f6' },{ label: 'Low', value: stats.byPriority.low, color: '#94a3b8' }].map((p) => (<div key={p.label}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600">{p.label}</span><span className="text-sm font-semibold text-slate-900">{p.value}</span></div><div className="h-6 bg-slate-100 rounded-md overflow-hidden"><div className="h-full rounded-md transition-all duration-700 flex items-center px-2" style={{ width: `${(p.value / maxPriority) * 100}%`, backgroundColor: p.color, minWidth: p.value > 0 ? '24px' : '0' }}>{p.value > 0 && <span className="text-[10px] text-white font-bold">{p.value}</span>}</div></div></div>))}</div></div>
        </div>

        {stats.byAgent.length > 0 && (<div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}><div className="flex items-center gap-2 mb-4"><Bot className="w-4 h-4 text-brand-600" /><h3 className="font-bold text-slate-900">Agent Performance</h3></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{stats.byAgent.map(({ agent, total, completed }) => (<div key={agent.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50"><div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: agent.color }}>{agent.name[0]}</div><div className="min-w-0"><p className="text-sm font-semibold text-slate-700 truncate">{agent.name}</p><p className="text-xs text-slate-400">{agent.role}</p></div></div><div className="flex items-center justify-between text-xs text-slate-500 mb-1"><span>Completed</span><span className="font-semibold text-slate-700">{completed}/{total}</span></div><div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, backgroundColor: agent.color }} /></div></div>))}</div></div>)}

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}><div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-brand-600" /><h3 className="font-bold text-slate-900">Task Velocity</h3></div><div className="flex items-end gap-2 h-32">{(() => {const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());const bars = [];for (let i = 6; i >= 0; i--) {const date = new Date();date.setDate(date.getDate() - i);const dayTasks = recentTasks.filter((t) => {const tDate = new Date(t.created_at);return tDate.toDateString() === date.toDateString();});const completed = dayTasks.filter((t) => t.completed).length;bars.push({ day: date.toLocaleDateString('en-US', { weekday: 'short' }), total: dayTasks.length, completed });}const maxBar = Math.max(...bars.map((b) => b.total), 1);return bars.map((b, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full flex-1 flex items-end"><div className="w-full rounded-t-md transition-all duration-700 relative" style={{ height: `${(b.total / maxBar) * 100}%`, backgroundColor: projectColor, minHeight: b.total > 0 ? '8px' : '2px' }}>{b.completed > 0 && (<div className="absolute bottom-0 w-full rounded-t-md bg-emerald-400" style={{ height: `${(b.completed / b.total) * 100}%` }} />)}</div></div><span className="text-[10px] text-slate-400">{b.day}</span></div>));})()}</div><div className="flex items-center gap-4 mt-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: projectColor }} /> Created</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Completed</span></div></div>
      </div>
    </div>
  );
}
