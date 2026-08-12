#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const skip=new Set(['.git','node_modules','dist','coverage','data']);const textExt=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.md','.yml','.yaml','.toml','.sql','.html','.css','.example']);
const patterns=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],['openai-key',/\bsk-[A-Za-z0-9_-]{20,}\b/],['slack-token',/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],['aws-access-key',/\bAKIA[0-9A-Z]{16}\b/],['telegram-bot-token',/\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/]];
let hits=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name)||ent.name==='.env'||ent.name==='.env.runtime')continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else{const ext=path.extname(p);if(!textExt.has(ext)&&!['Dockerfile','README.md'].includes(ent.name))continue;let lines;try{lines=fs.readFileSync(p,'utf8').split(/\r?\n/)}catch{continue}for(let i=0;i<lines.length;i++)for(const [name,re] of patterns)if(re.test(lines[i]))hits.push(`${p}:${i+1} ${name}`)}}}
walk('.');if(hits.length){console.error('Potential secret material detected (values suppressed):\n'+hits.join('\n'));process.exit(1)}console.log('Secret-pattern scan: PASS');
