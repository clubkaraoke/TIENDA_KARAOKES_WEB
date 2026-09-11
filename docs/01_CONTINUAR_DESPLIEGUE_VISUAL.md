# CONTINUAR AQUÍ — DESPLIEGUE VISUAL BUYKARAOKE / TOP PERÚ

Fecha: 2026-09-11

## Estado confirmado

La primera versión funcional del frontend ya fue programada en esta rama:

`feature/buykaraoke-medusa-top-peru-frontend-20260911`

El storefront está en `apps/storefront` y usa Next/TypeScript + Medusa.

### Flujo ya preparado

- DEMO sin abandonar el catálogo.
- El frontend envía `id_cancion` a la API TOP PERÚ.
- La API devuelve `audioUrl + cdgUrl` temporales.
- Se construye la entrada para `CDG_PLAYER_ONLINE`.
- El reproductor se abre dentro de un modal y se puede cerrar para seguir en el listado.
- El frontend NO conoce Sheet Maestro, Dropbox, RSA ni rutas privadas.
- AGREGAR usa `addToCart()` real de Medusa.
- Carrito, checkout, cuenta, pedidos, pagos y descargas digitales existentes en Medusa se mantienen.
- Para comercio: `variant.sku = ID_CANCION`.

## NO HACER TODAVÍA

NO importar masivamente los ~2,890 productos TOP PERÚ a Medusa hasta que el usuario apruebe visualmente el frontend.

NO inventar precios. El handoff original no define precio comercial final.

NO rehacer RSA V2, Apps Script v82, Dropbox, corte físico 60 s ni CDG_PLAYER_ONLINE.

## SIGUIENTE PASO EXACTO

1. Desplegar esta rama en una URL de prueba.
2. Configurar las URLs reales en:
   - `NEXT_PUBLIC_TOP_PERU_DEMO_API_BASE`
   - `NEXT_PUBLIC_CDG_PLAYER_URL`
3. Abrir la web en navegador y hacer smoke visual real.
4. Probar el flujo con `DJG-1K54WE5`:

`buscar DJG-1K54WE5 → DEMO → OVH → Maestro → Dropbox → corte 60 s → Player → cerrar → seguir en listado`

5. Mostrar al usuario la URL de prueba para aprobación visual.
6. Solo después de aprobar diseño y DEMO, definir precio real e importar los productos TOP PERÚ a Medusa.

## Regla de continuidad

Antes de tocar código, verificar el estado real de esta rama y continuar desde aquí. No volver a diseñar desde cero ni sustituir el flujo TOP PERÚ ya resuelto.
