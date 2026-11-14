const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);
(async()=>{
 const samples=[];
 for(let i=1;i<=3;i++){
  // Fresh browser PROCESS per sample; no shared HTTP or memory cache.
  const browser=await chromium.launch({headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:850}});
   await context.addInitScript(()=>localStorage.setItem('mutqin_lang','en'));
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   const page=await context.newPage();const cdp=await context.newCDPSession(page);
   await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:20,downloadThroughput:4*1024*1024/8,uploadThroughput:3*1024*1024/8,connectionType:'cellular4g'});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.goto(base+'/',{waitUntil:'load',timeout:45000});
   await page.locator('app-header app-logo').waitFor();
   await page.waitForTimeout(300);
   const value=await page.evaluate(()=>({title:document.title,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,resources:performance.getEntriesByType('resource').map(x=>({name:new URL(x.name).pathname,encodedBodySize:x.encodedBodySize,duration:x.duration})),appElements:document.querySelector('app-root')?.children.length}));
   assert.match(value.title,/Mr\. Adel Mostafa/);assert.ok(value.fcp>0);assert.ok(value.appElements>0);
   samples.push({sample:i,firstContentfulPaintMs:value.fcp,thresholdMs:1800,passed:value.fcp<=1800,title:value.title,appRootChildren:value.appElements,resources:value.resources});
  }finally{await browser.close()}
 }
 const result={boundary:'Parent measured actual local Angular production bundle, three independent browser processes, cache disabled, no SW, external network blocked. Does not prove staging capacity, provider push, or licensed DRM.',profile:{latencyMs:20,downloadBytesPerSecond:524288,uploadBytesPerSecond:393216,cpuRate:4},samples,passed:samples.every(x=>x.passed)};
 fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({samples:samples.map(x=>x.firstContentfulPaintMs),passed:result.passed}));process.exitCode=result.passed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
