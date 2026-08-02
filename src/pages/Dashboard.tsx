import { useEffect, useState } from 'react';
import { supabase, type Project, type Task, type Agent } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { TopBar } from '@/components/Sidebar';
import { cn, isOverdue, formatRelative } from '@/lib/utils';
import {
  Plus,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Bot,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

type DashboardProps = {
  onNavigateProject: (id: string) => void;
  onNewProject: () => void;
  onNavigateAgents: () => void;
  onNavigateConnections: () => void;
};

export function Dashboard({ onNavigateProject, onNewProject, onNavigateAgents, onNavigateConnections }: DashboardProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: projs }, { data: tks }, { data: ags }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*'),
        supabase.from('agents').select('*'),
      ]);
      setProjects(projs ?? []);
      setTasks(tks ?? []);
      setAgents(ags ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const completedTasks = tasks.filter((t) => t.completed).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date) && !t.completed).length;
  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'working').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const stats = [
    { label: 'Active Projects', value: projects.length, icon: FolderKanban, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Completed Tasks', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Overdue', value: overdueTasks, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title={`Welcome back, ${user?.email?.split('@')[0] ?? 'there'}`}
        subtitle="Here's what's happening across your workspace"
        actions={
          <button onClick={onNewProject} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Your Projects</h2>
                <button onClick={onNewProject} className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">
                  New <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No projects yet. Create your first one!</p>
                  <button onClick={onNewProject} className="btn-primary">
                    <Plus className="w-4 h-4" /> Create Project
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const projTasks = tasks.filter((t) => t.project_id === p.id);
                    const projCompleted = projTasks.filter((t) => t.completed).length;
                    const pct = projTasks.length > 0 ? Math.round((projCompleted / projTasks.length) * 100) : 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => onNavigateProject(p.id)}
                        className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-brand-300 hover:shadow-soft transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {p.name}
                          </span>
                          {p.agent_managed && (
                            <span className="badge bg-brand-50 text-brand-700 border-brand-200">
                              <Bot className="w-3 h-3" /> Agent-managed
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        {p.description && <p className="text-sm text-slate-500 mb-2 line-clamp-1">{p.description}</p>}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: p.color }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{pct}%</span>
                          <span className="text-xs text-slate-400">{projCompleted}/{projTasks.length} tasks</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Completion rate */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h2 className="font-bold text-slate-900 text-sm">Completion Rate</h2>
              </div>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#3563ff" strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(completionRate / 100) * 314} 314`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{completionRate}%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-slate-500">
                {completedTasks} of {tasks.length} tasks completed
              </p>
            </div>

            {/* Agents */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  <h2 className="font-bold text-slate-900 text-sm">AI Agents</h2>
                </div>
                <button onClick={onNavigateAgents} className="text-xs text-brand-600 font-medium hover:underline">
                  Manage
                </button>
              </div>
              {agents.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-3">No agents yet</p>
                  <button onClick={onNavigateAgents} className="btn-secondary text-xs">
                    <Plus className="w-3 h-3" /> Create Agent
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {agents.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.role}</p>
                      </div>
                      <span className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        a.status === 'active' || a.status === 'working' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      )} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Integrations */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-brand-600" />
                <h2 className="font-bold text-slate-900 text-sm">Integrations</h2>
              </div>
              <button onClick={onNavigateConnections} className="w-full p-3 rounded-lg border border-dashed border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all text-left">
                <p className="text-sm font-medium text-slate-700">Connect Builder Apps</p>
                <p className="text-xs text-slate-400 mt-0.5">GitHub, Slack, Notion, Linear, Jira</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
