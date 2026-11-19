import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const base = 'https://chosen37.github.io/Chosen37/denver-preview/';
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const chrome = spawn('google-chrome',['--headless','--disable-dev-shm-usage','--remote-debugging-port=9222','--user-data-dir=/tmp/vail-breeze-capture','about:blank'],{stdio:'ignore'});
try {
  let target;
  for (let n=0;n<60&&!target;n++) {
    await sleep(300);
    try { target=(await (await fetch('http://127.0.0.1:9222/json/list')).json()).find(item=>item.type==='page'); } catch {}
  }
  if (!target) throw Error('Chrome did not become ready');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
  const pending=new Map(); let seq=0;
  socket.onmessage=({data})=>{const m=JSON.parse(data);const p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++seq,{resolve,reject});socket.send(JSON.stringify({id:seq,method,params}));});
  async function evaluate(expression) {const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
  await mkdir('homepage-previews',{recursive:true});
  for (const [name,width,height] of [['desktop',1440,960],['mobile',390,844]]) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
    await cdp('Page.navigate',{url:base});
    let ready=false;
    for(let n=0;n<80&&!ready;n++){await sleep(250);ready=await evaluate("document.readyState==='complete' && document.querySelector('.vb-frame img')?.naturalWidth > 0");}
    if(!ready)throw Error('The public preview or its hero photo did not load');
    await evaluate('document.fonts.ready.then(()=>true)');
    await evaluate("document.querySelector('.vb-scenes a:nth-child(2)').click();document.querySelector('.vb-scenes a:nth-child(3)').click();document.querySelector('.vb-scenes a:first-child').click();");
    const layout=await evaluate("({hero:document.querySelector('.vb-frame:not([hidden])').id, width:document.documentElement.scrollWidth,viewport:innerWidth,guest:document.querySelector('.vb-actions a').getAttribute('href'),owner:document.querySelector('.vb-actions a:nth-child(2)').getAttribute('href')})");
    console.log(name,JSON.stringify(layout));
    if(layout.width>width+1||layout.hero!=='scene-prime-downtown'||layout.guest!=='stays.html'||layout.owner!=='management.html')throw Error('Homepage layout or navigation check failed');
    if(name==='mobile'){const menuCheck=await evaluate("(()=>{const b=document.querySelector('.menu-toggle'),n=document.querySelector('#main-nav');b.click();const open=b.getAttribute('aria-expanded')==='true'&&getComputedStyle(n).display!=='none';b.click();return open})()");if(!menuCheck)throw Error('Mobile menu did not open');}
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile('homepage-previews/'+name+'.png',Buffer.from(shot.data,'base64'));
  }
  socket.close();
} finally {chrome.kill();}
