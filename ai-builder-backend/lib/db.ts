import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabase;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  files: Record<string, string>;
  messages: Array<{ role: string; content: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  updated_at: string;
}

export async function saveProject(
  userId: string,
  project: Omit<Project, 'user_id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      user_id: userId,
      name: project.name,
      files: project.files,
      messages: project.messages,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save project: ${error.message}`);
  }
}

export async function loadProject(
  userId: string,
  projectId: string
): Promise<Project | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return data as Project;
}

export async function listProjects(userId: string): Promise<ProjectListItem[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }

  return (data as ProjectListItem[]) || [];
}
