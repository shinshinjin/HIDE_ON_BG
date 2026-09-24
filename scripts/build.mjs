import {mkdir,cp,rm,access} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/vendor',{recursive:true});await cp('index.html','dist/index.html');await cp('src','dist/src',{recursive:true});await cp('public','dist',{recursive:true});
try{await access('node_modules/peerjs/dist/peerjs.min.js');await cp('node_modules/peerjs/dist/peerjs.min.js','dist/vendor/peerjs.min.js');await cp('node_modules/peerjs/LICENSE','dist/vendor/peerjs-LICENSE.txt');}catch(e){if(process.env.CI)throw Error('PeerJS installation is required for deployment. Run npm install.');console.warn('PeerJS not installed. Solo works; multiplayer requires npm install and rebuild.');}
console.log('Built dist/ (relative URLs support GitHub Pages subpaths).');
