# Arraigo (base de demo)

Web móvil para participación y cohesión comunitaria en Gran Canaria. Mapa de municipios y barrios con un bosque de árboles (cada persona tiene el suyo), eventos con tablón, voluntariado, buzón, puntos de encuentro físicos, perfil con una planta que crece y un asistente de voz y texto. No hay backend ni base de datos: todo es de ejemplo y lo que se hace se guarda solo en el navegador.

Versión publicada: https://eldritch07.github.io/arraigo/ (añade `?demo=1` para el recorrido automático). Hay un código QR del enlace en `qr-arraigo.png` y también dentro de la app, en Perfil, con el botón "Ver código QR" (`node scripts/make-qr.mjs <enlace>` lo regenera).

El nombre viene de "arraigo": estar enraizado en un lugar y sentirse parte de él.

## Arrancar

```bash
npm install
npm run dev
```

Se abre en http://localhost:5173. Para generar la versión final: `npm run build` (carpeta `dist`).

## Modo presentación

La app puede recorrerse sola mientras alguien la explica: botón "Modo presentación" en la bienvenida y en Perfil, o abrir la dirección con `?demo=1` al final (por ejemplo `http://localhost:5173/?demo=1`). No hay panel encima de la app. El recorrido se detiene con una acción del ratón o del teclado, o con un doble toque seguido en el móvil (un solo roce no lo corta). Si no hay cuenta, crea una de demostración. Un enlace a un evento se comparte con `?event=ID`.

## Qué hay

- Cuenta simulada con contraseña (se guarda cifrada en el navegador), inicio de sesión, o seguir sin cuenta (se ve todo, pero crear o apuntarse pide cuenta).
- 7 idiomas en tiempo real: español, inglés, árabe, francés, alemán, chino e hindi. El árabe invierte la interfaz. El botón "+" añade más idiomas con el traductor del propio navegador (Chrome) cuando está disponible; si no, anota la petición.
- Mapa con 21 municipios y 403 barrios. Las Palmas de Gran Canaria usa 13 barrios con límite real de OpenStreetMap; el resto son áreas aproximadas.
- Bosque: cada árbol es una persona y su fase de crecimiento (semilla, brote, plántula, joven, adulta, en flor) se ve en el icono. Tu árbol lleva un aro verde. Las colaboraciones confirmadas plantan árboles pequeños.
- Eventos con estados (presentado, en revisión, aprobado, en curso, finalizado), lugar accesible, filtros, orden por más interesantes, me gusta, guardar y compartir.
- Tablón por evento para preguntar, comentar y que responda el organizador.
- Crear evento con documentación descargable en PDF ya rellena, petición de voluntarios, lugar accesible y patrocinador opcional.
- Patrocinadores: los comercios locales patrocinan eventos, salen destacados arriba y como publicidad etiquetada en la lista y en el detalle. Así se mantiene la app. Los comercios de ejemplo no son negocios reales.
- Apuntarse no da puntos. Los puntos llegan cuando el organizador confirma que fuiste (en la demo, el botón "simular que el organizador me confirma"). Quien organiza confirma asistentes desde el detalle de su evento.
- Voluntariado, buzón de quejas y sugerencias con foto, puntos de encuentro con cartelera imprimible, perfil y soporte.
- Perfil con tu actividad: eventos y voluntariados a los que te has apuntado (con su estado de confirmación), eventos guardados y eventos creados.
- Pensada para móvil: paneles que no se desplazan con el mapa, teclado en pantalla que no tapa los campos, zonas seguras del notch y de la barra inferior, mapa sin giro accidental y aviso de carga mientras llegan las teselas.
- Plantas canarias: drago, pino canario, palmera canaria y tajinaste rojo, con 6 fases.
- Asistente Gotita por texto y voz (Chrome y Safari).
- Animaciones de paneles, pestañas, listas, estados y crecimiento (librería `motion`). Se reducen solas si el sistema pide menos movimiento.

## Accesibilidad

Objetivo: WCAG 2.2 nivel AA y norma europea EN 301 549 (Real Decreto 1112/2018 y Acta Europea de Accesibilidad).

- Zonas táctiles de al menos 44 px, texto base de 16 px y campos de 16 px.
- Contraste de texto de 4,5 a 1 como mínimo; estados con texto e icono, nunca solo color.
- Teclado completo, foco visible, diálogos con foco controlado, Escape y fondo inerte, enlace para saltar al contenido.
- El mapa tiene alternativa en lista y selector de zona con buscador.
- Contraseña con botón para verla y sin bloquear pegar. Formularios con etiquetas, ayuda y errores en texto.
- Se indica si el lugar de cada evento es accesible.
- Hay una declaración de accesibilidad en Perfil. Falta una auditoría real con lector de pantalla y con personas usuarias.

## Dónde tocar

| Quiero cambiar | Archivo |
| --- | --- |
| Colores, tipografía, radios, escala del mapa | `src/index.css` (bloque `@theme`) |
| Textos y traducciones | `src/i18n/es.ts` (base) y `en.ts`, `ar.ts`, `fr.ts`, `de.ts`, `zh.ts`, `hi.ts` |
| Idiomas extra con "+" | `EXTRA_LANGS` en `src/i18n/index.tsx`, `src/components/MoreLanguages.tsx` |
| Datos de ejemplo, cuentas, puntos, patrocinadores | `src/state/app.tsx` |
| Zona, pestaña, diálogos, avisos | `src/state/ui.tsx` |
| Guion del modo presentación | `STEPS` en `src/state/tour.tsx` |
| Mapa, capas y bosque | `src/components/MapView.tsx`, `src/lib/forest.ts`, `src/lib/treeImages.ts` |
| Panel, pestañas y barra inferior | `src/components/Shell.tsx`, `BottomNav.tsx` |
| Pantallas | `src/components/screens/` |
| Eventos: detalle, tablón, acciones | `EventDetail.tsx`, `EventBoard.tsx`, `EventActions.tsx` |
| Crear evento y documentos | `src/components/CreateEventFlow.tsx`, `src/lib/pdf.ts` |
| Plantas, puntos y fases | `src/components/Plant.tsx`, `src/lib/plants.ts` |
| Asistente | `src/components/Assistant.tsx`, `DropletIcon.tsx` |
| Alta e inicio de sesión | `src/components/Auth.tsx` |

## Límites conocidos

- Todo vive en el navegador: no hay servidor, así que cuentas, puntos, mensajes y confirmaciones no se comparten entre personas. La confirmación del organizador y los asistentes se simulan con botones de demostración.
- La contraseña se cifra en el navegador, pero sin servidor no es una autenticación real.
- Las traducciones de los 7 idiomas se han generado con IA y conviene que las revise una persona hablante de cada idioma. Lo que escribe cada persona no se traduce solo.
- Los documentos descargables son modelos de ejemplo en español, sin valor administrativo.
- Gotita reconoce palabras clave, no usa IA.

## Datos geográficos

Los límites están en `public/data/*.geojson` (municipios, barrios y puntos de etiqueta). Se generan con:

```bash
node scripts/build-data.mjs
```

El script consulta Overpass (OpenStreetMap), guarda la respuesta en `scripts/.cache` y la reutiliza.

## Créditos de datos

Mapa base de OpenFreeMap y datos de OpenStreetMap (ODbL). Los datos de eventos, voluntariados, puntos, plantas y comercios son inventados.
