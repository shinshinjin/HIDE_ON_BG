import {PeerServer} from 'peer';
PeerServer({port:9000,path:'/test',allow_discovery:false},()=>console.log('Local test signaling ready on 9000'));
