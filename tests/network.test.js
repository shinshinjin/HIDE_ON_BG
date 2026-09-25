import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {RoomNetwork} from '../src/core/network.js';import {createRoom,uid,PROTOCOL} from '../src/core/room.js';
class Connection extends EventEmitter{constructor(){super();this.open=true;this.sent=[];}send(m){this.sent.push(structuredClone(m));}close(){if(!this.open)return;this.open=false;this.emit('close');}}
function fixture(){const self={id:uid(),name:'Host'},n=new RoomNetwork({self,onState:()=>{},onStatus:()=>{},onError:()=>{},onPersist:()=>{}});n.isHost=true;n.room=createRoom(self,'test','multi','ABCDEFGHJK');return n;}
const hello=(id=uid(),token=uid(),name='Guest')=>({type:'hello',protocol:PROTOCOL,id,token,name});
test('authenticated host transport rejects spoofing, duplicates, replay and stale revision',()=>{
 const n=fixture(),c=new Connection(),h=hello();n.accept(c);c.emit('data',h);assert.equal(n.room.players.length,2);assert.equal(n.tokens[h.id],h.token);assert.equal(JSON.stringify(c.sent).includes(h.token),false);
 const other=new Connection();n.accept(other);other.emit('data',{...h,token:uid()});assert.match(other.sent.at(-1).message,/인증/);
 const duplicate=new Connection();n.accept(duplicate);duplicate.emit('data',h);assert.match(duplicate.sent.at(-1).message,/다른 탭/);
 const before=n.room.revision;const req={type:'action',requestId:uid(),revision:before,action:{type:'ready'}};c.emit('data',req);assert.equal(n.room.players[1].ready,true);c.emit('data',req);assert.equal(n.room.players[1].ready,true);
 c.emit('data',{...req,requestId:uid()});assert.match(c.sent.at(-1).message,/갱신/);assert.equal(n.room.revision,before+1);
 c.emit('data',{type:'action',requestId:uid(),revision:n.room.revision,action:{type:'start'}});assert.match(c.sent.at(-1).message,/Host/);
 c.close();assert.equal(n.room.players[1].online,false);const re=new Connection();n.accept(re);re.emit('data',h);assert.equal(n.room.players[1].online,true);assert.equal(n.room.players.length,2);
 n.stop();
});
test('new joins during play rejected; existing authenticated session recovers',()=>{const n=fixture(),c=new Connection(),h=hello();n.accept(c);c.emit('data',h);c.emit('data',{type:'action',requestId:uid(),revision:n.room.revision,action:{type:'ready'}});n.action({type:'start'});c.close();const fresh=new Connection();n.accept(fresh);fresh.emit('data',hello(uid(),uid(),'New'));assert.match(fresh.sent.at(-1).message,/시작된/);const re=new Connection();n.accept(re);re.emit('data',h);assert.equal(n.room.players[1].online,true);n.stop();});
test('heartbeat returns current authoritative snapshot; expired channel is rejected',()=>{const n=fixture(),c=new Connection(),h=hello();n.accept(c);c.emit('data',h);c.emit('data',{type:'ping'});assert.equal(c.sent.at(-1).type,'state');assert.equal(c.sent.at(-1).room.revision,n.room.revision);n.clients.delete(h.id);c.emit('data',{type:'ping'});assert.equal(c.sent.at(-1).retry,true);n.stop();});
test('Bluff transport filters publish, heartbeat, stale, replay and reconnect snapshots',()=>{
 const n=fixture();n.room.gameId='bluff';const a=new Connection(),b=new Connection(),ha=hello(uid(),uid(),'A'),hb=hello(uid(),uid(),'B');n.accept(a);a.emit('data',ha);n.accept(b);b.emit('data',hb);
 for(const [c,h] of [[a,ha],[b,hb]])c.emit('data',{type:'action',requestId:uid(),revision:n.room.revision,action:{type:'ready'}});
 n.action({type:'start'});
 const check=(c,id)=>{for(const m of c.sent.filter(m=>m.type==='state'&&m.room.game)){const g=m.room.game;assert.equal(Object.hasOwn(g,'dice'),false);assert.deepEqual(g.ownDice,n.room.game.dice[id]);assert.equal(g.result,null);assert.deepEqual(g.history,[]);}};
 a.emit('data',{type:'ping'});
 const req={type:'action',requestId:uid(),revision:n.room.revision,action:{type:'chat',text:'public only'}};a.emit('data',req);a.emit('data',req);a.emit('data',{...req,requestId:uid(),revision:-1,action:{type:'bid',count:1,face:1,round:1}});
 check(a,ha.id);check(b,hb.id);a.close();const re=new Connection();n.accept(re);re.emit('data',ha);check(re,ha.id);assert.equal(n.room.players.length,3);n.stop();
});
