import { supabase } from './supabase';
export async function orchestratorFetch<T>(path:string, init:RequestInit={}):Promise<T>{
  const {data:{session}}=await supabase.auth.getSession();
  const headers=new Headers(init.headers); headers.set('Content-Type','application/json'); if(session?.access_token)headers.set('Authorization',`Bearer ${session.access_token}`);
  const r=await fetch(path,{...init,headers}); const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`); return data as T;
}
export type RuntimeAgent={id:string;name:string;kind:string;transport:string;endpoint:string|null;capabilities:string[];enabled:number;registered:number;last_seen_at:string|null;last_error:string|null;state:'disabled'|'unconfigured'|'registered'|'online'|'stale'};
export type OrchestrationTask={id:string;correlation_id:string;title:string;description:string;priority:number;status:string;assignee_agent_id:string|null;assignee_name:string|null;routing_reason:string|null;required_capabilities:string[];evidence:string[];result_summary:string|null;created_at:string;updated_at:string};
export type Connector={id:string;name:string;connector_type:string;transport:string;endpoint:string|null;secret_ref:string|null;enabled:number;verification_status:string;last_verified_at:string|null;last_error:string|null};

export type AutomationRule={id:string;name:string;enabled:number;trigger_type:'interval_minutes'|'daily';trigger_config:Record<string,number>;action_type:'create_task'|'send_message';action_config:Record<string,unknown>;last_run_at:string|null;last_error:string|null;run_count:number;created_at:string};
