'use strict';
const section=document.getElementById('practice');
const game=window.RecorderGame.mount(section,'mary');
const viewport=document.getElementById('viewport'),canvas=document.getElementById('canvas');
function fit(){const box=viewport.getBoundingClientRect();const scale=Math.max(.1,Math.min(box.width/1600,box.height/900));canvas.style.transform=`scale(${scale})`;}
new ResizeObserver(fit).observe(viewport);window.addEventListener('resize',fit);fit();
const dialog=document.getElementById('guide'),help=document.getElementById('help');
help.addEventListener('click',()=>{game.stop();dialog.showModal();help.setAttribute('aria-expanded','true');});
document.getElementById('close-guide').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>help.setAttribute('aria-expanded','false'));
document.getElementById('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.body.requestFullscreen();}catch{document.getElementById('fullscreen').textContent='請使用瀏覽器全螢幕';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game.stop();});window.addEventListener('pagehide',()=>game.stop());
document.addEventListener('keydown',event=>{if(dialog.open||event.repeat||event.target.closest('button,input,select,textarea,a'))return;if(event.code==='Space'){event.preventDefault();game.play();}else if(event.key.toLowerCase()==='r')game.restart();});
