/*
# Create core schema for AgentFlow (Asana clone with agent orchestration)

1. New Tables
- `projects` — top-level project containers with owner, name, description, color, icon, status, due date, and an `agent_managed` flag for agent orchestration.
- `sections` — grouped columns within a project (e.g. "To Do", "In Progress", "Done").
- `tasks` — individual tasks belonging to a project and optionally a section, with title, description, status, priority, assignee (agent or user), due date, order, and metadata.
- `task_dependencies` — self-referential dependency graph: a task can block or be blocked by another task within the same project.
- `agents` — AI agent profiles that can be assigned to tasks or manage entire projects. Fields for name, role, avatar color, model, status, and capabilities.
- `project_agents` — many-to-many linking agents to projects with a role (lead, contributor, observer).
- `messages` — collaborative chat messages within a project, authored by either a user or an agent. Supports threaded replies and agent-to-agent communication.
- `builder_connections` — stored credentials for 5 builder apps (GitHub, Slack, Notion, Linear, Jira). Credentials are encrypted server-side; the vault stores app type, encrypted token, metadata, and connection status. Only the owner can read/write their own credentials.
- `agent_delegations` — records of one agent delegating a task or subtask to another agent, with status tracking and notes.

2. Security
- Enable RLS on ALL tables.
- All tables are owner-scoped to the authenticated user via `user_id` with `DEFAULT auth.uid()`.
- Child tables (sections, tasks, messages, etc.) scope through their parent project's ownership.
- `builder_connections` has strict owner-only access — credentials never leak to other users.
- Separate CRUD policies (select/insert/update/delete) per table, scoped to `authenticated`.

3. Important Notes
- `user_id` columns default to `auth.uid()` so inserts from the client work without explicitly passing the owner.
- Task ordering uses a float `order_index` column for flexible reordering.
- Agent avatars use a color string (hex) for visual identity.
- Messages support `author_type` ('user' | 'agent') and optional `parent_id` for threaded replies.
- Builder connection credentials are stored as `encrypted_token` (text) — encryption handled at the edge function layer; the DB never stores plaintext tokens.
*/

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  color text NOT NULL DEFAULT '#3b82f6',
  icon text NOT NULL DEFAULT 'Briefcase',
  status text NOT NULL DEFAULT 'active',
  due_date date,
  agent_managed boolean NOT NULL DEFAULT false,
  lead_agent_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Sections
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index float NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sections" ON sections;
CREATE POLICY "select_own_sections" ON sections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_sections" ON sections;
CREATE POLICY "insert_own_sections" ON sections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_sections" ON sections;
CREATE POLICY "update_own_sections" ON sections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_sections" ON sections;
CREATE POLICY "delete_own_sections" ON sections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
  );

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignee_type text DEFAULT 'user',
  assignee_agent_id uuid,
  due_date date,
  order_index float NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_by_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, blocked_by_id)
);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_deps" ON task_dependencies;
CREATE POLICY "select_own_deps" ON task_dependencies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p, tasks t WHERE t.id = task_dependencies.task_id AND p.id = t.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_deps" ON task_dependencies;
CREATE POLICY "insert_own_deps" ON task_dependencies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p, tasks t WHERE t.id = task_dependencies.task_id AND p.id = t.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_deps" ON task_dependencies;
CREATE POLICY "delete_own_deps" ON task_dependencies FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p, tasks t WHERE t.id = task_dependencies.task_id AND p.id = t.project_id AND p.user_id = auth.uid())
  );

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'contributor',
  model text NOT NULL DEFAULT 'gpt-4o',
  color text NOT NULL DEFAULT '#6366f1',
  status text NOT NULL DEFAULT 'idle',
  capabilities text[] DEFAULT '{}',
  system_prompt text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agents" ON agents;
CREATE POLICY "select_own_agents" ON agents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agents" ON agents;
CREATE POLICY "insert_own_agents" ON agents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agents" ON agents;
CREATE POLICY "update_own_agents" ON agents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_agents" ON agents;
CREATE POLICY "delete_own_agents" ON agents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Project Agents (many-to-many)
CREATE TABLE IF NOT EXISTS project_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, agent_id)
);

ALTER TABLE project_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_agents" ON project_agents;
CREATE POLICY "select_own_project_agents" ON project_agents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_agents.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_project_agents" ON project_agents;
CREATE POLICY "insert_own_project_agents" ON project_agents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_agents.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_project_agents" ON project_agents;
CREATE POLICY "delete_own_project_agents" ON project_agents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_agents.project_id AND projects.user_id = auth.uid())
  );

-- Messages (collaborative chat)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'user',
  author_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'chat',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid())
  );

-- Builder Connections (secret vault)
CREATE TABLE IF NOT EXISTS builder_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  app_type text NOT NULL,
  app_name text NOT NULL DEFAULT '',
  encrypted_token text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}',
  connected boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_type)
);

ALTER TABLE builder_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_connections" ON builder_connections;
CREATE POLICY "select_own_connections" ON builder_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_connections" ON builder_connections;
CREATE POLICY "insert_own_connections" ON builder_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_connections" ON builder_connections;
CREATE POLICY "update_own_connections" ON builder_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_connections" ON builder_connections;
CREATE POLICY "delete_own_connections" ON builder_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Agent Delegations
CREATE TABLE IF NOT EXISTS agent_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  to_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  instructions text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_delegations" ON agent_delegations;
CREATE POLICY "select_own_delegations" ON agent_delegations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_delegations.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_delegations" ON agent_delegations;
CREATE POLICY "insert_own_delegations" ON agent_delegations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_delegations.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_delegations" ON agent_delegations;
CREATE POLICY "update_own_delegations" ON agent_delegations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_delegations.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_delegations.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_delegations" ON agent_delegations;
CREATE POLICY "delete_own_delegations" ON agent_delegations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_delegations.project_id AND projects.user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_project_id ON sections(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_agents_project_id ON project_agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_project_id ON agent_delegations(project_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_user_id ON builder_connections(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS builder_connections_updated_at ON builder_connections;
CREATE TRIGGER builder_connections_updated_at BEFORE UPDATE ON builder_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS agent_delegations_updated_at ON agent_delegations;
CREATE TRIGGER agent_delegations_updated_at BEFORE UPDATE ON agent_delegations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
