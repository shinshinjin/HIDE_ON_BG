import assert from 'node:assert/strict';
export async function testBluff({page,click,until,contexts}){
 // Reuse the existing runner and the same WebRTC service, no second test server.
 for(const context of contexts)await context.close();contexts.length=0;
 const solo=await page('블러프 혼자',390);await solo.locator('#game-select').selectOption('bluff');await click(solo,'solo');
 for(let i=0;i<60;i++){
  await until(async()=>await solo.locator('.result').isVisible()||await solo.locator('[data-action="nextRound"]').isVisible()||(await solo.locator('[data-action="bluffBid"]:enabled').count())>0);
  if(await solo.locator('.result').isVisible())break;
  if(await solo.locator('[data-action="nextRound"]').isVisible())await click(solo,'nextRound');
  else {const challenge=solo.locator('[data-action="challenge"]');if(await challenge.isEnabled())await challenge.click();else{await solo.locator('#bluff-bid').selectOption('20:5');await click(solo,'bluffBid');}}
 }
 await until(()=>solo.locator('.result').isVisible());assert(await solo.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS Bluff solo versus AI to final winner');
 const host=await page('블러프 Host');await click(host,'host');await until(()=>host.locator('#room-code').isVisible());const code=await host.locator('#room-code').innerText();const peers=[host];
 for(let i=1;i<6;i++){const p=await page('블러프 '+i,i%2?390:1280);await p.locator('#invite').fill(code);await click(p,'join');await until(()=>p.locator('[data-action="ready"]').isVisible());await click(p,'ready');peers.push(p);}
 await until(()=>host.locator('[data-action="start"]').isEnabled());await host.locator('[data-action="selectGame"][data-game="bluff"]').click();
 for(const p of peers.slice(1)){await until(()=>p.locator('.game-picker').innerText().then(v=>v.includes('Bluff')));await until(()=>p.locator('[data-action="ready"]').innerText().then(t=>t==='준비 완료'));await click(p,'ready');}
 await until(()=>host.locator('[data-action="start"]').isEnabled());
 const extra=await page('정원 초과');await extra.locator('#invite').fill(code);await click(extra,'join');await until(()=>extra.locator('#notice').innerText().then(t=>t.includes('가득')));await extra.context().close();
 await click(host,'start');for(const p of peers)await until(()=>p.locator('.bluff-sheet').isVisible());
 assert.equal(await peers[1].locator('.bluff-dice .die').count(),5);assert.equal(await peers[1].locator('.revealed-dice').count(),0);assert.equal(await peers[1].locator('.bluff-players').innerText().then(t=>(t.match(/5개 비공개/g)||[]).length),5);
 const privateDice=await peers[1].locator('.bluff-dice b').allTextContents();
 await peers[1].reload();await click(peers[1],'rejoin');await until(()=>peers[1].locator('.bluff-sheet').isVisible(),45000);assert.deepEqual(await peers[1].locator('.bluff-dice b').allTextContents(),privateDice);
 await host.reload();await click(host,'saves');await host.locator('[data-action="restore"]').first().click();await until(()=>host.locator('.bluff-sheet').isVisible(),45000);for(const p of peers)await until(()=>p.locator('.statusbar').innerText().then(t=>t.includes('연결됨')),45000);
 assert.deepEqual(await peers[1].locator('.bluff-dice b').allTextContents(),privateDice);
 await peers[1].locator('#chat').fill('Bluff 연결 복구 확인');await peers[1].locator('#chat').press('Enter');await until(()=>host.locator('.message p').allTextContents().then(a=>a.includes('Bluff 연결 복구 확인')));
 await peers[1].screenshot({path:'test-results/bluff-mobile-private.png',fullPage:true});assert(await peers[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const ids=[];for(const p of peers)ids.push(await p.locator('.bluff-players tr').filter({hasText:'(나)'}).getAttribute('data-player'));
 async function actor(){const id=await host.locator('.bluff-sheet').getAttribute('data-turn');return peers[ids.indexOf(id)];}
 async function makeBid(value){const p=await actor();await until(()=>p.locator('[data-action="bluffBid"]').isEnabled());await p.locator('#bluff-bid').selectOption(value);await click(p,'bluffBid');const expected=value==='1:1'?'1 × 1개 이상':'5 × 20개 이상';for(const q of peers)await until(()=>q.locator('.bluff-bid').innerText().then(t=>t===expected));}
 // Exercise a real rising declaration before the first challenge.
 await makeBid('1:1');
 for(let round=1;round<=30;round++){
  await makeBid('20:5');const p=await actor();await until(()=>p.locator('[data-action="challenge"]').isEnabled());await click(p,'challenge');
  for(const q of peers)await until(()=>q.locator('.bluff-sheet').getAttribute('data-stage').then(t=>t==='result'));
  const counts=await host.locator('.bluff-count').allTextContents();for(const q of peers)assert.deepEqual(await q.locator('.bluff-count').allTextContents(),counts);
  assert(await host.locator('.revealed-dice').count()===6);
  if(await host.locator('.result').isVisible())break;
  await click(host,'nextRound');for(const q of peers)await until(()=>q.locator('.bluff-sheet').getAttribute('data-stage').then(t=>t==='bid'));
 }
 for(const p of peers)await until(()=>p.locator('.result').isVisible());const result=await host.locator('.result h2').innerText();for(const p of peers)assert.equal(await p.locator('.result h2').innerText(),result);
 assert.equal((await host.locator('.bluff-count').allTextContents()).filter(v=>Number(v)>0).length,1);
 await host.screenshot({path:'test-results/bluff-six-player-result.png',fullPage:true});console.log('PASS Bluff six-peer WebRTC: switch game, readiness reset, capacity, private view, guest refresh, Host restore, chat, raise, challenge, reveal, loss, next round, elimination, final shared winner');
}
