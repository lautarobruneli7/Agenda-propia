/* Base de datos SQLite (módulo node:sqlite, incluido en Node 22.13+). Sin dependencias externas. */
const fs = require('node:fs');
const path = require('node:path');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error(`\nEste programa necesita Node.js 22.13 o superior (tenés ${process.version}).`);
  console.error('Descargalo desde https://nodejs.org y volvé a ejecutar iniciar.bat.\n');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'tareas.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS tasks (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    date          TEXT,               -- 'YYYY-MM-DD'
    time          TEXT,               -- 'HH:MM'
    done          INTEGER NOT NULL DEFAULT 0,
    done_at       INTEGER,
    created_at    INTEGER NOT NULL,
    notified_pre  INTEGER NOT NULL DEFAULT 0,
    notified_due  INTEGER NOT NULL DEFAULT 0
  );
`);

const toTask = (r) => ({
  id: r.id,
  title: r.title,
  date: r.date,
  time: r.time,
  done: !!r.done,
  doneAt: r.done_at,
  createdAt: r.created_at,
  notified: { pre: !!r.notified_pre, due: !!r.notified_due },
});

const str = (v, max) => (typeof v === 'string' && v ? v.slice(0, max) : null);

function listTasks() {
  return db.prepare('SELECT * FROM tasks ORDER BY created_at').all().map(toTask);
}

/** Reemplaza todo el conjunto de tareas en una única transacción. */
function replaceTasks(list) {
  if (!Array.isArray(list)) throw new Error('Se esperaba una lista de tareas');
  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, time, done, done_at, created_at, notified_pre, notified_due)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM tasks');
    for (const t of list) {
      const id = str(t.id, 64);
      const title = str(t.title, 200);
      if (!id || !title) continue;
      insert.run(
        id, title, str(t.date, 10), str(t.time, 5),
        t.done ? 1 : 0, Number.isFinite(t.doneAt) ? t.doneAt : null,
        Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
        t.notified?.pre ? 1 : 0, t.notified?.due ? 1 : 0
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { listTasks, replaceTasks };
