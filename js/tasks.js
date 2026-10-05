/* Modelo de tareas: CRUD, estados y agrupación. No toca el DOM.
   Tarea: { id, title, date|null, time|null, done, doneAt|null, createdAt, notified:{pre,due} } */
(function (App) {
  const { dueAt, today, addDays } = App.dates;

  let tasks = [];
  const listeners = [];

  const commit = () => {
    App.storage.save(tasks);
    listeners.forEach((fn) => fn());
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = (v) => (v ? v : null);

  /** Orden: por fecha, luego hora (sin hora al final), luego creación. */
  const byDue = (a, b) =>
    (a.date || '9999').localeCompare(b.date || '9999') ||
    (a.time || '99:99').localeCompare(b.time || '99:99') ||
    a.createdAt - b.createdAt;

  const isOverdue = (t, now = new Date()) => !t.done && !!t.date && dueAt(t) < now;

  App.tasks = {
    /** Carga las tareas ya leídas del almacenamiento (no vuelve a guardar). */
    init(list) {
      tasks = list;
    },
    onChange: (fn) => listeners.push(fn),
    all: () => tasks,
    isOverdue,
    byDue,

    add({ title, date, time }) {
      const t = {
        id: uid(),
        title: title.trim(),
        date: clean(date),
        time: date ? clean(time) : null,
        done: false,
        doneAt: null,
        createdAt: Date.now(),
        notified: { pre: false, due: false },
      };
      tasks.push(t);
      commit();
      return t;
    },

    update(id, { title, date, time }) {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const changedWhen = t.date !== clean(date) || t.time !== (date ? clean(time) : null);
      t.title = title.trim();
      t.date = clean(date);
      t.time = date ? clean(time) : null;
      if (changedWhen) t.notified = { pre: false, due: false };
      commit();
    },

    toggle(id) {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : null;
      commit();
    },

    remove(id) {
      const index = tasks.findIndex((x) => x.id === id);
      if (index < 0) return null;
      const [task] = tasks.splice(index, 1);
      commit();
      return { task, index };
    },

    restore({ task, index }) {
      tasks.splice(Math.min(index, tasks.length), 0, task);
      commit();
    },

    markNotified(id, kind) {
      const t = tasks.find((x) => x.id === id);
      if (t) {
        t.notified = { ...t.notified, [kind]: true };
        commit();
      }
    },

    counts(now = new Date()) {
      const pending = tasks.filter((t) => !t.done);
      return {
        pending: pending.length,
        overdue: pending.filter((t) => isOverdue(t, now)).length,
        done: tasks.length - pending.length,
      };
    },

    /** Pendientes agrupadas: Vencidas, luego cada fecha, y al final "Sin fecha". */
    groupPending(now = new Date()) {
      const pending = tasks.filter((t) => !t.done).sort(byDue);
      const groups = [];
      const overdue = pending.filter((t) => isOverdue(t, now));
      if (overdue.length) groups.push({ key: 'overdue', label: 'Vencidas', tone: 'danger', items: overdue, showDate: true });

      const rest = pending.filter((t) => !overdue.includes(t));
      const map = new Map();
      rest.forEach((t) => {
        const k = t.date || 'none';
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(t);
      });
      map.forEach((items, k) => {
        if (k === 'none') return;
        groups.push({ key: k, label: App.dates.label(k), tone: k === today() ? 'accent' : '', items });
      });
      if (map.has('none')) groups.push({ key: 'none', label: 'Sin fecha', tone: '', items: map.get('none') });
      return groups;
    },

    /** Todas las tareas de un día: pendientes primero. */
    forDay(iso) {
      return tasks
        .filter((t) => t.date === iso)
        .sort((a, b) => Number(a.done) - Number(b.done) || byDue(a, b));
    },

    completed() {
      return tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    },

    /** Mapa fecha -> {pending, overdue} para los puntos del calendario. */
    daySummary(now = new Date()) {
      const map = {};
      tasks.forEach((t) => {
        if (!t.date || t.done) return;
        const s = (map[t.date] = map[t.date] || { pending: 0, overdue: 0 });
        s.pending++;
        if (isOverdue(t, now)) s.overdue++;
      });
      return map;
    },
  };
})(window.App);
