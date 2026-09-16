# Issues y Mejoras - Turnex CRM Deportivo

**Fecha:** 2026-09-16  
**Estado actual:** Deploy funcionando en Vercel con Supabase real

---

## 📋 Resumen Ejecutivo

El CRM está **funcionando en producción** con:
- ✅ Base de datos real (Supabase PostgreSQL)
- ✅ Autenticación con middleware de protección de rutas
- ✅ CRUD completo: Personas, Espacios, Reservas, Cobros, Accesos
- ✅ Dashboard con KPIs reales y alertas automáticas
- ✅ Búsqueda global (⌘K), Toasts, Modo Kiosco
- ✅ Seed de datos de prueba cargado

---

## 🔴 Críticos (Bloquean operación real)

| # | Issue | Descripción | Esfuerzo |
|---|-------|-------------|----------|
| 1 | **Auth real para staff** | Crear usuarios en `usuario_staff` con `auth_user_id` vinculado a Supabase Auth. Hoy no hay ninguno. | 30 min |
| 2 | **RLS Policies en Supabase** | Row Level Security para que recepción no borre pagos, solo admin ve reportes financieros, etc. | 1 h |
| 3 | **Cierre de caja diario** | Cuadrar efectivo/transferencias al final del día, reporte para contabilidad. | 2 h |

---

## 🟡 Alta Prioridad (Valor inmediato)

| # | Mejora | Descripción | Esfuerzo | Valor para cliente |
|---|--------|-------------|----------|-------------------|
| 4 | **Cuotas auto-generadas (cron mensual)** | pg_cron en Supabase que crea cuotas el día 1 de cada mes según plan de cada socio. | 30 min | Elimina trabajo manual mensual |
| 5 | **Recordatorios automáticos (WhatsApp/Email)** | 3 días antes del vencimiento + día del vencimiento + moroso. Reduce morosidad sin perseguir. | 2 h | Impacto directo en ingresos |
| 6 | **PDF Carnets QR imprimibles** | Generar PDF lista para imprimir (pdf-lib + qrcode) con código único por socio. | 1 h | Profesionalismo, control acceso |
| 7 | **MercadoPago Checkout + Webhook** | Pago online de cuotas y señas. Webhook confirma y actualiza estado automático. | 3 h | Socios pagan solos, menos caja |
| 8 | **Modo Kiosco mejorado** | Lector QR real (cámara), sonido confirmación, modo offline con sync posterior. | 2 h | Recepción más rápida |

---

## 🟢 Media Prioridad (Calidad y Escalabilidad)

| # | Mejora | Descripción | Esfuerzo |
|---|--------|-------------|----------|
| 9 | **Tests E2E (Playwright)** | Flujos críticos: login, crear reserva, cobrar cuota, check-in, logout. | 4 h |
| 10 | **CI/CD GitHub Actions** | Lint + TypeScript + Tests + Build + Deploy preview en cada PR. | 1 h |
| 11 | **Drag & Drop en calendario reservas** | Mover reservas arrastrando, resize para cambiar duración. | 3 h |
| 12 | **Exportar reportes CSV/Excel** | Ingresos mensuales, ocupación, morosidad, caja diaria. | 2 h |
| 13 | **Filtros persistentes en URL** | Que al recargar mantenga fecha, cancha, filtros activos. | 1 h |
| 14 | **Búsqueda global mejorada** | Indexado completo, resultados en tiempo real, accesos directos. | 1 h |
| 15 | **Multi-sede (preparación)** | Agregar `sede_id` a todas las tablas, selector en header. | 2 h |

---

## 🔵 Baja Prioridad / Nice to Have

| # | Mejora | Cuándo tiene sentido |
|---|--------|---------------------|
| 16 | **PWA (offline, install)** | Si usan tablets sin red estable en canchas |
| 17 | **App móvil nativa (React Native / Expo)** | Cuando socios pidan reservar solos desde el celular |
| 18 | **Facturación AFIP (wsfe)** | Cuando facturen > $X/mes o lo exija contador |
| 19 | **Portal del socio** | Reservar, ver cuenta corriente, descargar comprobantes |
| 20 | **Notificaciones push** | Recordatorios en app móvil |
| 21 | **API pública / Webhooks** | Integraciones con otros sistemas (contabilidad, marketing) |

---

## 🏗️ Deuda Técnica / Arquitectura

| # | Item | Descripción |
|---|------|-------------|
| T1 | **Middleware de autenticación** | ✅ Implementado - protege rutas dashboard y portal |
| T2 | **Server Actions vs API Routes** | Mezcla actual - estandarizar en Server Actions para mutaciones |
| T3 | **Validación Zod en formularios** | Parcial - completar en todos los forms |
| T4 | **Error Boundaries React** | Faltan - agregar para graceful degradation |
| T5 | **Logging/Observabilidad** | Solo console.log - agregar Sentry o similar |
| T6 | **Cache/Revalidación Next.js** | Usar `revalidatePath` / `revalidateTag` en mutaciones |
| T7 | **Tipos TypeScript estrictos** | ✅ `strict: true` - mantener |

---

## 🎯 Para presentar al cliente - Priorización sugerida

### Sprint 1 (Semana 1) - **Operación diaria**
1. Auth staff real + RLS
2. Cuotas auto-generadas (cron)
2. Cierre de caja diario

### Sprint 2 (Semana 2) - **Cobranza automática**
4. Recordatorios WhatsApp/Email
5. MercadoPago integración
6. PDF Carnets QR

### Sprint 3 (Semana 3) - **Calidad y escalabilidad**
7. Tests E2E + CI/CD
8. Drag & drop calendario
9. Exportar reportes

### Sprint 4+ - **Diferenciadores**
10. Portal socio + App móvil
11. Multi-sede
12. Facturación AFIP

---

## 💰 Estimación de Costos (horas de desarrollo)

| Fase | Horas | Comentario |
|------|-------|------------|
| Críticos | ~4 h | Bloquean operación real |
| Alta prioridad | ~11 h | ROI inmediato (menos morosidad, más caja) |
| Media prioridad | ~13 h | Calidad, escalabilidad |
| Baja prioridad | ~20+ h | Diferenciadores futuros |
| Deuda técnica | ~8 h | Mantenibilidad a largo plazo |
| **Total** | **~36 h** | **~4-5 sprints de 1 semana** |

---

## 🤔 Preguntas para el Cliente

1. **¿Cuántos staff reales tendrán acceso?** (Define cuántos usuarios crear en Auth)
2. **¿Usan WhatsApp Business API o prefieren Email?** (Para recordatorios)
3. **¿Ya tienen cuenta MercadoPago como comercio?** (Para activar pagos online)
3. **¿Necesitan facturar (AFIP) ya o en 6 meses?**
4. **¿Cuántas sedes tienen o planean?** (Si >1, priorizar multi-sede)
5. **¿Los socios piden reservar desde el celular?** (Define prioridad portal/app)
6. **¿Tienen impresora térmica para carnets?** (Define formato PDF)
7. **¿Qué reportes necesita el contador mensualmente?**

---

## 📦 Estado Actual del Deploy

- **URL Producción:** `https://turnex-santiagomalak.vercel.app`
- **Kiosco Recepción:** `https://turnex-santiagomalak.vercel.app/kiosco`
- **Base de Datos:** Supabase (PostgreSQL) - Región São Paulo
- **Auth:** Supabase Auth + Middleware Next.js
- **Último Deploy:** Commit `ea6a6fa` - Auth middleware + logout fijo

---

## 🚀 Próximos Pasos Inmediatos (Esta semana)

1. **Crear usuarios staff en Supabase Auth** → invitar por email
2. **Ejecutar RLS policies SQL** (ver `supabase/rls-policies.sql`)
3. **Activar pg_cron para cuotas mensuales** (1 query SQL)
4. **Probar flujo completo:** login → dashboard → crear reserva → cobrar → check-in kiosco → logout