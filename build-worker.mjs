import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';

const htmlFiles = ['index.html','about.html','services.html','staff.html','categories.html','screening.html','employers.html','testimonials.html','faq.html','contact.html','request.html','consultation.html','legal.html','admin.html'];
const assets = {};
for (const file of [...htmlFiles, 'site.css', 'app.js']) assets[`/${file === 'index.html' ? '' : file}`] = await readFile(file, 'utf8');
assets['/index.html'] = assets['/'];

const worker = `const assets=${JSON.stringify(assets)};
const OWNER_ID='094557f5-8c24-466b-944f-d54358bcf6c0';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export default {async fetch(request,env){
  const url=new URL(request.url);
  const isOwner=request.headers.get('oai-authenticated-user-id')===OWNER_ID;
  if(url.pathname==='/api/submissions'&&request.method==='POST'){
    try{
      const body=await request.json();
      if(!body||!['request','consultation','contact'].includes(body.type)||!body.name||!Array.isArray(body.fields)) return json({ok:false,error:'Please complete all required fields.'},400);
      const payload=JSON.stringify(body.fields).slice(0,20000);
      const result=await env.DB.prepare('INSERT INTO submissions (type,name,email,phone,payload) VALUES (?,?,?,?,?)').bind(body.type,String(body.name).slice(0,200),body.email?String(body.email).slice(0,320):null,body.phone?String(body.phone).slice(0,80):null,payload).run();
      return json({ok:true,id:result.meta.last_row_id},201);
    }catch(error){return json({ok:false,error:'We could not save your submission. Please try again.'},500)}
  }
  if(url.pathname==='/api/health'){
    try{await env.DB.prepare('SELECT 1').first();return json({ok:true,storage:'connected'})}catch{return json({ok:false,storage:'unavailable'},503)}
  }
  if(url.pathname==='/api/content'&&request.method==='GET'){
    try{const row=await env.DB.prepare("SELECT value FROM site_settings WHERE key='content'").first();return json({ok:true,content:row?JSON.parse(row.value):null})}catch{return json({ok:false,error:'Unable to load site content.'},500)}
  }
  if(url.pathname==='/api/admin-content'&&request.method==='PUT'){
    if(!isOwner)return json({ok:false,error:'Owner access required.'},403);
    try{const body=await request.json();if(!body||typeof body!=='object')return json({ok:false,error:'Invalid content.'},400);const value=JSON.stringify(body).slice(0,250000);await env.DB.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES ('content',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(value).run();return json({ok:true})}catch{return json({ok:false,error:'Unable to save site content.'},500)}
  }
  if(request.method!=='GET'&&request.method!=='HEAD') return new Response('Method not allowed',{status:405});
  let path=url.pathname;
  if(path.endsWith('/')) path=path.slice(0,-1)||'/';
  if(path==='/admin.html'&&!isOwner)return new Response('Owner access required',{status:403});
  const body=assets[path];
  if(body===undefined)return new Response('Not found',{status:404});
  const type=path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
  return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':type,'x-content-type-options':'nosniff'}});
}};`;

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/server/index.js', worker);
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/drizzle', { recursive: true, force: true });
console.log('Built persistent Hands & Homes Worker.');
