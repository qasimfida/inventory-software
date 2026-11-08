import { chromium } from '@playwright/test';
import { readFile, readdir, writeFile, access } from 'node:fs/promises';
const root='.ai/reports/redesign', out=`${root}/phase-10-validation`;
const map={'login':'auth-login','shell-dashboard':'dashboard',inventory:'inventory','product-detail':'catalog-id',pos:'pos',purchasing:'purchasing',reports:'reports',settings:'settings-company',preferences:'settings-preferences',drawer:'online-store-products-add',showcase:'design-system',empty:'inventory-empty',loading:'online-store-slow'};
const pairs=[];
for(const name of (await readdir(`${out}/visual-baseline`)).filter(n=>n.endsWith('.png')).sort()) {
 const [,width,theme,density,key]=/^(\d+)-(light|dark)-(compact|comfortable)-(.+)\.png$/.exec(name);
 const before=`${root}/before/screens/${width}-${theme}-${map[key]}.png`;
 let exists=true;try{await access(before);}catch{exists=false;}
 pairs.push({name,width:Number(width),theme,density,key,before:exists?before:null,after:`${out}/visual-baseline/${name}`,review:'Top viewport comparison; candidate, not acceptance. Before density may differ.'});
}
await writeFile(`${out}/comparison.json`,JSON.stringify(pairs,null,2));
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1500,height:1080}});
for(let start=0;start<pairs.length;start+=6){
 let html='<body style="margin:0;background:#ddd;font:14px sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">';
 for(const p of pairs.slice(start,start+6)){
 html+=`<section><b>${p.name} — before / after</b><div style="display:flex;gap:4px;height:310px;background:#aaa">`;
 for(const path of [p.before,p.after]) html+=path?`<img style="width:350px;height:310px;object-fit:contain;object-position:top;" src="data:image/png;base64,${(await readFile(path)).toString('base64')}">`:'<div style="width:350px">No matching Phase 1 state capture</div>';
 html+='</div></section>';
 }
 html+='</div>';await page.setContent(html);await page.evaluate(async()=>{await Promise.all([...document.images].map(async img=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=Math.min(900,img.naturalHeight);c.getContext('2d').drawImage(img,0,0);img.src=c.toDataURL();await img.decode();}));});await page.screenshot({path:`${out}/comparison-${start/6+1}.png`,fullPage:true});
}
await browser.close();console.log(`${pairs.length} pairs; ${pairs.filter(p=>p.before).length} matching before images`);
