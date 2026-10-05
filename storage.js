/* Persistencia local. Para cambiar de backend (archivo, API, etc.) solo hay que tocar este módulo. */
(function (App) {
  const KEY = 'tareas.v1';

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
  };
})(window.App);
