import { useEffect, useState } from 'react';
import { supabase, type Project } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AuthProvider } from '@/lib/auth';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { ProjectPage } from '@/pages/ProjectPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { ConnectionsPage } from '@/pages/ConnectionsPage';
import { Sidebar, type View } from '@/components/Sidebar';
import { NewProjectModal } from '@/components/NewProjectModal';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data ?? []);
    setDataLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={48} />
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleNavigate = (newView: View, projectId?: string) => {
    setView(newView);
    if (projectId) setActiveProjectId(projectId);
  };

  const handleNewProject = () => setShowNewProject(true);

  const handleProjectCreated = (projectId: string) => {
    setShowNewProject(false);
    loadProjects();
    setActiveProjectId(projectId);
    setView('project');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        projects={projects}
        activeView={view}
        activeProjectId={activeProjectId}
        onNavigate={handleNavigate}
        onNewProject={handleNewProject}
      />

      {view === 'dashboard' && (
        <Dashboard
          onNavigateProject={(id) => handleNavigate('project', id)}
          onNewProject={handleNewProject}
          onNavigateAgents={() => setView('agents')}
          onNavigateConnections={() => setView('connections')}
        />
      )}

      {view === 'project' && activeProject && (
        <ProjectPage project={activeProject} onBack={() => setView('dashboard')} />
      )}

      {view === 'project' && !activeProject && !dataLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Select a project from the sidebar</p>
        </div>
      )}

      {view === 'agents' && <AgentsPage />}
      {view === 'connections' && <ConnectionsPage />}
      {view === 'settings' && (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Settings coming soon
        </div>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
