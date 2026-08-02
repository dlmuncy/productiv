import { useEffect, useState, useCallback } from 'react';
import { supabase, type Project, type Task, type Section, type Agent, type ProjectAgent, type AgentDelegation } from '@/lib/supabase';
import { TopBar } from '@/components/Sidebar';
import { ListView } from '@/views/ListView';
import { BoardView } from '@/views/BoardView';
import { TimelineView } from '@/views/TimelineView';
import { InfographicView } from '@/views/InfographicView';
import { ExecutiveView } from '@/views/ExecutiveView';
import { WorkloadView } from '@/views/WorkloadView';
import { MindMapView } from '@/views/MindMapView';
import { AgentPanel } from '@/components/AgentPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { cn } from '@/lib/utils';
import {
  List, Columns3, GanttChart, BarChart3, FileBarChart, Users, Network,
  Bot, MessageSquare, Plus, X, Calendar, Flag, Settings as SettingsIcon,
} from 'lucide-react';

type ViewType = 'list' | 'board' | 'timeline' | 'infographic' | 'executive' | 'workload' | 'mindmap';

const VIEWS: { id: ViewType; label: string; icon: typeof List }[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: Columns3 },
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
  { id: 'infographic', label: 'Infographic', icon: BarChart3 },
  { id: 'executive', label: 'Executive', icon: FileBarChart },
  { id: 'workload', label: 'Workload', icon: Users },
  { id: 'mindmap', label: 'Mind Map', icon: Network },
];

type ProjectPageProps = {
  project: Project;
  onBack: () => void;
};

export function ProjectPage({ project, onBack }: ProjectPageProps) {
  const [view, setView] = useState<ViewType>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectAgents, setProjectAgents] = useState<ProjectAgent[]>([]);
  const [delegations, setDelegations] = useState<AgentDelegation[]>([]);
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '', assignee_agent_id: '' });
  const [projectState, setProjectState] = useState(project);

  const loadData = useCallback(async () => {
    const [t, s, a, pa, d] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', project.id).order('order_index'),
      supabase.from('sections').select('*').eq('project_id', project.id).order('order_index'),
      supabase.from('agents').select('*'),
      supabase.from('project_agents').select('*').eq('project_id', project.id),
      supabase.from('agent_delegations').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
    ]);
    setTasks(t.data ?? []);
    setSections(s.data ?? []);
    setAgents(a.data ?? []);
    setProjectAgents(pa.data ?? []);
    setDelegations(d.data ?? []);
  }, [project.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setProjectState(project); }, [project]);

  const toggleComplete = async (task: Task) => {
    const completed = !task.completed;
    await supabase.from('tasks').update({ completed, status: completed ? 'done' : 'todo' }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed, status: completed ? 'done' : 'todo' } : t));
  };

  const updateTask = async (task: Task, updates: Partial<Task>) => {
    await supabase.from('tasks').update(updates).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, ...updates } : t));
  };

  const addTask = async (sectionId: string | null, title: string) => {
    const { data } = await supabase.from('tasks').insert({
      project_id: project.id,
      section_id: sectionId,
      title,
    }).select().single();
    if (data) setTasks((prev) => [...prev, data]);
  };

  const deleteTask = async (task: Task) => {
    await supabase.from('tasks').delete().eq('id', task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const addSection = async (name: string) => {
    const { data } = await supabase.from('sections').insert({
      project_id: project.id,
      name,
      order_index: sections.length,
    }).select().single();
    if (data) setSections((prev) => [...prev, data]);
  };

  const moveTask = async (task: Task, newSectionId: string | null) => {
    await supabase.from('tasks').update({ section_id: newSectionId }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, section_id: newSectionId } : t));
  };

  const toggleAgentManaged = async (managed: boolean, leadAgentId: string | null) => {
    await supabase.from('projects').update({ agent_managed: managed, lead_agent_id: leadAgentId }).eq('id', project.id);
    setProjectState((prev) => ({ ...prev, agent_managed: managed, lead_agent_id: leadAgentId }));
  };

  const createQuickTask = async () => {
    if (!newTask.title.trim()) return;
    const { data } = await supabase.from('tasks').insert({
      project_id: project.id,
      title: newTask.title.trim(),
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      assignee_agent_id: newTask.assignee_agent_id || null,
      assignee_type: newTask.assignee_agent_id ? 'agent' : 'user',
    }).select().single();
    if (data) setTasks((prev) => [...prev, data]);
    setNewTask({ title: '', priority: 'medium', due_date: '', assignee_agent_id: '' });
    setShowNewTask(false);
  };

  const linkedAgents = agents.filter((a) => projectAgents.some((pa) => pa.agent_id === a.id));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title={projectState.name}
        subtitle={projectState.description || 'No description'}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowChat(!showChat)} className={cn('btn-ghost', showChat && 'bg-brand-50 text-brand-700')}>
              <MessageSquare className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAgentPanel(!showAgentPanel)} className={cn('btn-ghost', showAgentPanel && 'bg-brand-50 text-brand-700')}>
              <Bot className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNewTask(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        }
      />

      {/* View switcher */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200/80 bg-white overflow-x-auto scrollbar-thin">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              view === v.id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            <v.icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === 'list' && (
            <ListView
              tasks={tasks} sections={sections} agents={linkedAgents}
              onToggleComplete={toggleComplete} onUpdateTask={updateTask}
              onAddTask={addTask} onAddSection={addSection} onDeleteTask={deleteTask}
            />
          )}
          {view === 'board' && (
            <BoardView
              tasks={tasks} sections={sections} agents={linkedAgents}
              onToggleComplete={toggleComplete} onUpdateTask={updateTask}
              onAddTask={addTask} onMoveTask={moveTask} onDeleteTask={deleteTask}
            />
          )}
          {view === 'timeline' && (
            <TimelineView tasks={tasks} projectColor={projectState.color} onToggleComplete={toggleComplete} />
          )}
          {view === 'infographic' && (
            <InfographicView tasks={tasks} agents={linkedAgents} projectColor={projectState.color} projectName={projectState.name} />
          )}
          {view === 'executive' && (
            <ExecutiveView tasks={tasks} agents={linkedAgents} project={projectState} />
          )}
          {view === 'workload' && (
            <WorkloadView tasks={tasks} agents={linkedAgents} onToggleComplete={toggleComplete} />
          )}
          {view === 'mindmap' && (
            <MindMapView tasks={tasks} agents={linkedAgents} projectColor={projectState.color} projectName={projectState.name} onToggleComplete={toggleComplete} />
          )}
        </div>

        {showAgentPanel && (
          <AgentPanel
            projectId={project.id}
            agents={agents}
            projectAgents={projectAgents}
            tasks={tasks}
            delegations={delegations}
            onAgentsChanged={loadData}
            onToggleAgentManaged={toggleAgentManaged}
            agentManaged={projectState.agent_managed}
            leadAgentId={projectState.lead_agent_id}
          />
        )}

        <ChatPanel
          projectId={project.id}
          agents={linkedAgents}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      </div>

      {/* New task modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowNewTask(false)}>
          <div className="card p-6 w-96 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Add New Task</h3>
              <button onClick={() => setShowNewTask(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="input" placeholder="Task name" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign to Agent</label>
                <select value={newTask.assignee_agent_id} onChange={(e) => setNewTask({ ...newTask, assignee_agent_id: e.target.value })} className="input">
                  <option value="">Unassigned</option>
                  {linkedAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={createQuickTask} disabled={!newTask.title.trim()} className="btn-primary w-full">
                <Plus className="w-4 h-4" /> Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
