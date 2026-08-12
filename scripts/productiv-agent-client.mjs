#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const base=(process.env.PRODUCTIV_URL||'').replace(/\/$/,'');
const token=process.env.PRODUCTIV_AGENT_TOKEN||'';
const handler=process.env.PRODUCTIV_TASK_HANDLER||'';
const interval=Math.max(Number(process.env.PRODUCTIV_POLL_SECONDS||300),30)*1000;
if(!base||!token){console.error('PRODUCTIV_URL and PRODUCTIV_AGENT_TOKEN are required');process.exit(2)}
const request=async(path,init={})=>{const r=await fetch(base+path,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${token}`,...init.headers}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${path}: ${r.status} ${data.error||''}`);return data};
const runHandler=(payload)=>new Promise((resolve,reject)=>{if(!handler)return resolve(null);const p=spawn('/bin/sh',['-lc',handler],{stdio:['pipe','pipe','inherit'],env:process.env});let out='';p.stdout.on('data',d=>out+=d);p.on('close',c=>{if(c!==0)return reject(new Error(`handler_exit_${c}`));try{resolve(JSON.parse(out))}catch{reject(new Error('handler_must_return_json'))}});p.stdin.end(JSON.stringify(payload));});
async function cycle(){
  await request('/api/agent/heartbeat',{method:'POST',body:'{}'});
  const inbox=await request('/api/agent/inbox');
  for(const msg of inbox.messages||[]){
    if(msg.type==='checkin_required'||msg.type==='checkout_required'){
      const result=await runHandler({kind:msg.type,message:msg});
      if(result?.summary){const typ=msg.type==='checkin_required'?'checkin':'checkout';await request(`/api/agent/reports/${typ}`,{method:'POST',body:JSON.stringify({summary:result.summary,evidence:result.evidence||[],report_date:String(msg.body||'').slice(0,10)})});await request(`/api/agent/messages/${msg.id}/read`,{method:'POST',body:'{}'});}
    }
  }
  for(const task of inbox.tasks||[]){
    if(task.status==='assigned') await request(`/api/agent/tasks/${task.id}/claim`,{method:'POST',body:'{}'}).catch(()=>{});
    const result=await runHandler({kind:'task',task});
    if(result?.completed===true && result.summary && Array.isArray(result.evidence) && result.evidence.length){await request(`/api/agent/tasks/${task.id}/complete`,{method:'POST',body:JSON.stringify({summary:result.summary,evidence:result.evidence})});}
    else if(result?.summary){await request(`/api/agent/tasks/${task.id}/progress`,{method:'POST',body:JSON.stringify({summary:result.summary})});}
  }
  if(process.env.PRODUCTIV_INBOX_SNAPSHOT) await fs.writeFile(process.env.PRODUCTIV_INBOX_SNAPSHOT,JSON.stringify(inbox,null,2));
}
async function main(){do{try{await cycle()}catch(e){console.error(new Date().toISOString(),e.message)}if(process.argv.includes('--once'))break;await new Promise(r=>setTimeout(r,interval));}while(true)}
main();
