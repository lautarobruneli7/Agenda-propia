/* Secciones (categorías) creadas por el usuario: { id, name, color }. No toca el DOM. */
(function (App) {
  const COLORS = ['#4f5bd5', '#2f9e6b', '#e08a1e', '#d6453d', '#c2479b', '#1f9bb5', '#7a5af8', '#6d7079'];

  let list = App.storage.loadCategories();
  const listeners = [];
  const commit = () => {
    App.storage.saveCategories(list);
    listeners.forEach((fn) => fn());
  };
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);

  App.categories = {
    COLORS,
    onChange: (fn) => listeners.push(fn),
    all: () => list,
    get: (id) => list.find((c) => c.id === id) || null,

    add({ name, color }) {
      const c = { id: uid(), name: name.trim(), color: color || COLORS[list.length % COLORS.length] };
      list.push(c);
      commit();
      return c;
    },

    update(id, { name, color }) {
      const c = list.find((x) => x.id === id);
      if (!c) return;
      c.name = name.trim();
      c.color = color;
      commit();
    },

    remove(id) {
      list = list.filter((c) => c.id !== id);
      commit();
    },
  };
})(window.App);
