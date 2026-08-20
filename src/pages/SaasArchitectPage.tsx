import { useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Lightbulb, Lock, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { TopBar } from '@/components/Sidebar';

export function SaasArchitectPage({ onBack }: { onBack: () => void }) {
  const [idea, setIdea] = useState('');
  const [audience, setAudience] = useState('SME SaaS');
  const [priceTier, setPriceTier] = useState('Mid Ticket ($49 - $99/mo)');
  const [notice, setNotice] = useState<string | null>(null);

  return <div className="flex-1 flex flex-col overflow-hidden bg-[#070b14] text-slate-100">
    <TopBar title="SaaS Business Architect" subtitle="Design, validate, and prepare a new SaaS venture" actions={<button onClick={onBack} className="btn-secondary"><ArrowLeft className="w-4 h-4"/> Back to Productiv</button>} />
    <div className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,.10),_transparent_30%),#070b14]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div><div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-[.2em] mb-2"><Sparkles className="w-4 h-4"/> Venture Design Engine</div><h1 className="text-3xl font-black">Turn an idea into a build-ready SaaS blueprint.</h1><p className="text-slate-400 mt-2">Preserves the Business Architect workflow while Productiv remains the operating shell.</p></div>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/80 p-1">
            <button className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm">Manual</button>
            <button onClick={() => setNotice('Autonomous mode is intentionally disabled during manual validation. No action was started.')} className="px-4 py-2 rounded-lg text-slate-400 text-sm flex items-center gap-2"><Lock className="w-3.5 h-3.5"/> Autonomous</button>
          </div>
        </div>
        {notice && <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5"/><div className="flex-1"><p className="font-semibold text-amber-200">Manual mode protected</p><p className="text-sm text-amber-100/70">{notice}</p></div><button onClick={() => setNotice(null)} className="text-xs text-amber-200">Dismiss</button></div>}
        <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-cyan-400"/></div><div><h2 className="font-bold text-xl">Initialize a SaaS Business</h2><p className="text-sm text-slate-400">Start with the same core inputs used by the existing Architect.</p></div></div>
            <label className="block text-sm font-semibold mb-2">Describe the venture</label><textarea value={idea} onChange={e=>setIdea(e.target.value)} rows={7} placeholder="What problem does the SaaS solve, for whom, and why will they pay for it?" className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"/>
            <div className="grid sm:grid-cols-2 gap-4 mt-4"><div><label className="block text-sm font-semibold mb-2">Target audience</label><select value={audience} onChange={e=>setAudience(e.target.value)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3"><option>SME SaaS</option><option>B2B Enterprise</option><option>Prosumer/Creators</option><option>Consumer</option></select></div><div><label className="block text-sm font-semibold mb-2">Price tier</label><select value={priceTier} onChange={e=>setPriceTier(e.target.value)} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3"><option>Low Ticket ($10 - $29/mo)</option><option>Mid Ticket ($49 - $99/mo)</option><option>High Ticket ($150 - $499/mo)</option></select></div></div>
            <button onClick={() => setNotice(idea.trim() ? 'Front-end intake validated. Analysis/build handoff is intentionally not connected in this review scope.' : 'Describe the SaaS venture before continuing.')} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black py-3.5 flex items-center justify-center gap-2"><Lightbulb className="w-5 h-5"/> Analyze Venture</button>
          </section>
          <aside className="space-y-4"><div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5"><h3 className="font-bold mb-4">Architect output path</h3>{['Idea viability & score','Business blueprint','Unit economics & projections','Lean Canvas','Pitch deck & marketing assets','Manual approval gate'].map((x,i)=><div key={x} className="flex gap-3 py-2.5"><div className="w-7 h-7 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 flex items-center justify-center text-xs font-bold">{i+1}</div><div className="flex-1"><p className="text-sm font-semibold">{x}</p><p className="text-xs text-slate-500">{i===5?'Required before any orchestration handoff':'Preserved Architect capability'}</p></div>{i<5&&<CheckCircle2 className="w-4 h-4 text-slate-600 mt-1"/>}</div>)}</div><div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5"><div className="flex gap-3"><Rocket className="w-5 h-5 text-blue-400"/><div><p className="font-bold">Next phase is locked</p><p className="text-sm text-slate-400 mt-1">No Orchestra SDLC launch, agent delegation, project creation, or autonomous execution occurs from this preview.</p></div></div></div></aside>
        </div>
      </div>
    </div>
  </div>;
}
