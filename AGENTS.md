# SIMRED — portal público

- Inspecciona el portal y sus llamadas API antes de modificar. Sigue Nuxt 4, Vue 3 con Composition API y las convenciones de `app/` del proyecto.
- Verifica ejemplos y dependencias contra la versión de Nuxt 4 fijada en `package-lock.json`. Evita APIs, opciones y dependencias exclusivas de Nuxt 5.
- Reutiliza componentes y composables. Conserva la identidad visual, la accesibilidad, el rendimiento y la compatibilidad con SSR e hidratación.
- Confirma los contratos REST y las reglas de negocio en el backend. Distingue lo implementado de lo previsto y justifica las dependencias nuevas.
- Ejecuta las verificaciones pertinentes. Usa Web Design Guidelines para revisar la interfaz y Playwright en local o en un entorno de pruebas autorizado, con datos de prueba. Documenta los cambios y lo verificado.
