const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, 'data.json');

function readData(){ try{ const raw = fs.readFileSync(DATA,'utf8'); return JSON.parse(raw); }catch(e){ return {posts:[], highscore:0, users:[], tokens:{}}; } }
function writeData(d){ fs.writeFileSync(DATA, JSON.stringify(d, null, 2), 'utf8'); }

function hashPassword(password, salt){ return crypto.scryptSync(String(password), salt, 64).toString('hex'); }

function authFromHeader(req){ const a = req.headers['authorization']; if(!a) return null; const parts = String(a).split(' '); if(parts.length!==2) return null; const token = parts[1]; const d = readData(); const uid = (d.tokens || {})[token]; if(!uid) return null; const user = (d.users || []).find(u=>u.id===uid); return user || null; }

const app = express();
app.use(express.json());

// Serve static site from project root
app.use('/', express.static(path.join(__dirname, '..')));

// Accounts
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  const d = readData();
  const existing = (d.users||[]).find(u=>u.username === String(username));
  if(existing) return res.status(409).json({ error: 'username taken' });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const user = { id: Date.now(), username: String(username), salt, hash };
  d.users = d.users || [];
  d.users.push(user);
  writeData(d);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'username and password required' });
  const d = readData();
  const user = (d.users||[]).find(u=>u.username === String(username));
  if(!user) return res.status(401).json({ error: 'invalid credentials' });
  const h = hashPassword(password, user.salt);
  if(h !== user.hash) return res.status(401).json({ error: 'invalid credentials' });
  const token = crypto.randomBytes(24).toString('hex');
  d.tokens = d.tokens || {};
  d.tokens[token] = user.id;
  writeData(d);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/logout', (req, res) => {
  const a = req.headers['authorization']; if(!a) return res.json({ ok:true });
  const parts = String(a).split(' '); if(parts.length!==2) return res.json({ ok:true });
  const token = parts[1]; const d = readData(); if(d.tokens) delete d.tokens[token]; writeData(d); res.json({ ok:true });
});

app.get('/api/me', (req, res) => {
  const user = authFromHeader(req);
  if(!user) return res.status(401).json({ error: 'unauthenticated' });
  res.json({ id: user.id, username: user.username });
});

// API: posts
app.get('/api/posts', (req, res) => {
  const d = readData();
  const users = d.users || [];
  const posts = (d.posts||[]).map(p => {
    const u = users.find(x=>x.id === p.userId);
    return Object.assign({}, p, { username: u ? u.username : (p.username || 'anonymous') });
  });
  res.json(posts);
});

app.post('/api/posts', (req, res) => {
  const { text } = req.body || {};
  if(!text || String(text).trim()==='') return res.status(400).json({ error: 'text required' });
  const user = authFromHeader(req);
  const d = readData();
  const item = { id: Date.now(), text: String(text), t: Date.now(), likes: 0 };
  if(user){ item.userId = user.id; item.username = user.username; }
  d.posts = d.posts || [];
  d.posts.push(item);
  writeData(d);
  res.json(item);
});

app.post('/api/posts/:id/like', (req, res) => {
  const id = Number(req.params.id);
  const d = readData();
  const idx = (d.posts||[]).findIndex(p=>Number(p.id)===id);
  if(idx===-1) return res.status(404).json({error:'not found'});
  d.posts[idx].likes = (d.posts[idx].likes||0) + 1;
  writeData(d);
  const users = d.users || [];
  const p = d.posts[idx];
  const u = users.find(x=>x.id === p.userId);
  res.json(Object.assign({}, p, { username: u ? u.username : (p.username || 'anonymous') }));
});

app.delete('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const d = readData();
  const idx = (d.posts||[]).findIndex(p=>Number(p.id)===id);
  if(idx===-1) return res.status(404).json({error:'not found'});
  const post = d.posts[idx];
  const user = authFromHeader(req);
  if(post.userId && (!user || user.id !== post.userId)) return res.status(403).json({ error: 'forbidden' });
  const removed = d.posts.splice(idx,1)[0];
  writeData(d);
  res.json(removed);
});

// Highscore & leaderboard endpoints (store scores in SQLite when available)
let db = null;
try{
  db = require('./db');
}catch(e){
  console.warn('SQLite DB unavailable, falling back to JSON-backed leaderboard', e && e.message);
  db = {
    insertScore(userId, username, score){
      const d = readData();
      d.scores = d.scores || [];
      d.scores.push({ userId: userId || null, username: username || null, score: Number(score)||0, t: Date.now() });
      writeData(d);
      return d.scores.length;
    },
    getTopScores(limit = 10){
      const d = readData();
      const arr = (d.scores || []).slice().sort((a,b)=>{ if(b.score!==a.score) return b.score - a.score; return a.t - b.t; });
      return arr.slice(0, limit);
    }
  };
}

app.get('/api/highscore', (req, res) => {
  const d = readData();
  res.json({ highscore: d.highscore || 0 });
});

app.post('/api/highscore', (req, res) => {
  const { score } = req.body || {};
  const d = readData();
  const s = Number(score) || 0;
  if(s > (d.highscore||0)){
    d.highscore = s;
    writeData(d);
  }
  // persist in sqlite leaderboard
  try{
    const user = authFromHeader(req);
    db.insertScore(user ? user.id : null, user ? user.username : null, s);
  }catch(e){ console.error('failed to write score to sqlite', e); }
  res.json({ highscore: d.highscore || 0 });
});

app.get('/api/leaderboard', (req, res) => {
  try{
    const top = db.getTopScores(10);
    res.json(top);
  }catch(e){ res.status(500).json({ error: 'could not fetch leaderboard' }); }
});

// Clear leaderboard (requires auth)
app.post('/api/leaderboard/clear', (req, res) => {
  const user = authFromHeader(req);
  if(!user) return res.status(401).json({ error: 'unauthenticated' });
  try{
    if(typeof db.clearScores === 'function'){
      db.clearScores();
    } else {
      const d = readData();
      d.scores = [];
      writeData(d);
    }
    res.json({ ok: true });
  }catch(e){ res.status(500).json({ error: 'could not clear leaderboard' }); }
});

// Public chat endpoints: save and return chat messages so they are viewable online
app.get('/api/chats', (req, res) => {
  try{
    const d = readData();
    const arr = (d.chats || []).slice(-500); // keep last 500
    res.json(arr);
  }catch(e){ res.status(500).json({ error: 'could not fetch chats' }); }
});

app.post('/api/chats', (req, res) => {
  const { text } = req.body || {};
  if(!text || String(text).trim()==='') return res.status(400).json({ error: 'text required' });
  try{
    const user = authFromHeader(req);
    const d = readData();
    const msg = { id: Date.now(), text: String(text), t: Date.now() };
    if(user){ msg.userId = user.id; msg.username = user.username; } else { msg.username = 'anonymous'; }
    d.chats = d.chats || [];
    d.chats.push(msg);
    writeData(d);
    res.json(msg);
  }catch(e){ res.status(500).json({ error: 'could not save chat' }); }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>{
  console.log('Legendary Parakeet server running on http://localhost:' + port);
});
