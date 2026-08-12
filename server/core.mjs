import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const nowIso=()=>new Date().toISOString();
export const hash=v=>createHash('sha256').update(v).digest('hex');
export const parse=(v,fallback=[])=>{try{return JSON.parse(v)}catch{return fallback}};
export const jsonBody=async(req)=>{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1_048_576)throw Object.assign(new Error('body_too_large'),{status:413});chunks.push(chunk)}if(!chunks.length)return{};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(new Error('invalid_json'),{status:400})}};
export const reply=(res,status,data,extra={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cache-control':'no-store',...extra});res.end(JSON.stringify(data))};
export const audit=(db,actor,action,subjectType=null,subjectId=null,detail={},correlationId=null)=>db.prepare(`INSERT INTO event_log(id,correlation_id,actor,action,subject_type,subject_id,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(randomUUID(),correlationId,actor,action,subjectType,subjectId,JSON.stringify(detail),nowIso());
export const tx=(db,fn)=>{db.exec('BEGIN IMMEDIATE');try{const x=fn();db.exec('COMMIT');return x}catch(e){db.exec('ROLLBACK');throw e}};

export function openDb(filename=process.env.PRODUCTIV_DB_PATH||'./data/productiv.db'){
  if(filename!==':memory:')fs.mkdirSync(path.dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename); db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec(`
CREATE TABLE IF NOT EXISTS runtime_agents(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,kind TEXT NOT NULL,transport TEXT NOT NULL DEFAULT 'pull',endpoint TEXT,capabilities_json TEXT NOT NULL DEFAULT '[]',enabled INTEGER NOT NULL DEFAULT 1,registered INTEGER NOT NULL DEFAULT 0,last_seen_at TEXT,last_error TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agent_tokens(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES runtime_agents(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,revoked_at TEXT);
CREATE TABLE IF NOT EXISTS agent_invites(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES runtime_agents(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orchestration_tasks(id TEXT PRIMARY KEY,correlation_id TEXT NOT NULL,parent_task_id TEXT REFERENCES orchestration_tasks(id),project_id TEXT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',required_capabilities_json TEXT NOT NULL DEFAULT '[]',priority INTEGER NOT NULL DEFAULT 50,status TEXT NOT NULL DEFAULT 'queued',assignee_agent_id TEXT REFERENCES runtime_agents(id),routing_reason TEXT,due_at TEXT,claimed_at TEXT,completed_at TEXT,result_summary TEXT,evidence_json TEXT NOT NULL DEFAULT '[]',created_by TEXT NOT NULL DEFAULT 'human',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON orchestration_tasks(status,priority DESC,created_at ASC); CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON orchestration_tasks(assignee_agent_id,status);
CREATE TABLE IF NOT EXISTS bus_messages(id TEXT PRIMARY KEY,correlation_id TEXT NOT NULL,from_agent_id TEXT REFERENCES runtime_agents(id),to_agent_id TEXT REFERENCES runtime_agents(id),task_id TEXT REFERENCES orchestration_tasks(id),type TEXT NOT NULL DEFAULT 'message',body TEXT NOT NULL,created_at TEXT NOT NULL,read_at TEXT);
CREATE INDEX IF NOT EXISTS idx_bus_to_agent ON bus_messages(to_agent_id,read_at,created_at);
CREATE TABLE IF NOT EXISTS daily_reports(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES runtime_agents(id),report_type TEXT NOT NULL,report_date TEXT NOT NULL,summary TEXT NOT NULL,evidence_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,UNIQUE(agent_id,report_type,report_date));
CREATE TABLE IF NOT EXISTS connectors(id TEXT PRIMARY KEY,name TEXT NOT NULL,connector_type TEXT NOT NULL,transport TEXT NOT NULL DEFAULT 'http',endpoint TEXT,secret_ref TEXT,enabled INTEGER NOT NULL DEFAULT 1,verification_status TEXT NOT NULL DEFAULT 'unverified',last_verified_at TEXT,last_error TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS event_log(id TEXT PRIMARY KEY,correlation_id TEXT,actor TEXT NOT NULL,action TEXT NOT NULL,subject_type TEXT,subject_id TEXT,detail_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS automation_rules(id TEXT PRIMARY KEY,name TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,trigger_type TEXT NOT NULL,trigger_config_json TEXT NOT NULL,action_type TEXT NOT NULL,action_config_json TEXT NOT NULL,last_run_at TEXT,last_error TEXT,run_count INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS scheduler_state(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
`);
  const slots=[
    ['Vivienne St. James','base44_superagent',['strategy','research','delegation','lead_generation'],{base44_app_id:'6a3b84e04eff3530698965c5'}],
    ['Dutchess','hermes_vps',['shell','coding','automation','operations'],{}],
    ['Hermes Managed','hermes_managed',['coordination','planning','messaging'],{}],
    ['ChatGPT Harness','chatgpt_harness',['architecture','review','qa','decisions'],{}],
    ['OpenClaw','openclaw',['automation','browser','execution'],{}],
    ['ExpenseRecoveryBot','telegram_bot',['telegram','lead_generation','expense_recovery'],{telegram_handle:'@ExpenseRecoveryBot'}],
  ];
  const ins=db.prepare(`INSERT OR IGNORE INTO runtime_agents(id,name,kind,transport,capabilities_json,metadata_json,registered,created_at,updated_at) VALUES(?,?,?,'pull',?,?,0,?,?)`),now=nowIso();
  for(const [name,kind,caps,meta] of slots)ins.run(randomUUID(),name,kind,JSON.stringify(caps),JSON.stringify(meta),now,now);
  return db;
}

export function chooseAssignee(db,required=[]){
  const rows=db.prepare(`SELECT a.*,(SELECT COUNT(*) FROM orchestration_tasks t WHERE t.assignee_agent_id=a.id AND t.status IN ('assigned','claimed','in_progress')) active_count FROM runtime_agents a WHERE a.enabled=1 AND a.registered=1`).all();
  const eligible=rows.map(a=>{const caps=new Set(parse(a.capabilities_json));const matched=required.filter(c=>caps.has(c)).length;return{...a,matched,active_count:Number(a.active_count||0),covers:required.length===0||matched===required.length}}).filter(a=>a.covers);
  eligible.sort((a,b)=>a.active_count-b.active_count||b.matched-a.matched||a.name.localeCompare(b.name));
  if(!eligible.length)return null;const a=eligible[0];return{agentId:a.id,reason:`capabilities=${required.join(',')||'none'}; active_tasks=${a.active_count}; deterministic_least_loaded_match`};
}

export async function adminActor(req,authMode){if(authMode==='test')return'test-admin';const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)throw Object.assign(new Error('missing_bearer_token'),{status:401});const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,anon=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;if(!url||!anon)throw Object.assign(new Error('admin_auth_not_configured'),{status:503});const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,authorization:`Bearer ${token}`}});if(!r.ok)throw Object.assign(new Error('invalid_session'),{status:401});const user=await r.json();return user.email||user.id||'authenticated-user'}
export function agentActor(db,req){const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)throw Object.assign(new Error('missing_agent_token'),{status:401});const row=db.prepare(`SELECT t.agent_id FROM agent_tokens t JOIN runtime_agents a ON a.id=t.agent_id WHERE t.token_hash=? AND t.revoked_at IS NULL AND a.enabled=1`).get(hash(token));if(!row)throw Object.assign(new Error('invalid_agent_token'),{status:401});return{actor:`agent:${row.agent_id}`,agentId:row.agent_id}}
export const publicAgent=a=>({...a,capabilities:parse(a.capabilities_json),metadata:parse(a.metadata_json,{}),capabilities_json:undefined,metadata_json:undefined,state:!a.enabled?'disabled':!a.registered?'unconfigured':!a.last_seen_at?'registered':Date.now()-Date.parse(a.last_seen_at)<15*60_000?'online':'stale'});

export async function verifyConnector(db,c){if(!c.endpoint)return{status:'failed',error:'endpoint_required'};try{const u=new URL(c.endpoint);if(!['http:','https:'].includes(u.protocol))throw new Error('unsupported_protocol');const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000),headers={};if(c.secret_ref){const v=process.env[c.secret_ref];if(!v)throw new Error(`secret_ref_not_present:${c.secret_ref}`);headers.authorization=`Bearer ${v}`}const r=await fetch(c.endpoint,{headers,signal:ctl.signal});clearTimeout(timer);if(!r.ok)throw new Error(`http_${r.status}`);return{status:'verified',error:null}}catch(e){return{status:'failed',error:e instanceof Error?e.message:'verification_failed'}}}
