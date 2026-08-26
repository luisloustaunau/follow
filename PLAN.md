# ANMA Supervisión de Obras — Plan de Desarrollo
**Última actualización:** Agosto 20, 2026  
**Estado del sistema:** En producción (AWS + Vercel)  
**Stack:** React 19 / Vite · AWS Lambda (Node 20) · DynamoDB · S3

---

## ✅ / ❌ Estado del backlog (para presentación)

> ✅ = Implementado y en producción  
> 🔄 = Implementado, pendiente de deploy  
> ❌ = Pendiente  
> ⏳ = Diferido (backlog futuro)

### 🔐 ACC — Acceso y Autenticación

| ID | Tarea | Estado |
|---|---|---|
| ACC-001 | 2FA por correo/SMS | ❌ |
| ACC-002 | Recuperación de contraseña (self-service UI) | ⏳ requiere SES |
| ACC-003 | Flujo de asignación de roles y onboarding de usuario | ✅ |
| ACC-004 | Gestión de permisos específicos por correo | ✅ |
| ACC-005 | Búsqueda por nombre/mapa en la app | ❌ |
| — | JWT reducido de 30 días a 8 horas | ✅ |
| — | Aviso de sesión por expirar (banner 15 min antes) | ✅ |
| — | Auto-logout al expirar el token | ✅ |
| — | `POST /auth/register` restringido a owner (hueco cerrado) | ✅ |
| — | `GET /auth/users` — listado de usuarios (sin hashes) | ✅ |
| — | Cambiar rol de un usuario existente | ✅ |
| — | Activar / desactivar cuenta (login bloqueado) | ✅ |
| — | Restablecer contraseña desde la UI (admin define nueva) | ✅ |
| — | Protecciones: no auto-desactivarse, no auto-degradarse, mínimo un owner activo | ✅ |

### 🎨 D-I — Diseño e Interfaz

| ID | Tarea | Estado |
|---|---|---|
| D-I-001 | Logotipos oficiales ANMA en todas las páginas | ❌ |
| D-I-002 | Tipografía y tamaños de texto revisados | ❌ |
| D-I-003 | Versión tipográfica exhaustiva | ❌ |
| D-I-004 | Aviso de Privacidad visible en la app y PDFs | ✅ |

### ⚖️ LZ-S — Legalidad y Cumplimiento

| ID | Tarea | Estado |
|---|---|---|
| LZ-S-001 | Aviso de privacidad en todos los bloques de control | ✅ |
| LZ-S-002 | Registro INDAUTOR / propiedad intelectual del código | ❌ |
| LZ-S-003 | Estructura de datos contractuales del personal | ❌ |
| LZ-S-004 | Estructura de datos de obligaciones financieras | ❌ |

### ⚙️ TEC — Técnico y Rendimiento

| ID | Tarea | Estado |
|---|---|---|
| TEC-001 | CORS restringido al dominio de Vercel (no más `*`) | ✅ |
| TEC-002 | Documentar infraestructura de hosting y templates | ❌ |
| TEC-003 | Documento de proceso de actualizaciones del sistema | ❌ |
| TEC-004 | Componente base de plataforma de consultoría | ❌ |
| TEC-005 | Separación de roles en backend (middleware centralizado) | ❌ |
| TEC-006 | Módulo de cuotas operativas y envío de correos | ❌ |
| TEC-007 | Diagrama de cuatro operativas (arquitectura) | ❌ |
| TEC-008 | Límite de tipo y tamaño de fotos (JPEG/PNG/WEBP, 10 MB) | ✅ |
| TEC-009 | Validación de fechas/tablas en actualizaciones | ❌ |
| TEC-010 | Permisos obligatorios por contrato de roles | ❌ |
| — | Error boundaries en todas las páginas (pantalla blanca → mensaje útil) | ✅ |

### 🔧 FUN — Funcionalidad

| ID | Tarea | Estado |
|---|---|---|
| FUN-001 | Acceso por proyecto asignado (filtrado real por supervisor) | ❌ |
| FUN-002 | Notificaciones de alerta por proyecto (email) | ❌ |
| FUN-003 | Indicadores de color en estimaciones por estatus | ✅ |
| FUN-004 | Colores de datos de estimaciones enlazados a contratista | ❌ |
| FUN-005 | Historial de proyectos activos con importación de datos | ❌ |
| FUN-006 | Reporte mensual consolidado (físico + financiero) | ❌ |
| FUN-007 | Validación de configuración de estado por proyecto | ❌ |
| FUN-008 | Gráfico de avance semanal verificado con datos reales | ✅ |
| FUN-009 | Módulo de auditoría / historial de cambios | ❌ |
| FUN-010 | Modelo matemático de distribución (arquitectura formal) | ⏳ |
| — | Estatus PENDIENTE_DE_PAGO entre APROBADA y PAGADA | ✅ |
| — | Fecha de pago requerida para PAGADA y PENDIENTE_DE_PAGO (validación inline) | ✅ |
| — | "Por estimar" en rojo cuando es negativo (sobre-estimado) | ✅ |
| — | Separación Contrato/Estimado/Por estimar sin IVA vs con IVA | ✅ |
| — | Programa de Obra: montos reales (no auto-distribuidos) | ✅ |
| — | Programa mensual: montos reales (no auto-distribuidos) | ✅ |
| — | Semana 0 / Semana 1 fechas corregidas (off-by-one) | ✅ |
| — | Estatus de proyecto (Planeación / En progreso / Pausado / Completado) | ✅ |
| — | Dashboard: badge de estatus + barra de avance físico | ✅ |
| — | Dashboard: búsqueda por nombre/contratista/no. contrato | ✅ |
| — | Dashboard: filtro por estatus | ✅ |
| — | Página `/users`: alta de usuarios (solo owner) | ✅ |
| — | Panel de administración de usuarios completo | ✅ |

### 🗺️ ACT — Acciones Estratégicas

| ID | Tarea | Estado |
|---|---|---|
| ACT-001 | Solución digital paralela (no-app) para tabularizar proyectos | ⏳ |

---

## Estado del sistema (módulos en producción)

| Módulo | Estado |
|---|---|
| Login / sesión JWT | ✅ |
| Proyectos (crear, ver) | ✅ |
| Frentes de trabajo | ✅ |
| Programa de Obra (Semana / Fecha / $) | ✅ |
| Reportes semanales (físico + financiero) | ✅ |
| Gráfica programado vs. real (S-curve) | ✅ |
| Control de Estimaciones | ✅ |
| Programa mensual de estimaciones | ✅ |
| Totales sin/con IVA separados | ✅ |
| "Por estimar" = contrato sin IVA − estimado sin IVA | ✅ |
| PAGADA / PENDIENTE_DE_PAGO requieren fecha de pago | ✅ |
| Export PDF reportes | ✅ |
| Export PDF estimaciones | ✅ |
| Roles (owner / supervisor / billing) | ✅ |
| CORS restringido a Vercel | ✅ |
| Aviso de privacidad en footer | ✅ |
| Error boundaries (sin pantalla blanca) | ✅ |
| Fotos: solo JPEG/PNG/WEBP, máx 10 MB | ✅ |

---

## Backlog completo por categoría

> Fuente: Excel de backlog entregado (Aug 20, 2026).  
> Prioridades: **Alta / Media / Baja**  
> Esfuerzo estimado: **S** (< 2h) · **M** (2–8h) · **L** (1–3 días) · **XL** (> 3 días)

---

### 🔐 ACC — Acceso y Autenticación

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| ACC-001 | Implementar autenticación de 2 factores (2FA) por correo o contraseña y validación posterior por correo o SMS aprobado por Administración | Alta | L | Ref 21: Hay un código de ingreso de accesos |
| ACC-002 | **Establecer y clarificar el método de recuperación de contraseña en caso de olvido** | Alta | M | — (resaltado en amarillo) |
| ACC-003 | Definir el procedimiento claro para asignar roles y permisos y validar a nuevo usuario | Media | S | Ref 18: Asignar contraseña financiera |
| ACC-004 | Gestionar otras funciones del correo: la asignación de accesos específicos y permisos correctos | Media | S | Ref 22: Documentar el flujo de asignación actual |
| ACC-005 | Implementar búsqueda en los resultados: definir si con Mapa/ubicación con precio o búsqueda por nombre en la app | Baja | M | — |

#### Detalle técnico ACC-002 (prioritario)
**Situación actual:** El administrador puede restablecer la contraseña de cualquier usuario desde
`/users` (define una nueva y se la entrega por un canal seguro). Esto cubre la necesidad operativa
sin depender de correo.

**Pendiente (self-service):** para que el propio usuario recupere su contraseña sin intervención del
administrador se requiere AWS SES. Ver "Dependencia: AWS SES" más abajo.

**Solución propuesta:**
1. Backend: `POST /auth/forgot-password` → genera token de 1 hora, guarda hash en DynamoDB, envía email via SES
2. Backend: `POST /auth/reset-password` → valida token, actualiza `passwordHash`
3. Frontend: página `/forgot-password` + página `/reset-password?token=xxx`
4. AWS SES: configurar dominio `anma.mx` como sender verificado

---

### 🔑 Módulo de administración de usuarios (implementado)

**Modelo:** las cuentas **solo las crea el administrador (`owner`)**. No hay registro público.
El rol se asigna en el alta y puede cambiarse después.

| Endpoint | Permiso | Descripción |
|---|---|---|
| `POST /auth/register` | owner | Crea cuenta con rol. Excepción: si no existe ningún usuario, se permite el primer alta (bootstrap) |
| `GET /auth/users` | owner | Lista usuarios. Nunca devuelve `passwordHash` |
| `PUT /auth/users/{email}` | owner | Cambia rol y/o activa/desactiva la cuenta |
| `POST /auth/users/{email}/reset-password` | owner | Define una contraseña nueva |

**Protecciones:**
- Cuenta desactivada → login rechazado aunque la contraseña sea correcta
- El owner no puede desactivarse ni degradarse a sí mismo
- El sistema impide dejar cero administradores activos
- Contraseña mínima de 8 caracteres; correo duplicado rechazado con mensaje claro
- Se registra `createdBy`, `updatedBy` y `lastPasswordResetBy` para trazabilidad

**Sobre las contraseñas:** se guardan con hash `bcrypt`, que es irreversible. Ni el administrador ni
el sistema pueden leerlas. Por eso la operación disponible es *restablecer*, no *consultar*. Esto
protege al usuario (reutiliza contraseñas en otros servicios), evita responsabilidad legal ante la
LFPDPPP, y mantiene el no repudio: si nadie más conoce la contraseña, las acciones registradas bajo
esa cuenta son atribuibles a su titular.

**Desactivar en vez de borrar:** eliminar un usuario dejaría huérfanas las referencias `createdBy` /
`lastEditedBy` en reportes y estimaciones. Para un sistema que respalda facturación de obra conviene
conservar quién hizo qué.

---

### 📧 Dependencia: AWS SES (pendiente)

**Qué es:** Simple Email Service, el servicio de AWS para enviar correo desde el backend.
Hoy las Lambdas no pueden enviar correo.

**Qué bloquea:** ACC-002 (recuperación self-service), ACC-003 en su versión por invitación
(el usuario define su propia contraseña) y FUN-002 (notificaciones).

**Qué se requiere:**
1. Verificar el dominio `anma.mx` en SES → agregar registros DNS (DKIM + SPF). Requiere acceso al
   panel DNS de ANMA.
2. Salir del *sandbox* de SES (solicitud a AWS, ~1 día) para poder enviar a cualquier destinatario.
3. Permiso `ses:SendEmail` en `template.yaml` + helper `src/lib/ses.ts` (~1 h de desarrollo).

**Costo:** ~$0.10 USD por cada 1,000 correos.

**Alternativa mientras tanto (en uso):** el administrador define la contraseña desde `/users` y la
entrega en persona o por canal seguro. No requiere correo.

---

### 🎨 D-I — Diseño e Interfaz

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| D-I-001 | Incorporar los logotipos oficiales en ANMA: definir en el logo a partir de Maquetación con precio a tener en las páginas | Baja | S | Ref 28: Identidad corporativa e integrales |
| D-I-002 | Crear versión tipográfica adecuada en todos los textos, tamaño y etiquetas de los textos | Media | S | Ref 66: Construcción de todas las páginas |
| D-I-003 | Realizar una versión tipográfica exhaustiva en todos los textos, tamaño y etiquetas de los textos | Media | S | — |
| D-I-004 | Implementar el Aviso de Privacidad visible dentro de la app, tablero tablero dentro de la app/PDF algún texto firmado | Alta | S | Ref 7: Obligación legal de protección de datos |

#### Detalle técnico D-I-004 (legal, prioritario)
Agregar pie de página en la app y en todos los PDFs con:
> *"La información contenida en este sistema es confidencial y propiedad de ANMA Ingeniería. Uso exclusivo para supervisión de obra. Protección de datos: Ley Federal de Protección de Datos Personales en Posesión de los Particulares."*

---

### ⚖️ LZ-S — Legalidad y Cumplimiento

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| LZ-S-001 | Implementar el Aviso de P-Fundación visible dentro de la app, tablero dentro de los bloques de control, tablero dentro de la Consultoría para | Alta | M | Ref 7: Obligación legal de protección en datos |
| LZ-S-002 | **Investigar el código básico, operativo y código de asistencia aprobada registrado a los documentos de control para** | Alta | M | (resaltado en amarillo) Ref 7: Propiedad intelectual del código |
| LZ-S-003 | Definir y estructurar la estructura de datos técnicos y clave de Contratista específicos como control del contrato del personal | Alta | M | Ref 7: Certeza jurídica del proyecto |
| LZ-S-004 | Definir e incorporar la estructura de datos técnicos y clave de datos financieros específicos como control de obligaciones contractuales | Alta | M | Ref 34: Control de obligaciones contractuales |

#### Detalle técnico LZ-S-002
El backlog indica revisar si el código fuente debe registrarse como obra intelectual. Acción:
1. Documentar la autoría en todos los archivos fuente con header ANMA
2. Revisar si aplica registro ante INDAUTOR
3. Definir política de confidencialidad del repositorio (actualmente público en GitHub → considerar privado)

---

### ⚙️ TEC — Técnico y Rendimiento

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| TEC-001 | Funcionar los procesos de cifrado de información dentro de la plataforma vía HTTPS (cómo se manda la información) | Alta | S | Ref 30: No uso de canales de negocio técnico |
| TEC-002 | Comprender y diagnosticar el sistema de Templates (Hosting vía contenido y cómo se manda la información) | Media | M | Ref 1: A proceso de infraestructura |
| TEC-003 | Desarrollar y enfocar el Documento "Proceso de Actualizaciones de la App junto con los sistemas operativos del equipo" (GRNAS) | Media | M | Ref 17: Documentación clave como mantenimiento |
| TEC-004 | Desarrollar el componente base de la plataforma de la consultoría de datos | Media | M | Ref 28: Validación de mecanismos red |
| TEC-005 | Definir e implementar bouncer para la separación de roles y cobro de permisos para el nivel obligó y base de datos | Media | L | Ref 78: Regulador lógico interno |
| TEC-006 | Desarrollar el módulo de cuotas operativas (coberturas, actualizaciones, funcionamiento y envío de correos) | Media | L | Ref 78: Validar límites con el/su equipo |
| **TEC-007** | **Evaluar y diagramar la estructura en cuatro operativas (coberturas, actualizaciones, funcionamiento y envío de correos)** | Media | M | (resaltado en amarillo) Ref 79: Acceso de limitaciones con el/su equipo |
| TEC-008 | ¿Cuál es el límite de la tabla en MB para la búsqueda de los reportes semanales y qué formas usan (JP1, PNG)? | Baja | S | Ref 31: Respuesta |
| TEC-009 | Justificación o refuta con respecto: fechas/tabl actualizando datos o variables en base a una tabla de los datos en la consultoría | Alta | M | Ref 31: Respuesta |
| TEC-010 | Agregar permisos obligatorios al contrato "Buen uso de los roles": Supervisión y "Superintendencia Responsable", e integrarlo al Anunciador | Alta | M | Ref 7: Resoluciones reductivas de roles y títulos |

#### Detalle técnico TEC-001 (HTTPS/CORS)
**Situación actual:** `Access-Control-Allow-Origin: *` en todos los responses Lambda.  
**Solución:** Restringir a solo el dominio de Vercel:
```typescript
// backend/src/lib/response.ts
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://frontend-beta-two-86.vercel.app';
'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
```
Agregar `ALLOWED_ORIGIN` como variable de entorno en `template.yaml`.

#### Detalle técnico TEC-005 (Separación de roles en backend)
**Situación actual:** Los roles se validan en algunos handlers pero no sistemáticamente. Supervisors pueden leer proyectos de otros.  
**Solución:** Middleware de autorización centralizado en `src/middleware/` que verifique rol + ownership antes de cada operación de escritura.

#### Detalle técnico TEC-007 (Cuatro operativas — arquitectura)
Las cuatro operativas que necesitan diagrama:
1. **Coberturas** — qué datos están en DynamoDB vs. S3
2. **Actualizaciones** — flujo de deploy: tsc → sam build → sam deploy
3. **Funcionamiento** — flujo de una sesión de usuario: Login → JWT → API Gateway → Lambda → DynamoDB
4. **Envío de correos** — SES para reset de contraseña + notificaciones futuras

#### Detalle técnico TEC-008 (Límites de tabla/fotos)
- **DynamoDB:** ítem máximo 400 KB. Los reportes guardan solo `string[]` de keys S3, no las fotos en sí. ✅ No hay problema.
- **S3:** sin límite práctico. Las fotos se sirven via presigned URL.
- **Fotos:** actualmente se aceptan cualquier tipo. Recomendación: limitar a JPEG/PNG/WEBP, máximo 10 MB por foto en el frontend.

---

### 🔧 FUN — Funcionalidad

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| FUN-001 | Implementar el Método de Acceso Funcional por Proyecto asignado (con DIV1 propuesto con DIV1) | Alta | M | Ref 11: Control operativo por perfil |
| FUN-002 | Desarrollar un sistema de alertas tipo notificación por proyecto para nivelar entre planes parciales o vacíos | Media | M | Ref 4: Avisar actuaciones de alertas provisionales |
| FUN-003 | Permitir la notificación de colores de la barra básica o ingreso de la sección y/o otros campos en los objetos de datos financiero | Media | S | Ref 28: Predicción en el sector financiero |
| FUN-004 | Enlazar los colores de datos en las estimaciones en Supervisión y a todas las cuentas obligadas con los datos en Contratista | Media | M | Ref 3: Lógica del negocio de la operación |
| FUN-005 | Incorporar en Proyecto básico (casi uso paso por paso de la base de proyectos activos, con capacidad de importar Experiencia · $OME) | Alta | L | Ref 22: Construcción contable anual |
| FUN-006 | Desarrollar e integrar un Reporte Mensual básico con un bloque con datos financieros controlados por cada mes (Estimaciones · $OME) | Media | L | Ref 22: Construcción contable anual |
| FUN-007 | Revisar la configuración y calcul del estado que existe en la sección Objetivos por cual proyecto nuevo campo según el cual | Media | M | Ref 16 y reg: validación de datos |
| FUN-008 | Funcionar el gráfico de avance semanal como verificación del forma previa (los datos principales, se un controles en el sistema) | Media | M | Ref 11: Flujo operativo básico |
| FUN-009 | Implementar un módulo de sistemas de control (2 y de auditoría) para salvar que el usuario manda y cambia en el sistema | Alta | L | Ref 9: Historial de Cambios |
| **FUN-010** | Buscar un modelo matemático formal (Prev y Contras) para desplegar una solución digital o nos App para tabularizar el proyecto. | Media | XL | Ref 9: Definición previa de la arquitectura de distribución |

#### Detalle técnico FUN-001 (Acceso por proyecto asignado)
**Situación actual:** El `supervisor` puede ver todos los proyectos y frentes. No hay campo `supervisorId` funcional que filtre datos.  
**Solución:**
1. En `USER` item de DynamoDB, agregar campo `assignedFronts: string[]`
2. En `GET /fronts/:frontId/reports`, verificar si `user.role === 'supervisor'` → exigir que `frontId` esté en `user.assignedFronts`
3. En `GET /projects`, filtrar retorno por fronts asignados si rol = supervisor
4. En la UI: formulario de asignación en la pantalla de usuario (solo owner)

#### Detalle técnico FUN-006 (Reporte mensual)
Actualmente existe el Control de Estimaciones por mes. Lo que falta:
- Resumen mensual consolidado: programado físico + real físico + estimado + pagado por mes
- Botón "Exportar reporte mensual PDF" que genere una hoja similar al Excel de Control de Estimaciones

#### Detalle técnico FUN-009 (Historial de cambios / auditoría)
**Implementación mínima:**
- Agregar `lastEditedBy`, `lastEditedAt`, `editHistory: [{by, at, field, from, to}]` en los items críticos (estimaciones, reportes)
- En el frontend: sección colapsable "Historial" en detalle de estimación y reporte

---

### 🗺️ ACT — Acciones Estratégicas

| ID | Tarea | Prioridad | Esfuerzo | Referencia backlog |
|---|---|---|---|---|
| ACT-001 | Buscar un modelo matemático formal (Prev y Contras) para desarrollar una solución Digital o Paper, no App para tabularizar el proyecto | Media | XL | Ref 9: Definición previa de la arquitectura de distribución |

---

## Roadmap de ejecución

### 🔴 Sprint 1 — Estabilidad y acceso (Semana 1–2, ~16h)
Bloqueos actuales que impiden uso real en producción.

| ID | Tarea | Esfuerzo | Responsable |
|---|---|---|---|
| ACC-002 | Recuperación de contraseña (UI + backend + SES) | M (6h) | Dev |
| TEC-001 | Restringir CORS al dominio de Vercel | S (1h) | Dev |
| P4 | Error boundaries y estados de error en todas las páginas | M (4h) | Dev |
| D-I-004 | Aviso de privacidad en footer y PDFs | S (2h) | Dev |
| ACC-001 | JWT: reducir a 8h + refresh token silencioso | M (4h) | Dev |

---

### 🟡 Sprint 2 — Roles y permisos robustos (Semana 3–4, ~20h)
Habilitar uso multi-usuario real (varios supervisores).

| ID | Tarea | Esfuerzo | Responsable |
|---|---|---|---|
| FUN-001 | Asignación de frentes a supervisores + filtrado backend | L (12h) | Dev |
| TEC-005 | Middleware de autorización centralizado | L (8h) | Dev |
| ACC-003 | Flujo de onboarding de nuevo usuario (owner invita, usuario activa) | M (6h) | Dev |

---

### 🟢 Sprint 3 — Funcionalidad financiera completa (Semana 5–6, ~20h)
Completar el ciclo de estimaciones y reportes para que sea equivalente al Excel.

| ID | Tarea | Esfuerzo | Responsable |
|---|---|---|---|
| FUN-006 | Reporte mensual consolidado (físico + financiero) | L (10h) | Dev |
| FUN-003 | Indicadores de color en estimaciones (rojo/amarillo/verde por estatus y cumplimiento) | S (3h) | Dev |
| FUN-008 | Verificar que el gráfico S-curve funcione con datos reales de ANMA | M (4h) | Dev |
| TEC-008 | Limitar tipo/tamaño de fotos en el frontend (JPEG/PNG, máx 10MB) | S (2h) | Dev |

---

### 🔵 Sprint 4 — Auditoría y notificaciones (Semana 7–8, ~16h)

| ID | Tarea | Esfuerzo | Responsable |
|---|---|---|---|
| FUN-009 | Historial de cambios en estimaciones y reportes | L (10h) | Dev |
| FUN-002 | Notificaciones por email (estimación en revisión, reporte enviado) via SES | L (8h) | Dev |
| TEC-003 | Documento de proceso de actualizaciones del sistema | S (2h) | Dev |

---

### ⚪ Backlog futuro (sin sprint asignado)

| ID | Tarea | Razón de diferir |
|---|---|---|
| ACC-001 | 2FA completo (SMS/TOTP) | Requiere definir proveedor (SNS/Twilio) |
| TEC-007 | Diagrama de cuatro operativas | Requiere sesión de arquitectura con ANMA |
| FUN-010 | Modelo matemático de distribución | XL — requiere definición funcional detallada |
| LZ-S-002 | Registro INDAUTOR del código fuente | Requiere decisión legal/administrativa |
| ACT-001 | Solución digital paralela (no-app) | Indefinido — pendiente de definición estratégica |

---

## Arquitectura actual (referencia)

```
Usuario (Browser)
    │ HTTPS
    ▼
Vercel (React SPA)
    │ fetch + JWT Bearer
    ▼
API Gateway (us-east-1)
    │
    ├── /auth/**            → AuthFunction       (Lambda)
    ├── /projects/**        → ProjectsFunction   (Lambda)
    ├── /projects/**/fronts → FrontsFunction     (Lambda)
    ├── /fronts/**/reports  → ReportsFunction    (Lambda)
    ├── /fronts/**/schedule → ScheduleFunction   (Lambda)
    ├── /projects/**/estimations → EstimationsFunction (Lambda)
    ├── /fronts/**/upload-url    → UploadsFunction     (Lambda)
    ├── /**/pdf             → PdfFunction        (Lambda, 30s, 1GB)
    └── /reports, /estimations → GlobalsFunction (Lambda)
         │
         ├── DynamoDB: anma-follow (single table, PAY_PER_REQUEST)
         │   GSI1: tipo de entidad (PROJECT / FRONT / REPORT / ESTIMATION)
         └── S3: anma-photos-439326782883
             fotos de reportes + PDFs generados
```

### Modelo de datos DynamoDB (single table)

| Entidad | PK | SK |
|---|---|---|
| Usuario | `USER#email` | `#META` |
| Proyecto | `PROJECT#id` | `#META` |
| Frente | `PROJECT#projectId` | `FRONT#frontId` |
| Semana del programa | `FRONT#frontId` | `SCHED#W001` |
| Reporte semanal | `FRONT#frontId` | `REPORT#001` |
| Estimación | `PROJECT#projectId` | `ESTIMATION#YYYY-MM#id` |
| Programa mensual | `PROJECT#projectId` | `MONTHPROG#YYYY-MM` |

### Roles y permisos

| Acción | owner | supervisor | billing |
|---|---|---|---|
| Ver todos los proyectos | ✅ | ✅ (solo asignados — pendiente FUN-001) | ✅ |
| Crear / editar proyecto | ✅ | ❌ | ❌ |
| Crear frente | ✅ | ❌ | ❌ |
| Editar programa de obra | ✅ | ❌ | ❌ |
| Enviar reporte semanal | ✅ | ✅ | ❌ |
| Crear estimación | ✅ | ❌ | ✅ |
| Actualizar estatus estimación | ✅ | ❌ | ✅ |
| Ver estimaciones | ✅ | ✅ | ✅ |
| Exportar PDF | ✅ | ✅ | ✅ |

---

## Variables de entorno

### Backend (AWS SSM / template.yaml)
| Variable | Valor actual | Notas |
|---|---|---|
| `TABLE_NAME` | `anma-follow` | Auto-injected por SAM |
| `BUCKET_NAME` | `anma-photos-439326782883` | Auto-injected por SAM |
| `JWT_SECRET` | `[secreto]` | Cambiar antes de go-live real |
| `ALLOWED_ORIGIN` | *(pendiente)* | Agregar en Sprint 1 |

### Frontend (Vercel env vars)
| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://jwil5lum73.execute-api.us-east-1.amazonaws.com/Prod` |

---

## Comandos clave

```bash
# Deploy backend
cd backend && npm run deploy
# (tsc → sam build → sam deploy con samconfig.toml)

# Reset de contraseña (admin)
cd backend && node scripts/reset-password.mjs email@anma.mx 'NuevaContraseña!'

# Re-seed datos de prueba
cd backend && npm run seed

# Frontend local
cd frontend && npm run dev

# Typecheck sin compilar
cd backend && npm run typecheck
```

---

## Información de acceso (producción)

| Recurso | Valor |
|---|---|
| App URL | https://frontend-beta-two-86.vercel.app |
| API URL | https://jwil5lum73.execute-api.us-east-1.amazonaws.com/Prod |
| AWS Account | 439326782883 |
| AWS Region | us-east-1 |
| Stack | anma-follow |
| DynamoDB table | anma-follow |
| S3 Bucket | anma-photos-439326782883 |
| Login owner | luis@anma.mx / anma2026! |
