import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('public/assets',{recursive:true});
const manifest={};
for(const file of await readdir('design')){
 if(!file.endsWith('.txt'))continue;
 const text=await readFile('design/'+file,'utf8');
 for(const [,name,url] of text.matchAll(/const (\w+) = "(https:\/\/www\.figma\.com\/api\/mcp\/asset\/[^" ]+)"/g)){
 const local=url.split('/').at(-1); manifest[file+':'+name]='/assets/'+local;
 try{await readFile('public/assets/'+local);}catch{
 const response=await fetch(url);if(!response.ok)throw Error(response.status+' '+url);
 await writeFile('public/assets/'+local,Buffer.from(await response.arrayBuffer()));
 }
 }
}
await writeFile('public/assets/manifest.json',JSON.stringify(manifest,null,2));
console.log('Downloaded and indexed',Object.keys(manifest).length,'asset references');
