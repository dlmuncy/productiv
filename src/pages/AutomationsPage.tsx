import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/Sidebar';
import { orchestratorFetch, type RuntimeAgent } from '@/lib/orchestrator';
import {
  Activity,
  ArrowRight,
  Clock3,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Route,
  Save,
  Sparkles,
  Workflow,
  XCircle,
} from 'lucide-react';

type TriggerType = 'interval_minutes' | 'daily';
type ActionType = 'create_task' | 'send_message';
type Rule = {
  id: string;
  name: string;
  enabled: number;
  trigger_type: TriggerType;
  trigger_config: Record<string, number>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  last_run_at: string | null;
  last_error: string | null;
  run_count: number;
  created_at: string;
};

type FormState = {
  name: string;
  trigger_type: TriggerType;
  hour: string;
  minute: string;
  interval: string;
  action_type: ActionType;
  title: string;
  description: string;
  capabilities: string;
  priority: string;
  to: string;
  body: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  trigger_type: 'daily',
  hour: '8',
  minute: '0',
  interval: '60',
  action_type: 'create_task',
  title: '',
  description: '',
  capabilities: '',
  priority: '50',
  to: '',
  body: '',
};

function NodeCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
        <h4 className="mt-1 font-bold text-slate-900">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function VisualBuilder({
  form,
  setForm,
  agents,
  busy,
  onSave,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  agents: RuntimeAgent[];
  busy: string;
  onSave: () => Promise<void>;
}) {
  const triggerSummary = useMemo(
    () =>
      form.trigger_type === 'daily'
        ? `Daily ${String(Number(form.hour) || 0).padStart(2, '0')}:${String(Number(form.minute) || 0).padStart(2, '0')}`
        : `Every ${Number(form.interval) || 0} min`,
    [form.trigger_type, form.hour, form.minute, form.interval],
  );
  const actionSummary = form.action_type === 'create_task' ? 'Create + route duty' : 'Send runtime message';

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <h3 className="font-bold text-slate-900">Visual Autom8-it builder</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            This canvas is intentionally limited to Productiv actions that execute through the real orchestration API. No mock connectors or simulated nodes are shown.
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          Executable graph · 1 trigger → 1 action
        </div>
      </div>

      <div className="bg-slate-50/80 p-5">
        <input
          className="input mb-5 max-w-xl bg-white"
          placeholder="Workflow name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />

        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)]">
          <NodeCard
            eyebrow="Trigger"
            title={triggerSummary}
            description="Productiv scheduler evaluates this trigger in PRODUCTIV_TIMEZONE and records each run."
          >
            <select
              className="input"
              value={form.trigger_type}
              onChange={(event) => setForm((current) => ({ ...current, trigger_type: event.target.value as TriggerType }))}
            >
              <option value="daily">Daily time</option>
              <option value="interval_minutes">Every N minutes</option>
            </select>
            {form.trigger_type === 'daily' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-slate-500">
                  Hour
                  <input className="input mt-1" type="number" min="0" max="23" value={form.hour} onChange={(e) => setForm((c) => ({ ...c, hour: e.target.value }))} />
                </label>
                <label className="text-[11px] font-semibold text-slate-500">
                  Minute
                  <input className="input mt-1" type="number" min="0" max="59" value={form.minute} onChange={(e) => setForm((c) => ({ ...c, minute: e.target.value }))} />
                </label>
              </div>
            ) : (
              <label className="text-[11px] font-semibold text-slate-500">
                Interval minutes
                <input className="input mt-1" type="number" min="1" value={form.interval} onChange={(e) => setForm((c) => ({ ...c, interval: e.target.value }))} />
              </label>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" /> Scheduler-backed trigger
            </div>
          </NodeCard>

          <div className="hidden items-center justify-center lg:flex">
            <div className="flex w-full items-center gap-1 text-brand-400">
              <div className="h-px flex-1 bg-brand-200" />
              <ArrowRight className="h-5 w-5" />
              <div className="h-px flex-1 bg-brand-200" />
            </div>
          </div>

          <NodeCard
            eyebrow="Action"
            title={actionSummary}
            description="The action is persisted as an automation rule and executed by Productiv, not by the browser."
          >
            <select
              className="input"
              value={form.action_type}
              onChange={(event) => setForm((current) => ({ ...current, action_type: event.target.value as ActionType }))}
            >
              <option value="create_task">Create + route duty</option>
              <option value="send_message">Send runtime message</option>
            </select>

            {form.action_type === 'create_task' ? (
              <>
                <input className="input" placeholder="Duty title (defaults to workflow name)" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
                <textarea className="input min-h-20" placeholder="Instructions / acceptance criteria" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
                <input className="input" placeholder="Capabilities, comma-separated" value={form.capabilities} onChange={(e) => setForm((c) => ({ ...c, capabilities: e.target.value }))} />
                <label className="text-[11px] font-semibold text-slate-500">
                  Priority 1–100
                  <input className="input mt-1" type="number" min="1" max="100" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))} />
                </label>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <Route className="h-4 w-4" /> Routed by capability and availability
                </div>
              </>
            ) : (
              <>
                <select className="input" value={form.to} onChange={(e) => setForm((c) => ({ ...c, to: e.target.value }))}>
                  <option value="">Choose enrolled runtime</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name} — {agent.state}</option>
                  ))}
                </select>
                <textarea className="input min-h-24" placeholder="Message sent to the selected runtime" value={form.body} onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} />
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <MessageSquare className="h-4 w-4" /> Real enrolled-runtime target
                </div>
              </>
            )}
          </NodeCard>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs text-slate-500">
            <strong className="text-slate-700">Graph:</strong> {triggerSummary} → {actionSummary}
          </div>
          <button
            className="btn-primary"
            disabled={busy === 'create' || !form.name.trim() || (form.action_type === 'send_message' && (!form.to || !form.body.trim()))}
            onClick={() => void onSave()}
          >
            {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save executable workflow
          </button>
        </div>
      </div>
    </section>
  );
}

export function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [agents, setAgents] = useState<RuntimeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      setError('');
      const [automationRules, runtimeAgents] = await Promise.all([
        orchestratorFetch<Rule[]>('/api/orchestration/automations'),
        orchestratorFetch<RuntimeAgent[]>('/api/orchestration/agents'),
      ]);
      setRules(automationRules);
      setAgents(runtimeAgents);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Automation engine unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy('create');
    setError('');
    try {
      const trigger_config = form.trigger_type === 'daily'
        ? { hour: Number(form.hour), minute: Number(form.minute) }
        : { minutes: Number(form.interval) };
      const action_config = form.action_type === 'create_task'
        ? {
            title: form.title.trim() || form.name.trim(),
            description: form.description.trim(),
            required_capabilities: form.capabilities.split(',').map((item) => item.trim()).filter(Boolean),
            priority: Number(form.priority) || 50,
          }
        : { to_agent_id: form.to, body: form.body.trim() };

      await orchestratorFetch('/api/orchestration/automations', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          trigger_type: form.trigger_type,
          trigger_config,
          action_type: form.action_type,
          action_config,
        }),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Create failed');
    } finally {
      setBusy('');
    }
  };

  const toggle = async (rule: Rule) => {
    setBusy(rule.id);
    try {
      await orchestratorFetch(`/api/orchestration/automations/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Update failed');
    } finally {
      setBusy('');
    }
  };

  const run = async () => {
    setBusy('run');
    try {
      await orchestratorFetch('/api/orchestration/scheduler/run', { method: 'POST', body: '{}' });
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Run failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar
        title="Automations"
        subtitle="Productiv + Autom8-it: visual, evidence-backed workflow routing"
        actions={(
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</button>
            <button className="btn-primary" onClick={() => void run()} disabled={busy === 'run'}>
              {busy === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run due now
            </button>
          </div>
        )}
      />

      <div className="mesh-bg flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {error && (
            <div className="card flex gap-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <XCircle className="h-4 w-4" />{error}
            </div>
          )}

          <VisualBuilder form={form} setForm={setForm} agents={agents} busy={busy} onSave={create} />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-brand-600" /><h3 className="font-bold text-slate-900">Saved executable workflows</h3></div>
                <p className="mt-1 text-xs text-slate-500">Run counts and errors come from Productiv's scheduler evidence, not browser simulation.</p>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="card p-10"><Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" /></div>
              ) : rules.length === 0 ? (
                <div className="card p-10 text-center"><Activity className="mx-auto h-8 w-8 text-slate-200" /><p className="mt-2 text-sm text-slate-500">No automations configured.</p></div>
              ) : rules.map((rule) => (
                <div className="card p-5" key={rule.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <h3 className="font-bold text-slate-900">{rule.name}</h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.trigger_type === 'daily'
                          ? `Daily at ${String(rule.trigger_config.hour).padStart(2, '0')}:${String(rule.trigger_config.minute).padStart(2, '0')}`
                          : `Every ${rule.trigger_config.minutes} minute(s)`}
                        {' → '}{rule.action_type === 'create_task' ? 'create + route duty' : 'send runtime message'}
                      </p>
                    </div>
                    <button className="btn-secondary" disabled={busy === rule.id} onClick={() => void toggle(rule)}>
                      {rule.enabled ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Enable</>}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs md:grid-cols-3">
                    <div><p className="text-slate-400">Verified runs</p><p className="mt-0.5 font-semibold text-slate-700">{rule.run_count}</p></div>
                    <div><p className="text-slate-400">Last run</p><p className="mt-0.5 font-semibold text-slate-700">{rule.last_run_at ? new Date(rule.last_run_at).toLocaleString() : 'Never'}</p></div>
                    <div><p className="text-slate-400">Last error</p><p className={`mt-0.5 font-semibold ${rule.last_error ? 'text-rose-600' : 'text-slate-700'}`}>{rule.last_error || 'None recorded'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
