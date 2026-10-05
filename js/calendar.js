/* Calendario mensual compacto (semana empieza en lunes). Solo dibuja; el estado vive en main.js. */
(function (App) {
  const { toISO, today, monthTitle } = App.dates;
  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  function render(el, { month, selected, summary }, { onSelect, onNav }) {
    el.replaceChildren();

    const head = App.ui.h('div', { class: 'cal-head' },
      App.ui.h('strong', {}, monthTitle(month)),
      App.ui.h('div', { class: 'cal-nav' },
        App.ui.h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Mes anterior', onclick: () => onNav(-1) }, '‹'),
        App.ui.h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Mes siguiente', onclick: () => onNav(1) }, '›')
      )
    );

    const grid = App.ui.h('div', { class: 'cal-grid' });
    WEEKDAYS.forEach((d) => grid.append(App.ui.h('span', { class: 'cal-wd' }, d)));

    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first);
    start.setDate(1 - offset);

    const todayISO = today();
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISO(d);
      const s = summary[iso];
      const cls = ['cal-day'];
      if (d.getMonth() !== month.getMonth()) cls.push('other');
      if (iso === todayISO) cls.push('today');
      if (iso === selected) cls.push('selected');
      if (s) cls.push(s.overdue ? 'has-overdue' : 'has-tasks');
      grid.append(App.ui.h('button', { type: 'button', class: cls.join(' '), onclick: () => onSelect(iso), 'aria-label': iso }, String(d.getDate())));
    }

    el.append(head, grid);
  }

  App.calendar = { render };
})(window.App);
