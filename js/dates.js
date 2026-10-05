/* Utilidades de fecha. Las fechas se guardan como 'YYYY-MM-DD' y las horas como 'HH:MM'. */
window.App = window.App || {};

(function (App) {
  const pad = (n) => String(n).padStart(2, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const parseISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const addDays = (iso, n) => {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };

  const today = () => toISO(new Date());

  /** Fecha/hora límite de una tarea. Sin hora => fin del día. */
  const dueAt = (task, fallbackTime = '23:59') => {
    if (!task.date) return null;
    const [h, m] = (task.time || fallbackTime).split(':').map(Number);
    const d = parseISO(task.date);
    d.setHours(h, m, task.time ? 0 : 59, 0);
    return d;
  };

  /** "Hoy", "Mañana", "Ayer" o "Mié 7 oct". */
  const label = (iso) => {
    const t = today();
    if (iso === t) return 'Hoy';
    if (iso === addDays(t, 1)) return 'Mañana';
    if (iso === addDays(t, -1)) return 'Ayer';
    const txt = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
      .format(parseISO(iso)).replace(/[.,]/g, '');
    return cap(txt);
  };

  const longToday = () =>
    cap(new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));

  const monthTitle = (d) =>
    cap(new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(d));

  App.dates = { toISO, parseISO, addDays, today, dueAt, label, longToday, monthTitle };
})(window.App);
