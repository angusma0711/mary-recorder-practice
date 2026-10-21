// Recorder play-along: note blocks scroll to the line while the recorder shows which holes to cover.
// Songs are edited here. Each note is [name, beats, lyric]; name null is a rest.
// B, A and G use the same fingering in Baroque and German systems.
(function () {
 const NOTES = {
  B: { color: '#4a86e8', dark: '#2f5fb3', freq: 493.88, holes: [0, 1] },
  A: { color: '#f2b818', dark: '#a87b00', freq: 440, holes: [0, 1, 2] },
  G: { color: '#3fae6a', dark: '#23774a', freq: 392, holes: [0, 1, 2, 3] },
 };
 const ROWS = ['B', 'A', 'G'];
 const SONGS = {
  bag: { title: 'B、A、G 練習', notes: [
   ['B', 1], ['B', 1], ['B', 1], [null, 1], ['A', 1], ['A', 1], ['A', 1], [null, 1], ['G', 1], ['G', 1], ['G', 1], [null, 1],
   ['B', 1], ['A', 1], ['G', 1], [null, 1], ['G', 1], ['A', 1], ['B', 1], [null, 1], ['B', 1], ['A', 1], ['G', 2]] },
  // B A G version: the third phrase uses B B B instead of the original high notes.
  mary: { title: 'Mary Had a Little Lamb', notes: [
   ['B', 1, 'Ma'], ['A', 1, 'ry'], ['G', 1, 'had'], ['A', 1, 'a'], ['B', 1, 'lit'], ['B', 1, 'tle'], ['B', 2, 'lamb,'],
   ['A', 1, 'lit'], ['A', 1, 'tle'], ['A', 2, 'lamb,'], ['B', 1, 'lit'], ['B', 1, 'tle'], ['B', 2, 'lamb,'],
   ['B', 1, 'Ma'], ['A', 1, 'ry'], ['G', 1, 'had'], ['A', 1, 'a'], ['B', 1, 'lit'], ['B', 1, 'tle'], ['B', 2, 'lamb,'],
   ['A', 1, 'fleece'], ['A', 1, 'was'], ['B', 1, 'white'], ['A', 1, 'as'], ['G', 4, 'snow.']] },
 };
 const TEMPOS = [{ label: '慢', bpm: 60 }, { label: '中', bpm: 80 }, { label: '快', bpm: 100 }];
 const COUNT_IN = 4, PX_PER_BEAT = 150, HIT_X = 250, LANE_W = 1424;
 const games = [];
 let audio = null;
 const voices = new Set();
 function silence(){voices.forEach(osc=>{try{osc.stop();}catch{}});voices.clear();}
 const ensureAudio = async () => {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state !== 'running') await Promise.race([audio.resume().catch(() => {}), new Promise(r => setTimeout(r, 250))]);
  return audio.state === 'running';
 };
 function tone(freq, seconds, volume = .22) {
  if (!audio || audio.state !== 'running') return;
  const t = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = freq > 1000 ? 'square' : 'sine'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + .03);
  gain.gain.setValueAtTime(volume, t + Math.max(.05, seconds - .08)); gain.gain.linearRampToValueAtTime(0, t + seconds);
  voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
  osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + seconds + .02);
 }
 function recorderSVG() {
  // Back thumb hole drawn separately on the left, then front holes 1–7 (6 and 7 are double holes).
  const front = [1, 2, 3, 4, 5, 6, 7].map((n, i) => {
   const x = 470 + i * 105;
   return n >= 6 ? `<g data-hole="${n}"><circle cx="${x - 9}" cy="70" r="9"/><circle cx="${x + 11}" cy="70" r="12"/></g>` : `<circle data-hole="${n}" cx="${x}" cy="70" r="${n === 3 ? 19 : 21}"/>`;
  }).join('');
  return `<svg class="rec-recorder" viewBox="0 0 1424 150" role="img" aria-label="直笛指法">
   <path d="M30 48 Q30 30 60 30 L250 36 L1240 44 Q1300 40 1330 30 Q1372 34 1376 70 Q1372 106 1330 110 Q1300 100 1240 96 L250 104 L60 110 Q30 110 30 92 Z" fill="#fbf6e9" stroke="#cdbf9c" stroke-width="3"/>
   <rect x="70" y="56" width="70" height="28" rx="6" fill="#e6dcc3"/><line x1="360" y1="38" x2="360" y2="102" stroke="#d9cdb0" stroke-width="3"/><line x1="1180" y1="42" x2="1180" y2="98" stroke="#d9cdb0" stroke-width="3"/>
   <g class="rec-thumb" data-hole="0"><circle cx="300" cy="70" r="23"/><text x="300" y="131" text-anchor="middle">拇指（背面）</text></g>
   <g class="rec-front">${front}</g>
   <text x="470" y="131" text-anchor="middle">1</text><text x="575" y="131" text-anchor="middle">2</text><text x="680" y="131" text-anchor="middle">3</text>
  </svg>`;
 }
 function mount(section, songId) {
  const song = SONGS[songId];
  const notes = []; let beat = 0;
  for (const [name, beats, lyric] of song.notes) { if (name) notes.push({ name, start: beat, beats, lyric: lyric || '' }); beat += beats; }
  const total = beat;
  section.classList.add('rec-slide');
  section.innerHTML = `<div class="rec-head"><h2>${section.dataset.heading}</h2><p class="rec-status" aria-live="polite">按「開始」</p><div class="rec-controls">
    <button type="button" class="primary" data-rec="play">▶ 開始</button><button type="button" data-rec="restart">↺ 重來</button>
    <button type="button" data-rec="tempo">速度：中</button><button type="button" data-rec="sound" aria-pressed="true">🔊 示範</button>${songId === 'mary' ? '<button type="button" data-rec="score" aria-pressed="true">跟奏畫面</button>' : ''}</div></div>
   ${songId === 'mary' ? '<figure class="rec-score-panel"><img src="assets/mary-had-a-little-lamb-score.svg?v=mary-score-1" alt="瑪莉有隻小綿羊：教師原稿重繪五線譜，四四拍，八小節，音名 B、A、G"></figure>' : ''}
   <div class="rec-progress"><span></span></div>
   <div class="rec-lane"><div class="rec-rows">${ROWS.map(r => `<button type="button" class="rec-row-label" data-show="${r}" style="--c:${NOTES[r].color}">${r}</button>`).join('')}</div>
    <div class="rec-window"><div class="rec-hit"></div><div class="rec-blocks">${notes.map((n, i) => `<div class="rec-block" data-i="${i}" style="--c:${NOTES[n.name].color};--d:${NOTES[n.name].dark};top:${ROWS.indexOf(n.name) * 33.333}%;width:${n.beats * PX_PER_BEAT - 12}px"><b>${n.name}</b>${n.lyric ? `<small>${n.lyric}</small>` : ''}</div>`).join('')}</div></div></div>
   <div class="rec-bottom">${recorderSVG()}<div class="rec-badge"><span class="rec-now">B</span><small class="rec-next"></small></div></div>
   <button type="button" class="rec-enable" hidden>點此啟用聲音</button>`;
  const q = s => section.querySelector(s);
  const blocks = [...section.querySelectorAll('.rec-block')];
  const holes = [...section.querySelectorAll('[data-hole]')];
  let playing = false, position = -COUNT_IN, startedAt = 0, frame = 0, tempo = 1, sound = true, lastNote = -1, lastCount = null, shown = null;
  const bpm = () => TEMPOS[tempo].bpm;
  function finger(name, upcoming) {
   const n = NOTES[name];
   holes.forEach(h => { const on = n.holes.includes(+h.dataset.hole); h.classList.toggle('on', on); h.style.setProperty('--c', n.color); });
   q('.rec-badge').style.setProperty('--c', n.color); q('.rec-now').textContent = name;
   q('.rec-next').textContent = upcoming ? `下一個：${upcoming}` : '';
  }
  function draw() {
   const now = position;
   blocks.forEach((b, i) => {
    const n = notes[i], x = HIT_X + (n.start - now) * PX_PER_BEAT;
    b.style.transform = `translateX(${x}px)`;
    b.classList.toggle('now', now >= n.start && now < n.start + n.beats);
    b.classList.toggle('past', now >= n.start + n.beats);
    b.style.visibility = x > LANE_W + 40 || x + n.beats * PX_PER_BEAT < -40 ? 'hidden' : 'visible';
   });
   q('.rec-progress span').style.width = `${Math.max(0, Math.min(1, now / total)) * 100}%`;
   if (shown) return;
   const index = notes.findIndex(n => now < n.start + n.beats);
   const n = notes[Math.max(0, index)] ?? notes[notes.length - 1];
   const after = notes[notes.indexOf(n) + 1];
   finger(n.name, after?.name);
  }
  function setStatus(text) { q('.rec-status').textContent = text; }
  function tick() {
   position = (performance.now() - startedAt) / 1000 * bpm() / 60 - COUNT_IN;
   if (position < 0) {
    const count = Math.floor(position + COUNT_IN) + 1;
    if (count !== lastCount) { lastCount = count; setStatus(`預備 ${count}`); tone(count === 1 ? 1600 : 1200, .05, .12); }
   } else {
    const index = notes.findIndex(n => position >= n.start && position < n.start + n.beats);
    if (index >= 0 && index !== lastNote) { lastNote = index; if (sound) tone(NOTES[notes[index].name].freq, notes[index].beats * 60 / bpm() * .9); }
    setStatus(sound ? '聽一聽' : '一起吹！');
   }
   draw();
   if (position >= total) { stop(); position = total; draw(); setStatus('完成！🎉'); q('[data-rec="play"]').textContent = '▶ 開始'; return; }
   frame = requestAnimationFrame(tick);
  }
  function setScore(on) {
   if (songId !== 'mary') return;
   if (on && playing) pause();
   section.classList.toggle('rec-score-view', on);
   const button = q('[data-rec="score"]');
   button.textContent = on ? '跟奏畫面' : '查看樂譜';
   button.setAttribute('aria-pressed', String(on));
  }
  function toggleScore() { setScore(!section.classList.contains('rec-score-view')); }
  async function play() {
   setScore(false);
   if (playing) { pause(); return; }
   shown = null;
   if (position >= total) position = -COUNT_IN;
   const ok = await ensureAudio(); q('.rec-enable').hidden = ok;
   playing = true; lastCount = null; lastNote = -1;
   startedAt = performance.now() - (position + COUNT_IN) * 60 / bpm() * 1000;
   q('[data-rec="play"]').textContent = '⏸ 暫停';
   frame = requestAnimationFrame(tick);
  }
  function stop() { playing = false; cancelAnimationFrame(frame); silence(); }
  function pause() { stop(); q('[data-rec="play"]').textContent = '▶ 繼續'; setStatus('已暫停'); }
  function restart() { stop(); shown = null; position = -COUNT_IN; q('[data-rec="play"]').textContent = '▶ 開始'; setStatus('按「開始」'); draw(); }
  function cycleTempo() {
   const was = playing; if (was) stop();
   tempo = (tempo + 1) % TEMPOS.length; q('[data-rec="tempo"]').textContent = `速度：${TEMPOS[tempo].label}`;
   if (was) { playing = false; play(); }
  }
  function toggleSound() { sound = !sound; if(!sound)silence(); const b = q('[data-rec="sound"]'); b.setAttribute('aria-pressed', String(sound)); b.textContent = sound ? '🔊 示範' : '🔇 學生吹'; }
  // Show one note's fingering (and play it) while stopped, for teaching B, A, G one at a time.
  async function show(name) {
   if (playing) pause();
   shown = name; finger(name, ''); setStatus(`${name} 的指法`);
   if (await ensureAudio()) tone(NOTES[name].freq, .9);
  }
  section.addEventListener('click', event => {
   const button = event.target.closest('button'); if (!button) return;
   if (button.dataset.rec === 'play') play(); else if (button.dataset.rec === 'restart') restart();
   else if (button.dataset.rec === 'tempo') cycleTempo(); else if (button.dataset.rec === 'sound') toggleSound();
   else if (button.dataset.rec === 'score') toggleScore();
   else if (button.dataset.show) show(button.dataset.show);
   else if (button.classList.contains('rec-enable')) audio?.resume().then(() => { button.hidden = audio.state === 'running'; });
  });
  draw();
  if (songId === 'mary') { section.classList.add('rec-mary'); setScore(true); }
  const game = { section, play, restart, cycleTempo, toggleSound, toggleScore, show, stop: () => { if (playing) pause(); } };
  games.push(game);
  return game;
 }

 function noteNotation(name) {
  // Treble staff: E4(bottom) to F5(top), 24 units per line spacing.
  const y = { B: 114, A: 126, G: 138 }[name];
  const color = NOTES[name].color;
  const lines = [66, 90, 114, 138, 162].map(line => `<line x1="28" y1="${line}" x2="368" y2="${line}"/>`).join('');
  const stem = name === 'B'
   ? `<line x1="225" y1="${y}" x2="225" y2="${y + 84}"/>`
   : `<line x1="255" y1="${y}" x2="255" y2="${y - 84}"/>`;
  return `<svg class="rec-note-notation" viewBox="0 0 560 250" role="img" aria-label="${name} 音高音譜號五線譜">
   <g class="rec-staff-lines">${lines}</g>
   <text class="rec-music-glyph" x="48" y="138" font-size="96">&#xE050;</text>
   <g fill="${color}" stroke="${color}" stroke-width="3.5"><ellipse cx="240" cy="${y}" rx="17" ry="10.5" transform="rotate(-18 240 ${y})"/>${stem}</g>
   <text class="rec-pitch-name" x="464" y="141" text-anchor="middle" fill="${color}">${name}</text>
  </svg>`;
 }
 function mountNote(section, name) {
  const note = NOTES[name];
  if (!note) return;
  // Separate front/back views keep the thumb hole off the front of the recorder.
  const graphic = recorderSVG().replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, '');
  section.innerHTML = `${noteNotation(name)}<div class="rec-note-pair">${graphic}${graphic}</div>`;
  const [front, back] = section.querySelectorAll('.rec-note-pair svg');
  front.querySelector('.rec-thumb').remove();
  front.setAttribute('aria-label', `${name} 音正面：前 ${note.holes.length - 1} 孔按實，其餘打開`);
  back.querySelector('.rec-front').remove();
  back.querySelector('rect').remove();
  back.querySelector('.rec-thumb circle').setAttribute('cx', '420');
  back.setAttribute('aria-label', `${name} 音背面：拇指孔按實`);
  section.querySelectorAll('[data-hole]').forEach(hole => {
   hole.classList.toggle('on', note.holes.includes(Number(hole.dataset.hole)));
   hole.style.setProperty('--c', note.color);
  });
 }
 window.RecorderGame = {
  mountNote,
  mount,
  stopAll() { games.forEach(game => game.stop()); },
  find(section) { return games.find(game => game.section === section); },
 };
})();
