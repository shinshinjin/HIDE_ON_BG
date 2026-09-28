import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {RoomNetwork} from '../src/core/network.js';import {createRoom,uid,PROTOCOL} from '../src/core/room.js';
class Connection extends EventEmitter{constructor(){super();this.open=true;this.sent=[];}send(m){this.sent.push(structuredClone(m));}close(){if(this.open){this.open=false;this.emit('close');}}}
test('Darkhorse every transport snapshot is filtered; replay/reconnect/old channel/stop cannot duplicate actions',()=>{
 for(let cycle=0;cycle<3;cycle++){
  const self={id:uid(),name:'Host'},id=uid(),token=uid(),n=new RoomNetwork({self,onState:()=>{},onStatus:()=>{},onError:()=>{},onPersist:()=>{}});
  n.isHost=true;n.room=createRoom(self,'test','multi','ABCDEFGHJK','darkhorse');
  const hello={type:'hello',protocol:PROTOCOL,id,token,name:'Guest'},a=new Connection();n.accept(a);a.emit('data',hello);
  a.emit('data',{type:'action',requestId:uid(),revision:n.room.revision,action:{type:'ready'}});n.action({type:'start'});
  const check=c=>{for(const m of c.sent.filter(m=>m.type==='state'&&m.room.game)){const g=m.room.game;for(const key of ['hands','deck','seed','history'])assert(!Object.hasOwn(g,key));assert.deepEqual(g.ownHand,n.room.game.hands[id]);}};
  const actor=n.room.game.order[n.room.game.turn],action={type:'darkPlace',horse:1,step:0};
  if(actor===self.id)n.action(action);else{const req={type:'action',requestId:uid(),revision:n.room.revision,action};a.emit('data',req);a.emit('data',req);}
  assert.equal(n.room.game.step,1);
  a.emit('data',{type:'ping'});a.emit('data',{type:'action',requestId:uid(),revision:-1,action:{type:'darkPlace',horse:2,step:1}});check(a);
  a.close();const b=new Connection();n.accept(b);b.emit('data',hello);check(b);assert.equal(n.room.players.length,2);
  const rev=n.room.revision;a.emit('data',{type:'action',requestId:uid(),revision:rev,action:{type:'chat',text:'old connection'}});assert.equal(n.room.revision,rev);
  n.stop();const stopped=n.room.revision;b.emit('data',{type:'action',requestId:uid(),revision:stopped,action:{type:'chat',text:'stopped'}});assert.equal(n.room.revision,stopped);assert.equal(n.clients.size,0);assert([...n.timers].every(t=>t._destroyed));
 }
});
