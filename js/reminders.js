/* Recordatorios: aviso 15 min antes de la hora y al llegar la hora.
   Tareas con fecha pero sin hora avisan a las 09:00 de ese día.
   Siempre muestra un aviso dentro de la app; además usa notificaciones del navegador si hay permiso. */
(function (App) {
  const LEAD_MIN = 15;
  const DEFAULT_TIME = '09:00';
  const CHECK_EVERY_MS = 30 * 1000;
  const MAX_LATE_MS = 12 * 60 * 60 * 1000; // no avisar de tareas que vencieron hace más de 12 h

  const supported = () => 'Notification' in window;
  const status = () => (supported() ? Notification.permission : 'unsupported');

  function fire(task, kind, minutes) {
    const body =
      kind === 'pre'
        ? `Vence en ${minutes} min`
        : task.time
        ? `Vence ahora (${task.time})`
        : 'Es para hoy';
    App.ui.toast(`${task.title} · ${body}`, { duration: 8000 });
    if (status() === 'granted') {
      try {
        new Notification(task.title, { body, tag: task.id });
      } catch {
        /* algunos navegadores solo permiten notificaciones desde service workers */
      }
    }
    App.tasks.markNotified(task.id, kind);
  }

  function check(now = new Date()) {
    App.tasks.all().forEach((t) => {
      if (t.done || !t.date) return;
      const due = App.dates.dueAt(t, DEFAULT_TIME);
      const diff = due - now;
      if (t.time && !t.notified.pre && diff > 0 && diff <= LEAD_MIN * 60000) {
        fire(t, 'pre', Math.max(1, Math.ceil(diff / 60000)));
      } else if (!t.notified.due && diff <= 0 && -diff < MAX_LATE_MS) {
        fire(t, 'due');
      }
    });
  }

  async function requestPermission() {
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignorado */
      }
    }
    return status();
  }

  function start() {
    check();
    setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => !document.hidden && check());
  }

  App.reminders = { start, check, status, requestPermission };
})(window.App);
