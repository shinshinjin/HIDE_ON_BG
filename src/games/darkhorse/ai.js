import {HORSES,cardById,effectOrder} from './rules.js';
// Only receives the same filtered information available to a human player.
export function chooseAI(g,id){
 if(g.stage==='placement')return {type:'darkPlace',horse:!g.horseOrder.includes(g.owners[id])?g.owners[id]:HORSES.find(h=>!g.horseOrder.includes(h)),step:g.step};
 const others=g.order.filter(p=>p!==id&&!g.forfeited.includes(p));
 const value=order=>-order.indexOf(g.owners[id])*10+others.reduce((n,p)=>n+order.indexOf(g.owners[p]),0);
 let best=null,score=-Infinity;
 for(const card of g.ownHand)for(const horse of HORSES)for(const other of cardById(card).kind==='swap'?HORSES.filter(h=>h!==horse):[null]){
  const v=value(effectOrder(g.horseOrder,card,horse,other));
  if(v>score){score=v;best={type:'darkPlay',card,horse,...(other===null?{}:{other}),step:g.step};}
 }
 if(!best)throw Error('사용 가능한 카드가 없습니다.');return best;
}
