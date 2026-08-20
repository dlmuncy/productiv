import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/supabase';
import { LayoutDashboard, Bot, Plug, Network, Workflow, Settings, LogOut, Plus, ChevronDown, Search, Bell, Command, Building2 } from 'lucide-react';

export type View = 'dashboard' | 'project' | 'architect' | 'agents' | 'connections' | 'orchestration' | 'automations' | 'settings';
type SidebarProps = { projects: Project[]; activeView: View; activeProjectId: string | null; onNavigate: (view: View, projectId?: string) => void; onNewProject: () => void; };

export function Sidebar({ projects, activeView, activeProjectId, onNavigate, onNewProject }: SidebarProps) {
  const { user, signOut } = useAuth(); const [projectsOpen, setProjectsOpen] = useState(true);
  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'architect' as View, label: 'SaaS Business Architect', icon: Building2 },
    { id: 'agents' as View, label: 'Agents', icon: Bot }, { id: 'orchestration' as View, label: 'Orchestration', icon: Network },
    { id: 'automations' as View, label: 'Automations', icon: Workflow }, { id: 'connections' as View, label: 'Connections', icon: Plug }, { id: 'settings' as View, label: 'Settings', icon: Settings },
  ];
  return <aside className="w-64 h-screen flex flex-col bg-white border-r border-slate-200/80 flex-shrink-0">
    <div className="h-16 flex items-center px-5 border-b border-slate-200/80"><Logo size={30} /></div>
    <div className="px-3 py-3"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input type="text" placeholder="Search..." className="w-full pl-8 pr-12 py-2 text-sm bg-slate-100 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-slate-200 transition-all"/><kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5 flex items-center gap-0.5"><Command className="w-2.5 h-2.5"/>K</kbd></div></div>
    <nav className="px-3 space-y-0.5">{navItems.map(item=><button key={item.id} onClick={()=>onNavigate(item.id)} className={cn('sidebar-item w-full',activeView===item.id&&'sidebar-item-active')}><item.icon className="w-4 h-4"/>{item.label}</button>)}</nav>
    <div className="mt-4 px-3 flex-1 overflow-y-auto scrollbar-thin"><div className="flex items-center justify-between mb-1"><button onClick={()=>setProjectsOpen(!projectsOpen)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"><ChevronDown className={cn('w-3 h-3 transition-transform',!projectsOpen&&'-rotate-90')}/>Projects</button><button onClick={onNewProject} className="p-1 rounded-md hover:bg-slate-100" title="New project"><Plus className="w-3.5 h-3.5 text-slate-500"/></button></div>{projectsOpen&&<div className="space-y-0.5 mt-1">{projects.length===0&&<p className="text-xs text-slate-400 px-3 py-2">No projects yet</p>}{projects.map(p=><button key={p.id} onClick={()=>onNavigate('project',p.id)} className={cn('sidebar-item w-full group',activeView==='project'&&activeProjectId===p.id&&'sidebar-item-active')}><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:p.color}}/><span className="truncate flex-1 text-left">{p.name}</span>{p.agent_managed&&<Bot className="w-3 h-3 text-brand-500"/>}</button>)}</div>}</div>
    <div className="p-3 border-t border-slate-200/80"><div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 group"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold">{user?.email?.[0]?.toUpperCase()??'U'}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{user?.email??'User'}</p><p className="text-xs text-slate-400">Authenticated workspace</p></div><button onClick={signOut} className="p-1.5 rounded-md hover:bg-slate-200 opacity-0 group-hover:opacity-100" title="Sign out"><LogOut className="w-3.5 h-3.5 text-slate-500"/></button></div></div>
  </aside>;
}

type TopBarProps={title:string;subtitle?:string;actions?:React.ReactNode};
export function TopBar({title,subtitle,actions}:TopBarProps){return <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl flex-shrink-0 text-slate-900"><div><h1 className="text-lg font-bold">{title}</h1>{subtitle&&<p className="text-xs text-slate-500">{subtitle}</p>}</div><div className="flex items-center gap-2">{actions}<button className="btn-ghost relative"><Bell className="w-4 h-4"/><span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"/></button></div></header>}
