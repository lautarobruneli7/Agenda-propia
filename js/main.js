/* Punto de entrada: estado de la vista y conexión entre módulos. */
(function (App) {
  const $ = (id) => document.getElementById(id);

  const state = {
    tab: 'pending',       // 'pending' | 'done'
    selectedDate: null,   // 'YYYY-MM-DD' | null
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    view: loadView(),     // 'list' | 'tiles'
    category: null,       // null (todas) | 'none' | id de sección
  };

  function loadView() {
    try { return localStorage.getItem('tareas:view') === 'tiles' ? 'tiles' : 'list'; } catch { return 'list'; }
  }

  /* ---------- Acciones ---------- */
  const handlers = {
    onToggle: (id) => App.tasks.toggle(id),
    onEdit(id) {
      const task = App.tasks.all().find((t) => t.id === id);
      if (!task) return;
      App.ui.openEditor(task, {
        onSave: (data) => App.tasks.update(id, data),
        onDelete: () => handlers.onDelete(id),
      });
    },
    onDelete(id) {
      const removed = App.tasks.remove(id);
      if (removed) App.ui.toast('Tarea eliminada', { action: { label: 'Deshacer', fn: () => App.tasks.restore(removed) } });
    },
  };

  const sectionHandlers = {
    onSelect(key) {
      state.category = state.category === key ? null : key;
      render();
    },
    onNew() {
      App.ui.openCategoryEditor(null, {
        onSave: (data) => {
          const cat = App.categories.add(data);
          state.category = cat.id;
          render();
        },
      });
    },
    onEdit(id) {
      const cat = App.categories.get(id);
      if (!cat) return;
      App.ui.openCategoryEditor(cat, {
        onSave: (data) => App.categories.update(id, data),
        onDelete() {
          App.categories.remove(id);
          App.tasks.clearCategory(id);
          state.category = null;
          App.ui.toast(`Sección "${cat.name}" eliminada. Sus tareas quedaron sin sección.`);
        },
      });
    },
  };

  function selectDay(iso) {
    state.selectedDate = state.selectedDate === iso ? null : iso;
    $('qa-date').value = state.selectedDate || '';
    syncQuickTime();
    render();
  }

  /* ---------- Render ---------- */
  function render() {
    App.ui.renderTabs($('tabs'), state, (tab) => { state.tab = tab; state.selectedDate = null; $('qa-date').value = ''; syncQuickTime(); render(); });
    App.ui.renderViewToggle($('view-toggle'), state, (view) => {
      state.view = view;
      try { localStorage.setItem('tareas:view', view); } catch { /* sin almacenamiento */ }
      render();
    });
    if (state.category && state.category !== 'none' && !App.categories.get(state.category)) state.category = null;
    App.ui.renderSections($('sections'), state, sectionHandlers);
    syncQuickCategory();
    App.ui.renderFilterChip($('filter-chip'), state, () => selectDay(state.selectedDate));
    App.ui.renderList($('task-list'), state, handlers);
    App.calendar.render(
      $('calendar'),
      { month: state.month, selected: state.selectedDate, summary: App.tasks.daySummary(new Date(), state.category) },
      {
        onSelect: selectDay,
        onNav: (n) => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + n, 1); render(); },
      }
    );
    $('today-label').textContent = App.dates.longToday();
    App.ui.renderBell($('btn-bell'));
  }

  /* ---------- Alta rápida ---------- */
  function syncQuickTime() {
    const t = $('qa-time');
    t.disabled = !$('qa-date').value;
    if (t.disabled) t.value = '';
  }

  /* El selector de sección sigue a la sección activa; si no hay ninguna, conserva la elección. */
  function syncQuickCategory() {
    const sel = $('qa-cat');
    const keep = sel.value;
    App.ui.fillCategorySelect(sel, keep);
    if (state.category && state.category !== 'none') sel.value = state.category;
    sel.hidden = !App.categories.all().length;
  }

  $('qa-date').addEventListener('input', syncQuickTime);

  $('quick-add').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('qa-title').value.trim();
    if (!title) return;
    const date = $('qa-date').value;
    App.tasks.add({ title, date, time: $('qa-time').value, categoryId: $('qa-cat').value });
    $('qa-title').value = '';
    if (!state.selectedDate) { $('qa-date').value = ''; $('qa-time').value = ''; syncQuickTime(); }
    $('qa-time').value = '';
    $('qa-title').focus();
  });

  /* ---------- Notificaciones ---------- */
  $('btn-bell').addEventListener('click', async () => {
    const s = await App.reminders.requestPermission();
    App.ui.renderBell($('btn-bell'));
    const msg = {
      granted: 'Recordatorios activados',
      denied: 'Las notificaciones están bloqueadas en el navegador. Los avisos igual aparecen dentro de la app.',
      unsupported: 'Este navegador no soporta notificaciones. Los avisos aparecen dentro de la app.',
    }[s];
    if (msg) App.ui.toast(msg);
  });

  /* ---------- Arranque ---------- */
  App.tasks.onChange(render);
  App.categories.onChange(render);
  render();
  App.reminders.start();
  // Refresca estados "vencida" y el día actual sin recargar
  setInterval(render, 60 * 1000);
})(window.App);
