/* Persistencia. Dos modos, elegidos automáticamente:
   - 'server': la app se abrió desde el servidor local (http://localhost) y las tareas viven en SQLite.
   - 'local' : la app se abrió como archivo (doble clic en index.html) y usa localStorage del navegador.
   El resto de la app solo usa init() y save(). */
(function (App) {
  const KEY = 'tareas.v1';
  const API = '/api/tasks';
  let mode = 'local';

  /* ---- localStorage (modo de respaldo) ---- */
  const local = {
    load() {
      try {
        const data = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    save(tasks) {
      try {
        localStorage.setItem(KEY, JSON.stringify(tasks));
      } catch {
        /* sin almacenamiento: la app sigue en memoria */
      }
    },
  };

  /* ---- API / SQLite ---- */
  let timer = null;
  let pending = null;
  let inflight = Promise.resolve();

  const send = (tasks) =>
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks),
      keepalive: true,
    }).then((r) => { if (!r.ok) throw new Error(r.status); });

  function flush() {
    if (!pending) return;
    const data = pending;
    pending = null;
    // En fila, para que las escrituras lleguen en orden
    inflight = inflight.then(() => send(data)).catch(() => App.storage.onError && App.storage.onError());
  }

  window.addEventListener('pagehide', flush);

  App.storage = {
    onError: null,
    mode: () => mode,

    /** Devuelve la lista de tareas y decide el modo según cómo se abrió la app. */
    async init() {
      if (location.protocol.startsWith('http')) {
        try {
          const r = await fetch(API, { cache: 'no-store' });
          if (r.ok) {
            mode = 'server';
            return await r.json();
          }
        } catch {
          /* servidor no disponible: se usa localStorage */
        }
      }
      mode = 'local';
      return local.load();
    },

    save(tasks) {
      if (mode === 'local') return local.save(tasks);
      pending = tasks;
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    },
  };
})(window.App);
