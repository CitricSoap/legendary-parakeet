(async function(){
  // Game constants
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;

  // Parakeet state
  const bird = { x: 120, y: H/2, vy:0, radius: 18 }
  const gravity = 0.6; const flap = -10;
  let frames = 0; let pipes = []; let score = 0; let highscore = 0; let running = false; let gameOver = false;

  // DOM
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('highscore');
  const restartBtn = document.getElementById('restart');

  async function loadHigh(){
    // prefer server highscore, fallback to localStorage
    try{
      const res = await fetch('/api/highscore');
      if(res.ok){ const j = await res.json(); highscore = Number(j.highscore||0); highEl.textContent = highscore; return; }
    }catch(e){}
    highscore = parseInt(localStorage.getItem('lp_high')||'0',10);
    highEl.textContent = highscore;
  }

  async function saveHigh(){
    if(score>highscore){
      highscore=score; localStorage.setItem('lp_high',String(highscore)); highEl.textContent = highscore;
      try{
        await fetch('/api/highscore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({score:highscore})});
        // refresh global high display when server available
        fetchGlobalHigh();
      }catch(e){ /* ignore, keep local copy */ }
    }
  }

  // Leaderboard helpers
  const globalHighEl = document.getElementById('globalHigh');
  const refreshLeaderBtn = document.getElementById('refreshLeader');
  async function fetchGlobalHigh(){
    try{
      const res = await fetch('/api/highscore');
      if(!res.ok) return;
      const j = await res.json();
      if(globalHighEl) globalHighEl.textContent = (j.highscore || 0);
      if(highEl) highEl.textContent = (j.highscore || 0);
    }catch(e){ /* ignore */ }
  }
  if(refreshLeaderBtn) refreshLeaderBtn.addEventListener('click', fetchGlobalHigh);
  // initial fetch
  fetchGlobalHigh();
  
  // fetch leaderboard list
  const leaderList = document.getElementById('leaderList');
  async function fetchLeaderboard(){
    try{
      const res = await fetch('/api/leaderboard');
      if(!res.ok) return;
      const arr = await res.json();
      if(!leaderList) return;
      leaderList.innerHTML = '';
      arr.forEach((r,i)=>{
        const li = document.createElement('div');
        li.style.padding='6px 0';
        li.textContent = `${i+1}. ${r.username || 'anon'} — ${r.score}`;
        leaderList.appendChild(li);
      });
    }catch(e){}
  }
  fetchLeaderboard();

  // Clear leaderboard button (requires auth)
  const clearBtn = document.getElementById('clearLeaderboard');
  if(clearBtn){
    clearBtn.addEventListener('click', async ()=>{
      const ok = confirm('Clear leaderboard? (requires login)');
      if(!ok) return;
      try{
        const res = await authFetch('/api/leaderboard/clear', { method: 'POST' });
        if(res.ok){ alert('Leaderboard cleared'); fetchLeaderboard(); fetchGlobalHigh(); }
        else if(res.status===401) alert('You must be logged in to clear the leaderboard');
        else { const j = await res.json(); alert(j.error || 'Could not clear leaderboard'); }
      }catch(e){ alert('Failed to clear leaderboard'); }
    });
  }

  function reset(){ bird.y = H/2; bird.vy = 0; frames = 0; pipes = []; score = 0; gameOver = false; running = true; scoreEl.textContent = score; }

  function addPipe(){ const gap = 140; const minY = 60; const maxY = H - 60 - gap; const top = Math.floor(Math.random()*(maxY-minY))+minY; pipes.push({x:W+40, top, gap, w:60}); }

  function update(){ if(!running) return; frames++; // physics
    bird.vy += gravity; bird.y += bird.vy;
    if(frames%90===0) addPipe();
    // move pipes
    for(let i=pipes.length-1;i>=0;i--){ pipes[i].x -= 3.4; if(pipes[i].x + pipes[i].w < 0) pipes.splice(i,1); }

    // collision & scoring
    pipes.forEach(p=>{
      if(!p.scored && p.x + p.w < bird.x){ score++; p.scored = true; scoreEl.textContent = score; }
      // collision check
      const withinX = bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + p.w;
      if(withinX){ if(bird.y - bird.radius < p.top || bird.y + bird.radius > p.top + p.gap){ gameOver = true; running = false; saveHigh(); }}
    });

    // ground/sky
    if(bird.y - bird.radius < 0 || bird.y + bird.radius > H){ gameOver = true; running = false; saveHigh(); }
  }

  function drawParakeet(x,y,angle=0){ ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    // body
    ctx.fillStyle = '#f6f06e'; ctx.beginPath(); ctx.ellipse(0,0,18,14,0,0,Math.PI*2); ctx.fill();
    // wing
    ctx.fillStyle = '#6fcf97'; ctx.beginPath(); ctx.ellipse(-2,2,10,6,Math.PI/6,0,Math.PI*2); ctx.fill();
    // beak
    ctx.fillStyle = '#ffb86b'; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(18,4); ctx.lineTo(12,6); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = '#042f30'; ctx.beginPath(); ctx.arc(-2,-3,2.6,0,Math.PI*2); ctx.fill();
    ctx.restore(); }

  function draw(){ // background
    // sky gradient handled by CSS on canvas, draw subtle ground
    ctx.clearRect(0,0,W,H);
    // draw pipes
    pipes.forEach(p=>{
      ctx.fillStyle = '#2f8f9b';
      ctx.fillRect(p.x,0,p.w,p.top);
      ctx.fillRect(p.x,p.top+p.gap,p.w,H-(p.top+p.gap));
      // pipe rim
      ctx.fillStyle = '#1d6a6f'; ctx.fillRect(p.x,p.top-6,p.w,6); ctx.fillRect(p.x,p.top+p.gap,p.w,6);
    });

    // draw bird
    const tilt = Math.max(Math.min(bird.vy/8,1),-0.6);
    drawParakeet(bird.x,bird.y,tilt);

    if(!running && !gameOver){ // paused / waiting to start
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.font='20px system-ui'; ctx.textAlign='center'; ctx.fillText('Press Space or Click to start',W/2,H/2 - 80);
    }
    if(gameOver){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.font='34px system-ui'; ctx.textAlign='center'; ctx.fillText('Game Over',W/2,H/2 - 20); ctx.font='18px system-ui'; ctx.fillText('Press Restart to play again',W/2,H/2+14); }
  }

  function loop(){ update(); draw(); requestAnimationFrame(loop); }

  // Input
  function flapAction(){ if(gameOver) return; bird.vy = flap; running = true; }
  document.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(!running && !gameOver && frames===0) running=true; flapAction(); }});
  canvas.addEventListener('click', ()=>{ if(!running && frames===0) running=true; flapAction(); });
  restartBtn.addEventListener('click', ()=>{ reset(); });

  // init
  loadHigh(); reset(); loop();

  // --- Social feed + Auth ---
  const feedEl = document.getElementById('feed');
  const form = document.getElementById('postForm');
  const text = document.getElementById('postText');
  const STORAGE_KEY = 'lp_posts';

  // auth UI
  const inpUser = document.getElementById('inpUser');
  const inpPass = document.getElementById('inpPass');
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const loggedOut = document.getElementById('loggedOut');
  const loggedIn = document.getElementById('loggedIn');
  const who = document.getElementById('who');

  function escapeHtml(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  // Local fallback storage
  function readPostsLocal(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; } }
  function savePostsLocal(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  // token helpers
  function getToken(){ return localStorage.getItem('lp_token'); }
  function setToken(t){ if(t) localStorage.setItem('lp_token', t); else localStorage.removeItem('lp_token'); }
  let currentUser = null;

  async function authFetch(url, opts={}){
    opts.headers = opts.headers || {};
    const token = getToken();
    if(token) opts.headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, opts);
  }

  async function loadCurrentUser(){
    try{
      const res = await authFetch('/api/me');
      if(res.ok){ currentUser = await res.json(); showLoggedIn(); return; }
    }catch(e){}
    currentUser = null; showLoggedOut();
  }

  function showLoggedIn(){ if(!currentUser) return showLoggedOut(); loggedIn.style.display='inline-flex'; loggedOut.style.display='none'; who.textContent = currentUser.username; }
  function showLoggedOut(){ loggedIn.style.display='none'; loggedOut.style.display='inline-flex'; who.textContent=''; }

  btnRegister && btnRegister.addEventListener('click', async ()=>{
    const u = (inpUser.value||'').trim(); const p = inpPass.value||''; if(!u||!p) return alert('username & password required');
    try{
      const res = await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
      if(res.ok){ alert('registered — now login'); inpPass.value=''; } else { const j = await res.json(); alert(j.error || 'register failed'); }
    }catch(e){ alert('register failed'); }
  });

  btnLogin && btnLogin.addEventListener('click', async ()=>{
    const u = (inpUser.value||'').trim(); const p = inpPass.value||''; if(!u||!p) return alert('username & password required');
    try{
      const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
      if(res.ok){ const j = await res.json(); setToken(j.token); currentUser = j.user; showLoggedIn(); await renderPosts(); } else { const j = await res.json(); alert(j.error || 'login failed'); }
    }catch(e){ alert('login failed'); }
  });

  btnLogout && btnLogout.addEventListener('click', async ()=>{
    try{ await authFetch('/api/logout',{method:'POST'}); }catch(e){}
    setToken(null); currentUser = null; showLoggedOut(); await renderPosts();
  });

  // API layer (graceful fallback)
  async function getPosts(){ try{ const res = await authFetch('/api/posts'); if(res.ok) return await res.json(); }catch(e){} return readPostsLocal(); }
  async function createPost(textVal){ try{ const res = await authFetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:textVal})}); if(res.ok) return await res.json(); if(res && res.status===401) throw new Error('auth'); }catch(e){} const posts = readPostsLocal(); const item = { id: Date.now(), text:textVal, t:Date.now(), likes:0, username: currentUser ? currentUser.username : 'you' }; posts.push(item); savePostsLocal(posts); return item; }
  async function likePost(id){ try{ const res = await authFetch(`/api/posts/${id}/like`,{method:'POST'}); if(res.ok) return await res.json(); }catch(e){} const posts = readPostsLocal(); const idx = posts.findIndex(p=>String(p.id)===String(id)); if(idx!==-1){ posts[idx].likes = (posts[idx].likes||0)+1; savePostsLocal(posts); return posts[idx]; } return null; }
  async function deletePost(id){ try{ const res = await authFetch(`/api/posts/${id}`,{method:'DELETE'}); if(res.ok) return await res.json(); }catch(e){} const posts = readPostsLocal(); const idx = posts.findIndex(p=>String(p.id)===String(id)); if(idx!==-1){ const removed = posts.splice(idx,1)[0]; savePostsLocal(posts); return removed; } return null; }

  async function renderPosts(){ const posts = await getPosts(); feedEl.innerHTML = '';
    if(!posts || posts.length===0){ feedEl.innerHTML = '<div class="small">No posts yet — be the first to chirp!</div>'; return; }
    posts.slice().reverse().forEach(p=>{ const el = document.createElement('div'); el.className='post';
      const canDelete = currentUser && p.userId && Number(p.userId) === Number(currentUser.id);
      el.innerHTML = `<div class="meta"><span>${new Date(p.t).toLocaleString()}</span><span>${p.likes||0} ❤</span></div><div class="body">${escapeHtml(p.text)}</div><div class="actions"><button data-id="${p.id}" class="like">Like</button>${canDelete?`<button data-id="${p.id}" class="del">Delete</button>`:''}</div>`;
      const meta = el.querySelector('.meta'); if(meta){ const userSpan = document.createElement('div'); userSpan.style.fontSize='12px'; userSpan.style.color='#2f6673'; userSpan.textContent = p.username ? p.username : 'anonymous'; meta.insertBefore(userSpan, meta.firstChild); }
      feedEl.appendChild(el);
    }); }

  form.addEventListener('submit', async e=>{ e.preventDefault(); const v = text.value.trim(); if(!v) return; await createPost(v); text.value=''; await renderPosts(); });

  feedEl.addEventListener('click', async e=>{ const id = e.target.getAttribute('data-id'); if(!id) return; if(e.target.classList.contains('del')){ await deletePost(id); await renderPosts(); }
    if(e.target.classList.contains('like')){ await likePost(id); await renderPosts(); }
  });

  // initial render
  await loadCurrentUser();
  renderPosts();
})();
