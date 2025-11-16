const fs = require('fs');
const path = require('path');

// Try to load better-sqlite3 optionally. If it's not available we'll fall
// back to a JSON-backed implementation so the app still runs in constrained
// environments (e.g. Fly/containers where native compilation was skipped).
let sqliteAvailable = false;
let db = null;
try{
  const Database = require('better-sqlite3');
  const DB_PATH = path.join(__dirname, 'db.sqlite');
  db = new Database(DB_PATH);
  // Initialize schema
  db.prepare("PRAGMA journal_mode=WAL;").run();
  db.prepare(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT,
    score INTEGER,
    t INTEGER
  )`).run();
  sqliteAvailable = true;
}catch(e){
  // Module not available or failed to initialize — we'll fallback below.
  sqliteAvailable = false;
}

const DATA_FILE = path.join(__dirname, 'data.json');
function readData(){ try{ return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }catch(e){ return {}; } }
function writeData(d){ try{ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8'); }catch(e){} }

if(sqliteAvailable){
  module.exports = {
    insertScore(userId, username, score){
      try{
        const stmt = db.prepare('INSERT INTO scores (userId, username, score, t) VALUES (?, ?, ?, ?)');
        const info = stmt.run(userId || null, username || null, Number(score) || 0, Date.now());
        return info.lastInsertRowid;
      }catch(e){ console.error('insertScore err', e); }
      return null;
    },
    getTopScores(limit = 10){
      try{
        const stmt = db.prepare('SELECT userId, username, score, t FROM scores ORDER BY score DESC, t ASC LIMIT ?');
        return stmt.all(limit);
      }catch(e){ console.error('getTopScores err', e); }
      return [];
    },
    clearScores(){
      try{
        const stmt = db.prepare('DELETE FROM scores');
        stmt.run();
        return true;
      }catch(e){ console.error('clearScores err', e); }
      return false;
    }
  };
}else{
  module.exports = {
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
    },
    clearScores(){
      const d = readData();
      d.scores = [];
      writeData(d);
      return true;
    }
  };
}
