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
