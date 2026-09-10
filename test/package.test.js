const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('packed CommonJS, ESM and TypeScript consumers resolve the public API', () => {
  const root=path.resolve(__dirname,'..'), dir=fs.mkdtempSync(path.join(os.tmpdir(),'pcm-package-'));
  function run(cmd,args) { return execFileSync(cmd,args,{cwd:dir,encoding:'utf8',stdio:'pipe'}); }
  try {
    const pack=JSON.parse(execFileSync('npm',['pack','--json','--pack-destination',dir],{cwd:root,encoding:'utf8'}))[0];
    assert.ok(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('node_modules/')));
    run('npm',['install','--ignore-scripts','--no-audit','--no-fund',path.join(dir,pack.filename)]);
    run(process.execPath,['-e',"const p=require('pcm');if(typeof p.getPcmData!=='function'||typeof p.getPcmStream!=='function')throw Error('exports')"]);
    run(process.execPath,['--input-type=module','-e',"import p from 'pcm';if(typeof p.getPcmData!=='function')throw Error('exports')"]);
    const source=`import * as pcm from 'pcm';
import { Stream } from 'stream';
pcm.getPcmData('audio.wav', {stereo:false}, (sample,channel) => { const n:number=sample+channel; }, (error,output)=>{ const e:string|null=error; });
const stream: Stream = pcm.getPcmStream('audio.wav');
stream.removeAllListeners();
pcm.getPcmStream('audio.wav').on('end', (error,output)=>{}).on('data', (sample,channel)=>{});
// @ts-expect-error stereo must be boolean
pcm.getPcmData('audio.wav',{stereo:'yes'},()=>{},()=>{});
`;
    for(const ext of ['cts','mts'])fs.writeFileSync(path.join(dir,'consumer.'+ext),source);
    run(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--strict','--noEmit','--target','es2022','--module','nodenext','--moduleResolution','nodenext','--typeRoots',path.join(root,'node_modules/@types'),'consumer.cts','consumer.mts']);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
