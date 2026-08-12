import { randomUUID } from 'node:crypto';
import { audit, chooseAssignee, nowIso, parse } from './core.mjs';

function localParts(date,timeZone){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date),get=t=>parts.find(p=>p.type===t)?.value||'';return{date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour'))}}
function dailyPrompt(db,type,date,hour,target){if(hour<target)return 0;const reportType=type==='checkin_required'?'checkin':'checkout',agents=db.prepare(`SELECT id FROM runtime_agents WHERE enabled=1 AND registered=1`).all();let made=0;for(const a of agents){if(db.prepare(`SELECT 1 FROM daily_reports WHERE agent_id=? AND report_type=? AND report_date=?`).get(a.id,reportType,date))continue;const body=`${date}:${type}`;if(db.prepare(`SELECT 1 FROM bus_messages WHERE to_agent_id=? AND type=? AND body=?`).get(a.id,type,body))continue;const id=randomUUID(),corr=randomUUID();db.prepare(`INSERT INTO bus_messages(id,correlation_id,to_agent_id,type,body,created_at) VALUES(?,?,?,?,?,?)`).run(id,corr,a.id,type,body,nowIso());audit(db,'scheduler',`daily.${reportType}.requested`,'agent',a.id,{date},corr);made++}return made}
export function runScheduler(db,at=new Date()){
  const queued=db.prepare(`SELECT id,required_capabilities_json FROM orchestration_tasks WHERE status='queued' ORDER BY priority DESC,created_at`).all();let routed=0;
  for(const t of queued){const route=chooseAssignee(db,parse(t.required_capabilities_json));if(route){db.prepare(`UPDATE orchestration_tasks SET status='assigned',assignee_agent_id=?,routing_reason=?,updated_at=? WHERE id=? AND status='queued'`).run(route.agentId,route.reason,nowIso(),t.id);audit(db,'scheduler','task.routed','task',t.id,{route});routed++}}
  const tz=process.env.PRODUCTIV_TIMEZONE||'America/New_York',p=localParts(at,tz),result={routed,queued_remaining:queued.length-routed,checkins_requested:dailyPrompt(db,'checkin_required',p.date,p.hour,Number(process.env.PRODUCTIV_CHECKIN_HOUR||8)),checkouts_requested:dailyPrompt(db,'checkout_required',p.date,p.hour,Number(process.env.PRODUCTIV_CHECKOUT_HOUR||19)),automations_run:0,automation_errors:0,local_date:p.date,time_zone:tz};
  const rules=db.prepare(`SELECT * FROM automation_rules WHERE enabled=1 ORDER BY created_at`).all();
  for(const rule of rules){
    const tc=parse(rule.trigger_config_json,{}),ac=parse(rule.action_config_json,{}),last=rule.last_run_at?new Date(rule.last_run_at):null;let due=false;
    if(rule.trigger_type==='interval_minutes'){const mins=Math.max(1,Number(tc.minutes||5));due=!last||at.getTime()-last.getTime()>=mins*60000}
    else if(rule.trigger_type==='daily'){const targetHour=Number(tc.hour||0),targetMinute=Number(tc.minute||0),lastParts=last?localParts(last,tz):null;due=(p.hour>targetHour||p.hour===targetHour&&Number(new Intl.DateTimeFormat('en-US',{timeZone:tz,minute:'2-digit'}).format(at))>=targetMinute)&&(!lastParts||lastParts.date!==p.date)}
    if(!due)continue;
    try{
      if(rule.action_type==='create_task'){
        const required=Array.isArray(ac.required_capabilities)?ac.required_capabilities.map(String):[],route=chooseAssignee(db,required),id=randomUUID(),corr=randomUUID(),now=nowIso();
        db.prepare(`INSERT INTO orchestration_tasks(id,correlation_id,title,description,required_capabilities_json,priority,status,assignee_agent_id,routing_reason,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,corr,String(ac.title||rule.name),String(ac.description||''),JSON.stringify(required),Number(ac.priority||50),route?'assigned':'queued',route?.agentId||null,route?.reason||'no_registered_capability_match',`automation:${rule.id}`,now,now);audit(db,`automation:${rule.id}`,'task.created','task',id,{route,required},corr);
      } else if(rule.action_type==='send_message'){
        if(!ac.to_agent_id||!String(ac.body||'').trim())throw new Error('message_action_missing_target_or_body');const id=randomUUID(),corr=randomUUID();db.prepare(`INSERT INTO bus_messages(id,correlation_id,to_agent_id,type,body,created_at) VALUES(?,?,?,'message',?,?)`).run(id,corr,String(ac.to_agent_id),String(ac.body),nowIso());audit(db,`automation:${rule.id}`,'message.sent','message',id,{to:ac.to_agent_id},corr);
      } else throw new Error('unsupported_action_type');
      db.prepare(`UPDATE automation_rules SET last_run_at=?,last_error=NULL,run_count=run_count+1,updated_at=? WHERE id=?`).run(nowIso(),nowIso(),rule.id);audit(db,'scheduler','automation.completed','automation',rule.id);result.automations_run++;
    }catch(e){const msg=e instanceof Error?e.message:'automation_failed';db.prepare(`UPDATE automation_rules SET last_run_at=?,last_error=?,run_count=run_count+1,updated_at=? WHERE id=?`).run(nowIso(),msg,nowIso(),rule.id);audit(db,'scheduler','automation.failed','automation',rule.id,{error:msg});result.automation_errors++}
  }
  db.prepare(`INSERT INTO scheduler_state(key,value,updated_at) VALUES('last_run',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(JSON.stringify(result),nowIso());return result;
}
