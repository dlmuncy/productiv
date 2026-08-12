#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const roots=['src','server'];
const forbidden=[/\bmock(?:ed|ing)?\b/i,/\bfake\b/i,/\bsimulat(?:e|ed|ing|ion)\b/i,/\bdemo\b/i,/Math\.random\s*\(/,/btoa\s*\(/,/atob\s*\(/];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);let failures=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(extensions.has(path.extname(p))){const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);for(let i=0;i<lines.length;i++)for(const re of forbidden)if(re.test(lines[i]))failures.push(`${p}:${i+1} ${re}`)}}}
for(const r of roots)if(fs.existsSync(r))walk(r);
if(failures.length){console.error('Runtime placeholder/simulation gate failed:\n'+failures.join('\n'));process.exit(1)}
console.log('Runtime placeholder/simulation gate: PASS');
