import * as engine from './yacht/engine.js';
import {categories,RULESET} from './yacht/scoring.js';
export const games={yacht:{id:'yacht',name:'Yacht Dice',minPlayers:2,maxPlayers:8,rules:RULESET,categories,...engine}};
export function getGame(id){if(!Object.hasOwn(games,id))throw Error('지원하지 않는 게임입니다.');return games[id];}
