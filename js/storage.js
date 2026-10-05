/* Persistencia local. Para cambiar de backend (archivo, API, etc.) solo hay que tocar este módulo. */
(function (App) {
  const KEY = 'tareas.v1';
  const CAT_KEY = 'tareas.categorias.v1';

  App.storage = {
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
        /* almacenamiento no disponible: la app sigue funcionando en memoria */
      }
    },
    loadCategories() {
      try {
        const data = JSON.parse(localStorage.getItem(CAT_KEY));
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    saveCategories(list) {
      try {
        localStorage.setItem(CAT_KEY, JSON.stringify(list));
      } catch {
        /* sin almacenamiento */
      }
    },
  };
})(window.App);
