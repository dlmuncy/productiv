import { useEffect, useState } from 'react';
import { supabase, type Agent } from '@/lib/supabase';
import { TopBar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { Bot, Plus, X, Cpu, Trash2, Sparkles, Loader2 } from 'lucide-react';

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', role: 'contributor', model: 'gpt-4o', color: '#3563ff', system_prompt: '' });

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
    setAgents(data ?? []);
    setLoading(false);
  };

  const createAgent = async () => {
    if (!newAgent.name.trim()) return;
    await supabase.from('agents').insert({
      name: newAgent.name.trim(),
      role: newAgent.role,
      model: newAgent.model,
      color: newAgent.color,
      system_prompt: newAgent.system_prompt,
    });
    setNewAgent({ name: '', role: 'contributor', model: 'gpt-4o', color: '#3563ff', system_prompt: '' });
    setShowCreate(false);
    loadAgents();
  };

  const deleteAgent = async (id: string) => {
    await supabase.from('agents').delete().eq('id', id);
    loadAgents();
  };

  const updateAgentStatus = async (agent: Agent, status: string) => {
    await supabase.from('agents').update({ status }).eq('id', agent.id);
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status } : a));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="AI Agents"
        subtitle="Manage your AI agent team"
        actions={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Agent</button>}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">No agents yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Create AI agents that can manage projects, delegate tasks, and collaborate with your team.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Sparkles className="w-4 h-4" /> Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {agents.map((agent, i) => (
              <div key={agent.id} className="card p-5 animate-slide-up group" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: agent.color }}>
                    {agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{agent.name}</h3>
                    <p className="text-xs text-slate-500">{agent.role}</p>
                  </div>
                  <button onClick={() => deleteAgent(agent.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {agent.model}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', agent.status === 'active' || agent.status === 'working' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                    {agent.status}
                  </div>
                </div>

                {agent.system_prompt && (
                  <p className="text-xs text-slate-500 mt-3 p-2 rounded-lg bg-slate-50 line-clamp-2">{agent.system_prompt}</p>
                )}

                <div className="flex items-center gap-1 mt-3">
                  <select
                    value={agent.status}
                    onChange={(e) => updateAgentStatus(agent, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-brand-400"
                  >
                    <option value="idle">Idle</option>
                    <option value="active">Active</option>
                    <option value="working">Working</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            ))}
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
                <input type="text" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} className="input" placeholder="e.g. Project Manager AI" autoFocus />
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
                <Sparkles className="w-4 h-4" /> Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
