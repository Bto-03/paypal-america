# PayPal America · Plan de sprints

**Equipo:** Geovanny (producto/frontend) · Beto (backend/datos/QA)
**Ventana:** miércoles 11 nov 09:00 → jueves 12 nov 15:00 (Ecuador, UTC−5)
**Entrega:** objetivo interno **jueves 12:30** · límite oficial **jueves 15:00**
**Fuente:** *PayPal America · Biblia del producto y plan de equipo* (Page de Geovanny). Si este plan y la biblia no coinciden, manda la biblia.

> Los horarios son una propuesta. Si un sprint se atrasa, **se recorta el alcance, no la fecha**. El orden de recorte está en la sección 6.

---

## 1. Cómo trabajamos

- **Sprints cortos** de 2 a 3 horas. Cada uno tiene una meta clara y termina con una **revisión de 15 min**: mostramos lo que funciona, no lo que "casi" funciona.
- **Cada uno tiene su lista.** Toma la siguiente tarea de **su** columna en orden. Si se traba, la marca 🔴 y avisa.
- **Tablero:** cada tarea pasa por `⬜ Por hacer → 🟡 Haciendo → 🔵 En revisión → ✅ Hecho`. Se marca aquí mismo o en GitHub Projects.
- **Regla de los 20 minutos:** quien lleve 20 min trabado en algo avisa al otro. No se espera al final del sprint.
- **Un dueño por archivo.** Geovanny es dueño de `frontend/`. Beto es dueño de `server/`, `fixtures/` y `tests/`. Nadie edita los archivos del otro sin avisar.
- **Hecho** = cumple el criterio de la tarea, se probó y se vieron los casos de error, no expone secretos y el otro lo revisó. Una captura de pantalla bonita no cuenta como hecho.
- **Mensajes entre los dos:** `[ID] estado · qué falta · qué necesito de ti`. Ejemplo: `[B1.3] 🔴 la captura devuelve 422 · necesito que apruebes con Personal EC`.

---

## 2. Reglas que no se rompen

1. Todo corre en **sandbox**: nada de dinero real ni endpoint live.
2. Las claves van solo en `.env`, nunca en el código, el repo, el chat ni el video. `.env.example` lleva solo los nombres.
3. Un pago cuenta como recibido **solo** si el servidor verificó el `COMPLETED`: importe, moneda, payee y sesión. La URL de retorno no prueba nada.
4. Las cifras las calcula el código. La IA solo redacta. Lo observado en sandbox va separado de lo estimado para Ecuador (5,40% + $0,30).
5. Nunca decir ni insinuar que la app evita el ISD o los impuestos, elimina el fraude, emite tarjetas, da cashback o millas, o tiene alianzas.
6. Nada de chat, Payouts, Invoicing, conexión con bancos ni funciones nuevas fuera del MVP.
7. Todo lo que se entrega va **en inglés**: README, video y Devpost.

---

## 3. Resumen por sprint

| Sprint | Horario | Meta del sprint | Revisión |
|---|---|---|---|
| **S0 · Arranque** | Mié 09:00–09:30 | Contrato API congelado, stack, hosting y LLM elegidos | — |
| **S1 · Primer cobro** | Mié 09:30–12:00 | Venta de $200 en sandbox de punta a punta · UI con mocks | 12:00 |
| **S2 · Ledger y pasaporte** | Mié 12:00–15:30 *(almuerzo 13–14)* | Venta → ledger → meta → mango dorado, con la UI conectada a la API real | 15:30 |
| **S3 · IA y aporte** | Mié 15:30–18:30 | Avisos LLM reales · checkout de $1 a la causa DEMO | 18:30 |
| **S4 · Deploy y QA** | Mié 19:00–21:30 | URL pública HTTPS · matriz QA en verde · **congelar funciones** | 21:30 |
| **S5 · Materiales** | Jue 08:00–11:00 | Video de 170 s, README, licencia, Devpost en borrador | 11:00 |
| **S6 · Entrega** | Jue 11:00–12:30 | Envío hecho y enlaces comprobados desde otro navegador | 12:30 |
| *Colchón* | Jue 12:30–15:00 | Solo bloqueos. Nada nuevo. | 15:00 límite |

---

## 4. Backlog por persona

`Est.` = estimación en horas · `Dep.` = de qué depende

### Sprint 0 · Arranque (juntos, 30 min)

| ID | Tarea | Dueño | Criterio de hecho |
|---|---|---|---|
| ⬜ S0.1 | Confirmar horas disponibles de cada uno el miércoles y el jueves | Ambos | Horas escritas aquí |
| ⬜ S0.2 | Decidir el stack: se conserva el proyecto de Cursor que ya existe (Node/Express o Next.js) | Ambos | Stack escrito y repo creado |
| ⬜ S0.3 | Congelar el contrato API v1 (sección 8 de la biblia): endpoints, envelope `data+meta` y DTO | Ambos | `docs/api-v1.md` aprobado por los dos |
| ⬜ S0.4 | Elegir proveedor LLM con acceso ya existente, sin gastos nuevos sin aprobación | Beto | Modelo y key en `.env` funcionando |
| ⬜ S0.5 | Elegir hosting y base persistente (Vercel + Postgres o Render + disco) | Beto | Ruta elegida y límites gratuitos verificados |
| ⬜ S0.6 | Geovanny entrega a Beto lo que ya tenga del cobro en Cursor | Geovanny | Archivos traspasados; desde aquí Orders es de Beto |
| ⬜ S0.7 | Aprobar pantallas, meta de $300, regiones demo e idioma ES-EC/EN | Geovanny | Lista cerrada |

---

### 🟦 Geovanny · producto / frontend / pitch

| ID | Sprint | Tarea | Est. | Dep. | Criterio de hecho |
|---|---|---|---|---|---|
| ⬜ G1.1 | S1 | Esqueleto del frontend: navegación entre Inicio, Pasaporte y Apoyar, más la etiqueta **SANDBOX** siempre visible | 0,5 | S0.2 | Las 3 vistas navegan en móvil y en escritorio |
| ⬜ G1.2 | S1 | Adaptador mock que lee los fixtures de Beto, con "MOCK" rotulado | 0,5 | B1.1 | Cambiar de mock a API toca solo el adaptador |
| ⬜ G1.3 | S1 | **Inicio:** alias, región, meta, tarjeta bruto/neto, botón "Cobrar de prueba" y espacio para 2–3 avisos | 1,0 | G1.2 | Se ve bien con los fixtures success, pending y cancelled |
| ⬜ G1.4 | S1 | Diseño base: plano, blur discreto, texto grande y buen contraste | 0,5 | — | Tarjeta limpia sin número bancario, CVV ni nada que parezca tarjeta emitida |
| ⬜ G2.1 | S2 | **Pasaporte:** lugares demo y mango dorado ganado, con su origen ("declarado, no verificado") | 1,0 | G1.2 | El mango solo aparece con una venta completed |
| ⬜ G2.2 | S2 | Pantalla **Cobro/resultado**: revisión de $200, redirección a PayPal y estados loading / pending / cancelado / completado | 0,75 | B1.3 | Cada estado se distingue; doble clic bloqueado |
| ⬜ G2.3 | S2 | **CP2:** cambiar el adaptador mock por la API real | 0,5 | B2.4 | Venta real → meta y mango se actualizan sin rehacer componentes |
| ⬜ G2.4 | S2 | Selector ES-EC / EN para etiquetas y textos | 0,5 | — | Todo el texto cambia de idioma, nada queda a medias |
| ⬜ G3.1 | S3 | Tarjetas de avisos IA con enlace a **Evidencia** (montos, estado, fecha y supuestos) | 1,0 | B3.3 | Muestra "IA temporalmente no disponible" si el LLM falla |
| ⬜ G3.2 | S3 | **Apoyar:** 3 causas DEMO ordenadas por región, aporte fijo de $1 y confirmación voluntaria | 1,0 | B3.5 | Al elegir Galápagos, su causa sale primero; todas dicen DEMO |
| ⬜ G3.3 | S3 | Textos finales ES-EC y EN, sin promesas falsas (revisar contra la sección 2) | 0,5 | — | Revisado por Beto |
| ⬜ G4.1 | S4 | Pulido: móvil, foco visible, contraste y estados de error | 1,0 | G3.* | El recorrido completo se lee bien en el celular |
| ⬜ G4.2 | S4 | Guion del video de 170 s, ajustado a lo que de verdad funciona | 0,75 | — | Guion final cronometrado |
| ⬜ G4.3 | S4 | Borrador de Devpost en inglés: problema, solución, cómo funciona, uso de IA, qué sigue | 0,75 | — | Borrador revisado por Beto |
| ⬜ G5.1 | S5 | **Grabar el video** sobre la URL pública: pago real, IA, mango, aporte y un caso pendiente | 1,5 | B4.5 | < 3 min, sin secretos en pantalla, narración o subtítulos EN |
| ⬜ G5.2 | S5 | Subir a YouTube como público, con subtítulos EN | 0,5 | G5.1 | El enlace abre desde una ventana de incógnito |
| ⬜ G5.3 | S5 | Completar los campos de Devpost: imágenes, enlaces y herramientas usadas | 0,75 | B5.2 | Todos los campos llenos |
| ⬜ G6.1 | S6 | Representante designado envía en Devpost y guarda el comprobante | 0,5 | Todo | Confirmación recibida antes de las 12:30 |

---

### 🟩 Beto · backend / PayPal / datos / QA

| ID | Sprint | Tarea | Est. | Dep. | Criterio de hecho |
|---|---|---|---|---|---|
| ⬜ B1.1 | S1 | **Fixtures tipados** del contrato v1: success, pending, cancelled, duplicate, ai_unavailable y donation_demo | 0,5 | S0.3 | Geovanny los renderiza; un test valida tipos, enums y nulls |
| ⬜ B1.2 | S1 | OAuth server-side contra `api-m.sandbox.paypal.com`, con `.env` y `.env.example` | 0,25 | S0.6 | Token obtenido sin exponer el secret |
| ⬜ B1.3 | S1 | `POST /api/orders`: el servidor fija $200 para venta y $1 para aporte, y el payee en servidor | 0,75 | B1.2 | Devuelve `approvalUrl`; ignora cualquier importe o payee que mande el navegador |
| ⬜ B1.4 | S1 | `POST /api/orders/:id/capture` + `GET /api/orders/:id` con verificación de COMPLETED, importe, moneda, payee y sesión | 1,0 | B1.3 | **CP1:** captura real con Personal EC, con captureId guardado |
| ⬜ B2.1 | S2 | Base persistente: ledger con `captureId` único, `purpose`, centavos y estados | 1,0 | S0.5 | Reiniciar el servidor no borra nada |
| ⬜ B2.2 | S2 | Idempotencia: doble clic, refresh y timeout no duplican; se consulta antes de reintentar | 0,5 | B2.1 | Un test demuestra que no hay duplicados |
| ⬜ B2.3 | S2 | Reglas: bruto, comisión observada (`seller_receivable_breakdown`), estimación EC (5,40% + $0,30), meta y escenario de retiro (0,50%, mínimo $10) | 0,75 | B2.1 | $200 → $188,90 estimados · 63% de $300 · test en verde |
| ⬜ B2.4 | S2 | `GET /api/dashboard`, `PATCH /api/goal` y stickers (uno por perfil, lugar e hito) | 0,75 | B2.3 | Sirve los mismos DTO que los fixtures |
| ⬜ B3.1 | S3 | Prompt del LLM con datos mínimos, sin nombres, correos ni direcciones | 0,5 | S0.4 | El prompt no lleva PII |
| ⬜ B3.2 | S3 | Validador de salida: JSON `{category, text, evidenceIds, assumptions}` y rechazo de cifras que no salieron de los cálculos | 0,75 | B3.1 | Un test inyecta una cifra inventada y la rechaza |
| ⬜ B3.3 | S3 | `POST /api/insights` con caché por firma de entradas, timeout y `aiStatus: unavailable` | 0,5 | B3.2 | Si se apaga el LLM, las cifras siguen visibles y se muestra el error IA |
| ⬜ B3.4 | S3 | `GET /api/causes?regionId=` con catálogo fijo de 3 causas DEMO | 0,25 | — | Ordena por región declarada |
| ⬜ B3.5 | S3 | Aporte de $1: Orders con `purpose=donation_demo`, aparte de las ventas | 0,5 | B1.4 | No suma a la meta ni da mango |
| ⬜ B4.1 | S4 | Deploy en el hosting elegido, con variables privadas y HTTPS | 1,0 | S0.5 | URL pública funcionando; el servidor de casa solo como respaldo |
| ⬜ B4.2 | S4 | Sesión aislada por visitante | 0,5 | B4.1 | Otra sesión no ve órdenes ajenas |
| ⬜ B4.3 | S4 | **Matriz QA:** venta, cancelación, pendiente, duplicado, timeout, LLM caído, aporte y privacidad | 0,75 | B4.1 | Tabla con los resultados en `docs/qa.md` |
| ⬜ B4.4 | S4 | Revisar secretos: nada en el repo ni en los logs, `.gitignore` correcto | 0,25 | — | `git grep` sin claves |
| ⬜ B4.5 | S4 | **Congelar funciones (21:30)** y etiquetar la versión candidata | — | B4.3 | Tag `v1.0-rc` |
| ⬜ B5.1 | S5 | README en inglés: qué es, cómo correrlo en sandbox, variables, arquitectura y limitaciones | 1,0 | B4.5 | Geovanny lo ejecuta siguiendo solo el README |
| ⬜ B5.2 | S5 | Repo público, licencia MIT y `.env.example` | 0,25 | B5.1 | GitHub detecta la licencia |
| ⬜ B5.3 | S5 | Apoyar la grabación: datos limpios en la demo, sin claves en pantalla | 0,5 | G5.1 | — |
| ⬜ B6.1 | S6 | Prueba externa: URL pública, repo y video desde incógnito | 0,5 | G5.2 | Los 3 enlaces abren sin sesión |

**Webhooks:** solo si sobra tiempo en S4 y el núcleo ya pasa la QA. No son obligatorios.

---

## 5. Revisiones (15 min al cierre de cada sprint)

| Revisión | Qué se muestra | Si falla |
|---|---|---|
| **CP1 · 12:00** | Captura real de $200 en sandbox con ID · UI con mocks | Beto sigue con el cobro como prioridad; Geovanny continúa con mocks |
| **CP2 · 15:30** | Venta real → ledger → meta → mango en la UI | Se recortan los extras de la UI y se sigue a S3 |
| **CP3 · 18:30** | Avisos LLM reales · aporte de $1 completado | Si la IA no está, se declara; nunca se finge |
| **CP4 · 21:30** | URL pública · QA en verde · funciones congeladas | Se documenta el bloqueo del deploy y se usa la contingencia: instrucciones completas para correrlo |
| **CP5 · 11:00 jue** | Video, README y Devpost listos | Solo se corrige lo que bloquea el envío |

---

## 6. Si nos atrasamos: orden de recorte

1. Variantes de texto Costa/Sierra
2. Animaciones y blur complejo
3. Webhooks
4. Extras del dashboard

**No se recorta:** pago verificado, persistencia, ES-EC/EN, LLM real, mango, aporte demo y pruebas.

---

## 7. Pendientes antes de arrancar

- [ ] Horas disponibles de los dos (S0.1)
- [ ] Stack existente en Cursor (S0.2)
- [ ] Acceso a un LLM (S0.4)
- [ ] Cuenta GitHub de Beto con `gh auth login` hecho (sirve también para Flota)
- [ ] Cuenta Devpost de los dos y elección del representante
- [ ] Credenciales sandbox (Business EC + Personal EC) en el `.env` de Beto, compartidas por un canal privado y nunca por el chat del grupo
