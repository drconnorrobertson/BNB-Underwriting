import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const policy=JSON.parse(fs.readFileSync(new URL('../brand-check-policy.json',import.meta.url),'utf8'));
const roots=process.argv.slice(2); if(!roots.length)throw Error('Publish directory required');
const blocked=policy.blockedDomains.map(d=>d.replace(/^www\./,'').toLowerCase());
const failures=[];let files=0;
const textTypes=new Set(['.html','.js','.css','.json','.svg','.xml','.txt','.md','.csv','.vtt','.srt','.tsx','.ts','.jsx']);
function normalize(s){return s.replace(/&#x([0-9a-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16))).replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(+v)).replace(/&nbsp;/g,' ').replace(/\\u([0-9a-f]{4})/gi,(_,v)=>String.fromCharCode(parseInt(v,16)));}
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.name.startsWith('.')||['node_modules','scripts','tests','work','_gen'].includes(e.name))continue;
 const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}
 if(e.isFile()&&/\.(?:png|jpg|jpeg|webp|avif|gif)$/i.test(e.name)){const hash=createHash('sha256').update(fs.readFileSync(p)).digest('hex');if((policy.blockedAssetSha256||[]).includes(hash))failures.push({file:p,reason:'blocked personal-association image'});continue;}
 if(!e.isFile()||['vercel.json','package.json','package-lock.json','brand-check-policy.json','brand-link-policy.json'].includes(e.name)||!textTypes.has(path.extname(p)))continue;
 const raw=fs.readFileSync(p,'utf8'),s=normalize(raw),lower=s.toLowerCase();files++;
 const name=/(?:\b(?:dr\.?\s*)?connor[\s\u00a0_-]*robertson\b|drconnor+robertson|connorrobertson)/i.test(s.replace(/<[^>]+>/g,' '));
 const domain=blocked.find(d=>lower.includes(d));
 // Connor Davis is a different person; named references to him remain valid.
 const unqualified=/\bconnor\b/i.test(s.replace(/connor(?:[\s_-]+)davis/gi,''));
 if(name||domain||unqualified)failures.push({file:p,reason:name?'personal identity':domain?'personal domain '+domain:'unqualified personal name'});
 }}
for(const root of roots)walk(path.resolve(root));
console.log(JSON.stringify({files,violations:failures.length,failures:failures.slice(0,30)}));if(failures.length)process.exitCode=1;
