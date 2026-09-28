import assert from 'node:assert/strict';
export async function testDarkhorse({page,click,until,contexts}){
 for(const context of contexts)await context.close();contexts.length=0;
 async function oneAction(p){
  const before=await p.locator('.darkhorse-sheet').getAttribute('data-step');
  if(await p.locator('[data-action="darkPlace"]:enabled').count())await p.locator('[data-action="darkPlace"]:enabled').first().click();
  else{
   await p.locator('[data-action="darkSelect"]:enabled').first().click();
   const first=p.locator('[data-action="darkTarget"]').first();await first.click();
   await until(async()=>await p.locator('.darkhorse-sheet').getAttribute('data-step')!==before||(await p.locator('.darkhorse-targets').innerText().catch(()=>'' )).includes('교환할 다른 말'));
   // A swap selects two horses; all other effects apply after one target.
   if(await p.locator('.darkhorse-targets').count()){
    const text=await p.locator('.darkhorse-targets').innerText();
    if(text.includes('교환할 다른 말'))await p.locator('[data-action="darkTarget"]').first().click();
   }
  }
 }
 const solo=await page('순위전 혼자',390);await solo.locator('#game-select').selectOption('darkhorse');await click(solo,'rules');assert((await solo.locator('.rules').innerText()).includes('자체 변형'));await click(solo,'home');await click(solo,'solo');
 for(let i=0;i<20;i++){
  await until(async()=>await solo.locator('.result').isVisible()||await solo.locator('[data-action="darkPlace"]:enabled,[data-action="darkSelect"]:enabled').count()>0);
  if(await solo.locator('.result').isVisible())break;await oneAction(solo);
 }
 await until(()=>solo.locator('.result').isVisible());assert.equal(await solo.locator('.darkhorse-sheet').getAttribute('data-step'),'17');assert(await solo.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await solo.reload();await click(solo,'saves');await solo.locator('[data-action="restore"]').first().click();await until(()=>solo.locator('.result').isVisible());
 for(let i=0;i<2;i++){
  await click(solo,i===0?'rematch':'solo');await until(()=>solo.locator('.darkhorse-sheet').isVisible());
  await until(()=>solo.locator('[data-action="darkPlace"]:enabled').count().then(n=>n>0));
  const step=Number(await solo.locator('.darkhorse-sheet').getAttribute('data-step'));await oneAction(solo);
  await until(()=>solo.locator('.darkhorse-sheet').getAttribute('data-step').then(n=>Number(n)>=step+1));
  await click(solo,'leave');await until(()=>solo.locator('#game-select').isVisible());
 }
 console.log('PASS Darkhorse solo AI, rules, finished save restore, repeated rematch/close lifecycle, mobile');
 const host=await page('순위전 Host');await click(host,'host');await until(()=>host.locator('#room-code').isVisible());const code=await host.locator('#room-code').innerText(),peers=[host];
 for(let i=1;i<6;i++){const p=await page('순위전 '+i,i%2?390:1280);await p.locator('#invite').fill(code);await click(p,'join');await until(()=>p.locator('[data-action="ready"]').isVisible());await click(p,'ready');peers.push(p);}
 await until(()=>host.locator('[data-action="start"]').isEnabled());await host.locator('[data-action="selectGame"][data-game="darkhorse"]').click();
 for(const p of peers.slice(1)){await until(()=>p.locator('[data-action="ready"]').innerText().then(t=>t==='준비 완료'));await click(p,'ready');}
 await until(()=>host.locator('[data-action="start"]').isEnabled());await click(host,'start');
 for(const p of peers)await until(()=>p.locator('.darkhorse-sheet').isVisible());
 const ids=[];for(const p of peers)ids.push(await p.locator('.darkhorse-players tr').filter({hasText:'(나)'}).getAttribute('data-player'));
 async function synchronizedAction(){
  const before=Number(await host.locator('.darkhorse-sheet').getAttribute('data-step')),id=await host.locator('.darkhorse-sheet').getAttribute('data-turn'),p=peers[ids.indexOf(id)];
  await until(()=>p.locator('[data-action="darkPlace"]:enabled,[data-action="darkSelect"]:enabled').count().then(n=>n>0));await oneAction(p);
  for(const q of peers)await until(()=>q.locator('.darkhorse-sheet').getAttribute('data-step').then(v=>Number(v)===before+1));
 }
 for(let i=0;i<7;i++)await synchronizedAction();
 for(const p of peers)assert.equal(await p.locator('.darkhorse-hand button').count(),5);
 assert.equal((await peers[1].locator('.darkhorse-players').innerText()).split('비공개').length-1,5);
 const hand=await peers[1].locator('.darkhorse-hand button').evaluateAll(nodes=>nodes.map(n=>n.dataset.card));
 await peers[1].reload();await click(peers[1],'rejoin');await until(()=>peers[1].locator('.darkhorse-sheet').isVisible(),45000);
 assert.deepEqual(await peers[1].locator('.darkhorse-hand button').evaluateAll(nodes=>nodes.map(n=>n.dataset.card)),hand);
 await host.reload();await click(host,'saves');await host.locator('[data-action="restore"]').first().click();await until(()=>host.locator('.darkhorse-sheet').isVisible(),45000);
 for(const p of peers)await until(()=>p.locator('.statusbar').innerText().then(t=>t.includes('연결됨')),45000);
 assert.equal(await host.locator('.darkhorse-sheet').getAttribute('data-step'),'7');assert.deepEqual(await peers[1].locator('.darkhorse-hand button').evaluateAll(nodes=>nodes.map(n=>n.dataset.card)),hand);
 await peers[1].locator('#chat').fill('순위전 복구 확인');await peers[1].locator('#chat').press('Enter');await until(()=>host.locator('.message p').allTextContents().then(a=>a.includes('순위전 복구 확인')));
 await peers[1].screenshot({path:'test-results/darkhorse-mobile-private.png',fullPage:true});assert(await peers[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(let i=0;i<30;i++)await synchronizedAction();
 const ranking=await host.locator('.darkhorse-order tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.horse));for(const p of peers){await until(()=>p.locator('.result').isVisible());assert.deepEqual(await p.locator('.darkhorse-order tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.horse)),ranking);assert.equal(await p.locator('.result h2').innerText(),await host.locator('.result h2').innerText());}
 await host.screenshot({path:'test-results/darkhorse-six-player-result.png',fullPage:true});
 console.log('PASS Darkhorse six-peer WebRTC: select, ready, 7 placements, private cards, guest refresh, Host restore, chat, 30 card actions, shared final ranking');
}
