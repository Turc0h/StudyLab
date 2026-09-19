# Novedades y cambios de estructura — StudyLab

Este archivo documenta, fase por fase, qué se construyó, qué archivos se tocaron y qué
decisiones de diseño/arquitectura se tomaron. Usalo como mapa cuando necesites pedir una
modificación puntual ("che, cambiá tal cosa de la Fase 3") o cuando vuelvas al proyecto después
de un tiempo y no te acuerdes dónde vive cada cosa.

Convención: cada fase tiene **Qué se construyó**, **Archivos clave** y **Decisiones /
simplificaciones** (cosas que se dejaron a propósito más simples de lo ideal, para no bloquear
el avance, y que están anotadas para retomar después).

---

## Fase 0 — Diseño y setup

**Qué se construyó**
- Proyecto Vite + React 19 + TypeScript + Tailwind CSS v4 + Zustand + Dexie.js.
- Sistema de diseño completo en `src/index.css`: paleta dark (default) y light vía variables CSS
  (`:root` / `[data-theme="light"]`), tipografía (Space Grotesk / Inter / JetBrains Mono),
  escala de espaciado (4px, Tailwind), radios de borde (6/10/14/20px), fondo ambiental animado.
- Página de estilo/kit en `/kit` que documenta todo lo anterior en vivo.
- Componentes base reutilizables: `Button`, `Surface`, `Badge`, `Switch`, `Input`.

**Archivos clave**
- `src/index.css` — todos los tokens de diseño.
- `src/stores/useThemeStore.ts` — tema + fondo ambiental (Zustand, persistido en localStorage).
- `src/hooks/useSyncTheme.ts`, `src/hooks/useCssVar.ts`.
- `src/components/ui/*` — primitivos.
- `src/components/AmbientBackground.tsx`.
- `src/pages/style-kit/*` — página `/kit`.

**Decisiones / simplificaciones**
- Modo oscuro es el default; el claro existe pero recibe menos cuidado (según brief original).
- El fondo ambiental respeta `prefers-reduced-motion` y es desactivable desde Configuración.

---

## Fase 1 — Layout y navegación

**Qué se construyó**
- Shell de la app con sidebar (desktop) y barra de navegación inferior (mobile, breakpoint `md`).
- Routing con `react-router-dom`: `/` Dashboard, `/files` Archivos, `/methods` Métodos,
  `/session` Sesión, `/settings` Configuración.
- 5 páginas con estructura y estados vacíos con copy real (sin lógica todavía en esta fase,
  salvo Configuración que ya activa tema/fondo ambiental reales).

**Archivos clave**
- `src/layouts/AppShell.tsx` — layout raíz (sidebar + outlet + nav mobile).
- `src/components/nav/Sidebar.tsx`, `src/components/nav/MobileNav.tsx`.
- `src/config/nav.ts` — fuente única de los ítems de navegación.
- `src/components/PageHeader.tsx`, `src/components/EmptyState.tsx` — patrones reutilizados en
  todas las páginas.
- `src/pages/Dashboard.tsx`, `Files.tsx`, `Methods.tsx`, `Session.tsx`, `Settings.tsx`.
- `src/App.tsx` — definición de rutas (`createBrowserRouter`).

**Decisiones / simplificaciones**
- El ítem de nav mobile "Configuración" se cortaba porque el flex item no podía achicarse
  (`min-width: auto` por defecto en flexbox) — se corrigió con `min-w-0` en `MobileNav.tsx`.
- El `Switch` de la Fase 0 tenía dos bugs (salto de píxeles al desactivar, por un `border`
  condicional que cambiaba el box model; y centrado vertical impreciso) — se corrigieron en
  `src/components/ui/Switch.tsx` usando `border` siempre presente (transparente cuando está
  activo) y centrado con `top-1/2 -translate-y-1/2` en vez de un offset fijo.
- El switch dejó de usar `rounded-full` (pastilla perfecta tipo iOS, el único elemento de toda
  la app con ese radio) y pasó a `rounded-md`/`rounded-sm`, consistente con el resto del
  lenguaje geométrico — pedido explícito para que se sienta menos "genérico de librería".

---

## Fase 2 — Gestor de archivos

**Qué se construyó**
- Esquema completo de Dexie (`src/db/db.ts`) con **todas** las tablas que el resto de las fases
  iban a necesitar, definidas de una — así no hay migraciones intermedias: `folders`, `files`,
  `highlights`, `postits`, `sessions`, `deadlines`, `reviewSchedule`, `flashcards`,
  `flashcardDecks`.
- Árbol de carpetas navegable (recursivo, expandible) + breadcrumbs.
- Subida por drag-and-drop (o selector nativo) directo a la carpeta actual; el archivo se guarda
  como `Blob` en IndexedDB.
- Buscador simple por nombre (filtra sobre todos los archivos, ignora la carpeta actual).
- Sistema de plantillas (`src/config/templates.ts`): elegís año + carrera y se generan las
  carpetas `Año → Carrera → Materia` con las materias típicas de 1er año. Ahora mismo hay 3
  carreras de ejemplo (Medicina, Ingeniería Informática, Psicología) — agregar una carrera nueva
  es solo sumar una entrada al array `careerTemplates`.

**Archivos clave**
- `src/db/db.ts` — toda la base de datos local.
- `src/config/templates.ts` — plantillas de carrera/materias.
- `src/features/files/FolderTree.tsx`, `Breadcrumbs.tsx`, `FileGrid.tsx`, `NewFolderModal.tsx`,
  `fileHelpers.ts`.
- `src/components/ui/Modal.tsx` — modal genérico (se reutiliza en fases siguientes).
- `src/pages/Files.tsx` — arma todo lo anterior.

**Decisiones / simplificaciones**
- El buscador es un `includes()` case-insensitive simple, no hay indexado de texto completo.
- Al subir un PDF, `ocrStatus` arranca en `"pending"` sin saber todavía si el PDF tiene texto
  real o es escaneado — eso se resuelve la primera vez que se abre (Fase 3/5 lo actualizan).

---

## Fase 3 — Visor de documentos

**Qué se construyó**
- `PdfViewer` (`src/features/document-viewer/PdfViewer.tsx`): renderiza PDF a canvas vía
  `pdfjs-dist`, con navegación de páginas y zoom (60%–250%). Nunca abre pestaña ni ventana nueva
  — todo vive en un panel (`DocumentPanel`) que se monta encima de la página actual.
- Worker de PDF.js configurado una sola vez en `src/lib/pdf.ts`.
- Detección automática de si el PDF tiene capa de texto real (necesario para saber si hace falta
  OCR — Fase 5) al cargar el documento.

**Archivos clave**
- `src/lib/pdf.ts`, `src/features/document-viewer/PdfViewer.tsx`,
  `src/features/document-viewer/DocumentPanel.tsx` (el panel que envuelve al viewer).

**Decisiones / simplificaciones**
- `PdfViewer` ya nació con la capa de texto (`TextLayer` de pdf.js) montada, porque la Fase 4
  (subrayado) la necesita inmediatamente encima — se construyeron juntas en la práctica aunque
  son fases separadas en el brief.
- Solo se abre PDF por ahora. Word/imágenes muestran un mensaje explícito de "todavía no
  soportado" en vez de fingir que funciona — no hay pipeline de conversión Word→PDF implementado.

---

## Fase 4 — Subrayado + bloc de notas automático

**Qué se construyó**
- Selección de texto sobre la capa de texto de pdf.js → al soltar el mouse, se guarda un
  `HighlightRecord` (texto + rects normalizados 0–1 relativos a la página, para que sobrevivan a
  cualquier zoom).
- Los subrayados se redibujan como marcas semitransparentes sobre la página (`HighlightMarks.tsx`).
- Panel de notas en vivo (`NotesPanel.tsx`): lista subrayados y post-its ordenados por fecha,
  cada uno con botón **"Ir a la página N"** que salta ahí mismo en el `PdfViewer` (estado de
  página controlado desde `DocumentPanel`, compartido entre el viewer y el panel de notas).

**Archivos clave**
- `src/features/document-viewer/HighlightMarks.tsx`, `NotesPanel.tsx`.
- `db.highlights` en `src/db/db.ts`.

**Decisiones / simplificaciones**
- Los rects se guardan normalizados (0–1) respecto al tamaño de página, no en píxeles absolutos
  — así el subrayado se ve bien sin importar en qué zoom se hizo o se vuelve a abrir.

---

## Fase 5 — OCR para escaneados + post-its

**Qué se construyó**
- OCR con Tesseract.js (`src/features/document-viewer/ocr.ts`): si el PDF no tiene capa de texto
  (detectado en Fase 3), aparece un botón **"Ejecutar OCR"** en el header del documento. Corre
  página por página (renderiza cada página a canvas y se la pasa a Tesseract), con barra de
  progreso, y el texto reconocido de cada página se agrega al panel de notas con su link de
  vuelta a esa página.
- Badge de estado en cada PDF, tanto en la grilla de archivos como en el header del visor:
  **"OCR pendiente"** vs **"Listo para subrayar"** — se actualiza solo la primera vez que se
  abre el archivo.
- Post-its posicionales (`PostItMarks.tsx`): en "modo post-it" (botón en el header), un click
  sobre la página ancla una nota en esas coordenadas x/y (por eso funcionan también sobre
  escaneados sin texto). Se pueden arrastrar (drag con puntero), editar el texto (textarea
  inline) y borrar. Aparecen listados también en el panel de notas, igual que los subrayados.

**Archivos clave**
- `src/features/document-viewer/ocr.ts`, `PostItMarks.tsx`.
- `db.postits` en `src/db/db.ts`.

**Decisiones / simplificaciones — importante para lo que sigue**
- ~~El texto reconocido por OCR no tiene bounding boxes por palabra... queda pendiente para una
  iteración futura.~~ **Resuelto** — ver "Ajustes post-entrega #2" más abajo: ahora sí se arma una
  capa de texto seleccionable a partir de las cajas de línea que devuelve Tesseract.
- Tesseract.js descarga el modelo de idioma (`spa`) desde una CDN la primera vez que se usa OCR
  en el navegador — necesita conexión a internet esa primera vez. No se empaquetó el modelo
  localmente.
- El OCR corre a través de la API de alto nivel de Tesseract.js (que internamente maneja su
  propio worker), sin mostrar un preview del texto antes de guardarlo — se guarda directo.

---

## Fase 6 — Motor de sesión y los 8 métodos

**Qué se construyó**
- Motor de sesión único y configurable: `src/features/session-engine/methods.ts` define los 8
  métodos como datos (`StudyMethod`: nombre, descripción breve/completa, por qué funciona, cómo
  se usa acá, con qué combina, y un `structureType` que decide qué componente de ejecución usar).
  `SessionRunner.tsx` es el único despachador — un `switch` sobre `structureType` — no hay 8
  builds separados.
- `BlockSessionRunner.tsx`: timer por bloques compartido (usado por Pomodoro, Active Recall e
  Interleaving) — cuenta regresiva, avance automático o manual, pausa, indicador de ciclos.
- Un componente de ejecución por método en `src/features/session-engine/runners/`:
  - **Pomodoro** — 4 ciclos de Foco 25min + Descanso 5min, descanso largo al final.
  - **Active Recall** — timer de 20 min con el documento oculto (`onHideDocument`, controlado
    desde `Session.tsx`) + espacio para preguntas/respuestas propias.
  - **Spaced Repetition** — no corre timer: lista temas con repaso pendiente (`db.reviewSchedule`)
    y reprograma la fecha duplicando el intervalo anterior al marcar "repasado" (tope 60 días).
  - **Feynman** — bloque libre con un textarea "explicá esto como si...".
  - **Interleaving** — el usuario carga sub-temas + minutos por bloque, después rota con
    `BlockSessionRunner`.
  - **Cornell Notes** — plantilla de 3 zonas (preguntas / notas / resumen) con CSS grid.
  - **SQ3R** — stepper de 5 pasos guiados (Explorar/Preguntar/Leer/Recitar/Repasar), con notas
    por paso.
  - **Leitner** — flashcards reales (`db.flashcards` + `db.flashcardDecks`): Fallé vuelve a caja
    1, Acerté sube de caja (intervalos 1/2/4/7/14 días), con alta de tarjetas in-line.
- Selector de métodos (`/methods`): 8 fichas breves (`MethodCard`), click abre la ficha completa
  en modal (`MethodDetailModal`) con "Empezar sesión" → navega a `/session?method=<id>`.
- Página de Sesión (`/session`): lee `?method=` y `?file=` de la URL. Documento a un lado
  (reutiliza `DocumentAnnotator` de la Fase 3-5, embebido en vez de pantalla completa), método al
  otro. Si no hay archivo elegido, `FilePickerInline` deja elegir uno sin salir de la página.
- `logSession()` (`src/features/session-engine/logSession.ts`) registra cada sesión completada en
  `db.sessions` (método, materia si el archivo vive en una carpeta tipo `subject`, duración) —
  esto es lo que va a alimentar el Dashboard real en la Fase 7.

**Archivos clave**
- `src/features/session-engine/` completo (methods.ts, SessionRunner.tsx, BlockSessionRunner.tsx,
  MethodCard.tsx, MethodDetailModal.tsx, FilePickerInline.tsx, logSession.ts, `runners/*`).
- `src/features/document-viewer/DocumentAnnotator.tsx` — se **separó** de `DocumentPanel.tsx`
  (que ahora es solo un wrapper a pantalla completa) para poder reusar el mismo visor+notas
  embebido dentro de la página de Sesión sin duplicar código.
- `src/pages/Methods.tsx`, `src/pages/Session.tsx` (reescritas por completo).

**Decisiones / simplificaciones**
- **Bug real encontrado y corregido acá**: `db.files` no tenía `mimeType` indexado, y
  `FilePickerInline` lo necesitaba para filtrar PDFs — Dexie tiraba
  `KeyPath mimeType on object store files is not indexed` apenas se entraba a una sesión. Se
  agregó `mimeType` al índice de `files` en `src/db/db.ts`.
- Los textos libres de Feynman, Cornell y SQ3R **no se persisten** todavía — viven solo en el
  estado del componente durante la sesión. `logSession()` sí registra que la sesión pasó (para el
  Dashboard), pero el contenido escrito se pierde al cerrar. Conectarlo a una tabla de notas por
  sesión queda pendiente si hace falta guardarlo.
- Dentro de una sesión, el documento se muestra sin su panel de notas lateral propio (no entra en
  la mitad de pantalla) — subrayados y post-its se siguen guardando igual, pero para verlos
  listados hay que reabrir el archivo desde Archivos.
- Leitner no llama a `logSession()` — es una actividad continua sin un "final" claro en esta
  versión.

---

## Fase 7 — Dashboard

**Qué se construyó**
- Dashboard conectado a datos reales de Dexie (`src/features/dashboard/stats.ts` +
  `src/pages/Dashboard.tsx`), sin Google Calendar todavía:
  - **Racha** — días consecutivos con al menos una sesión (`computeStreak`). Si hoy todavía no
    estudiaste, no rompe la racha de ayer.
  - **Vueltas por materia** — cuenta sesiones agrupadas por `subjectFolderId`, resuelto a nombre
    de carpeta.
  - **Registro reciente** — últimas 4 sesiones con nombre de método y fecha relativa.
  - **Próximos vencimientos** — manual por ahora: un formulario mínimo (título + fecha) agrega a
    `db.deadlines`. Preparado para mezclarse con eventos de Google Calendar en la Fase 9.

**Archivos clave**
- `src/features/dashboard/stats.ts`, `src/pages/Dashboard.tsx`.

**Decisiones / simplificaciones**
- **Bug real encontrado y corregido acá** (y es importante para todo el resto del código): pasar
  un `className` con un ancho (`w-36`, `flex-1`, `w-20`) directo a `<Input>` no funciona de forma
  confiable, porque `Input` ya trae `w-full` en sus clases base y **el orden de las clases en el
  JSX no determina qué gana** — gana la que aparece después en la hoja de estilos que genera
  Tailwind, que es un orden interno, no el de aparición. En este caso `w-full` le ganaba a `w-36`,
  y dentro de un `flex` con otro input al lado, eso hacía que uno se comiera casi todo el ancho y
  el otro quedara reducido a un cuadradito. **La solución, y el patrón a repetir de acá en
  adelante:** nunca pasarle una clase de ancho a `Input` (ni a otro componente con `w-full` de
  base) cuando está dentro de un `flex` — envolverlo en un `<div>` con `w-36` / `flex-1
  min-w-0` y dejar que el `w-full` interno llene ese contenedor. Se corrigió en
  `Dashboard.tsx` y `InterleavingRunner.tsx`, y se blindó `SpacedRunner.tsx` con el mismo
  patrón aunque ahí visualmente no se notaba.

---

## Fase 8 — Sonido ambiente

**Qué se construyó**
- Reproductor discreto y colapsable (`AmbientPlayer.tsx`), flotante en la esquina inferior
  derecha, montado una sola vez en `AppShell` — visible en toda la app, no solo en Configuración.
- Lista de pistas config-driven (`src/features/ambient-sound/tracks.ts`) — **vacía a
  propósito**. `public/audio/README.md` explica cómo agregar archivos `.mp3` propios o libres de
  derechos y sumarlos a esa lista.
- El reproductor no renderiza nada (`return null`) si la lista está vacía — no hay UI muerta
  dando vueltas.
- Settings ahora refleja el estado real: cuántas pistas hay cargadas, y un botón "Conectar
  Spotify" deshabilitado (el SDK no está integrado — no hay una fase dedicada para eso, queda
  para cuando haga falta).

**Archivos clave**
- `src/features/ambient-sound/tracks.ts`, `AmbientPlayer.tsx`.
- `src/stores/useAmbientPlayerStore.ts` (Zustand: pista actual, play/pause, volumen).
- `public/audio/README.md`.

**Decisiones / simplificaciones**
- **Regla del proyecto respetada al pie de la letra**: cero archivos de audio con copyright
  embebidos o enlazados. El reproductor está construido y funciona con un `<audio>` nativo, pero
  no reproduce nada hasta que el usuario agregue sus propios archivos.
- Conexión a Spotify/YouTube Music vía SDK: **no implementada**. El botón está ahí como
  affordance visual, no hace nada todavía — habría que sumar sus SDKs (OAuth propio de cada uno)
  el día que se priorice.

---

## Fase 9 — Backend + Google Calendar

**Qué se construyó**
- Backend real en `server/` (Node + Express + TypeScript, proyecto separado del frontend con su
  propio `package.json`): OAuth 2.0 de Google (`googleapis`), guarda el token en un archivo local
  (`server/.token.json`, gitignored — alcanza para un solo usuario), y expone:
  - `GET /health` — estado general.
  - `GET /auth/google` — redirect al consentimiento de Google.
  - `GET /auth/google/callback` — intercambia el código por tokens, los guarda, redirige de
    vuelta a `/settings?calendar=connected`.
  - `GET /api/calendar/status` — si están las credenciales configuradas y si hay una cuenta
    conectada.
  - `GET /api/calendar/events` — próximos eventos del calendario primario.
- Frontend conectado pero **a prueba de que el backend no esté corriendo**
  (`src/features/google-calendar/useGoogleCalendar.ts`): todo fetch al backend falla en silencio
  y cae a estado vacío — la app nunca se rompe por esto, es local-first por diseño y este es el
  único punto que depende de un proceso externo.
- Configuración → Google Calendar ahora muestra el estado real (backend caído / backend arriba
  sin credenciales / arriba y sin conectar / conectado) y un botón "Conectar" que redirige a
  `/auth/google`.
- Dashboard → "Próximos vencimientos" mezcla los eventos de Google Calendar (si hay conexión)
  con los vencimientos manuales de la Fase 7, marcados con "· Calendar".

**Archivos clave**
- `server/` completo (`src/index.ts`, `src/googleClient.ts`, `src/routes/auth.ts`,
  `src/routes/calendar.ts`, `.env.example`).
- `src/config/env.ts` (`BACKEND_URL`, default `http://localhost:3001`).
- `src/features/google-calendar/useGoogleCalendar.ts`.

**Decisiones / simplificaciones — leer antes de tocar esto**
- **El backend no arranca solo.** `npm run dev` en la raíz solo levanta el frontend. Para probar
  Google Calendar: `cd server`, copiar `.env.example` a `.env`, completar
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` con un OAuth Client propio creado en Google Cloud
  Console (con la Calendar API habilitada y el redirect URI exacto configurado ahí), y
  `npm install && npm run dev`.
- **No hay credenciales de Google incluidas en ningún lado** — no podían generarse acá, cada
  instalación necesita las suyas. Sin ellas, la sección de Configuración simplemente informa el
  estado ("faltan credenciales") y el botón queda inactivo.
- Se probó que el backend levanta y responde (`/health`, `/api/calendar/status`) sin
  credenciales configuradas — **no se probó el flujo de OAuth real** (consentimiento de Google +
  intercambio de token), porque requiere una cuenta de Google real y credenciales reales que no
  existen en este entorno.
- El token se guarda en un archivo plano en disco — funciona para un usuario local, no es un
  esquema de sesiones/multi-usuario. Si esto se despliega en algún momento a un servidor real
  compartido, hay que reemplazarlo por almacenamiento por usuario.
- No se implementó la creación de bloques de estudio sugeridos en el calendario del usuario
  (mencionada como "opcional" en el brief original) — solo lectura de eventos.

---

## Fase 10 — Pulido (pasada inicial, no exhaustiva)

**Qué se hizo**
- **Code-splitting por ruta**: `src/App.tsx` pasó de imports estáticos a `React.lazy` + 
  `Suspense` para las 6 páginas. Antes, un solo bundle de **919 KB** cargaba pdf.js y
  Tesseract.js aunque el usuario nunca abriera un documento. Ahora el bundle de entrada baja a
  **288 KB**, y todo el peso de `pdfjs-dist` + `tesseract.js` vive en un chunk separado
  (`DocumentAnnotator-*.js`, ~457 KB) que solo se descarga al entrar a Archivos o Sesión. Se
  verificó corriendo `npm run build` — desapareció el warning de "chunk larger than 500 kB".
- Accesibilidad de base (ya estaba desde la Fase 0, se dejó registrado acá): foco de teclado
  visible vía `:focus-visible` global en `src/index.css`, y el fondo ambiental respeta
  `prefers-reduced-motion` además de tener su propio toggle manual.
- Responsive verificado con capturas reales en 390px (mobile) para Dashboard, Archivos y
  Configuración — encontró y corrigió el bug de `MobileNav` (Fase 1) y el de los `Input` dentro
  de `flex` (Fase 7).

**Lo que NO se hizo — quedó pendiente de una pasada de pulido más profunda**
- No hubo una auditoría de accesibilidad completa (lector de pantalla, navegación 100% por
  teclado en modales/menús, contraste medido con herramienta) — solo lo que ya venía bien desde
  el sistema de diseño de la Fase 0.
- No se probó rendimiento con archivos realmente grandes (PDFs de cientos de páginas, OCR sobre
  documentos largos) — el flujo de OCR corre página por página de forma secuencial, sin límite ni
  aviso de "esto puede tardar mucho" para archivos grandes.
- No se revisó tablet específicamente (se probó desktop ~1440px y mobile ~390px, no el rango
  intermedio salvo por los breakpoints de Tailwind ya usados en el layout).
- El input de búsqueda de Archivos, los formularios de sesión, etc. no tienen validación más
  allá de deshabilitar el botón de submit — no hay mensajes de error inline.

---

## Ajustes post-entrega — visor de PDF, Sesión y post-its

Ronda de correcciones pedida después de usar la app en serio. Toca Fases 3, 5 y 6.

**Qué se pidió y qué se hizo**

1. **"Al abrir un PDF tengo que ir cambiando de página una por una, quiero que salga todo en
   fila."** → `PdfViewer.tsx` se reescribió de raíz: en vez de renderizar una sola página
   controlada (`page`/`onPageChange`), ahora renderiza **todas las páginas apiladas en una
   columna con scroll continuo** (`PdfPage` es un subcomponente, uno por página, todos montados
   a la vez). Se sacaron los botones de anterior/siguiente; el zoom se mantiene. El link "Ir a la
   página N" del panel de notas ahora hace `scrollIntoView` sobre esa página en vez de cambiar de
   vista.

2. **"En la sesión el PDF se ve chico, quiero pantalla completa con el timer en la barra lateral
   izquierda."** → Se sacó el límite de ancho `max-w-5xl` del `AppShell` (vivía en un wrapper
   global que apretaba TODAS las páginas) y se lo movió a cada página que lo necesita
   (`Dashboard`, `Files`, `Methods`, `Settings` ahora lo traen ellas mismas). `Session.tsx` se
   reorganizó: barra lateral angosta (320px) a la izquierda con el nombre del método y el
   `SessionRunner` (timer, flashcards, etc.), y el documento ocupa **todo el resto del ancho y
   alto disponibles** — antes era una grilla 50/50 con el documento reducido a media pantalla.
   Esto obligó a que `AppShell`'s `<main>` pasara de "toda la página scrollea" a "el `<main>`
   scrollea internamente" (`h-screen overflow-hidden` en el shell, `overflow-y-auto` en
   `<main>`), así Sesión puede ocupar exactamente el alto disponible sin que la página entera
   haga scroll.

3. **"Subrayar no tiene ninguna opción que lo permita, es automático y lo hace mal."** →
   Se agregó un botón explícito **"Subrayar"** en el header del documento (mismo patrón que
   "Post-it"): mientras no está activo, seleccionar texto no crea nada. Además se encontró y
   arregló un bug real de fondo: el detector de selección escuchaba `onMouseUp` en el
   **contenedor de cada página**, así que si el arrastre del mouse terminaba unos pocos píxeles
   fuera del borde de esa página (algo que pasa todo el tiempo al seleccionar cerca del margen),
   el evento nunca llegaba a dispararse y no pasaba nada — de ahí el "lo hace mal". Se movió el
   listener a nivel de toda la ventana (`window.addEventListener("mouseup", ...)`), y se
   identifica a qué página pertenece la selección por su posición en el DOM
   (`container.contains(range.commonAncestorContainer)`), no por dónde cayó el cursor. Ahora
   funciona sin importar dónde se suelte el mouse.

4. **Post-its — tres problemas separados:**
   - *"Al moverlos se abre un menú del navegador."* Se separó el mango de arrastre (ahora tiene
     un ícono de agarre `⠿` explícito) del resto de la nota, y se le agregó `touch-action: none`,
     `preventDefault()` en el `pointerdown`, y bloqueo del menú contextual
     (`onContextMenu`) — nada de esto dependía de un gesto ambiguo antes.
   - *"Es tedioso borrarlos."* El botón de borrar (X) estaba **dentro** del mismo `<div>` que
     capturaba el arrastre, así que un click rápido a veces se interpretaba como el inicio de un
     drag antes de registrar el click. Ahora el botón de borrar es un elemento hermano, separado,
     con su propio `onPointerDown` que corta la propagación — nunca puede arrancar un arrastre.
   - *"No quiero crear post-its infinitos, quiero apretar el botón cada vez."* El botón "Post-it"
     dejó de ser un modo persistente: ahora es un **armado de un solo uso** — se activa, el
     próximo click en la página coloca una nota y el botón se desarma solo. Para poner otra hay
     que volver a apretarlo.

**Archivos tocados**
- `src/features/document-viewer/PdfViewer.tsx` (reescrito — scroll continuo, subrayado por
  ventana completa).
- `src/features/document-viewer/DocumentAnnotator.tsx` (botón "Subrayar", post-it de un solo uso,
  `jumpTo` en vez de `page`/`onPageChange`).
- `src/features/document-viewer/PostItMarks.tsx` (mango de arrastre separado del botón borrar,
  bloqueo de gestos nativos).
- `src/layouts/AppShell.tsx` (scroll movido a `<main>`, sin `max-w-5xl` global).
- `src/pages/Dashboard.tsx`, `Files.tsx`, `Methods.tsx`, `Settings.tsx` (agregan su propio
  `mx-auto max-w-5xl`).
- `src/pages/Session.tsx` (reescrito — barra lateral izquierda + documento a pantalla completa).

**Cómo se probó**
Con un PDF de 3 páginas real: se confirmó que las 3 páginas quedan una debajo de la otra con
scroll, que seleccionar texto SIN el modo "Subrayar" activo no crea nada, que activarlo y
arrastrar (incluso pasándose del borde de la página) sí crea el subrayado y aparece en el panel
de notas, que "Post-it" arma-coloca-desarma correctamente (un segundo click sin volver a apretar
el botón no crea nada), y que la sesión de Pomodoro muestra el timer en la barra lateral con el
documento ocupando el resto de la pantalla.

*Nota de proceso*: mientras se probaba esto con un script automatizado, aparecieron resultados
falsos causados por el propio script de prueba (coordenadas de arrastre que mandaban el mouse
fuera de la ventana del navegador, y archivos de log escritos dentro de la carpeta del proyecto
que hacían recargar el servidor de desarrollo a mitad de la prueba). Quedan mencionados acá por
si en el futuro un test automatizado da resultados raros: revisar primero que el propio test no
esté escribiendo archivos dentro del proyecto ni moviendo el mouse fuera de los límites reales de
la ventana.

---

## Ajustes post-entrega #2 — OCR seleccionable + reinicio de datos

Segunda ronda de correcciones. Toca Fases 5 y 10.

**Qué se pidió y qué se hizo**

1. **"Toma los PDF como si fueran imágenes, no me deja seleccionar texto."** → Esto pasaba en
   PDFs escaneados (sin capa de texto embebida): como se documentó como simplificación consciente
   en la Fase 5, el OCR solo volcaba el texto reconocido como una nota plana en el panel lateral,
   pero **nunca armaba una capa de texto seleccionable sobre la imagen** — así que para esos
   documentos la queja era literalmente correcta, no eran seleccionables.
   Se resolvió de raíz:
   - `ocr.ts` ahora pide a Tesseract las cajas por **línea** (`data.blocks[].paragraphs[].lines[]`,
     cada una con su `bbox`), no solo el texto plano, y las normaliza (0–1) igual que los rects de
     los subrayados.
   - Se agregó la tabla `ocrPages` (`fileId, page, lines[]`) en `db.ts` (bump a
     `db.version(2)`) para guardarlas.
   - `PdfPage` (dentro de `PdfViewer.tsx`) ahora arma, por cada línea de OCR, un `<span>`
     posicionado sobre la imagen (mismo mecanismo que usa pdf.js para su propia capa de texto:
     texto transparente, `cursor: text`, `user-select: text`, escalado horizontal con
     `transform: scaleX(...)` para que el ancho del span calce con el bbox real). El resultado es
     una capa invisible pero genuinamente seleccionable — el usuario puede arrastrar el mouse
     sobre el texto escaneado exactamente igual que sobre un PDF con texto real, y el botón
     "Subrayar" (de la ronda anterior) funciona sin cambios porque usa el mismo detector de
     selección a nivel de ventana.
   - Se sacó el volcado automático de una nota gigante por página al terminar el OCR — ya no hace
     falta, porque ahora el usuario puede seleccionar y subrayar exactamente la frase que le
     interesa, igual que en cualquier otro documento.
   - Probado con un PDF armado a propósito sin texto embebido (una imagen renderizada con dos
     líneas): antes de correr OCR, arrastrar el mouse sobre el texto no seleccionaba nada; después
     de "Ejecutar OCR", el mismo arrastre selecciona el texto correcto
     (`window.getSelection()` lo confirma) y, con "Subrayar" activo, crea un subrayado real que
     aparece en el panel de notas con el rect bien alineado sobre la imagen.

2. **"Quiero reiniciar la página, quedó guardada información anterior."** → Se agregó una sección
   **"Datos"** al final de Configuración con un botón **"Reiniciar aplicación"** (pide
   confirmación in-line antes de borrar). Ejecuta `resetAllLocalData()` (`db.ts`): borra la base
   IndexedDB completa (`db.delete()`) y `localStorage`, y recarga la página — vuelve a arrancar
   con las carpetas de plantilla de cero. Probado con un script automatizado: crea una carpeta,
   la borra desde Configuración, y confirma leyendo IndexedDB directamente que la tabla de
   carpetas queda vacía.

**Archivos tocados**
- `src/features/document-viewer/ocr.ts` (reescrito — devuelve líneas con bbox en vez de texto
  plano).
- `src/features/document-viewer/PdfViewer.tsx` (`PdfPage` arma la capa de texto sintética cuando
  la página no tiene texto real embebido pero sí líneas de OCR).
- `src/features/document-viewer/DocumentAnnotator.tsx` (lee `db.ocrPages`, se lo pasa a
  `PdfViewer`, ya no crea una nota automática al terminar el OCR).
- `src/db/db.ts` (tabla `ocrPages`, bump a `db.version(2)`, función `resetAllLocalData()`).
- `src/pages/Settings.tsx` (sección "Datos" con el botón de reinicio y su confirmación).

*Nota*: como se agregó una tabla nueva a la base local (`ocrPages`), cualquiera que ya tuviera la
app abierta desde antes de este cambio puede necesitar el botón de "Reiniciar aplicación" una
sola vez si Dexie no migra sola — es la misma función que se acaba de agregar para este pedido.

---

## Ajustes post-entrega #3 — Rediseño futurista HUD, corrección de bugs, optimización y gestión de archivos

Tercera ronda de mejoras integrales enfocada en estética de vanguardia, estabilidad funcional y rendimiento de estudio prolongado.

**Qué se construyó y mejoró**

1. **Estética gráfica futurista / HUD de alta tecnología**:
   - Nuevos tokens y sombras de resplandor neón (`--shadow-glow`, `--shadow-glow-sm`) en `index.css`.
   - Efectos de *glassmorphism* de alto contraste (`.glass-panel`, `.glass-panel-interactive`) con bordes translúcidos y desenfoque de fondo en `Surface.tsx`.
   - Cuadrícula cibernética sutil con máscara orbital (`.cyber-grid`) en `AmbientBackground.tsx` que acompaña el fondo ambiental sin saturar la vista.
   - Barra lateral `Sidebar.tsx` transformada en consola HUD con indicador de telemetría de base de datos local activa (`// LOCAL DB INDEXED_OK`) y puntos de pulso LED (`.hud-pulse-dot`).
   - `Badge.tsx` y `Button.tsx` actualizados con tipografía técnica `JetBrains Mono` y micro-bordes luminosos.
   - Fichas de métodos `MethodCard.tsx` rediseñadas como paneles HUD interactivos con identificadores técnicos.

2. **Corrección de errores críticos (Bugs funcionales)**:
   - **Desfase de zona horaria en vencimientos (`Dashboard.tsx`)**: se reemplazó la interpretación automática en UTC por el desglose numérico de año, mes y día en hora local fijada a las 23:59:59.
   - **Cálculo erróneo de `formatDueDate` (`stats.ts`)**: se corrigió la fórmula que marcaba como "Mañana" las entregas del día de hoy, calculando la diferencia real entre días calendario a medianoche.
   - **Efectos colaterales en `useLiveQuery` (`LeitnerRunner.tsx`)**: se extrajo la creación del mazo por defecto a un `useEffect` para evitar bucles reactivos y condiciones de carrera en React 19.
   - **Bloqueo permanente en fallo de OCR (`DocumentAnnotator.tsx`)**: se implementó un bloque `catch` que devuelve `ocrStatus` a `"pending"` e informa el error al usuario si falla la conexión al descargar el modelo de Tesseract.
   - **Detección robusta de PDFs (`fileHelpers.ts`)**: soporte para extensión de archivo `.pdf` y variantes `application/x-pdf`, previniendo fallos al arrastrar archivos en Windows.

3. **Optimizaciones de rendimiento y timers**:
   - **Temporizador resiliente a segundo plano (`BlockSessionRunner.tsx`)**: el timer ahora calcula el tiempo transcurrido contra marcas de tiempo reales (`Date.now() + remaining * 1000`), impidiendo que el navegador congele o ralentice el Pomodoro al cambiar de pestaña o minimizar la ventana.
   - **Anillo de progreso circular futurista (*Progress Ring*)**: reemplazo de la barra estática por un indicador radial SVG animado con resplandor neón cian.
   - **Renderizado diferido en PDFs extensos (`PdfViewer.tsx`)**: incorporación de `content-visibility: auto` y `contain-intrinsic-size` en cada página, más liberación de memoria mediante `doc.cleanup()` y `loadingTask.destroy()`.

4. **Gestión de archivos y carpetas**:
   - Posibilidad de eliminar archivos y carpetas directamente desde `FileGrid.tsx` y `FolderTree.tsx`.
   - Borrado en cascada (`deleteFileCascade` y `deleteFolderCascade` en `fileHelpers.ts`): limpia de forma atómica los subrayados, post-its y páginas OCR asociadas en IndexedDB, impidiendo que queden registros huérfanos.

5. **Persistencia y exportación de notas de estudio**:
   - `CornellRunner.tsx`, `FeynmanRunner.tsx` y `Sq3rRunner.tsx` ahora guardan automáticamente borradores en almacenamiento local para no perder apuntes ante recargas accidentales, e incluyen botones para **"Copiar texto"** y **"Descargar .txt"**.

6. **Diseño responsive en Sesión (`Session.tsx`)**:
   - En pantallas móviles (`< md`), se incorpora un selector HUD entre "MÉTODO // TIMER" y "DOCUMENTO", evitando que el visor de PDF quede comprimido.

---

## StudyLab v3.0 — Cognitive Operating System

Transformación de la aplicación en un Sistema Operativo Cognitivo de alto rendimiento, implementado sin restricciones ni simplificaciones.

### Módulo 1: Motor de Memoria & Algoritmos Predictivos
- **FSRS v4.5 / v5 (Free Spaced Repetition Scheduler)**:
  - Implementación matemática canónica de Retrievability $R(t, S) = (1 + 19 \cdot t / S)^{-0.5}$.
  - Vida media del conocimiento: $t_{1/2} = \frac{3}{19} \cdot S \approx 0.1579 \cdot S$.
  - Vector canónico de 17 parámetros de Jarrett Ye con mean-reversion de Dificultad $D$ y actualización de Estabilidad $S$ en recuerdo y olvido.
  - Esquema Dexie v3 con tablas `cardsFsrs` y `reviewLogs` (telemetría con latencia en milisegundos y estados previos/posteriores).
  - Migración y sincronización automática transparente de mazos Leitner existentes hacia FSRS.
  - Actualización de `LeitnerRunner.tsx` con soporte dual (FSRS predictivo / Leitner clásico) y preview de intervalos en tiempo real.
- **Grafo de Conocimiento & Árboles Causales (`/graph`)**:
  - Motor topológico DAG (`graphEngine.ts`) con detección de ciclos causales.
  - Bloqueo dinámico de nodos: los conceptos hijos se bloquean si cualquier prerrequisito tiene $R < 0.70$ o maestría $< 70\%$.
  - Detección de Cuellos de Botella Cognitivos (`identifyBottlenecks`): identifica conceptos de alta centralidad con alta tasa de fallas recurrentes.
  - Lienzo interactivo `GraphCanvas.tsx` con estética Cyber-HUD, arrastre, zoom, anillos de progreso de retención y panel inspector.

### Módulo 2: Modos Avanzados de Estudio Cognitivo
- **Técnica Feynman & Validación Socrática (`SocraticFeynmanRunner.tsx`)**:
  - Detector en tiempo real de razonamiento circular / tautologías ("X ocurre porque X...").
  - Detector de jerga técnica compleja con incentivo a la sustitución por analogías cotidianas.
  - Generador dinámico de desafíos socráticos y contraejemplos en condiciones de borde.
- **Quantitative Blurting con Categorización Cromática (`QuantitativeBlurtingRunner.tsx`)**:
  - Volcado mental libre contra cronómetro estricto.
  - Auditoría cromática automática de aserciones: 🟢 Verde (preciso), 🟡 Amarillo (impreciso), 🔴 Rojo (distorsión/error), ⚪ Gris (omisiones fundamentales).
  - Métricas cuantitativas de exhaustividad y precisión, más generación en 1 clic de tarjetas FSRS a partir de las omisiones.
- **Dynamic Adaptive Interleaving (`DynamicInterleavingRunner.tsx`)**:
  - Práctica entrelazada de alta interferencia contextual entre múltiples dominios.
  - Inyección de preguntas trampa discriminativas diseñadas para evitar sesgos de transferencia superficial.
  - Medidor en tiempo real del Ratio de Discriminación.
- **Palacio de la Memoria Espacial 2.5D (`SpatialPalaceRunner.tsx`)**:
  - Entorno isométrico en Canvas 2.5D con navegación por coordenadas espaciales (WASD / teclado / ratón).
  - Cámaras progresivas ("Atrio de Fundamentos", "Cámara de Dinámica Sináptica", "Bóveda de Síntesis").
  - Compuertas de Recuerdo Activo: las puertas permanecen selladas hasta alcanzar retención consolidada ($R \ge 85\%$) en los loci del recinto.

### Módulo 3: Workspace OS Modular & Micro-Widgets (`/workspace`)
- **Perfiles Neuro-Cognitivos Sintonizados**:
  - `Deep Problem Solving`: KaTeX REPL + Síntesis Gamma 40 Hz + Medidor de Fatiga.
  - `Memory Fortress`: Bloc Efímero 60s + Síntesis Alfa 10 Hz + Medidor de Fatiga.
  - `Research Synthesis`: KaTeX REPL + Bloc Efímero + Síntesis Theta 6 Hz.
  - `Personalizado`: selección modular de micro-widgets activos.
- **Micro-Widgets**:
  - `CognitiveFatigueMeter.tsx`: Telemetría en vivo de dinámica de tecleo, ráfagas de corrección y pausas para calcular el Índice de Fatiga (0–100%).
  - `EphemeralScratchpad.tsx`: Desvanecimiento visual de opacidad en 60 segundos y purga automática de buffer para forzar síntesis y desahogar la memoria de trabajo.
  - `BinauralSynthesizer.tsx`: Generador Web Audio API nativo con osciladores estéreo desacoplados (Gamma 40Hz, Alfa 10Hz, Theta 6Hz) y ruido marrón/rosa para enmascaramiento ambiental. Sin dependencias externas de audio.
  - `LatexTerminal.tsx`: Terminal de evaluación interactiva con KaTeX en vivo, paleta de símbolos científicos y snippets de fórmulas.
- **Motor Autonómico de Reglas IFTTT (`automationEngine.ts`)**:
  - Detección de picos de neuro-fatiga (>75%) con sugerencia de micro-descanso y sintonización de ondas Alfa.
  - Aislamiento de lapsos consecutivos con recomendación en el Grafo de Conocimiento.
  - Alertas circadianas nocturnas para optimización del sueño de ondas lentas.

### Módulo 4: Telemetría & Métricas en Dashboard
- Indicador de Vida Media del Conocimiento ($t_{1/2}$) agregado.
- Monitor del Índice de Ilusión de Competencia (ICI) comparando velocidad de respuesta vs estabilidad de retención real.
- Lanzador de acceso directo hacia el Grafo Causal y el Workspace OS.

---

## Fase 8 — Personal Academic Knowledge Engine (v4.0)

Transformación de StudyLab en un motor de conocimiento universitario de alta precisión académica superior a NotebookLM, con arquitectura Citation-First, RAG híbrido y evaluación socrática.

### 1. Pipeline de Ingesta & Semantic Chunking Jerárquico
- **AST Parsing Semántico (`academicChunker.ts`)**:
  - Segmentación jerárquica de textos académicos basada en la estructura formal: Partes, Capítulos, Secciones y Subsecciones.
  - Bloques Atómicos Indivisibles: Garantía de no fragmentación de axiomas, lemas, teoremas y sus demostraciones integradas.
  - Extracción matemática LaTeX: Detección y normalización de fórmulas en modo bloque (`$$...$$`, `\[...\]`) y en línea (`$...$`, `\(...\)`).
  - Bounding Boxes Normalizadas: Coordenadas espaciales relativas (0.0 a 1.0) para trazabilidad e iluminación en visores de documentos.
- **Indexación Híbrida & GraphRAG (`vectorIndex.ts`)**:
  - Búsqueda híbrida combinando similitud densa de cosenos con scoring léxico BM25 vía Reciprocal Rank Fusion (RRF).
  - Impulso semántico topológico mediante los conceptos del Grafo Causal y prerrequisitos directos.
  - Sembrado de textos universitarios de referencia: *Física III: Electromagnetismo & Campos* y *Álgebra Lineal: Estructuras Algebraicas y Espacios Vectoriales*.

### 2. Generación Activa FSRS & Evaluación Socrática
- **Auto-generador FSRS (`flashcardGenerator.ts`)**:
  - Generación automática de tarjetas atómicas cumpliendo las 20 Reglas de Formulación de SuperMemo.
  - Estimación inicial de Estabilidad ($S_0$) y Dificultad ($D_0$) modulada por la densidad matemática del chunk.
- **Evaluador Socrático NLI (`socraticEvaluator.ts`)**:
  - Comparación analítica de explicaciones del alumno contra el texto fuente.
  - Diagnóstico categórico: Dominio Completo, Comprensión Sólida, Comprensión Parcial y Lagunas Críticas.
  - Detección de aciertos conceptuales, omisiones de hipótesis necesarias y contradicciones/alucinaciones.
  - Generación de preguntas socráticas adaptativas para cerrar brechas conceptuales.

### 3. The Academic Workspace Tri-Panel (`/academic`)
- **Panel 1: Gestor de Fuentes Universitarias (`AcademicSourceManager.tsx`)**:
  - Organización jerárquica por carrera, año de cursada, cátedra y tipo de documento.
  - Badges de auditoría técnica: OCR Status, AST Tree Parsed, GraphRAG Indexed.
- **Panel 2: Lienzo Híbrido Split & Citation-First UI (`AcademicCanvas.tsx`)**:
  - Split view interactivo: Editor de notas con soporte KaTeX + Visor de documento con bounding boxes resaltadas en neón cian.
  - Diálogo Socrático RAG: Terminal de chat con citaciones auditables obligatorias en cada afirmación.
  - Píldoras de Cita (`CitationPill.tsx`): Al hacer clic o hover, muestran el fragmento original y desplazan el visor a la página y coordenada exacta.
- **Panel 3: Widgets de Ejecución Cognitiva (`AcademicCognitiveWidgets.tsx`)**:
  - Lector y entrenador FSRS con ratings Again (1), Hard (2), Good (3), Easy (4) y telemetría de intervalos.
  - Simulador de preguntas trampa de examen: Desafíos conceptuales con justificación rigurosa fundamentada en el texto.
  - Grafo topológico de conceptos clave y dependencias de prerrequisitos.

### 4. Endpoints Backend & Modelo de Datos Dexie v4
- **Migración Dexie v4 (`db.ts`)**: Tablas `academicSources`, `academicChunks`, `academicEvaluations` y `workspaceState`.
- **Rutas Express (`server/src/routes/academic.ts`)**:
  - `/api/academic/sources/ingest`: Ingesta y parseo AST jerárquico.
  - `/api/academic/cognitive/feynman-eval`: Evaluación socrática de explicaciones.
  - `/api/academic/cognitive/generate-flashcards`: Síntesis de tarjetas FSRS.
  - `/api/academic/fsrs/next-review`: Predicción y cálculo de estabilidad e intervalos.
  - `/api/academic/health`: Estado de los módulos cognitivos.

---

## Fase 9 — Academic Hub UX Overhaul & Visor Ejecutable (v4.1)

### 1. Ingesta Real de Archivos (Drag-and-Drop & PDF.js Local)
- **`AcademicFileUploader.tsx`**:
  - Zona nativa de arrastrar y soltar (drag-and-drop) y selector de archivos (`.pdf`, `.md`, `.txt`).
  - Extracción de texto y coordenadas de página en el navegador mediante `pdfjsLib.getDocument()`.
  - Persistencia del Blob original en `db.files` vinculado mediante `fileId` con `AcademicSourceRecord`.
  - Barra de progreso multietapa en tiempo real: *Lectura del archivo (15%)* → *Extracción de texto (50%)* → *Indexación AST y chunks (80%)* → *Éxito (100%)*.
  - Sincronización multipart opcional con el backend mediante `multer`.

### 2. Visor PDF Interactivo Ejecutable & Menú Flotante (`AcademicCanvas.tsx`)
- **Renderizado Nativo PDF.js**:
  - Carga el Blob binario almacenado en `db.files` mediante el componente `PdfViewer` con zoom, cambio de página y renderizado de texto.
- **Menú Contextual Flotante de Selección**:
  - Al seleccionar texto en el documento aparece un popover flotante en las coordenadas exactas de la selección con tres acciones:
    - `[✨ Flashcard FSRS]`: Genera una tarjeta de repetición espaciada en `db.cardsFsrs`.
    - `[🧠 Evaluar Feynman]`: Carga el fragmento en la terminal socrática para someterlo a auditoría NLI.
    - `[🔗 Grafo Causal]`: Vincula el fragmento como un concepto dentro del árbol de conocimiento.
- **Modo Ejecutable por Bloques (`[⚡ Ejecutar Simulacro]`)**:
  - Cada fragmento de texto o teorema incluye un botón para ejecutar un test rápido e instantáneo de opción múltiple basado exclusivamente en ese párrafo.
- **Sincronización Bidireccional de Citas**:
  - Al pulsar un `CitationPill` en el chat o en el simulador, el visor salta a la página indicada y resalta el párrafo con un bounding box animado en neón cian.

### 3. Grafo Causal RPG & Ruta Crítica (`AcademicKnowledgeGraphPanel.tsx`)
- **Propósito Explícito**: "Mapa de Prerrequisitos Académicos (Tu ruta crítica de estudio)".
- **Mecánica RPG de Bloqueo/Desbloqueo**:
  - 🟢 **Verde (R ≥ 80%)**: Dominado.
  - 🔵 **Cian (50% ≤ R < 80%)**: En progreso / Disponible.
  - 🔴 **Rojo (R < 50%)**: Crítico / Bloqueado. Los conceptos descendientes que dependen de una base en rojo quedan atenuados y con icono de candado.
- **Acción Directa de Estudio**:
  - Al hacer clic en cualquier nodo se abre un modal con el desglose de retención y el botón directo: *"Estudiar este nodo ahora (Sesión FSRS Exprés)"*, que activa el mazo FSRS de inmediato.

### 4. Sistema de Tutoriales On-Demand (`AcademicTutorialOverlay.tsx`)
- **Botón Global de Ayuda (`?`)**:
  - Ubicado en el header superior derecho, accesible en cualquier momento.
- **Tour Guiado de 4 Pasos**:
  1. *Paso 1 (Gestor de Fuentes):* Ingesta de PDFs y notas.
  2. *Paso 2 (Visor y Selección Ejecutable):* Menú flotante y simulacros de bloque.
  3. *Paso 3 (Widgets FSRS):* Algoritmo de memoria y botones Again/Hard/Good/Easy.
  4. *Paso 4 (Grafo Causal RPG):* Interpretación de colores y desbloqueo de prerrequisitos.
- Soporte para navegación con teclado (`Esc`, flechas `←` y `→`) y persistencia en `localStorage`.

---

## Expansión v5.1 — Catálogo de 30 Métodos Cognitivos y Motor de Contexto Unificado (Context Engine)

### 1. Métodos de Estudio Ampliados (`/methods`)
- **Catálogo Exhaustivo de 30 Técnicas Científicas**:
  - Ampliación de 5 a 30 métodos con base empírica estricta (Dunlosky et al., Roediger & Karpicke, Sweller, etc.), sin URLs externas ni dependencias de red.
  - 6 categorías canónicas: `memorizacion`, `comprension`, `gestion-tiempo`, `escritura`, `evaluacion`, `metacognicion`.
  - Ficha modal detallada (`MethodPreviewModal.tsx`) con 3 a 5 pasos accionables (`howTo`), metadatos de materias recomendadas (`bestFor`) y respaldo científico formal.
  - Mantenimiento intacto de los runners preexistentes (`implemented: true` para Feynman, Pomodoro, Active Recall, SQ3R e Interleaving) e incorporación de fichas teóricas (`implemented: false`, badge "Próximamente").
  - Botones contextuales integrados: "Usar con FSRS", "Ver en Grafo", "Iniciar Sesión" según las capacidades declaradas en `integratesWith`.
  - Migración a Dexie v6 con tabla `studyMethods` y sembrado automático idempotente (`src/data/studyMethodsSeed.ts`).

### 2. Motor de Contexto Unificado (`/context` — Context Engine)
- **Aislamiento y Privacidad Local-First**:
  - Desactivado por defecto (`contextEngineEnabled: false`), configurable desde Ajustes (`/settings`) o mediante el store `useContextEngineStore`.
  - La ruta `/context` y su icono en la barra lateral solo se visualizan si el módulo está activado.
  - Cero llamadas a APIs externas o LLMs en la nube; 100% determinista y ejecutado en el cliente.
- **Submódulos Implementados**:
  1. *Vinculador de Proyectos & Biblioteca (`ProjectKnowledgeLinker.tsx`):* Creación de proyectos de examen/materia, vinculación con carpetas y archivos locales de Dexie, y estimador heurístico de horas con calibración por promedio móvil.
  2. *Bloqueador Semanal de Tiempo (`WeeklyCalendarTimeBlocker.tsx`):* Matriz semanal de 7 días y franjas horarias con sugerencias inteligentes; **cero automatizaciones silenciosas** (requiere confirmación manual del usuario antes de guardar en `contextTimeBlocks`).
  3. *Chequeo Ético de Energía Post-Sesión (`PostSessionEnergyCheck.tsx`):* Registro rápido de 1 a 5 niveles de concentración en `fatigueTelemetry`. Requiere un umbral ético mínimo de 10 registros antes de calcular el informe de ritmo circadiano.
  4. *Embudo Unificado de Entrada de Texto (`UnifiedTextIntake.tsx` & `textIntakeParser.ts`):* Parser basado en reglas deterministas para notas, tareas y fechas, con tarjeta de vista previa editable obligatoria antes de persistir.
- **Hoja de Ruta Futura (`docs/CONTEXT_ENGINE_ROADMAP.md`)**:
  - Documentación de arquitectura para fases subsiguientes: embeddings locales (Transformers.js), Whisper local en Tauri, integración con Ollama offline y principios éticos sobre no intrusión y biometría.

### 3. Suite de Verificación Automatizada
- `scripts/test-study-methods-catalog.mjs`: 18/18 pruebas aprobadas (integridad de 30 métodos, 6 categorías, idempotencia de Dexie v6 y contratos de UI).
- `scripts/test-context-engine.mjs`: 37/37 pruebas aprobadas (aislamiento, flags por defecto, parser determinista, confirmación manual, promedio móvil y esquema v6).
- Verificación integral: `npm test` (14 suites de test ejecutadas con éxito) y `npm run build` (`tsc -b && vite build` completado en 19s).

---

## Expansión v5.2 — Fase 2 Context Engine, Ollama Local y Runners Cornell & Mock Exams

### 1. Fase 2 Context Engine: Vinculación Semántica Automática (`ProjectKnowledgeLinker.tsx`)
- **Pipeline de Embeddings Denso Local**:
  - Reutilización de `computeEmbeddingVector` (`@xenova/transformers` con `all-MiniLM-L6-v2`) y `cosineSimilarity`.
  - Botón integrado *"Sugerir Documentos por IA Semántica"*: analiza el título y descripción del proyecto y calcula la afinidad con los fragmentos de la biblioteca.
  - **Confirmación manual obligatoria**: Despliega una tarjeta con los documentos sugeridos, su porcentaje de afinidad semántica y casillas de selección para que el usuario elija exactamente qué vincular antes de confirmar.

### 2. Integración y Monitor de Ollama Local (`localhost:11434`)
- **Cliente 100% Offline (`src/platform/ai/ollamaClient.ts`)**:
  - Comunicación exclusiva con `http://localhost:11434` mediante `/api/tags` y `/api/generate`.
  - Manejo seguro de timeouts y desconexiones sin llamadas a la nube ni dependencias externas.
- **Sección en Ajustes (`Settings.tsx`)**:
  - Monitor en vivo del estado del servidor Ollama con botón de comprobación.
  - Reconocimiento dinámico de modelos descargados (ej: `llama3.2:latest`, `phi3`).
  - Instrucciones claras en pantalla para iniciar el servicio en Windows con `ollama run llama3.2`.

### 3. Nuevos Runners Interactivos de Métodos de Estudio
- **Método Cornell (`CornellMethod.tsx`)**:
  - Lienzo estructurado con 3 regiones canónicas: Columna izquierda de preguntas y cues (30%), Columna derecha de notas principales (70%) y franja inferior de resumen.
  - **Modo Evocación Activa (Recall Mode)**: Permite velar las notas con un telón traslúcido para forzar al estudiante a responder a las preguntas de memoria antes de destapar las notas.
- **Simulacros de Examen / Practice Testing (`MockExamMethod.tsx`)**:
  - Setup personalizable con selector de tiempo (10 a 60 min).
  - Cronómetro regresivo en tiempo real con alerta visual para los últimos 2 minutos.
  - Bloqueo estricto de respuestas y feedback durante el examen para combatir la ilusión de competencia.
  - Pantalla final de rúbrica, porcentaje de aciertos, desglose de preguntas y fundamentación neurocognitiva.

### 4. Suite de Verificación Automatizada (15 Suites)
- `scripts/test-phase2-advanced.mjs`: 28/28 pruebas aprobadas (cliente Ollama, vinculación semántica, contratos de runner Cornell y Mock Exam).
- `scripts/test-study-methods-catalog.mjs`: 18/18 pruebas aprobadas con soporte para los nuevos métodos con runner activo (`implemented: true`).
- `npm test`: 15 suites de test ejecutadas con éxito.
- `npm run build`: `tsc -b && vite build` completado limpiamente en 4.70 segundos.

---

## Expansión StudyLab v5.3 — Cognición con Ollama, Dictado de Voz y Runners de Zettelkasten y Blurting

Esta versión completa las Fases 3 y 4 del Context Engine y expande el catálogo de métodos interactivos a 9 herramientas prácticas funcionales.

### 1. Context Engine Fase 4: Asistente Cognitivo Local con Ollama
- **Inferencia LLM Segura (`UnifiedTextIntake.tsx`)**:
  - Si el demonio local Ollama está activo (`http://localhost:11434`), procesa el texto ingresado usando `llama3.2` mediante un prompt que extrae un objeto JSON estricto (`title`, `type`: task/event/note, `urgency`, `targetDate`, `tags`).
  - **Degradación Elegante**: Si Ollama no está corriendo, recurre de forma transparente al motor de reglas regex (`parseTextIntakeRules`), garantizando cero bloqueos o errores de red.
  - **Cero Automatizaciones Silenciosas**: Siempre genera un borrador no confirmado (`isConfirmed: false`) en una tarjeta de previsualización interactiva donde el usuario puede editar los campos antes de guardar.

### 2. Context Engine Fase 3: Dictado por Voz Offline en Cliente
- **Speech Recognition Nativo**:
  - Implementado con la Web Speech API del navegador (`webkitSpeechRecognition` / `SpeechRecognition`) en modo `lang: "es-ES"`.
  - Transcripción reactiva en tiempo real con botón de micrófono animado e indicador visual de escucha.
  - No requiere API keys ni servidores en la nube de terceros.

### 3. Nuevos Runners Interactivos de Métodos de Estudio
- **Zettelkasten Académico (`ZettelkastenMethod.tsx`)**:
  - **Identificador atómico**: Genera códigos de tiempo canónicos (ej. `202609182005`).
  - **Enlaces wiki bidireccionales**: Detección automática en vivo de sintaxis `[[título]]` y tags `#etiqueta`.
  - **Panel de red asociativa**: Muestra visualmente las conexiones salientes y sugerencias de vinculación con el grafo de conocimiento.
  - Persistencia directa en Dexie (`studySessions`).
- **Blurting / Vaciado Mental (`BlurtingMethod.tsx`)**:
  - **Fase 1 (Lectura/Carga)**: Estudio enfocado del material con cronómetro de preparación.
  - **Fase 2 (Vaciado a Ciegas)**: Ocultamiento total del apunte original y escritura de memoria libre bajo presión de tiempo.
  - **Fase 3 (Auditoría de Lagunas)**: Vista comparativa lado a lado entre el texto original y la evocación, con categorización de conceptos recordados vs olvidados y derivación directa al algoritmo FSRS.

### 4. Estado Global de Métodos (30 Métodos Totales)
- **9 Runners Interactivos Funcionales**: Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten y Blurting.
- **21 Fichas Científicas Prácticas**: Con fundamentación cognitiva, fases paso a paso y conexiones de navegación hacia FSRS y Knowledge Graph.

### 5. Suite de Verificación Automatizada (16 Suites)
- `scripts/test-phase3-cognition.mjs`: 20/20 pruebas aprobadas (Ollama intake, dictado, contratos Zettelkasten y Blurting).
- `scripts/test-study-methods-catalog.mjs`: 18/18 pruebas aprobadas (9 runners activos + 21 teóricos).
- `npm test`: 16 suites ejecutadas en 6.8s con 100% de éxito.
- `npm run build`: compilación limpia en 4.41s.

---

## Expansión StudyLab v5.4 — Método Leitner, 13 Runners Interactivos y Selector de Perfiles Cognitivos

Esta versión añade el runner físico del **Método Leitner (Cajas de Flashcards)**, promueve 4 métodos más al estado interactivo activo (alcanzando 13 de 30 métodos) e implementa la **Fase 5 del Context Engine** con un **Selector de Perfiles Cognitivos (Context Stance)**.

### 1. Runner Interactivo del Método Leitner (`LeitnerMethod.tsx`)
- **Arquitectura de 5 Compartimentos**:
  - Caja 1 (Diario), Caja 2 (Cada 3 días), Caja 3 (Semanal), Caja 4 (Quincenal), Caja 5 (Graduadas / Mensual).
- **Mecánica de Evaluación Fidedigna**:
  - Anverso / Reverso con botón *"Revelar Respuesta"*.
  - **Acierto**: Promueve la tarjeta a la caja inmediata superior (`c.box + 1`).
  - **Fallo (Regla Estricta Leitner)**: Cualquier error devuelve la ficha inmediatamente a la Caja 1, garantizando que los vacíos conceptuales se repasen al día siguiente.
- **Integración con Biblioteca**: Permite estudiar las flashcards locales de `db.flashcards` o utilizar el mazo base de entrenamiento universitario.
- **Métricas de Consolidación**: Monitorea el porcentaje de graduación y distribución por caja, guardando la sesión en `db.studySessions`.

### 2. Catálogo Extendido a 13 Métodos Interactivos Activos
Se promovieron formalmente 4 metodologías a `implemented: true` con runners integrados en `MethodsPage.tsx`:
1. **Método Leitner** (`leitner`): FSRS y sesiones de memorización con 5 cajas.
2. **Método SQ3R** (`sq3r`): Protocolo guiado en 5 fases (Survey, Question, Read, Recite, Review).
3. **Mapas Conceptuales / Mentales** (`mind-maps`): Estructuración jerárquica radial con árbol de ramas lógicas.
4. **Interrogación Elaborativa** (`elaborative-interrogation`): Cuestionamiento causal de afirmaciones y contraejemplos.

### 3. Context Engine Fase 5: Selector de Perfiles Cognitivos (`CognitiveProfileSelector.tsx`)
- Nueva pestaña *"Perfiles Cognitivos"* en `ContextEngineDashboard.tsx`.
- **4 Posturas Mentales Estratégicas**:
  - 🧠 **Inmersión Lógica & Deducción**: Para matemáticas, algoritmos y bioquímica (sugiere Interleaving, Feynman, Interrogación Elaborativa).
  - 🏰 **Fortaleza Mnemónica & Retención**: Para medicina, leyes y vocabulario (sugiere Leitner, Recuerdo Activo, Repaso Espaciado).
  - ✍️ **Síntesis, Tesis & Estructura**: Para papers y manuales densos (sugiere Zettelkasten, Cornell, SQ3R, Mapas Conceptuales).
  - ⚡ **Presión de Examen & Auditoría**: Para erradicar la ilusión de competencia (sugiere Simulacros de Examen, Blurting).
- **Lanzamiento Inmediato**: Cada sugerencia incluye un botón *"Iniciar [Método]"* con deep-link a `/methods?run=...`.

### 4. Suite de Verificación Automatizada (17 Suites)
- `scripts/test-phase4-leitner-modes.mjs`: 33/33 pruebas aprobadas (contratos Leitner, conteo 13/17 en catálogo, perfiles cognitivos).
- `npm test`: **17 suites de test ejecutadas con 100% de éxito en 7.1s**.
- `npm run build`: compilación de producción limpia en 3.98s sin advertencias de linter.

---

## Expansión StudyLab v5.5 — Palacio de la Memoria, Técnicas Mnemotécnicas y Metacognición KWL (16 Runners)

Esta versión introduce 3 nuevas herramientas de memorización y metacognición profunda, superando la mitad del catálogo científico implementado (**16 de 30 métodos con runner interactivo**).

### 1. Runner Interactivo del Palacio de la Memoria (`MemoryPalaceMethod.tsx`)
- **Acceso:** Desde `/methods?run=method-of-loci`.
- **Arquitectura de Estaciones Fijas:**
  - Definición de una ruta espacial real (ej. *Puerta de entrada*, *Perchero*, *Espejo*, *Mesa*, *Balcón*...).
  - Asociación deliberada de anclas visuales hiperbólicas, absurdas o de alto impacto sensorial con los conceptos técnicos.
- **Modo Recorrido Mental (Walkthrough):**
  - Guía paso a paso que oculta la solución y pone a prueba la evocación serial en orden estricto.
  - Medición de aciertos, cálculo de porcentaje de precisión de recorrido y persistencia en `db.studySessions`.

### 2. Runner Interactivo de Técnicas Mnemotécnicas (`MnemonicsMethod.tsx`)
- **Acceso:** Desde `/methods?run=mnemonics`.
- **Generador Asistido de Anclajes Fonéticos:**
  - Ingreso de secuencias arbitrarias (mitosis, pares craneales, estados de oxidación, normas).
  - Extractor automático de iniciales para armar acrónimos palabra-clave (ej. `P - M - A - T`).
  - Asistente para frases acrósticas memorables (*"Prometeo Me Ama Tanto"*) e imágenes mentales.
- **Modo Decodificador Activo:**
  - El sistema muestra el acrónimo o frase estímulo y desafía al estudiante a reconstruir cada término original de memoria, calificando la retención.

### 3. Runner Interactivo de Metacognición KWL (`KwlMethod.tsx`)
- **Acceso:** Desde `/methods?run=kwl-method`.
- **Matriz de 3 Columnas Canónica (Donna Ogle):**
  - **K (Know / Lo que sé):** Activación explícita de conocimientos y esquemas previos antes de abrir el texto.
  - **W (Want to know / Lo que quiero saber):** Formulación de preguntas inquisitivas que dirigen la atención selectiva.
  - **L (Learned / Lo que aprendí):** Síntesis de asimilación tras la lectura y contrastación de dudas resueltas.
- **Seguimiento de Preguntas:** Marcador de casillas interactivas para auditar qué incógnitas de la columna W fueron despejadas y cuáles persisten para consulta de cátedra.

### 4. Estado Global de Métodos: 16 Runners Activos + 14 Fichas Guiadas
El catálogo supera el hito del 50% de interactividad práctica:
- **16 Runners Funcionales:** Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten, Blurting, Mapas Mentales, Leitner, Interrogación Elaborativa, Palacio de la Memoria, Mnemotecnias, KWL y Repaso Espaciado (FSRS).
- **14 Fichas Prácticas Guiadas:** Con fundamentación teórica, fases paso a paso y conexiones de navegación hacia FSRS y Knowledge Graph.

### 5. Suite de Verificación Automatizada (18 Suites)
- `scripts/test-phase5-memory-tools.mjs`: 40/40 pruebas aprobadas (contratos Loci, Mnemotecnias, KWL, catálogo 16/14).
- `npm test`: **18 suites de tests ejecutadas con 100% de éxito en 7.8s**.
- `npm run build`: compilación limpia en 4.46s con 0 errores de linter.

---

## Fase v5.6 — Profundización Cognitiva: Autoexplicación, Codificación Dual y Bloques de Trabajo Profundo

Esta fase expande el Methods Hub alcanzando **19 runners interactivos** de un total de 30 métodos, atacando la comprensión causal paso a paso, la bimodalidad cerebro-visual y la resistencia ejecutiva ante distracciones.

### 1. Runner Interactivo de Autoexplicación (`SelfExplanationMethod.tsx`)
- **Acceso:** Desde `/methods?run=self-explanation`.
- **Fundamentación:** Chi et al. (1989) — La justificación explícita paso a paso activa la resolución de lagunas inferenciales y refuerza modelos mentales profundos.
- **Flujo de Trabajo Guiado:**
  - **Paso 1: Planteo y Desglose:** Definición del problema, teorema, demostración o procedimiento, dividido en pasos o premisas secuenciales.
  - **Paso 2: Justificación Causal ("¿Por qué?"):** Para cada paso, el estudiante debe justificar por qué ese paso es lógicamente necesario, qué principio teórico lo gobierna y qué pasaría si se omitiera.
  - **Paso 3: Análisis de Condiciones Límite:** Reflexión sobre qué condiciones deben cumplirse para que el razonamiento sea válido y qué supuestos romperían la conclusión.
  - **Paso 4: Árbol Causal y Registro:** Resumen consolidado del razonamiento e integración con `db.studySessions`.

### 2. Runner Interactivo de Codificación Dual (`DualCodingMethod.tsx`)
- **Acceso:** Desde `/methods?run=dual-coding`.
- **Fundamentación:** Allan Paivio (1986) — La doble codificación verbal y visual crea dos huellas mnémicas independientes pero asociadas, duplicando las probabilidades de recuperación espontánea.
- **Espacio de Trabajo Bimodal Sincronizado:**
  - **Panel Izquierdo (Canal Verbal):** Redacción proposicional estructurada de los conceptos, definiciones e hipótesis.
  - **Panel Derecho (Canal Visual):** Lienzo interactivo de nodos y flujos diagramáticos con selección de paletas semánticas, conectores lógicos y mapas de relación.
  - **Sincronización:** Validación de correspondencia 1:1 entre cada proposición textual y su manifestación visual correspondiente.

### 3. Runner Interactivo de Bloques de Trabajo Profundo (`DeepWorkMethod.tsx`)
- **Acceso:** Desde `/methods?run=deep-work`.
- **Fundamentación:** Cal Newport (2016) / Ritmo Ultradiano BRAC (Kleitman) — La atención focal sin cambios de contexto permite entrar en estado de flujo y reduce el "residuo atencional" (attention residue).
- **Ciclo de Ejecución de Alta Intensidad:**
  - **Fase de Preparación:** Selección del bloque ultradiano (60 min, 90 min estándar o 120 min de alta resistencia). Definición de la "Meta Monumental" única de la sesión.
  - **Checklist de Aislamiento Cognitivo:** Verificación previa de 4 compuertas (teléfono fuera de la vista, pestañas no relevantes cerradas, entorno acústico blindado, agua/café listo).
  - **Timer Ultradiano Concentrado:** Cuenta regresiva con barra de progreso reactiva, medidor de pulsaciones de enfoque y botón de rescate de emergencias.
  - **Auditoría Post-Bloque:** Calificación de profundidad (1 al 5), registro de distracciones intrusivas contenidas y persistencia en el historial de sesiones.

### 4. Estado Global de Métodos: 19 Runners Activos + 11 Fichas Guiadas
El catálogo de StudyLab alcanza el 63.3% de cobertura funcional interactiva:
- **19 Runners Funcionales:** Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten, Blurting, Mapas Mentales, Leitner, Interrogación Elaborativa, Palacio de la Memoria, Mnemotecnias, KWL, Autoexplicación, Codificación Dual, Bloques de Trabajo Profundo y Repaso Espaciado (FSRS).
- **11 Fichas Prácticas Guiadas:** Con fundamentación teórica, fases paso a paso y conexiones de navegación hacia FSRS y Knowledge Graph.

### 5. Suite de Verificación Automatizada (19 Suites)
- `scripts/test-phase6-deep-learning.mjs`: 43/43 pruebas aprobadas (contratos de Autoexplicación, Codificación Dual, Deep Work y catálogo 19/11).
- `npm test`: **19 suites de tests ejecutadas con 100% de éxito**.
- `npm run build`: compilación limpia con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.7 — Estructuración y Comprensión Conceptual: Mapas Conceptuales (Novak), Agrupación (Chunking) y Aprendizaje Basado en Problemas (PBL)

Esta fase eleva el Methods Hub a **22 runners interactivos** de un total de 30 métodos (73.3% de cobertura funcional), incorporando herramientas para la síntesis relacional formal, la compresión de listas extensas y la resolución inductiva de casos del mundo real.

### 1. Runner Interactivo de Mapas Conceptuales Novakianos (`ConceptMapsMethod.tsx`)
- **Acceso:** Desde `/methods?run=concept-maps`.
- **Fundamentación:** Joseph D. Novak (1984) / David Ausubel — A diferencia de los mapas mentales asociativos libres, los mapas conceptuales novakianos exigen estructuración jerárquica y el enlace obligatorio de conceptos mediante palabras conectoras que formen proposiciones gramaticales verdaderas.
- **Espacio de Trabajo Proposicional:**
  - **Banco de Nodos Jerárquicos:** Clasificación explícita de conceptos en tres niveles cognitivos (*Cúspide*, *Intermedio*, *Específico*).
  - **Constructor de Ternas Lógicas:** Conexión dirigida `[Concepto Origen]` &rarr; *(Frase Conectora / Verbo)* &rarr; `[Concepto Destino]`.
  - **Auditoría Proposicional:** Validación sintáctica de proposiciones legibles con significado autónomo y exportación al historial de sesiones (`db.studySessions`).

### 2. Runner Interactivo de Agrupación Cognitiva / Chunking (`ChunkingMethod.tsx`)
- **Acceso:** Desde `/methods?run=chunking`.
- **Fundamentación:** George A. Miller (1956) / Nelson Cowan (2001) — La memoria de trabajo humana posee una capacidad biofísica restringida a 4 ± 1 paquetes atencionales. La compresión de datos dispersos en bloques semánticos de orden superior permite manipular volúmenes masivos de información sin desbordamiento cognitivo.
- **Flujo de Trabajo Dual (Organización & Drill):**
  - **Modo Organización:** Carga masiva de elementos desordenados y empaquetamiento en 3 a 5 bloques óptimos con anclajes mnemotécnicos sonoros (*"1-2-8 Vista y Olfato"*).
  - **Modo Drill de Recuerdo Activo:** Ocultamiento interactivo del contenido de cada bloque para obligar a la recuperación forzada de memoria antes de contrastar las respuestas.
  - **Métricas de Capacidad en Vivo:** Conteo de bloques vs. óptimo biológico ($\le 5$), cálculo de ratio de compresión (ítems/bloque) y registro de evocaciones validadas.

### 3. Runner Interactivo de Aprendizaje Basado en Problemas / PBL (`ProblemBasedLearningMethod.tsx`)
- **Acceso:** Desde `/methods?run=problem-based-learning`.
- **Fundamentación:** Howard Barrows & Tamblyn (1980, McMaster) — Metodología inductiva que sitúa un dilema real e incompleto como detonante, forzando la formulación de incógnitas diagnósticas y necesidades de autoaprendizaje bibliográfico.
- **Ciclo de Indagación Inductiva en 3 Pestañas:**
  - **Pestaña 1: Hechos Verificados vs. Incógnitas Críticas:** Matriz en T para discernir qué premisas están probadas y qué vacíos requieren investigación.
  - **Pestaña 2: Hipótesis & Necesidades de Aprendizaje (Learning Issues):** Planteo de diagnósticos o explicaciones tentativas con especificación explícita de la bibliografía de cátedra necesaria para sustentarlas.
  - **Pestaña 3: Resolución Fundamentada & Metacognición:** Formulación de la propuesta final y registro de los principios generales transferibles asimilados durante el caso.

### 4. Estado Global de Métodos: 22 Runners Activos + 8 Fichas Guiadas
El catálogo de StudyLab alcanza el 73.3% de interactividad práctica:
- **22 Runners Funcionales:** Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten, Blurting, Mapas Mentales, Leitner, Interrogación Elaborativa, Palacio de la Memoria, Mnemotecnias, KWL, Autoexplicación, Codificación Dual, Bloques de Trabajo Profundo, Mapas Conceptuales Novakianos, Chunking, Aprendizaje Basado en Problemas y Repaso Espaciado (FSRS).
- **8 Fichas Prácticas Guiadas:** Con fundamentación teórica, fases paso a paso y conexiones de navegación hacia FSRS y Knowledge Graph.

### 5. Suite de Verificación Automatizada (20 Suites)
- `scripts/test-phase7-conceptual-methods.mjs`: 49/49 pruebas aprobadas al 100%.
- `npm test`: **20 suites de tests ejecutadas con 100% de éxito**.
- `npm run build`: compilación limpia en 4.08s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.8 — Metacognición Estratégica y Transferencia: Efecto Protegido, Método del Relato y Método PQ4R

Esta fase expande el Methods Hub alcanzando **25 runners interactivos** de un total de 30 métodos (**83.3% de cobertura funcional interactiva**), incorporando herramientas para la enseñanza reflexiva a aprendices, la memorización serial por drama visual y la lectura crítica con búsqueda de contraejemplos.

### 1. Runner Interactivo de Enseñar a Otros / Efecto Protegido (`ProtegeEffectMethod.tsx`)
- **Acceso:** Desde `/methods?run=protege-effect`.
- **Fundamentación:** Chase, Chin, Oppezzo & Schwartz (2009, Stanford AAA Lab / Teachable Agents) — La preparación intencional para instruir a un tercero obliga a organizar esquemas mentales más profundos y elimina la falsa ilusión de competencia.
- **Espacio de Instrucción de Pares:**
  - **Perfil del Protegido:** Definición del interlocutor y nivel de partida (alumnos ingresantes, pares o legos).
  - **Puntos Clave y Analogías Cotidianas:** Exigencia obligatoria de traducir conceptos técnicos a metáforas sin jerga inaccesible.
  - **Simulador de Desafíos e Interrupciones:** Desafíos inquisitivos del aprendiz (*"¿Por qué no ocurre lo mismo si la temperatura baja?"*) con opción de marcar dudas no resueltas para consulta de cátedra.

### 2. Runner Interactivo del Método del Relato / Cadena Narrativa (`StoryMethod.tsx`)
- **Acceso:** Desde `/methods?run=story-method`.
- **Fundamentación:** Gordon Bower & Michal Clark (1969, Stanford) — Demostraron una tasa de retención del 93% en el recuerdo serial de listas mediante encadenamiento narrativo frente a solo un 13% en controles no narrativos.
- **Flujo de Trabajo Dual (Composición & Drill):**
  - **Modo Composición:** Carga de conceptos o etapas secuenciales con asignación de escenas visuales dramáticas, absurdas o con fuerte carga de movimiento entre el eslabón $n$ y el eslabón $n+1$.
  - **Modo Drill de Evocación Activa:** Ocultamiento de términos técnicos para forzar la reconstrucción serial de la secuencia completa a partir de la trama del relato, con cálculo de aciertos.

### 3. Runner Interactivo del Método PQ4R (`Pq4rMethod.tsx`)
- **Acceso:** Desde `/methods?run=pq4r`.
- **Fundamentación:** Thomas & Robinson (1972) — Evolución avanzada del protocolo SQ3R orientada a capítulos científicos y doctrinales densos.
- **Protocolo de 6 Etapas con Fase Nuclear "Reflect":**
  - **1. Preview:** Ojeada estructural de la arquitectura del texto.
  - **2. Question:** Conversión de encabezados en interrogantes directrices.
  - **3. Read:** Lectura focalizada buscando las respuestas a los interrogantes.
  - **4. Reflect (Fase Nuclear):** Conexión con conocimientos previos, formulación de contraejemplos que desafían la regla y análisis de condiciones límite antes del recitado.
  - **5. Recite:** Paráfrasis oral o escrita a libro cerrado sin mirar apuntes.
  - **6. Review:** Contraste con el texto para auditar lagunas y derivar tarjetas a repaso espaciado.

### 4. Estado Global de Métodos: 25 Runners Activos + 5 Fichas Guiadas
El catálogo de StudyLab alcanza el 83.3% de cobertura interactiva:
- **25 Runners Funcionales:** Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten, Blurting, Mapas Mentales, Leitner, Interrogación Elaborativa, Palacio de la Memoria, Mnemotecnias, KWL, Autoexplicación, Codificación Dual, Bloques de Trabajo Profundo, Mapas Conceptuales Novakianos, Chunking, Aprendizaje Basado en Problemas, Enseñar a Otros (Efecto Protegido), Método del Relato, Método PQ4R y Repaso Espaciado (FSRS).
- **5 Fichas Prácticas Guiadas:** Práctica Distribuida, Dificultades Deseables, Principio de Segmentación, Estudio Multisensorial y Consolidación por Sueño.

### 5. Suite de Verificación Automatizada (21 Suites)
- `scripts/test-phase8-metacognition-runners.mjs`: 52/52 pruebas aprobadas al 100%.
- `npm test`: **21 suites de tests ejecutadas con 100% de éxito**.
- `npm run build`: compilación limpia en 4.63s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.9 — Catálogo Completo 100% (30 de 30 Runners Activos)

Esta fase marca un hito de completitud absoluto para StudyLab: **el 100% del catálogo científico de 30 métodos de estudio cuenta ahora con runners interactivos operativos**, eliminando completamente cualquier método que estuviera restringido a una ficha meramente teórica.

### 1. Runner Interactivo de Práctica Distribuida / Calendario de Espaciado (`DistributedPracticeMethod.tsx`)
- **Acceso:** Desde `/methods?run=distributed-practice`.
- **Fundamentación:** Ebbinghaus (1885), Cepeda et al. (2006, Psychological Bulletin) — La distribución de la carga horaria en micro-sesiones espaciadas a lo largo de semanas o meses produce una retención duradera 2x superior al atracón o estudio masivo de última hora (*cramming*).
- **Calculadora & Planificador de Distribución:**
  - **Comparador Visual de Eficiencia:** Contraste dinámico entre estudio masivo continuo (fatiga cognitiva y decaimiento rápido) vs. estudio distribuido espaciado (recuperación sináptica óptima).
  - **Asignador de Bloques y Días de Amortiguación:** Selector de duración de bloques (60, 90, 120 minutos) con cálculo automático de sesiones requeridas y días libres recomendados como buffer cognitivo.
  - **Regla de Oro de los 5 Minutos:** Espacio estructurado para la evocación activa al inicio de cada micro-bloque antes de reanudar el material nuevo.

### 2. Runner Interactivo de Dificultades Deseables (`DesirableDifficultiesMethod.tsx`)
- **Acceso:** Desde `/methods?run=desirable-difficulties`.
- **Fundamentación:** Robert & Elizabeth Bjork (1994, 2011, UCLA) — Introducir dificultades deliberadas que desaceleran la velocidad aparente de aprendizaje fortalece la capacidad de almacenamiento y transferencia en memoria a largo plazo.
- **Auditoría de Fricciones Cognitivas:**
  - **Selector de Palancas de Fricción:** 4 palancas directas: Test Retardado, Intercalado a Ciegas, Efecto Generativo y Variabilidad de Entorno/Contexto.
  - **Matriz de Diagnóstico y Autoevaluación:** Calificación de fluidez subjetiva inmediata (1-5) vs. retención real medida (1-5) con advertencia automática de la *ilusión de competencia* cuando la fluidez aparente enmascara una baja retención duradera.

### 3. Runner Interactivo del Principio de Segmentación (`SegmentationPrincipleMethod.tsx`)
- **Acceso:** Desde `/methods?run=segmentation-principle`.
- **Fundamentación:** Richard Mayer (2001, 2009, Multimedia Learning) — La mente procesa mejor materiales continuos o videos complejos cuando se fraccionan en segmentos breves autogestionados de 3 a 5 minutos, permitiendo la consolidación antes de recibir nuevo estímulo.
- **Consola de Segmentación de Clases & Video:**
  - **Particionador de Segmentos:** Fraccionamiento del contenido total en micro-bloques estructurados con marcas temporales (de 0 a N minutos).
  - **Temporizador de Pausa Activa (60 segundos):** Cuenta regresiva para detener el video/audio y sintetizar activamente la idea fuerza sin estímulos distractores externos.
  - **Bitácora de Síntesis:** Registro acumulado de conclusiones por segmento antes de pasar al siguiente tramo.

### 4. Runner Interactivo de Estudio Multisensorial (`MultisensoryLearningMethod.tsx`)
- **Acceso:** Desde `/methods?run=multisensory-learning`.
- **Fundamentación:** Shams & Seitz (2008, Trends in Cognitive Sciences) — Los estímulos multisensoriales sincronizados activan redes neuronales interconectadas que potencian el aprendizaje y facilitan la evocación por redundancia cortical.
- **Matriz de Anclaje de Tres Vías:**
  - **Canal Visual (Corteza Occipital):** Diagramas, esquemas espaciales y codificación cromática.
  - **Canal Auditivo (Corteza Temporal):** Dictado en voz alta, explicaciones grabadas y mnemotecnias sonoras.
  - **Canal Motor / Kinestésico (Corteza Motora):** Escritura manuscrita, gesticulación física o maquetas conceptuales.
  - **Auditoría de Sincronía y Retención:** Registro del impacto multisensorial y calificación de solidez del anclaje mnémico.

### 5. Runner Interactivo de Consolidación por Sueño (`SleepConsolidationMethod.tsx`)
- **Acceso:** Desde `/methods?run=sleep-consolidation`.
- **Fundamentación:** Diekelmann & Born (2010, Nature Reviews Neuroscience) — La memoria se reactiva y consolida durante las fases de ondas lentas (SWS/NREM) y fase REM mediante transferencia sináptica hipocampo-neocorteza.
- **Protocolo Pre-Cama & Evocación Matutina:**
  - **Calculadora de Ciclos Ultradianos (90 min):** Planificación de descansos de 4.5h, 6.0h, 7.5h o 9.0h para despertar al término de un ciclo sin inercia del sueño.
  - **Revisión Suave Previa al Sueño (15 min):** Filtro de conceptos de alta prioridad para sembrado hipocampal a baja intensidad (sin pantallas estimulantes).
  - **Test de Evocación Matutina al Despertar:** Registro inmediato de conceptos recordados tras el despertar para verificar la consolidación sináptica nocturna.

### 6. Estado Definitivo del Catálogo: 30 de 30 Runners Activos (100% Interactivo)
El catálogo de StudyLab completa su meta arquitectónica:
- **30 Runners Funcionales Disponibles:** Feynman, SQ3R, Pomodoro, Recuerdo Activo, Interleaving, Cornell, Simulacros de Examen, Zettelkasten, Blurting, Mapas Mentales, Leitner, Interrogación Elaborativa, Palacio de la Memoria, Mnemotecnias, KWL, Autoexplicación, Codificación Dual, Bloques de Trabajo Profundo, Mapas Conceptuales Novakianos, Chunking, Aprendizaje Basado en Problemas, Enseñar a Otros (Efecto Protegido), Método del Relato, Método PQ4R, Práctica Distribuida, Dificultades Deseables, Principio de Segmentación, Estudio Multisensorial, Consolidación por Sueño y Repaso Espaciado (FSRS).
- **0 Fichas Estáticas Restantes:** Todas las metodologías cuentan con herramientas de ejecución, cálculo o registro interactivo con integración local-first.

### 7. Suite de Verificación Automatizada Integral (22 Suites)
- `scripts/test-phase9-full-catalog.mjs`: 73/73 pruebas aprobadas al 100%.
- `npm test`: **22 suites de tests ejecutadas con 100% de éxito (352+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.02s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.10 — Contexto de Entorno Desktop y Sugerencia Cognitiva

Esta fase implementa la **Fase 5 del Roadmap del Motor de Contexto** (`docs/CONTEXT_ENGINE_ROADMAP.md`), conectando de forma pasiva y privada el entorno de trabajo del estudiante con la activación asistida de su postura mental y sus metodologías de estudio recomendadas.

### 1. Backend Nativo en Rust: Comando `detect_active_study_tools` (`desktop_context.rs`)
- **Ubicación:** `src-tauri/src/desktop_context.rs` e integrado en `lib.rs`.
- **Privacidad y Ética Innegociable:**
  - Inspección de procesos de solo lectura basada exclusivamente en una **lista blanca académica local** (`code.exe`, `cursor.exe`, `rstudio.exe`, `sumatrapdf.exe`, `obsidian.exe`, `anki.exe`, `texstudio.exe`, etc.).
  - Cero keylogging, cero captura de pantalla, cero rastreo de navegación web y cero telemetría externa.
  - Ejecución ligera en Windows mediante `tasklist /FO CSV /NH` y en POSIX mediante `ps`, con HashSet determinista de bajo impacto de CPU.

### 2. Servicio de Diagnóstico y Ponderación Cognitiva (`desktopContextService.ts`)
- **Ubicación:** `src/features/context-engine/desktopContextService.ts`.
- **Mapeo Heurístico a Posturas Mentales:**
  - *Herramientas de Código/Cálculo (VS Code, RStudio, PyCharm):* Recomienda **Profundidad Lógica & Deducción** (*Feynman*, *PBL*, *Mapas Conceptuales*).
  - *Visores de Documentos/PDFs (SumatraPDF, Calibre, Acrobat):* Recomienda **Fortaleza Mnemotécnica** (*Leitner*, *Recuerdo Activo*, *Palacio de la Memoria*).
  - *Gestores de Notas/Markdown (Obsidian, Notion, Word):* Recomienda **Síntesis Divergente** (*Zettelkasten*, *Cornell*, *Codificación Dual*).
  - *Calculadoras/Simuladores (SpeedCrunch, Anki):* Recomienda **Presión de Examen** (*Simulacros*, *PQ4R*, *Dificultades Deseables*).
- **Cálculo de Confianza y Diagnóstico:** Genera porcentaje de coincidencia y justificación pedagógica en lenguaje natural para la sugerencia.

### 3. Interfaz de Usuario: Pestaña "Entorno Desktop" (`DesktopEnvironmentContext.tsx`)
- **Ubicación:** `src/features/context-engine/DesktopEnvironmentContext.tsx` integrado en `ContextEngineDashboard.tsx`.
- **Capacidades Operativas:**
  - Indicador de modo (Tauri Nativo vs Navegador Web).
  - Escaneo bajo demanda o automático periódico cada 30 segundos.
  - Grilla de herramientas académicas activas con sus categorías y procesos.
  - Tarjeta destacada con la postura cognitiva sugerida y botón de 1 clic para *"Activar Postura"*.
  - Catálogo directo de las 4 metodologías científicas recomendadas para ese entorno, con botón de lanzamiento directo a `/methods?run=<id>`.

### 4. Suite de Verificación Automatizada (23 Suites)
- `scripts/test-phase10-desktop-context.mjs`: 43/43 pruebas aprobadas al 100%.
- `npm test`: **23 suites de tests ejecutadas con 100% de éxito (395+ aserciones verificadas)**.
- `cargo check`: compilación limpia en Rust (`src-tauri`) sin errores.
- `npm run build`: compilación limpia en 4.47s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.11 — Asistente de Triaje Cognitivo para los 30 Métodos

Esta fase introduce el **Motor de Triaje Cognitivo (Cognitive Triage & Matcher Engine)** dentro del Methods Hub (`/methods`), resolviendo la sobrecarga de opciones para el estudiante al diagnosticar su situación académica inmediata y prescribir las 3 metodologías óptimas entre el catálogo completo de 30 métodos interactivos.

### 1. Motor de Ponderación Multidimensional (`cognitiveTriageEngine.ts`)
- **Ubicación:** `src/features/study-methods/cognitiveTriageEngine.ts`.
- **Diagnóstico en 4 Dimensiones Pedagógicas:**
  - **Horizonte Temporal / Urgencia:** Menos de 24 horas (modo choque pre-examen), 2 a 7 días (semana de parciales), o más de 2 semanas (cursada regular).
  - **Naturaleza del Material:** Lógico-deductivo / fórmulas, fáctico-memorístico puro, doctrinal / textos densos, o integrador / visual multimodal.
  - **Nivel de Dominio:** Primer contacto desde cero, consolidación intermedia, o avanzado con búsqueda de brechas y rúbrica.
  - **Nivel de Energía:** Pico circadiano matutino, energía media sostenida, o fatiga mental / estudio nocturno.
- **Matriz de Compatibilidad y Prescripción:** Pondera los 30 métodos con scores de 0 a 100, genera porcentaje de compatibilidad (50% a 99%), diagnóstico contextualizado, alertas de seguridad pedagógica ante fatiga extrema y fundamentos redactados por método.

### 2. Modal Asistente Interactivo de Triaje (`CognitiveTriageModal.tsx`)
- **Ubicación:** `src/components/study-methods/CognitiveTriageModal.tsx`.
- **Experiencia de Usuario:**
  - Asistente guiado de 4 pasos con barra de progreso porcentual y navegación ágil (menos de 45 segundos de completado).
  - Pantalla de podio de resultados con los 3 métodos recomendados (Medalla de Oro / Recomendación Principal, 2do y 3er puesto).
  - Cada tarjeta presenta el porcentaje de compatibilidad, categoría, justificación pedagógica y clave metodológica.
  - Botón directo *"Iniciar Runner"* que enlaza sin fricción al entorno interactivo del método elegido.

### 3. Integración en MethodsPage (`MethodsPage.tsx`)
- **Ubicación:** `src/pages/MethodsPage.tsx`.
- Botón prominente en la cabecera: *"Asistente de Triaje Cognitivo"*.
- Soporte para apertura directa vía parámetro de URL `/methods?triage=true`.

### 4. Suite de Verificación Automatizada (24 Suites)
- `scripts/test-phase11-cognitive-triage.mjs`: 30/30 pruebas aprobadas al 100%.
- `npm test`: **24 suites de tests ejecutadas con 100% de éxito (425+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.51s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.12 — Paquete de Respaldo y Migración Portable (.studylab-bundle)

Esta fase consolida el ecosistema de preservación y migración de datos de StudyLab con un formato de paquete oficial unificado (`.studylab-bundle`), verificación de integridad criptográfica SHA-256 previa a la restauración y cobertura exhaustiva de las 29 tablas del sistema Dexie.

### 1. Formato Oficial `.studylab-bundle` y Manifiesto v5.12 (`workspaceBackup.ts`)
- **Ubicación:** `src/features/storage/workspaceBackup.ts`.
- **Integridad Criptográfica SHA-256:**
  - Se genera un hash SHA-256 canónico del volcado de la base de datos (`studylab_db.json`) empleando `crypto.subtle.digest("SHA-256", ...)` o el runtime disponible en el navegador/desktop.
  - El checksum se empaqueta dentro del `studylab_manifest.json` bajo la especificación `format: "studylab-bundle"` y `dexieSchemaVersion: 6`.
- **Cobertura Exhaustiva de Tablas:**
  - Exportación y restauración idempotente de las 29 tablas de Dexie: `folders`, `files`, `highlights`, `postits`, `sessions`, `deadlines`, `reviewSchedule`, `flashcards`, `flashcardDecks`, `ocrPages`, `cardsFsrs`, `reviewLogs`, `concepts`, `conceptEdges`, `workspaceConfigs`, `fatigueTelemetry`, `academicSources`, `academicChunks`, `academicEvaluations`, `workspaceState`, `studentErrors`, `examPlans`, `studyMethods`, `contextProjects`, `contextTimeBlocks`, `contextProjectDocs`, `contextEvents`, `energyLogs` y `textIntakes`.
  - Reconstrucción binaria de documentos PDF en el directorio `files/{id}.bin` y preservación de blobs en IndexedDB.

### 2. Inspección Previa y Modal de Vista Previa (`RestorePreviewModal.tsx`)
- **Ubicación:** `src/components/backup/RestorePreviewModal.tsx`.
- **Auditoría Sin Efectos Secundarios (`inspectBackupBundle`):**
  - Descomprime el archivo `.studylab-bundle` o `.zip` en memoria para auditar metadatos, timestamp, versiones y contar registros clave sin modificar el estado local.
  - Compara en vivo el checksum SHA-256 recalculado contra el manifest para detectar alteraciones, descargas truncadas o archivos incompatibles antes de cualquier sobreescritura.
- **Experiencia de Usuario en la Modal:**
  - Badge de certificación de firma SHA-256 (Verificado vs Advertencia de integridad).
  - Matriz con contadores de documentos PDF, tarjetas FSRS, sesiones de métodos y proyectos de contexto.
  - Barra de progreso interactiva durante la restauración progresiva.

### 3. Integración en Pantalla de Configuración (`Settings.tsx`)
- **Ubicación:** `src/pages/Settings.tsx`.
- El botón de exportación genera directamente el archivo `.studylab-bundle`.
- El selector de restauración admite `.studylab-bundle` y `.zip`.
- Al seleccionar un archivo, se activa la inspección criptográfica previa y se abre la modal de confirmación informada.

### 4. Suite de Verificación Automatizada (25 Suites)
- `scripts/test-phase12-workspace-bundle.mjs`: 57/57 pruebas aprobadas al 100%.
- `npm test`: **25 suites de tests ejecutadas con 100% de éxito (480+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.25s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.13 — Command Palette Unificada (Ctrl+K / Cmd+K) y Navegación Universal

Esta fase implementa la **Paleta de Comandos Global (Command Palette / Spotlight)**, elevando la experiencia de usuario y ergonomía de navegación de StudyLab al estándar de un entorno de desarrollo profesional (como VS Code, Raycast u Obsidian).

### 1. Store Global de Paleta (`useCommandPaletteStore.ts`)
- **Ubicación:** `src/stores/useCommandPaletteStore.ts`.
- Gestiona el estado de visibilidad (`isOpen`), la consulta actual (`query`) y las acciones de apertura, cierre y alternancia (`open`, `close`, `toggle`, `setQuery`).

### 2. Motor de Búsqueda Multimodal y Ponderación (`commandPaletteService.ts`)
- **Ubicación:** `src/features/command-palette/commandPaletteService.ts`.
- **Indexación y Búsqueda sobre 5 Entidades del Sistema:**
  1. **Métodos de Estudio (Catálogo de 30 Métodos):** Búsqueda difusa ponderada por nombre en español, nombre en inglés, categoría, palabras clave y casos de uso pedagógico. Al seleccionarlo, navega directamente a `/methods?run={id}` iniciando el runner correspondiente.
  2. **Acciones Rápidas del Sistema:** Acceso directo a Asistente de Triaje Cognitivo (`/methods?triage=true`), Respaldo `.studylab-bundle` (`/settings`), Consola de Diagnóstico QA (`/qa`), Generador de Sonido Ambiente (`/ambient`), Modo Enfoque (Distraction-Free), Centro de Organización (`Ctrl+O`), Bandeja de Notificaciones (`Ctrl+N`), Alternar Tema (Oscuro/Claro) y Digitalización OCR.
  3. **Documentos y Archivos PDF:** Búsqueda en tiempo real sobre la tabla `files` de Dexie, abriendo el visualizador directamente en `/pdf?fileId={id}`.
  4. **Proyectos del Motor de Contexto:** Búsqueda en la tabla `contextProjects` con navegación ágil a `/context?project={id}`.
  5. **Conceptos del Grafo de Conocimiento:** Búsqueda en la tabla `concepts` mostrando score de dominio y navegando a `/graph?concept={id}`.

### 3. Componente Modal de Paleta (`CommandPalette.tsx`)
- **Ubicación:** `src/components/command-palette/CommandPalette.tsx`.
- **Navegación 100% por Teclado:**
  - `ArrowDown` / `ArrowUp` para ciclar resultados con auto-scroll.
  - `Enter` para ejecutar la acción seleccionada y cerrar la paleta.
  - `Escape` o clic en el fondo para cancelar.
- **Códigos de Color Semánticos:** Badges visuales por categoría (`MÉTODO` en ámbar, `ARCHIVO` en esmeralda, `PROYECTO` en violeta, `CONCEPTO` en cian, `ACCIÓN` en rosa).
- **Indicador de Atajo:** Indicador `↵ Ejecutar` dinámico sobre el elemento activo.

### 4. Integración en el Shell (`Shell.tsx`) y Cabecera (`Header.tsx`)
- `Shell.tsx`: Registra el listener global `Ctrl+K` / `Cmd+K` y monta `<CommandPalette />`.
- `Header.tsx`: Incorpora botón disparador con icono `Search`, etiqueta responsive y chip de teclado `⌘K`.

### 5. Suite de Verificación Automatizada (26 Suites)
- `scripts/test-phase13-command-palette.mjs`: 44/44 pruebas aprobadas al 100%.
- `npm test`: **26 suites de tests ejecutadas con 100% de éxito (520+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 5.11s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.14 — Exportador e Impresor de Dossier Universitario (A4 / Markdown / HTML)

Esta fase implementa el **Generador de Dossier Universitario Imprimible y Exportador Académico Multiformato**, permitiendo a los estudiantes compilar en un solo documento de alta fidelidad todos sus apuntes, conceptos, subrayados, post-its, banco de errores pedagógicos y tarjetas de autoevaluación por materia o cátedra.

### 1. Motor de Compilación de Datos y Exportación (`dossierGenerator.ts`)
- **Ubicación:** `src/features/dossier/dossierGenerator.ts`.
- **Extracción Multientidad (`buildDossierData`):**
  - Consulta Dexie IndexedDB filtrando por carpeta de materia (`folderId`) o abarcando todo el repositorio.
  - Recopila: conceptos clave con score de dominio, documentos PDF asociados, fragmentos de texto subrayados con número de página, notas post-it con sus anotaciones, banco de errores del estudiante (`studentErrors`) con causas de fallo y correcciones analíticas, y tarjetas de estudio (FSRS y Leitner).
- **Generación en Markdown Académico (`generateDossierMarkdown`):**
  - Genera un archivo `.md` estructurado y limpio con metadatos, tabla de resumen estadístico y secciones modulares.
  - Las preguntas de autoevaluación se maquetan en bloques `<details><summary>` nativos colapsables para facilitar el estudio activo.
- **Generación en HTML Autónomo A4 (`generateDossierHtml`):**
  - Hoja de estilo embebida con reglas `@media print`: tamaño exacto `@page { size: A4; margin: 20mm; }`, saltos de página semánticos (`page-break-before: always`) entre secciones mayores, y prevención de cortes de página dentro de tarjetas (`break-inside: avoid`).
  - Barra de herramientas flotante con botón `window.print()` que se oculta automáticamente al imprimir o exportar a PDF en el navegador.

### 2. Modal de Configuración y Vista Previa (`DossierPreviewModal.tsx`)
- **Ubicación:** `src/components/dossier/DossierPreviewModal.tsx`.
- **Selector de Materia / Cátedra:** Permite elegir qué carpeta de materia exportar con auto-detección del nombre y contadores en tiempo real.
- **Interruptores de Sección:** Toggles para incluir/excluir individualmente conceptos clave, subrayados de textos, notas adhesivas, banco de errores y cuestionario de autoevaluación.
- **Vista Previa Dual:** Pestañas para visualizar el maquetado A4 en tiempo real o inspeccionar el código fuente Markdown generado.
- **Tres Acciones Inmediatas:**
  1. `Imprimir / Guardar como PDF`: abre el diálogo de impresión nativo del navegador con maquetación A4 perfecta.
  2. `Descargar .md`: descarga el archivo Markdown formateado.
  3. `Descargar .html`: descarga un archivo HTML autónomo listo para compartir o abrir offline.

### 3. Integración en el Gestor de Archivos (`Files.tsx`) y Command Palette (`commandPaletteService.ts`)
- **Gestor de Archivos:** Incorpora el botón **"Exportar Dossier"** en la barra de herramientas de `/files` y escucha el parámetro `?dossier=true`.
- **Command Palette:** Nueva acción global `action-dossier` invocable con `Ctrl+K` bajo términos como *"dossier"*, *"imprimir"*, *"pdf"*, *"resumen"*, *"apuntes"*, *"materia"*, o *"compendio"*.

### 4. Suite de Verificación Automatizada (27 Suites)
- `scripts/test-phase14-dossier-generator.mjs`: 39/39 pruebas aprobadas al 100%.
- `npm test`: **27 suites de tests ejecutadas con 100% de éxito (560+ aserciones verificadas)**.
- `npm run build`: compilación limpia con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.15 — Modo Repaso Rápido de Emergencia (Cram Mode / Blitz Session)

Esta fase introduce el **Modo Repaso Rápido de Emergencia (Cram Mode / Blitz Session)**, una herramienta pedagógica diseñada para situaciones de examen inminente (a menos de 12 o 24 horas) donde el estudiante necesita repasar de forma intensa sus conceptos más débiles sin distorsionar los cronogramas FSRS de largo plazo.

### 1. Motor de Priorización de Urgencia (`cramSelector.ts`)
- **Ubicación:** `src/features/cram/cramSelector.ts`.
- **Garantía de Aislamiento FSRS:**
  - El modo de emergencia NO invoca `executeFsrsReview` ni altera `stability`, `difficulty`, `lapses` o `dueDate` en `db.cardsFsrs`.
  - Permite repeticiones continuas inmediatas protegiendo el modelo matemático de retención a largo plazo.
- **Ponderación Algorítmica de Urgencia (`calculateItemUrgencyScore`):**
  - **Errores Pedagógicos No Resueltos (`studentErrors`):** Calificación crítica de 95/100, garantizando que los fallos analizados aparezcan al frente de la sesión.
  - **Tarjetas FSRS Vulnerables:** Calcula la Retrievability en tiempo real $R(t, S) = (1 + 19 \cdot t / S)^{-0.5}$. Aquellas con menor probabilidad de recuerdo y alta dificultad obtienen mayor prioridad (hasta 90/100).
  - **Tarjetas Leitner en Cajas Críticas:** Prioriza ítems en Caja 1 y 2.
- **Filtro Modular por Materia:** Permite acotar el repaso Blitz a una cátedra específica o abarcar todo el repositorio.

### 2. Componente de Ejecución Interactivo (`CramMethod.tsx`)
- **Ubicación:** `src/components/study-methods/CramMethod.tsx`.
- **Tres Fases Tácticas:**
  1. *Setup:* Selector de materia, temporizador por tarjeta (30s Sprint, 45s Blitz, 60s Táctico o Sin Límite), interruptor para conceptos débiles y límite de tarjetas.
  2. *Blitz:* Interfaz interactiva de alta concentración con cronómetro regresivo animado, volteo ágil (<kbd>Espacio</kbd>), y calificación rápida (<kbd>1</kbd> Fallo, <kbd>2</kbd> Dudoso, <kbd>3</kbd> Dominado).
     - **Re-inserción de Fallos:** Cualquier tarjeta calificada con fallo vuelve automáticamente al final de la cola Blitz para asegurar su dominio antes de salir de la sesión.
  3. *Diagnóstico Final:* Resumen de aciertos inmediatos, dudas y fallos reinsertados, tasa de efectividad y listado de conceptos críticos a vigilar antes de entrar al aula, junto con recomendaciones neurocognitivas de descanso pre-examen.

### 3. Integración en el Ecosistema
- **Catálogo de Métodos (`MethodsPage.tsx`):** Botón directo *"Modo Repaso de Emergencia (Blitz)"* en el encabezado y runner activo para `cram` (`/methods?run=cram`).
- **Dashboard (`Dashboard.tsx`):** Botón de acceso rápido *"Repaso Blitz Pre-Examen"* con icono animado de llama en la cabecera principal.
- **Command Palette (`commandPaletteService.ts`):** Acción global `action-cram` disponible con `Ctrl+K` bajo términos como *"cram"*, *"emergencia"*, *"blitz"*, *"repaso rapido"*, *"examen"*, *"parcial"*.

### 4. Suite de Verificación Automatizada (28 Suites)
- `scripts/test-phase15-cram-mode.mjs`: 33/33 pruebas aprobadas al 100%.
- `npm test`: **28 suites de tests ejecutadas con 100% de éxito (600+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.61s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.16 — Simulador de Coloquios y Exámenes Orales (Oral Defense Simulator)

Esta fase implementa el **Simulador de Coloquios y Exámenes Orales con Rúbrica Universitaria y Temporizador de Ponencia**, dotando a StudyLab de un entorno de entrenamiento para defensas de tesinas, exámenes finales orales y coloquios de cátedra (frecuentes en carreras de Medicina, Derecho, Ingeniería, Ciencias Exactas y Humanidades).

### 1. Motor de Evaluación y Generador de Objeciones (`oralDefenseEngine.ts`)
- **Ubicación:** `src/features/oral-defense/oralDefenseEngine.ts`.
- **Rúbrica Universitaria Normalizada sobre 10 Puntos (`calculateOralRubricScore`):**
  - Evalúa 5 dimensiones esenciales del desempeño oral (escala 1 a 5 por dimensión, sumando de 5 a 25 y normalizando a base 10):
    1. *Dominio Conceptual & Deducción Teórica:* Capacidad de justificar principios de base sin memoria mecánica.
    2. *Rigor Terminológico y Ausencia de Muletillas:* Uso de vocabulario de cátedra preciso y eliminación de titubeos.
    3. *Manejo del Tiempo y Estructura Discursiva:* Estructuración en introducción, nudo demostrativo y conclusión dentro del límite de tiempo.
    4. *Solvencia ante Objeciones y Repreguntas:* Habilidad para defender hipótesis ante condiciones de borde y contraejemplos.
    5. *Serenidad, Convicción y Presencia Escénica:* Proyección de la voz, manejo de la ansiedad y postura corporal asertiva.
  - Dictamen cualitativo automatizado: Insuficiente (< 4.0), Regular / Aprobado (4.0 - 6.9), Distinguido (7.0 - 8.9) y Sobresaliente (9.0 - 10.0).
- **Generador de Preguntas de la Mesa Examinadora (`generateJuryQuestions`):**
  - Modela preguntas con roles diferenciados: *Profesor Titular* (deducción de leyes fundamentales y síntesis epistemológica), *Jefe de Trabajos Prácticos* (casos límite y contingencias prácticas) y *Vocal del Tribunal* (preguntas trampa y falsas analogías).
- **Persistencia en Base de Datos:** Registra las defensas en `db.sessions` con `methodId: "oral-defense"` y duración real.

### 2. Componente de Ejecución Interactivo (`OralDefenseMethod.tsx`)
- **Ubicación:** `src/components/study-methods/OralDefenseMethod.tsx`.
- **Flujo Guiado de 4 Fases:**
  1. *Fase de Setup:* Selección de cátedra/materia o tema libre, duración de la exposición (3 min Flash, 5 min Estándar, 10 min Defensa Formal), cantidad de repreguntas docentes y redacción de la *Ficha de Ponencia* (hasta 5 viñetas guía permitidas en la mesa de examen).
  2. *Fase de Exposición Oral en Vivo:* Cronómetro regresivo animado, atril virtual, ficha de ponencia colapsable y medidor de ritmo de habla opcional mediante la Web Speech API (`SpeechRecognition`) con cálculo en vivo de palabras por minuto (ppm).
  3. *Fase de Preguntas del Tribunal:* Rondas secuenciales con intervención docente, intención didáctica declarada y temporizador recomendado de respuesta oral (75s a 120s).
  4. *Fase de Rúbrica y Veredicto:* Formulario interactivo de autoevaluación o co-evaluación en 5 dimensiones con cálculo de nota en tiempo real y dictamen del tribunal.

### 3. Integración en el Ecosistema StudyLab
- **Catálogo de Métodos (`MethodsPage.tsx`):** Botón directo *"Simulador de Coloquio Oral"* en la cabecera del catálogo y switch de runner activo para `/methods?run=oral-defense`.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Nueva acción global `action-oral-defense` disponible con `Ctrl+K` bajo términos como *"oral"*, *"coloquio"*, *"defensa"*, *"tesis"*, *"tribunal"*, *"discurso"*, mapeada con el icono `Mic`.
- **Tipado Global (`types/index.ts`):** Inclusión de `"oral-defense"` dentro del tipo `StudyMethodId`.

### 4. Suite de Verificación Automatizada (29 Suites)
- `scripts/test-phase16-oral-defense.mjs`: 32/32 pruebas aprobadas al 100%.
- `npm test`: **29 suites de tests ejecutadas con 100% de éxito (630+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 3.55s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.17 — Telemetría Biométrica BLE & Pulso Cardíaco Local (Fase 6 Context Engine)

**Qué se construyó**
Implementación integral de la **Fase 6 del Roadmap del Context Engine**: Monitoreo biométrico local mediante Web Bluetooth API (`navigator.bluetooth`) y servicio estandarizado Bluetooth SIG Heart Rate (`0x180D`, `0x2A37`), cálculo matemático de variabilidad de frecuencia cardíaca (HRV / RMSSD), diagnóstico autonómico del estrés cognitivo y protocolo guiado de Respiración Cuadrada (*Box Breathing*) 4-4-4-4 para reducción de taquicardia y ansiedad pre-examen.

### 1. Motor de Decodificación GATT y Algoritmos Biométricos (`biometricsService.ts`)
- **Ubicación:** `src/features/biometrics/biometricsService.ts`.
- **Decodificador Binario Bluetooth SIG:**
  - Inspecciona el flag byte en la posición 0 de la característica GATT `0x2A37`.
  - Soporta medición en formato 8 bits (Uint8) y 16 bits (Uint16 Little-Endian).
  - Parser de intervalos R-R (resolución $1/1024$ de segundo convertida a milisegundos).
  - Detección de contacto con la piel (*Skin Contact Sensor*).
  - Extracción de energía gastada en kilojulios (kJ).
- **Cálculo Matemático de HRV (RMSSD):**
  - Implementa la raíz cuadrada de la media de las diferencias al cuadrado de intervalos R-R consecutivos:
    $$\text{RMSSD} = \sqrt{\frac{1}{N-1}\sum_{i=1}^{N-1}(RR_{i+1} - RR_i)^2}$$
- **Evaluador de Estrés Autonómico:**
  - Clasifica el estado neurofisiológico en 4 niveles con recomendaciones cognitivas concretas:
    - `stressed`: $\text{BPM} \ge 100$, sobrecarga simpática o ansiedad pre-examen; sugiere activar la Respiración Cuadrada.
    - `fatigued`: $\text{BPM} \ge 88$ con baja variabilidad o desgaste sostenido.
    - `focused`: $70 \le \text{BPM} \le 85$, óptimo para trabajo profundo (*flow state*).
    - `calm`: $\text{BPM} < 70$, tono parasimpático basal y reposo cognitivo.
- **Generador Sintético Offline (`SyntheticHeartRateSimulator`):**
  - Permite pruebas y validación sin hardware Bluetooth físico mediante simulación oscilatoria con deriva sinusoidal y ruido aleatorio gaussiano para perfiles `calm`, `focused` y `stressed`.

### 2. Store Reactivo y Control de Telemetría (`useBiometricsStore.ts`)
- **Ubicación:** `src/stores/useBiometricsStore.ts`.
- **Integración con Web Bluetooth API:** Conexión segura con filtro de servicio `heart_rate`, suscripción a `startNotifications()` y reconexión/desconexión resiliente.
- **Historial Deslizante:** Buffer circular de 30 muestras temporales para graficado reactivo de sparklines en tiempo real.
- **Gestión Modal:** Control de visibilidad del modal de Respiración Cuadrada.

### 3. Componentes de Visualización e Intervención
- **`BiometricsMonitorCard.tsx` (`src/features/biometrics/BiometricsMonitorCard.tsx`):**
  - Tacómetro cardíaco con icono de corazón animado sincronizado con la frecuencia cardíaca actual (`60 / currentBpm` segundos por latido).
  - Sparkline SVG interactivo del historial reciente de pulso con gradiente dinámico.
  - Insignia y tarjeta de diagnóstico del estado neurovegetativo con colorimetría semántica.
  - Controles de conexión BLE real y switch de perfiles del simulador sintético (*Calma*, *Foco Óptimo*, *Estrés de Examen*).
- **`BoxBreathingModal.tsx` (`src/features/biometrics/BoxBreathingModal.tsx`):**
  - Protocolo de respiración diafragmática 4-4-4-4: Inhalar (4s) $\to$ Retener lleno (4s) $\to$ Exhalar (4s) $\to$ Retener vacío (4s).
  - Anillo visual concéntrico pulsante con escalado CSS dinámico, contador de ciclos completados y retroalimentación de tono vagal.

### 4. Integraciones en el Sistema
- **Context Engine Dashboard (`ContextEngineDashboard.tsx`):** Pestaña dedicada `"biometrics"` (*"Biometría & Pulso BLE"*) que integra la tarjeta de monitoreo en el panel de telemetría de estudio.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Nueva acción global `action-biometrics` (`Ctrl+K`) accesible mediante términos como *"pulso"*, *"ritmo cardiaco"*, *"frecuencia cardiaca"*, *"estres"*, *"biometria"*, *"ble"*, *"bluetooth"*, mapeada con el icono `Heart`.

### 5. Suite de Verificación Automatizada (30 Suites)
- `scripts/test-phase17-biometrics.mjs`: 26/26 pruebas aprobadas al 100%.
- `npm test`: **30 suites de tests ejecutadas con 100% de éxito (660+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.16s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.18 — Matriz Anual de Consistencia Cognitiva y Pronóstico de Retención a 365 Días (FSRS Memory Decay)

**Qué se construyó**
Implementación del sistema dual de analítica de largo plazo: la **Matriz Anual de Consistencia Cognitiva (52 semanas / 365 días)** con mapeo de densidad horaria y rachas, y el **Motor Matemático de Pronóstico de Retención a 365 Días**, que modela el decaimiento de memoria $R(t, S)$ sobre el mazo FSRS del estudiante, identifica el *Abismo de Olvido* pre-examen y sugiere fechas de refuerzo pedagógico antes de que la retención caiga por debajo del umbral de aprobación (80%).

### 1. Motor de Matriz de Consistencia y Rachas (`consistencyHeatmap.ts`)
- **Ubicación:** `src/features/analytics/consistencyHeatmap.ts`.
- **Ventana Deslizante de 52 Semanas (365 días):**
  - Genera una matriz semanal alineada con domingos (52 columnas $\times$ 7 filas de días).
  - Agrega telemetría de sesiones de estudio (`db.sessions`) y repasos FSRS (`db.reviewLogs`).
- **Niveles de Intensidad Cognitiva (0 a 4):**
  - Nivel 0: Sin actividad registrada.
  - Nivel 1 (Ligero): < 15 min o < 10 tarjetas.
  - Nivel 2 (Moderado): 15 a 45 min o 10 a 30 tarjetas.
  - Nivel 3 (Profundo / Deep Work): 45 a 90 min o 30 a 70 tarjetas.
  - Nivel 4 (Titán / Hiperfoco): > 90 min o > 70 tarjetas repasadas.
- **Métricas de Consistencia y Rachas:**
  - Racha actual activa (días consecutivos hasta hoy).
  - Racha récord histórica (all-time longest streak).
  - Total de horas netas de estudio y tarjetas repasadas en el último año.
  - Promedio de minutos dedicados por día activo.
  - Porcentaje de consistencia anual sobre el calendario civil.

### 2. Motor Matemático de Pronóstico a 365 Días (`retentionForecast.ts`)
- **Ubicación:** `src/features/analytics/retentionForecast.ts`.
- **Fórmula Canónica de Retención FSRS:**
  - Simula la probabilidad de recuperación a futuro para cada tarjeta $i$ en función de su estabilidad $S_i$ y los días transcurridos:
    $$R(t, S) = \left(1 + 19 \cdot \frac{t}{S}\right)^{-0.5}$$
- **Hitos Temporales de Examen:**
  - Computa la retención estimada a Hoy (0d), 7 días, 30 días (1 mes), 60 días (2 meses), 90 días (típico trimestre / finales universitarios), 180 días (semestre) y 365 días (año).
- **Detección de Umbrales Críticos:**
  - Días hasta caer por debajo del **80%** (umbral de aprobación segura).
  - Días hasta el **70%** (*Abismo Crítico de Olvido* / caída acelerada).
  - Días hasta el **50%** (Vida Media del Conocimiento / Half-Life $t_{1/2}$).
- **Recomendaciones Pedagógicas Adaptativas:**
  - Diagnóstico categorizado en `good`, `warning` y `critical`.
  - Cálculo de la fecha de refuerzo recomendada (*Booster Review Day*) para impedir que la curva caiga al abismo de olvido.

### 3. Componentes Visuales en el Dashboard
- **`ConsistencyHeatmapCard.tsx` (`src/features/analytics/ConsistencyHeatmapCard.tsx`):**
  - Matriz visual interactiva con soporte para temas oscuro y claro.
  - Foco y hover interactivo sobre cada celda con popover detallado (fecha, minutos, sesiones, tarjetas y nivel de intensidad).
  - Escala de color gradual de esmeralda / turquesa y leyenda de intensidad.
  - Franja de KPIs clave: Días Activos, Horas de Foco, Tarjetas Repasadas y Promedio diario.
- **`RetentionForecastCard.tsx` (`src/features/analytics/RetentionForecastCard.tsx`):**
  - Selector interactivo de horizonte de examen (30d, 60d, 90d, 180d).
  - Gráfico vectorial SVG continuo con gradiente dinámico y líneas guía punteadas para los umbrales de 90%, 80% y 70%.
  - Línea vertical indicadora del día de examen seleccionado con valor de retención proyectado.
  - Tarjeta de diagnóstico y aviso de refuerzo sugerido con insignia de advertencia.

### 4. Integraciones en el Sistema
- **Dashboard (`Dashboard.tsx`):** Integración directa de ambos componentes analíticos en la vista principal del estudiante.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):**
  - Nueva acción `action-consistency-heatmap` mapeada con el icono `Calendar` y términos de consistencia y racha.
  - Nueva acción `action-retention-forecast` mapeada con el icono `TrendingUp` y términos de pronóstico y memoria a 365 días.

### 5. Suite de Verificación Automatizada (31 Suites)
- `scripts/test-phase18-retention-heatmap.mjs`: 20/20 pruebas aprobadas al 100%.
- `npm test`: **31 suites de tests ejecutadas con 100% de éxito (680+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.61s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.19 — Simulador de Exámenes a Desarrollo y Ensayos Universitarios (Essay & Synthesis Evaluator)

**Qué se construyó**
Implementación del entorno de entrenamiento para exámenes escritos a desarrollo, preguntas de cátedra y ensayos académicos. Incorpora un motor de rúbrica analítica en 4 dimensiones, un **"Detector de Humo" (análisis de verborragia vacía y frases cliché)**, contador en vivo de palabras con guía estructural (Tesis $\to$ Fundamentación $\to$ Casos Límites $\to$ Síntesis), y banco de consignas para Medicina, Derecho, Ingeniería y Ciencias Sociales.

### 1. Motor de Evaluación y Rúbrica de Cátedra (`essayGraderEngine.ts`)
- **Ubicación:** `src/features/essay-grader/essayGraderEngine.ts`.
- **Rúbrica Universitaria de 4 Dimensiones:**
  - *Dominio Conceptual (35%):* densidad de conceptos y terminología técnica obligatoria de cátedra.
  - *Estructura & Cohesión (25%):* detección de planteo inicial/tesis, desarrollo argumental, casos límites y conclusión formal.
  - *Rigor Crítico & Conectores (20%):* uso de conectores causales, excepciones y contrastes de doctrina.
  - *Claridad & Detector de Humo (20%):* penalización progresiva por frases vacías y verborragia retórica sin contenido.
- **Detector de Humo:**
  - Identifica catálogo de frases cliché académicas (*"como todos sabemos"*, *"a lo largo de la historia"*, *"es un tema muy interesante y de suma importancia"*, *"no cabe duda que"*, etc.).
  - Cuantifica el porcentaje de caracteres consumidos por relleno vacuo y emite feedback pedagógico específico.
- **Banco de Consignas Precargadas:**
  - Medicina: *Fisiopatología del Shock Séptico y Cascada Inflamatoria*.
  - Derecho: *Principio de Proporcionalidad y Control de Constitucionalidad*.
  - Ingeniería: *Teorema de Nyquist-Shannon y Fenómeno de Aliasing*.
  - Humanidades: *La Dialéctica del Amo y el Esclavo en Hegel*.
- **Persistencia:** Registro de exámenes en `db.sessions` con `methodId: "essay-exam"`.

### 2. Componente Interactivo (`EssayExamMethod.tsx`)
- **Ubicación:** `src/components/study-methods/EssayExamMethod.tsx`.
- **Flujo Guiado de 3 Fases:**
  - *Fase 1 (Setup):* Selección de consigna precargada o creación de pregunta personalizada con palabras clave de cátedra, límites de tiempo (10 a 45 min) y extensión objetivo (200 a 800 palabras).
  - *Fase 2 (Redacción bajo Tiempo):* Editor serif amplio, temporizador regresivo animado, contador de palabras y barra de progreso porcentual, junto a una guía colapsable de estructura universitaria recomendada.
  - *Fase 3 (Dictamen y Rúbrica):* Nota numérica sobre 10 con categoría de veredicto (*Sobresaliente*, *Distinguido*, *Aprobado*, *Insuficiente*), barras de puntuación por dimensión, diagnóstico de verborragia, chips de términos clave cubiertos/ausentes y recomendaciones de mejora.

### 3. Integraciones en el Sistema
- **Catálogo de Métodos (`MethodsPage.tsx`):** Carga diferida (`lazy`), switch case para `"essay-exam"` y botón directo *"Examen a Desarrollo & Ensayo"* en la cabecera.
- **Tipado Global (`types/index.ts`):** Inclusión de `"essay-exam"` en `StudyMethodId`.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Nueva acción rápida global `action-essay-exam` mapeada con el icono `FileText` y términos como *"desarrollo"*, *"ensayo"*, *"escrito"*, *"parcial"*, *"redaccion"*, *"rubrica"*.

### 4. Suite de Verificación Automatizada (32 Suites)
- `scripts/test-phase19-essay-exam.mjs`: 15/15 pruebas aprobadas al 100%.
- `npm test`: **32 suites de tests ejecutadas con 100% de éxito (695+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 4.26s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.20 — Matriz Comparativa y Despiece Teórico de Autores (Comparative Matrix & Active Recall Grids)

**Qué se construyó**
Implementación del motor multidimensional de comparación teórica y contraste epistemológico para carreras universitarias. Permite construir cuadros comparativos entre autores, escuelas o patologías clínicas, identificar puntos de fricción conceptual frecuentemente examinados en mesas de examen y realizar entrenamiento intensivo mediante **Active Recall a Celdas Ciegas** con autoevaluación semántica.

### 1. Motor de Matrices y Despiece Teórico (`comparativeMatrixEngine.ts`)
- **Ubicación:** `src/features/comparative-matrix/comparativeMatrixEngine.ts`.
- **Estructura Multidimensional:**
  - Ejes de Entidades (columnas) y Dimensiones Analíticas (filas) con indexación canónica `${entityIdx}_${dimIdx}`.
  - Puntos de Fricción Teórica (*Friction Points*): catálogo de trampas docentes, objeciones cruzadas y puntos de choque doctrinal (ej. génesis del lenguaje entre Piaget y Vygotsky, efecto desplazamiento en macroeconomía, o fracción de eyección normal en insuficiencia cardíaca).
- **Banco de Matrices Precargadas:**
  - Psicología & Educación: *Corrientes del Aprendizaje (Conductismo vs Cognitivismo vs Constructivismo)*.
  - Medicina & Fisiopatología: *Diagnóstico Diferencial: Insuficiencia Cardíaca Sistólica (ICFEr) vs Diastólica (ICFEp)*.
  - Economía & Finanzas: *Macroeconomía: Keynesianismo vs Monetarismo vs Escuela Austríaca*.
  - Derecho & Jurídico: *Derecho de Daños: Responsabilidad Contractual vs Extracontractual*.
- **Generador de Celdas Ciegas:**
  - Enmascara celdas aleatoria o totalmente (ratio 50% o 100%) para forzar la evocación activa sin pistas visuales.
- **Evaluador de Respuestas Semánticas:**
  - Compara la evocación del estudiante contra la definición canónica de cátedra, identificando palabras clave dominadas y conceptos omitidos.
- **Persistencia:** Registro de sesiones de despiece en `db.sessions` con `methodId: "comparative-matrix"`.

### 2. Componente Interactivo (`ComparativeMatrixMethod.tsx`)
- **Ubicación:** `src/components/study-methods/ComparativeMatrixMethod.tsx`.
- **Modo 1 (Cuadro Completo de Estudio):**
  - Vista panorámica tabular con tipografía técnica, códigos de entidad y panel inferior de preguntas trampa de final de cátedra.
- **Modo 2 (Active Recall a Celdas Ciegas):**
  - Celdas ocultas con estado interactivo: área de evocación escrita/mental, revelación de respuesta canónica con acierto porcentual, y autoevaluación en 3 niveles (*Dominado*, *Dudoso*, *Fallo*).
  - Barra de progreso de maestría en tiempo real sobre el total de celdas ocultas.
- **Creador de Matrices Propias:**
  - Permite al estudiante diseñar matrices comparativas ad-hoc para cualquier materia ingresando entidades y dimensiones separadas por comas.

### 3. Integraciones en el Sistema
- **Catálogo de Métodos (`MethodsPage.tsx`):** Carga diferida (`lazy`), switch case para `"comparative-matrix"` y botón directo *"Matriz Comparativa de Cátedra"* en la cabecera.
- **Tipado Global (`types/index.ts`):** Inclusión de `"comparative-matrix"` en `StudyMethodId`.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Nueva acción rápida global `action-comparative-matrix` mapeada con el icono `Columns3` y términos como *"comparativa"*, *"matriz"*, *"autores"*, *"teorias"*, *"diferencial"*, *"cuadro"*.

### 4. Suite de Verificación Automatizada (33 Suites)
- `scripts/test-phase20-comparative-matrix.mjs`: 15/15 pruebas aprobadas al 100%.
- `npm test`: **33 suites de tests ejecutadas con 100% de éxito (710+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 3.94s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.21 — Simulador de Casos Prácticos y Viñetas Clínicas / Legales (Ockham Diagnostic Simulator)

**Qué se construyó**
Implementación del simulador de casos prácticos y viñetas reales para carreras profesionales avanzadas (Medicina, Derecho, Ingeniería/DevOps). Modela la resolución progresiva de escenarios complejos con **Criterio de Navaja de Ockham**, penalizando el sobrecosto de pruebas innecesarias o iatrogénicas, y confrontando el diagnóstico y plan terapéutico del estudiante contra el Gold Standard de cátedra.

### 1. Motor de Casos Prácticos y Eficiencia Diagnóstica (`caseStudyEngine.ts`)
- **Ubicación:** `src/features/case-study/caseStudyEngine.ts`.
- **Estructura Canónica de la Viñeta:**
  - Motivo de consulta / Hecho detonante (`chiefComplaint`), Antecedentes fácticos (`anamnesisOrFacts`) y Examen físico o inspección de entorno (`physicalExamOrContext`).
- **Mesa de Investigaciones Complementarias:**
  - Clasificación por categorías: Laboratorio, Imágenes, Telemetría / Trazado, Peritaje / Prueba, Historial.
  - Parámetros `isEssential` (estudios indispensables de 1ª línea) y `costPoints` (penalización en caso de ser solicitadas sin justificación).
- **Banco de Casos Clínicos y Profesionales Precargados:**
  - **Medicina (Cardiología / Urgencias):** *Dolor Torácico Agudo en Paciente de 58 Años* (IAM anteroseptal vs Disección Aórtica / Pericarditis; penaliza angio-TC y espera de troponinas cuando el ECG ya es patognomónico).
  - **Derecho & Litigio:** *Incumplimiento de Suministro Industrial y Caso Fortuito* (Resolución contractual imputable vs Eximente por Fuerza Mayor; penaliza testimoniales superfluas y analiza peritajes contables y cartas documento).
  - **Ingeniería de Software & DevOps:** *Caída de Latencia Crítica en Pasarela de Pagos* (Agotamiento de Pool HikariCP / Contención de conexiones vs Saturación CPU / DDoS; penaliza reinicio masivo que detona efecto Thundering Herd).
- **Algoritmo de Evaluación de 3 Dimensiones (0 - 10):**
  - **Acierto Diagnóstico (45%):** Concordancia semántica con el diagnóstico principal y diferenciales.
  - **Criterio de Navaja de Ockham (25%):** Economía de pruebas. Deduce puntos por pruebas redundantes o potencialmente iatrogénicas y por omisión de pruebas críticas. Categoriza en *Excelente (Criterio Ockham)*, *Moderada* o *Exceso de Pruebas / Iatrogenia*.
  - **Plan Terapéutico / Resolutivo (30%):** Pertinencia de la intervención inmediata y penalización severa por incurrir en conductas formalmente contraindicadas.
- **Persistencia Local:** Almacenamiento del intento y duración en `db.sessions` con `methodId: "case-study"`.

### 2. Componente Interactivo Progresivo (`CaseStudyMethod.tsx`)
- **Ubicación:** `src/components/study-methods/CaseStudyMethod.tsx`.
- **Flujo en 4 Fases Progresivas:**
  1. **Presentación de la Viñeta:** Lectura del motivo de consulta, hechos y examen físico inicial.
  2. **Mesa de Estudios:** Catálogo de pruebas disponibles con categorías y advertencias de costo. Desbloqueo progresivo con revelación instantánea de hallazgos.
  3. **Diagnóstico y Conducta:** Formulación por escrito del diagnóstico principal, hipótesis diferenciales y plan terapéutico inmediato.
  4. **Confrontación Gold Standard:** Pantalla de devolución con nota final sobre 10, desglose por dimensiones, veredicto de Ockham, comparación cara a cara entre la respuesta del estudiante y la de cátedra, advertencias sobre conductas contraindicadas y **Perlas de Cátedra para Finales**.

### 3. Integraciones en el Ecosistema
- **Catálogo de Métodos (`MethodsPage.tsx`):** Carga diferida (`lazy`), caso `"case-study"` en el despachador de runners y botón directo *"Casos Prácticos & Viñetas"* en la barra superior.
- **Tipado del Sistema (`types/index.ts`):** `StudyMethodId` actualizado con `"case-study"`.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Acción rápida global `action-case-study` vinculada a `/methods?run=case-study` con icono `Briefcase` y términos de búsqueda especializados (*"caso"*, *"clinico"*, *"vinetas"*, *"medicina"*, *"derecho"*, *"ingenieria"*, *"ockham"*, *"diagnostico"*).

### 4. Suite de Verificación Automatizada (34 Suites)
- `scripts/test-phase21-case-study.mjs`: 16/16 pruebas aprobadas al 100%.
- `npm test`: **34 suites de tests ejecutadas con 100% de éxito (726+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 5.18s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Fase v5.22 — Cronograma Dinámico de Cuatrimestre & Diagrama de Gantt Académico (Semester Gantt & Workload Balancer)

**Qué se construyó**
Implementación de la estación de planificación temporal y balance de esfuerzo cuatrimestral para estudiantes universitarios. Modela el ciclo lectivo completo en 16 semanas, calcula la tasa diaria de horas necesarias por examen y emite alertas automáticas de **"Semanas de Colapso"** cuando coinciden 2 o más evaluaciones mayores o la demanda supera la capacidad fisiológica semanal.

### 1. Motor de Cronograma y Carga Académica (`semesterGanttEngine.ts`)
- **Ubicación:** `src/features/semester-planner/semesterGanttEngine.ts`.
- **Estructura Canónica del Hito Académico:**
  - Tipos formales: `Primer Parcial`, `Segundo Parcial`, `Recuperatorio`, `Entrega TP Obligatorio`, `Coloquio / Examen Final`.
  - Parámetros: fecha de vencimiento (`dueDate`), horas estimadas de preparación profunda (`estimatedPrepHours`) y nivel de dificultad (`Media`, `Alta`, `Crítica`).
- **Planes Universitarios Modelo Precargados:**
  - **Ingeniería en Sistemas / Software:** *Sistemas Distribuidos*, *Bases de Datos Masivas*, *Arquitectura de Software*.
  - **Medicina:** *Cardiología & ECG*, *Farmacología Clínica*, *Neumonología*.
  - **Derecho:** *Obligaciones & Contratos*, *Derecho de Daños*.
- **Algoritmo de Detección de Semanas de Colapso (`detectSemesterOverloads`):**
  - Evalúa ventanas rodantes de 7 días. Si coinciden 2 o más exámenes o la carga semanal excede 24-30 horas, dispara el estado `Semana de Colapso` con recomendación proactiva de adelantamiento de estudio.
- **Proyector de Esfuerzo Diario (`calculateDailyHoursRequired`):**
  - Calcula la tasa diaria en `h/día` necesaria para llegar a la fecha sin saturación. Clasifica el estado de urgencia en *Holgado*, *Moderado*, *Alerta Cramming* (<= 7 días) o *Vencido*.
- **Persistencia e Integración:** Sincronización automática de hitos con `db.deadlines` y persistencia de sesiones en `db.sessions` con `methodId: "semester-gantt"`.

### 2. Componente Visual e Interactivo (`SemesterGanttMethod.tsx`)
- **Ubicación:** `src/components/study-methods/SemesterGanttMethod.tsx`.
- **Diagrama Gantt de 16 Semanas:**
  - Cuadrícula temporal responsiva (`grid-cols-16`) con semanas numeradas e indicador visual de sobrecarga.
  - Barras por cátedra con píldoras de examen etiquetadas (`P1`, `P2`, `TP`, `FIN`) coloreadas por materia y severidad.
  - Al hacer clic en cualquier hito, despliega panel de detalle con dificultad, horas estimadas y fecha exacta.
- **Panel de Alerta de Colapso Cognitivo:**
  - Tarjetas de advertencia con desglose de materias en conflicto y botón de acción rápida *"Activar Cram Mode (Repaso 7 Días)"* con redirección fluida a `/methods?run=cram`.
- **Formulario Ágil de Registro:**
  - Permite al estudiante sumar nuevos parciales y entregas con sliders de días restantes y horas estimadas.
- **Matriz de Tasa Diaria de Estudio:**
  - Tarjetas de monitoreo continuo de horas/día por materia con badges semaforizados de urgencia.

### 3. Integraciones en el Ecosistema
- **Catálogo de Métodos (`MethodsPage.tsx`):** Carga diferida (`lazy`), runner case `"semester-gantt"` y botón directo *"Cronograma & Gantt"* en la barra superior.
- **Tipado Global (`types/index.ts`):** `StudyMethodId` actualizado con `"semester-gantt"`.
- **Command Palette (`commandPaletteService.ts` / `CommandPalette.tsx`):** Nueva acción rápida `action-semester-gantt` vinculada a `/methods?run=semester-gantt` con el icono `CalendarDays`.

### 4. Suite de Verificación Automatizada (35 Suites)
- `scripts/test-phase22-semester-gantt.mjs`: 15/15 pruebas aprobadas al 100%.
- `npm test`: **35 suites de tests ejecutadas con 100% de éxito (741+ aserciones verificadas)**.
- `npm run build`: compilación limpia en 5.03s con 0 errores TypeScript (`tsc -b && vite build`).

---

## Cómo correr todo esto

```bash
# Frontend (siempre necesario)
npm install
npm run dev              # http://localhost:5173

# Backend (opcional — solo para Google Calendar, Fase 9)
cd server
cp .env.example .env     # completar con credenciales propias de Google Cloud
npm install
npm run dev               # http://localhost:3001
```

Todo lo demás (archivos, notas, progreso, métodos, sesiones) funciona 100% local-first en
IndexedDB sin el backend — como pedía la regla original del proyecto.
