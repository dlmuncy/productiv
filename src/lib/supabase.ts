import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: string;
  due_date: string | null;
  agent_managed: boolean;
  lead_agent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_type: string;
  assignee_agent_id: string | null;
  due_date: string | null;
  order_index: number;
  completed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  model: string;
  color: string;
  status: string;
  capabilities: string[];
  system_prompt: string;
  created_at: string;
};

export type ProjectAgent = {
  id: string;
  project_id: string;
  agent_id: string;
  role: string;
  created_at: string;
};

export type Message = {
  id: string;
  project_id: string;
  author_type: string;
  author_agent_id: string | null;
  content: string;
  parent_id: string | null;
  message_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BuilderConnection = {
  id: string;
  user_id: string;
  app_type: string;
  app_name: string;
  encrypted_token: string;
  metadata: Record<string, unknown>;
  connected: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentDelegation = {
  id: string;
  project_id: string;
  from_agent_id: string;
  to_agent_id: string;
  task_id: string | null;
  instructions: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  blocked_by_id: string;
  created_at: string;
};
