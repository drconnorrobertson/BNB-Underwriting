import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(repo,'dist');
const extensions = new Set(['.html','.css','.js','.json','.svg','.txt','.xml','.png','.jpg','.jpeg','.webp','.avif','.gif','.ico','.woff2','.woff','.ttf','.eot','.mp3','.mp4','.webm','.vtt','.webmanifest','.pdf','.csv']);
const skip = new Set(['.git','.vercel','node_modules','dist','scripts','brand','tests','work','app','src','lib','components','api','_gen','__pycache__','brand-link-policy.json','brand-check-policy.json','package.json','package-lock.json','tsconfig.json','vercel.json']);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
function copy(dir,dest) {
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  if(skip.has(entry.name) || (entry.name.startsWith('.') && entry.name!=='.well-known')) continue;
  const from=path.join(dir,entry.name),to=path.join(dest,entry.name);
  if(entry.isDirectory()) {fs.mkdirSync(to,{recursive:true});copy(from,to);}
  else if(extensions.has(path.extname(entry.name))) fs.copyFileSync(from,to);
 }
}
copy(repo,out);
if(!fs.existsSync(path.join(out,'index.html'))) throw new Error('Static publish directory is missing index.html');
console.log('Prepared static publish directory without build sources or brand policy files.');
