import { createProductivServer, runScheduler } from './productiv.mjs';
const port=Number(process.env.PORT||8788),{server,db}=createProductivServer();
const tick=()=>{try{runScheduler(db)}catch(e){console.error('scheduler_error',e)}};tick();setInterval(tick,60_000).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Productiv orchestrator listening on ${port}`));
