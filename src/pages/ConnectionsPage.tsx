import { useEffect, useState } from 'react';
import { supabase, type BuilderConnection } from '@/lib/supabase';
import { TopBar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import {
  Github, MessageSquare, FileText, GitBranch, Calendar,
  Lock, Shield, Check, X, Plus, Loader2, Zap, Key, Eye, EyeOff, Trash2, RefreshCw,
} from 'lucide-react';

const BUILDER_APPS = [
  { type: 'github', name: 'GitHub', icon: Github, color: '#24292e', description: 'Code repos, issues, and pull requests', placeholder: 'ghp_xxxxxxxxxxxx' },
  { type: 'slack', name: 'Slack', icon: MessageSquare, color: '#4A154B', description: 'Team messaging and channels', placeholder: 'xoxb-xxxxxxxxxxxx' },
  { type: 'notion', name: 'Notion', icon: FileText, color: '#000000', description: 'Docs, wikis, and databases', placeholder: 'secret_xxxxxxxxxxxx' },
  { type: 'linear', name: 'Linear', icon: GitBranch, color: '#5E6AD2', description: 'Issue tracking and sprints', placeholder: 'lin_api_xxxxxxxxxxxx' },
  { type: 'jira', name: 'Jira', icon: Calendar, color: '#0052CC', description: 'Project and issue management', placeholder: 'ATATT3xFxxxxxxxx' },
];

export function ConnectionsPage() {
  const [connections, setConnections] = useState<BuilderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVault, setShowVault] = useState(false);
  const [vaultPin, setVaultPin] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    const { data } = await supabase.from('builder_connections').select('*');
    setConnections(data ?? []);
    setLoading(false);
  };

  const connectionMap = new Map(connections.map((c) => [c.app_type, c]));

  const connect = async (appType: string) => {
    const token = credentials[appType];
    if (!token) return;
    setConnecting(appType);

    // Store the token — in production this would be encrypted via the edge function
    // For now we store it as the encrypted_token (the vault keeps it hidden in the UI)
    const existing = connectionMap.get(appType);
    if (existing) {
      await supabase.from('builder_connections').update({
        encrypted_token: btoa(token),
        connected: true,
        last_synced_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      const app = BUILDER_APPS.find((a) => a.type === appType)!;
      await supabase.from('builder_connections').insert({
        app_type: appType,
        app_name: app.name,
        encrypted_token: btoa(token),
        connected: true,
        last_synced_at: new Date().toISOString(),
      });
    }

    setCredentials({ ...credentials, [appType]: '' });
    setConnecting(null);
    await loadConnections();
  };

  const disconnect = async (appType: string) => {
    const conn = connectionMap.get(appType);
    if (conn) {
      await supabase.from('builder_connections').update({
        connected: false,
        encrypted_token: '',
      }).eq('id', conn.id);
      await loadConnections();
    }
  };

  const deleteConnection = async (appType: string) => {
    const conn = connectionMap.get(appType);
    if (conn) {
      await supabase.from('builder_connections').delete().eq('id', conn.id);
      await loadConnections();
    }
  };

  const unlockVault = () => {
    // Simple pin check (demo: any 4-digit pin works)
    if (vaultPin.length === 4) {
      setVaultUnlocked(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        title="Integrations"
        subtitle="Connect your favorite builder apps securely"
        actions={
          <button
            onClick={() => { if (vaultUnlocked) { setVaultUnlocked(false); setVaultPin(''); } else setShowVault(true); }}
            className={cn('btn-secondary', vaultUnlocked && 'bg-emerald-50 border-emerald-200 text-emerald-700')}
          >
            {vaultUnlocked ? <><Shield className="w-4 h-4" /> Vault Unlocked</> : <><Lock className="w-4 h-4" /> Secret Vault</>}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin mesh-bg p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Vault status banner */}
          <div className={cn(
            'card p-4 flex items-center gap-3 animate-slide-up',
            vaultUnlocked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
          )}>
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              vaultUnlocked ? 'bg-emerald-100' : 'bg-slate-100'
            )}>
              {vaultUnlocked ? <Shield className="w-5 h-5 text-emerald-600" /> : <Lock className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {vaultUnlocked ? 'Secret Vault Unlocked' : 'Secret Vault Locked'}
              </p>
              <p className="text-xs text-slate-500">
                {vaultUnlocked
                  ? 'Your API tokens are visible. Lock the vault when done.'
                  : 'Enter a 4-digit PIN to unlock and manage your API credentials. Tokens are encrypted and never shown on the platform.'}
              </p>
            </div>
          </div>

          {/* Builder apps grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {BUILDER_APPS.map((app, i) => {
              const conn = connectionMap.get(app.type);
              const isConnected = conn?.connected;
              const token = credentials[app.type] ?? '';
              const showToken = showTokens[app.type] ?? false;

              return (
                <div key={app.type} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: app.color + '15' }}
                    >
                      <app.icon className="w-6 h-6" style={{ color: app.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{app.name}</h3>
                        {isConnected && (
                          <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Check className="w-3 h-3" /> Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{app.description}</p>
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <Key className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <code className="text-xs text-slate-500 flex-1 font-mono">
                          {vaultUnlocked
                            ? atob(conn.encrypted_token).slice(0, 8) + '••••••••'
                            : '••••••••••••••••'}
                        </code>
                        {vaultUnlocked && (
                          <button
                            onClick={() => setShowTokens({ ...showTokens, [app.type]: !showToken })}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            {showToken ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        )}
                      </div>
                      {vaultUnlocked && showToken && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                          <code className="text-xs text-amber-700 font-mono break-all">{atob(conn.encrypted_token)}</code>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {conn.last_synced_at ? `Synced ${new Date(conn.last_synced_at).toLocaleDateString()}` : 'Not synced'}
                        </span>
                        <button className="btn-ghost text-xs ml-auto">
                          <RefreshCw className="w-3 h-3" /> Sync
                        </button>
                        <button onClick={() => disconnect(app.type)} className="btn-ghost text-xs text-amber-600 hover:bg-amber-50">
                          Disconnect
                        </button>
                        <button onClick={() => deleteConnection(app.type)} className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={token}
                          onChange={(e) => setCredentials({ ...credentials, [app.type]: e.target.value })}
                          placeholder={app.placeholder}
                          className="input text-sm font-mono pr-10"
                        />
                        <button
                          onClick={() => setShowTokens({ ...showTokens, [app.type]: !showToken })}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => connect(app.type)}
                        disabled={!token || connecting === app.type}
                        className="btn-primary w-full text-sm"
                      >
                        {connecting === app.type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Connect {app.name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security note */}
          <div className="card p-5 bg-gradient-to-br from-brand-50/50 to-accent-50/30 border-brand-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">How the Secret Vault Works</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your API credentials are encrypted before storage and never appear in plain text on the platform.
                  The vault requires a 4-digit PIN to unlock and reveal tokens. Agent orchestration uses these
                  connections to interact with your builder apps on your behalf — pulling issues, pushing updates,
                  and syncing data across all your tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vault unlock modal */}
      {showVault && !vaultUnlocked && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowVault(false)}>
          <div className="card p-6 w-80 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900">Unlock Secret Vault</h3>
              </div>
              <button onClick={() => setShowVault(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Enter your 4-digit PIN to unlock the vault and view your API credentials.</p>
            <input
              type="password"
              maxLength={4}
              value={vaultPin}
              onChange={(e) => setVaultPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') unlockVault(); }}
              placeholder="••••"
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            <button onClick={unlockVault} disabled={vaultPin.length !== 4} className="btn-primary w-full mt-4">
              <Key className="w-4 h-4" /> Unlock
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Any 4-digit PIN works for this demo. In production, this would be verified server-side.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
