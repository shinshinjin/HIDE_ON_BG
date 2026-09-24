// Repeatable CI integration tests using real WebRTC data channels and local signaling.
// Run: npm run test:e2e (after npx playwright install chromium).
import {chromium} from '@playwright/test';
import {PeerServer} from 'peer';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const web=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4175'},stdio:'inherit'});
const signal=PeerServer({port:9000,path:'/test',allow_discovery:false});
await mkdir('test-results',{recursive:true});
let browser;const failures=[];const contexts=[];
const base=process.env.E2E_BASE_URL||'http://localhost:4175';
const useCloud=process.env.E2E_CLOUD==='1';
const categories=['ones','twos','threes','fours','fives','sixes','choice','four','full','little','big','yacht'];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=30000){const end=Date.now()+ms;let last;while(Date.now()<end){try{if(await fn())return;}catch(e){last=e;}await delay(150);}throw last||Error('Timed out');}
async function page(name,width=1280){const context=await browser.newContext({viewport:{width,height:900}});contexts.push(context);if(!useCloud)await context.route('**/network-config.json',route=>route.fulfill({json:{peerOptions:{host:'localhost',port:9000,path:'/test',secure:false,config:{iceServers:[]}}}}));const p=await context.newPage();p.on('pageerror',e=>failures.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);await p.locator('#nickname').fill(name);return p;}
const click=(p,action)=>p.locator(`[data-action="${action}"]`).first().click();
async function takeTurn(p,cat){await until(()=>p.locator('[data-action="roll"]').isEnabled());await click(p,'roll');await until(()=>p.locator(`[data-category="${cat}"]`).isVisible());await p.locator(`[data-category="${cat}"]`).click();await until(()=>p.locator(`[data-category="${cat}"]`).count().then(n=>n===0));}
try{
 await until(async()=>{try{return (await fetch('http://localhost:4175')).ok;}catch{return false;}});
 browser=await chromium.launch({args:['--no-sandbox']});
 const solo=await page('테스트 혼자',390);await solo.screenshot({path:'test-results/mobile-home.png',fullPage:true});await click(solo,'solo');
 for(const cat of categories)await takeTurn(solo,cat);
 await until(()=>solo.locator('.result').isVisible());assert.equal(await solo.locator('.score-table tbody tr').count(),13);await solo.screenshot({path:'test-results/mobile-result.png',fullPage:true});
 assert.equal(await solo.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile page must not overflow');
 await solo.reload();await click(solo,'saves');await solo.locator('[data-action="restore"]').first().click();await until(()=>solo.locator('.result').isVisible());console.log('PASS solo full game, mobile layout, IndexedDB refresh restore');
 const host=await page('테스트 Host');await click(host,'host');await until(()=>host.locator('#room-code').isVisible());const code=await host.locator('#room-code').innerText();
 const guests=[];for(let i=1;i<=7;i++){const p=await page('참가 '+i,i%2?390:1280);await p.locator('#invite').fill(code);await click(p,'join');await until(()=>p.locator('[data-action="ready"]').isVisible());await click(p,'ready');guests.push(p);}
 await until(()=>host.locator('[data-action="start"]').isEnabled());assert.equal(await host.locator('.players-table tbody tr').count(),8);
 await guests[0].locator('#chat').fill('<b>테스트 메모</b>');await guests[0].locator('#chat').press('Enter');await until(()=>host.locator('.message p').allTextContents().then(a=>a.includes('<b>테스트 메모</b>')));assert.equal(await host.locator('.message p b').count(),0);
 await click(host,'start');await until(()=>guests[6].locator('.score-table').isVisible());await host.screenshot({path:'test-results/desktop-game.png',fullPage:true});
 // A refresh must recover the same player with its persistent token.
 await guests[0].reload();await click(guests[0],'rejoin');await until(()=>guests[0].locator('.score-table').isVisible(),45000);
 // Host closes and restores its own saved room. Other clients reconnect automatically.
 await host.reload();await click(host,'saves');await host.locator('[data-action="restore"]').first().click();await until(()=>host.locator('.score-table').isVisible(),45000);
 await until(()=>guests[0].locator('.statusbar').innerText().then(t=>t.includes('연결됨')),45000);
 for(const cat of categories){await takeTurn(host,cat);for(const p of guests)await takeTurn(p,cat);}
 for(const p of [host,...guests])await until(()=>p.locator('.result').isVisible());
 const totals=await host.locator('.total-row td').allTextContents();for(const p of guests)assert.deepEqual(await p.locator('.total-row td').allTextContents(),totals);
 await host.screenshot({path:'test-results/multiplayer-result.png',fullPage:true});
 const duplicate=await host.context().newPage();duplicate.on('dialog',d=>d.accept());await duplicate.goto(base);await click(duplicate,'host');await until(()=>duplicate.locator('#notice').innerText().then(t=>t.includes('다른 탭')));
 assert.deepEqual(failures,[]);console.log('PASS 8-peer real WebRTC: lobby, ready, chat escaping, 96 turns, guest refresh, host restore, shared results, duplicate-tab lock');
}catch(e){console.error(e);if(browser)for(let i=0;i<contexts.length;i++)for(const p of contexts[i].pages())await p.screenshot({path:`test-results/failure-${i}.png`,fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser?.close();web.kill();signal.close();}
