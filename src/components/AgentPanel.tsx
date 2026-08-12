import { useState } from 'react';
import { supabase, type Agent, type ProjectAgent, type AgentDelegation, type Task } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Bot, Plus, X, ArrowRight, Clock,
  Sparkles, Zap, Cpu, Trash2,
} from 'lucide-react';

type AgentPanelProps = {
  projectId: string;
  agents: Agent[];
  projectAgents: ProjectAgent[];
  tasks: Task[];
  delegations: AgentDelegation[];
  onAgentsChanged: () => void;
  onToggleAgentManaged: (managed: boolean, leadAgentId: string | null) => void;
  agentManaged: boolean;
  leadAgentId: string | null;
};

export function AgentPanel({
  projectId, agents, projectAgents, tasks, delegations, onAgentsChanged,
  onToggleAgentManaged, agentManaged, leadAgentId,
}: AgentPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', role: 'contributor', model: 'gpt-4o', color: '#3563ff', system_prompt: '' });

  const projectAgentIds = new Set(projectAgents.map((pa) => pa.agent_id));
  const linkedAgents = agents.filter((a) => projectAgentIds.has(a.id));
  const availableAgents = agents.filter((a) => !projectAgentIds.has(a.id));

  const createAgent = async () => {
    if (!newAgent.name.trim()) return;
    const { data } = await supabase.from('agents').insert({
      name: newAgent.name.trim(),
      role: newAgent.role,
      model: newAgent.model,
      color: newAgent.color,
      system_prompt: newAgent.system_prompt,
    }).select().single();
    if (data) {
      await supabase.from('project_agents').insert({ project_id: projectId, agent_id: data.id, role: newAgent.role });
      onAgentsChanged();
    }
    setNewAgent({ name: '', role: 'contributor', model: 'gpt-4o', color: '#3563ff', system_prompt: '' });
    setShowCreate(false);
  };

  const linkAgent = async (agentId: string) => {
    await supabase.from('project_agents').insert({ project_id: projectId, agent_id: agentId, role: 'contributor' });
    onAgentsChanged();
  };

  const unlinkAgent = async (agentId: string) => {
    await supabase.from('project_agents').delete().eq('project_id', projectId).eq('agent_id', agentId);
    if (leadAgentId === agentId) onToggleAgentManaged(false, null);
    onAgentsChanged();
  };

  const setLeadAgent = async (agentId: string | null) => {
    onToggleAgentManaged(agentId !== null, agentId);
  };

  return (
    <div className="w-80 h-full flex flex-col bg-white border-l border-slate-200/80 flex-shrink-0">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-slate-900 text-sm">Agent Orchestration</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-ghost p-1.5">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-gradient-to-br from-brand-50 to-accent-50/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Autonomous Management</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Let an AI agent manage this entire project — creating tasks, delegating work, and tracking progress.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={leadAgentId ?? ''}
              onChange={(e) => setLeadAgent(e.target.value || null)}
              className="input text-xs py-1.5 flex-1"
            >
              <option value="">User managed</option>
              {linkedAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} (Lead)</option>
              ))}
            </select>
          </div>
          {agentManaged && leadAgentId && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-600">
              <Zap className="w-3 h-3" />
              Agent is managing this project
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Project Agents</h3>
          {linkedAgents.length === 0 && (
            <p className="text-xs text-slate-400 py-3 text-center">No agents assigned to this project</p>
          )}
          <div className="space-y-2">
            {linkedAgents.map((agent) => {
              const agentTasks = tasks.filter((t) => t.assignee_agent_id === agent.id);
              const activeTasks = agentTasks.filter((t) => !t.completed).length;
              const isLead = leadAgentId === agent.id;
              return (
                <div key={agent.id} className={cn(
                  'rounded-lg border p-3 transition-all',
                  isLead ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'
                )}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{agent.name}</p>
                      <p className="text-xs text-slate-400">{agent.role}</p>
                    </div>
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      agent.status === 'active' || agent.status === 'working' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    )} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {agent.model}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activeTasks} active</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => setLeadAgent(isLead ? null : agent.id)}
                      className={cn('text-xs px-2 py-1 rounded transition-colors', isLead ? 'text-brand-700 bg-brand-100' : 'text-slate-500 hover:bg-slate-100')}
                    >
                      {isLead ? 'Leading' : 'Set as Lead'}
                    </button>
                    <button onClick={() => unlinkAgent(agent.id)} className="text-xs px-2 py-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {availableAgents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Available Agents</h3>
            <div className="space-y-1">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => linkAgent(agent.id)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: agent.color }}>
                    {agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 truncate">{agent.name}</p>
                    <p className="text-xs text-slate-400">{agent.role}</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {delegations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Delegations</h3>
            <div className="space-y-2">
              {delegations.slice(0, 5).map((d) => {
                const fromAgent = agents.find((a) => a.id === d.from_agent_id);
                const toAgent = agents.find((a) => a.id === d.to_agent_id);
                const task = tasks.find((t) => t.id === d.task_id);
                if (!fromAgent || !toAgent) return null;
                return (
                  <div key={d.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-slate-700">{fromAgent.name}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-700">{toAgent.name}</span>
                    </div>
                    {task && <p className="text-slate-500 truncate">Task: {task.title}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn(
                        'badge text-[10px]',
                        d.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        d.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      )}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-96 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Create New Agent</h3>
              <button onClick={() => setShowCreate(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} className="input" placeholder="e.g. Project Manager AI" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                  <select value={newAgent.role} onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })} className="input">
                    <option value="lead">Lead</option>
                    <option value="contributor">Contributor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="planner">Planner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                  <select value={newAgent.model} onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })} className="input">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="llama-3.1-70b">Llama 3.1 70B</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                <div className="flex gap-2">
                  {['#3563ff', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'].map((c) => (
                    <button key={c} onClick={() => setNewAgent({ ...newAgent, color: c })} className={cn('w-7 h-7 rounded-lg transition-all', newAgent.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : '')} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">System Prompt (optional)</label>
                <textarea value={newAgent.system_prompt} onChange={(e) => setNewAgent({ ...newAgent, system_prompt: e.target.value })} className="input resize-none" rows={3} placeholder="You are a project manager that..." />
              </div>
              <button onClick={createAgent} disabled={!newAgent.name.trim()} className="btn-primary w-full">
                <Sparkles className="w-4 h-4" /> Create & Assign Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
