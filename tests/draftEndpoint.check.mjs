import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const fixtureDir=mkdtempSync(path.join(root,'work','isolated-draft-check-'));
const before=readFileSync(path.join(root,'.data/hub-store.json'));
const proc=spawn(process.execPath,[path.join(root,'server.ts')],{cwd:fixtureDir,env:{...process.env,NODE_ENV:'production',PORT:'43127',SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',GEMINI_API_KEY:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';proc.stdout.on('data',d=>logs+=d);proc.stderr.on('data',d=>logs+=d);
try {
 await new Promise((resolve,reject)=>{ const timeout=setTimeout(()=>reject(new Error('Server failed to start: '+logs)),15000); const poll=setInterval(()=>{if(logs.includes('server running')){clearTimeout(timeout);clearInterval(poll);resolve();}if(proc.exitCode!==null){clearTimeout(timeout);clearInterval(poll);reject(new Error(logs));}},100); });
 const call=async(user,method,url,body)=>{const res=await fetch('http://127.0.0.1:43127'+url,{method,headers:{'Content-Type':'application/json',...(user?{'x-cuny-user-id':user}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,body:await res.json()};};
 const endpoint='/api/clubs/club-ai/posts';
 assert.equal((await call(null,'POST',endpoint,{title:'synthetic',caption:'test'})).status,401);
 assert.equal((await call('usr-viewer-ai','POST',endpoint,{title:'synthetic',caption:'test'})).status,403);
 const created=await call('usr-editor-ai','POST',endpoint,{title:'Synthetic concurrency check',caption:'original'});assert.equal(created.status,201);
 const post=created.body.post;const url=endpoint+'/'+post.postId;
 assert.equal((await call('usr-editor-ai','PATCH',url,{caption:'unversioned'})).status,428);
 assert.equal((await call('usr-editor-ai','PATCH',url,{expectedUpdatedAt:post.updatedAt,status:'Published'})).status,400);
 assert.equal((await call('usr-editor-ai','PATCH',url,{expectedUpdatedAt:post.updatedAt,clubId:'club-msa'})).status,400);
 const first=await call('usr-editor-ai','PATCH',url,{expectedUpdatedAt:post.updatedAt,caption:'first editor'});assert.equal(first.status,200);
 const stale=await call('usr-contrib-ai','PATCH',url,{expectedUpdatedAt:post.updatedAt,caption:'stale editor'});assert.equal(stale.status,409);
 const outsider=await call('usr-lead-msa','PATCH',url,{expectedUpdatedAt:first.body.post.updatedAt,caption:'wrong club'});assert.equal(outsider.status,403);
 assert.equal((await call('usr-viewer-ai','PATCH',url,{expectedUpdatedAt:first.body.post.updatedAt,caption:'viewer'})).status,403);
 const second=await call('usr-editor-ai','PATCH',url,{expectedUpdatedAt:first.body.post.updatedAt,caption:'reviewed latest'});assert.equal(second.status,200);assert.equal(second.body.post.caption,'reviewed latest');
 assert.deepEqual(readFileSync(path.join(root,'.data/hub-store.json')),before);
 console.log('PASS: 10 isolated HTTP checks; original runtime store unchanged.');
} finally {proc.kill();}
