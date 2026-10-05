/* Capa visual: helpers de DOM, lista de tareas, pestañas, diálogo de edición y avisos. */
(function (App) {
  /* ---------- Helpers ---------- */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    children.flat().forEach((c) => c != null && el.append(c));
    return el;
  }

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
  };
  const icon = (name) => {
    const s = h('span', { class: 'ico' });
    s.innerHTML = ICONS[name]; // SVG estático propio, sin datos del usuario
    return s;
  };

  /* ---------- Fila de tarea ---------- */
  function taskRow(t, { showDate }, handlers) {
    const overdue = App.tasks.isOverdue(t);
    const meta = [];
    if (showDate && t.date) meta.push(App.dates.label(t.date));
    if (t.time) meta.push(t.time);

    const cat = App.categories.get(t.categoryId);

    return h('li', {
      class: ['task', t.done && 'done', overdue && 'overdue'].filter(Boolean).join(' '),
      style: cat ? `--cat:${cat.color}` : null,
    },
      h('button', {
        type: 'button', class: 'check', 'aria-pressed': String(t.done),
        'aria-label': t.done ? 'Marcar como pendiente' : 'Marcar como completada',
        onclick: () => handlers.onToggle(t.id),
      }, icon('check')),
      h('div', { class: 'body', onclick: () => handlers.onEdit(t.id) },
        h('span', { class: 'title' }, t.title),
        h('span', { class: 'tags' },
          cat ? h('span', { class: 'cat-tag' }, cat.name) : null,
          meta.length ? h('span', { class: 'meta' }, meta.join(' · ')) : null)
      ),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'icon-btn sm', title: 'Editar', 'aria-label': 'Editar', onclick: () => handlers.onEdit(t.id) }, icon('edit')),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'Eliminar', 'aria-label': 'Eliminar', onclick: () => handlers.onDelete(t.id) }, icon('trash'))
      )
    );
  }

  function group(g, handlers, view) {
    return h('section', { class: 'group' },
      h('h3', { class: g.tone || '' }, g.label, h('span', { class: 'count' }, String(g.items.length))),
      h('ul', { class: 'tasks' + (view === 'tiles' ? ' tiles' : '') }, g.items.map((t) => taskRow(t, { showDate: g.showDate }, handlers)))
    );
  }

  const EMPTY = {
    pending: ['Todo al día', 'Escribí arriba para agregar tu primera tarea.'],
    done: ['Nada completado todavía', 'Las tareas que marques aparecen acá.'],
    day: ['Sin tareas este día', 'Agregá una con el campo de arriba.'],
  };

  function renderList(el, state, handlers) {
    el.replaceChildren();
    let groups;
    let empty = EMPTY.pending;

    if (state.selectedDate) {
      const items = App.tasks.forDay(state.selectedDate, state.category);
      groups = items.length ? [{ label: App.dates.label(state.selectedDate), tone: 'accent', items }] : [];
      empty = EMPTY.day;
    } else if (state.tab === 'done') {
      const items = App.tasks.completed(state.category);
      groups = items.length ? [{ label: 'Completadas', items, showDate: true }] : [];
      empty = EMPTY.done;
    } else {
      groups = App.tasks.groupPending(new Date(), state.category);
    }

    if (!groups.length) {
      el.append(h('div', { class: 'empty' }, h('strong', {}, empty[0]), h('p', { class: 'muted' }, empty[1])));
      return;
    }
    groups.forEach((g) => el.append(group(g, handlers, state.view)));
  }

  /* ---------- Secciones ---------- */
  function fillCategorySelect(select, value) {
    select.replaceChildren(
      h('option', { value: '' }, 'Sin sección'),
      ...App.categories.all().map((c) => h('option', { value: c.id }, c.name))
    );
    select.value = App.categories.get(value) ? value : '';
  }

  function renderSections(el, state, { onSelect, onNew, onEdit }) {
    const counts = App.tasks.pendingByCategory();
    const chip = (key, label, color, count) => h('button', {
      type: 'button', class: 'sec' + (state.category === key ? ' active' : ''),
      style: color ? `--cat:${color}` : null, 'aria-pressed': String(state.category === key),
      onclick: () => onSelect(key),
    }, color ? h('span', { class: 'dot' }) : null, label, count ? h('span', { class: 'count' }, String(count)) : null);

    const cats = App.categories.all();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const active = App.categories.get(state.category);

    el.replaceChildren(...[
      cats.length ? chip(null, 'Todas', null, total) : null,
      ...cats.map((c) => chip(c.id, c.name, c.color, counts[c.id])),
      cats.length && counts.none ? chip('none', 'Sin sección', null, counts.none) : null,
      active ? h('button', { type: 'button', class: 'icon-btn sm', title: 'Editar sección', 'aria-label': 'Editar sección', onclick: () => onEdit(active.id) }, icon('edit')) : null,
      h('button', { type: 'button', class: 'sec new', onclick: onNew }, '+ Nueva sección'),
    ].filter(Boolean));
  }

  function openCategoryEditor(cat, { onSave, onDelete }) {
    const dlg = document.getElementById('cat-dialog');
    const name = document.getElementById('cat-name');
    const box = document.getElementById('cat-colors');
    const colors = App.categories.COLORS;
    let color = cat ? cat.color : colors[App.categories.all().length % colors.length];

    document.getElementById('cat-heading').textContent = cat ? 'Editar sección' : 'Nueva sección';
    document.getElementById('cat-delete').hidden = !cat;
    name.value = cat ? cat.name : '';

    const paint = () => box.replaceChildren(...colors.map((c) => h('button', {
      type: 'button', class: 'swatch' + (c === color ? ' on' : ''), style: `--cat:${c}`,
      role: 'radio', 'aria-checked': String(c === color), 'aria-label': c,
      onclick: () => { color = c; paint(); },
    })));
    paint();

    document.getElementById('cat-form').onsubmit = (e) => {
      e.preventDefault();
      if (!name.value.trim()) return;
      onSave({ name: name.value, color });
      dlg.close();
    };
    document.getElementById('cat-cancel').onclick = () => dlg.close();
    document.getElementById('cat-delete').onclick = () => { dlg.close(); onDelete(); };

    dlg.showModal();
    name.focus();
    name.select();
  }

  /* ---------- Selector de vista (lista / cuadros) ---------- */
  const VIEW_ICONS = {
    list: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
    tiles: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
  };

  function renderViewToggle(el, state, onView) {
    const btn = (view, label) => {
      const b = h('button', {
        type: 'button', class: 'view-btn' + (state.view === view ? ' active' : ''),
        title: label, 'aria-label': label, 'aria-pressed': String(state.view === view),
        onclick: () => onView(view),
      });
      b.innerHTML = VIEW_ICONS[view]; // SVG estático propio
      return b;
    };
    el.replaceChildren(btn('list', 'Ver como lista'), btn('tiles', 'Ver como cuadros'));
  }

  /* ---------- Pestañas y filtro ---------- */
  function renderTabs(el, state, onTab) {
    const c = App.tasks.counts();
    el.replaceChildren(
      h('button', { type: 'button', class: 'tab' + (state.tab === 'pending' ? ' active' : ''), onclick: () => onTab('pending') },
        'Pendientes', h('span', { class: 'count' }, String(c.pending)),
        c.overdue ? h('span', { class: 'badge-danger', title: 'Vencidas' }, `${c.overdue} vencida${c.overdue > 1 ? 's' : ''}`) : null),
      h('button', { type: 'button', class: 'tab' + (state.tab === 'done' ? ' active' : ''), onclick: () => onTab('done') },
        'Completadas', h('span', { class: 'count' }, String(c.done)))
    );
  }

  function renderFilterChip(el, state, onClear) {
    el.replaceChildren();
    if (!state.selectedDate) return;
    el.append(h('button', { type: 'button', class: 'chip', onclick: onClear },
      `Mostrando: ${App.dates.label(state.selectedDate)}`, h('span', { 'aria-hidden': 'true' }, ' ✕')));
  }

  /* ---------- Diálogo de edición ---------- */
  function openEditor(task, { onSave, onDelete }) {
    const dlg = document.getElementById('edit-dialog');
    const title = document.getElementById('ed-title');
    const date = document.getElementById('ed-date');
    const time = document.getElementById('ed-time');
    const cat = document.getElementById('ed-cat');
    const syncTime = () => { time.disabled = !date.value; if (!date.value) time.value = ''; };

    title.value = task.title;
    date.value = task.date || '';
    time.value = task.time || '';
    fillCategorySelect(cat, task.categoryId);
    syncTime();
    date.oninput = syncTime;

    document.getElementById('edit-form').onsubmit = (e) => {
      e.preventDefault();
      if (!title.value.trim()) return;
      onSave({ title: title.value, date: date.value, time: time.value, categoryId: cat.value });
      dlg.close();
    };
    document.getElementById('ed-cancel').onclick = () => dlg.close();
    document.getElementById('ed-delete').onclick = () => { dlg.close(); onDelete(); };

    dlg.showModal();
    title.focus();
    title.select();
  }

  /* ---------- Avisos ---------- */
  function toast(message, { action, duration = 5000 } = {}) {
    const box = document.getElementById('toasts');
    const el = h('div', { class: 'toast' }, h('span', {}, message));
    const close = () => el.remove();
    if (action) el.append(h('button', { type: 'button', class: 'toast-action', onclick: () => { action.fn(); close(); } }, action.label));
    box.append(el);
    setTimeout(close, duration);
  }

  function renderBell(btn) {
    const s = App.reminders.status();
    btn.replaceChildren(icon('bell'));
    btn.classList.toggle('on', s === 'granted');
    btn.title =
      s === 'granted' ? 'Recordatorios activados'
      : s === 'denied' ? 'Notificaciones bloqueadas en el navegador'
      : s === 'unsupported' ? 'Este navegador no soporta notificaciones'
      : 'Activar notificaciones del navegador';
  }

  App.ui = { h, renderList, renderSections, fillCategorySelect, openCategoryEditor, renderViewToggle, renderTabs, renderFilterChip, openEditor, toast, renderBell };
})(window.App);
