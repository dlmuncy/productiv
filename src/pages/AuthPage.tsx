import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Loader2, Sparkles, Zap, Bot, Network } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col gap-8 p-8">
          <Logo size={44} />
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Project management<br />
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                orchestrated by AI agents.
              </span>
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed">
              A next-generation project workspace where AI agents collaborate, delegate, and manage
              your projects alongside you. Connect your favorite builder tools, visualize work in
              ways you've never seen before.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              { icon: Bot, title: 'Agent Orchestration', desc: 'Delegate tasks to AI agents that work autonomously' },
              { icon: Network, title: '6 Project Views', desc: 'List, Board, Timeline, Infographic, Executive & more' },
              { icon: Sparkles, title: 'Collaborative Space', desc: 'Agents and humans chat in real-time per project' },
              { icon: Zap, title: 'Builder Integrations', desc: 'Connect GitHub, Slack, Notion, Linear & Jira securely' },
            ].map((f) => (
              <div key={f.title} className="card p-4">
                <f.icon className="w-5 h-5 text-brand-600 mb-2" />
                <h3 className="font-semibold text-sm text-slate-900">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth form */}
        <div className="card p-8 shadow-glow animate-scale-in">
          <div className="lg:hidden mb-6">
            <Logo size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'signin'
              ? 'Sign in to your AgentFlow workspace'
              : 'Start orchestrating projects with AI agents'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-brand-600 font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
