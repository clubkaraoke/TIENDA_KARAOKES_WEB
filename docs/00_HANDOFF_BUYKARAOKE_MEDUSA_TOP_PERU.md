# HANDOFF — TIENDA KARAOKES WEB

## BuyKaraoke UX + Medusa + TOP PERÚ Demo

**Estado:** especificación funcional aprobada para continuar implementación.

## 1. Objetivo

Construir la nueva tienda digital de karaokes DJGABO usando:

- **Medusa v2 + Digital Products** como motor de comercio.
- **BuyKaraokeDownloads.com** solamente como referencia de UX/flujo visual.
- **TOP PERÚ** como catálogo/datos para los karaokes peruanos.
- El backend de demos ya construido en OVH para reproducir muestras seguras de 60 segundos.

No se debe clonar Magento, código, branding, textos, imágenes ni assets propietarios de BuyKaraokeDownloads. Lo que se replica es la filosofía de UX: catálogo compacto, reproducción rápida y compra sin interrumpir la navegación.

---

## 2. Regla principal de arquitectura

**Medusa sigue siendo el cerebro de la tienda.**

El frontend inspirado en BuyKaraoke solo reemplaza la capa visual y de interacción.

```text
FRONTEND DJGABO (estilo/UX BuyKaraoke)
            |
            +--> búsqueda / catálogo
            +--> demo
            +--> agregar al carrito
            +--> carrito
            |
            v
        MEDUSA V2
            |
            +--> cliente
            +--> carrito
            +--> checkout
            +--> pago
            +--> order
            +--> historial
            +--> Mis Karaokes
            +--> descargas protegidas
```

No crear un segundo sistema de pedidos, pagos o descargas.

---

## 3. Backend TOP PERÚ ya resuelto y probado

El otro flujo técnico ya está terminado. No rehacerlo.

```text
Maestro TOP PERÚ ✅
   ↓
RSA V2 ✅
   ↓
Apps Script v82 ✅
   ↓
Dropbox ✅
   ↓
CDG + audio ✅
   ↓
corte físico 60 s ✅
   ↓
sesión demo segura ✅
```

Flujo funcional esperado desde el storefront:

```text
Web TOP PERÚ
   ↓
usuario pulsa DEMO
   ↓
frontend envía ID_CANCION
   ej: DJG-1K54WE5
   ↓
API OVH crea sesión demo
   ↓
consulta Maestro TOP PERÚ
   ↓
resuelve archivos privados en Dropbox
   ↓
genera/usa corte físico de 60 s
   ↓
devuelve URLs temporales
   audioUrl + cdgUrl
   ↓
frontend carga CDG_PLAYER_ONLINE
   ↓
cliente ve + escucha el karaoke dentro de la tienda
```

### Regla de seguridad

El frontend **NO** debe consultar directamente:

- Google Sheet Maestro
- Dropbox privado
- rutas físicas de archivos
- credenciales

El storefront solo debe hablar con la API autorizada de OVH y trabajar con el identificador lógico `ID_CANCION`.

---

## 4. Identificador de integración

Para cada karaoke TOP PERÚ, el identificador canónico para solicitar demo es:

```text
ID_CANCION
```

Ejemplo:

```text
DJG-1K54WE5
```

El frontend no debe deducir nombres de archivo ni construir rutas de Dropbox.

---

# 5. UX aprobada inspirada en BuyKaraoke

## Principio central

La tienda debe sentirse como un catálogo rápido:

```text
BUSCAR
  ↓
VER MUCHAS CANCIONES
  ↓
▶ ESCUCHAR / VER DEMO SIN SALIR
  ↓
🛒 AGREGAR SIN SALIR
  ↓
SEGUIR BUSCANDO
  ↓
ABRIR CARRITO CUANDO EL CLIENTE QUIERA
  ↓
CHECKOUT MEDUSA
```

Evitar tarjetas enormes, páginas innecesarias y pasos intermedios.

---

## 6. Header aprobado

Header compacto y persistente:

```text
DJGABO                         CUENTA     🛒 0
------------------------------------------------
INICIO | NUEVOS | TOP | GÉNEROS | PACKS | PEDIR CANCIÓN
------------------------------------------------
🔎 Busca canción, artista o grupo...
```

### Queda

- Logo DJGABO.
- Cuenta.
- Carrito visible con contador.
- Menú horizontal simple.
- Buscador protagonista.

### No queda

- doble carrito/sidebar.
- login grande metido en Home.
- navegación duplicada.
- elementos Magento.

---

# 7. Buscador

BuyKaraoke obliga a escoger `By Artist` o `By Song` y solo busca al enviar.

Nuestra versión debe ser más sencilla:

```text
🔎 Busca canción, artista o grupo...
```

El usuario no debería tener que decidir previamente si busca artista o canción.

### Resultado deseado

```text
ARTISTAS
Armonía 10
Ver todos →

CANCIONES
▶ Cervecero        Armonía 10      S/ X     🛒 AGREGAR
▶ Mix Cervecero    Grupo X         S/ X     🛒 AGREGAR
```

### Estado en URL

Conservar búsqueda/paginación en URL para que Back restaure resultados:

```text
/buscar?q=armonia+10&page=2
```

### Paginación

Preferir paginación clásica:

```text
← 1 2 3 4 5 →
```

No usar scroll infinito en V1.

---

# 8. Listado compacto de canciones

Este es el componente principal de la tienda.

Referencia conceptual:

```text
┌──────┬──────────────────────┬─────────────────┬────────┬─────────────┐
│ DEMO │ CANCIÓN              │ ARTISTA         │ PRECIO │             │
├──────┼──────────────────────┼─────────────────┼────────┼─────────────┤
│ ▶ 🎬 │ Mix Por Tu Amor      │ Grupo X         │ S/ X   │ 🛒 AGREGAR  │
│ ▶ 🎬 │ Amor Rebelde         │ Grupo Amor      │ S/ X   │ 🛒 AGREGAR  │
│ ▶ 🎬 │ Cervecero            │ Armonía 10      │ S/ X   │ 🛒 AGREGAR  │
└──────┴──────────────────────┴─────────────────┴────────┴─────────────┘
```

### Queda de BuyKaraoke

- título clicable.
- artista clicable.
- preview directo.
- precio en la misma fila.
- botón agregar en la misma fila.
- agregar sin abandonar el catálogo.
- contador de carrito actualizado inmediatamente.

### Se elimina

- índice `#`.
- `Times Played` en V1.
- cantidad Qty para archivos digitales.
- stock visible.
- reviews/rating inicialmente.

---

# 9. Reproductor / DEMO

Al pulsar DEMO, el usuario no debe navegar a otra página.

El reproductor se abre en la misma experiencia de catálogo.

Diseño conceptual:

```text
┌──────────────────────────────────────────────┐
│ AMOR REBELDE                             ✕   │
├──────────────────────────────────────────────┤
│                                              │
│              KARAOKE PREVIEW                 │
│                                              │
│                  ▶                           │
│                                              │
│ 0:00 ━━━━━━━━━●━━━━━━━━━━━━━━━━ 1:00         │
│                                              │
│ 🔊 ━━━━━━━                               ⛶   │
└──────────────────────────────────────────────┘
```

Controles V1:

- Play/Pause.
- progreso.
- volumen.
- cerrar `X`.
- fullscreen si corresponde.

No agregar controles innecesarios como Cast, PiP, captions o selector de pistas salvo necesidad futura.

### Integración real del botón DEMO TOP PERÚ

Pseudo-flujo:

```text
onDemoClick(product):
    id = product.ID_CANCION
    session = POST API_OVH_DEMO(id)
    player.load({
        audioUrl: session.audioUrl,
        cdgUrl: session.cdgUrl
    })
    player.open()
```

La forma exacta del endpoint/request debe tomarse de la implementación backend ya aprobada. No inventar una segunda API si ya existe.

---

# 10. Agregar al carrito

Pulsar:

```text
🛒 AGREGAR
```

Debe agregar el producto al carrito de **Medusa** sin sacar al cliente de la lista.

```text
🛒 0 → 🛒 1
```

El cliente puede seguir reproduciendo y agregando más canciones.

No usar flujo Magento ni `/checkout/cart/add`.

---

# 11. Página individual de canción

Debe existir, pero ser secundaria; la mayoría de acciones se pueden hacer desde el listado.

Versión limpia:

```text
AMOR REBELDE
Grupo Amor Rebelde

[cover / imagen opcional]

▶ VER DEMO

Incluye:
✓ Video Karaoke HD
✓ formato(s) correspondiente(s)

Precio

[ 🛒 AGREGAR ]

← volver a resultados
```

Evitar:

- Qty.
- stock.
- SKU visible.
- sidebar Magento.
- reviews en V1.
- zoom/galería compleja.
- login dentro del producto.

---

# 12. HOME V1 aprobada

Orden:

```text
HEADER
  ↓
BUSCADOR PRINCIPAL
  ↓
NUEVOS KARAOKES
  ↓
TOP KARAOKE
  ↓
GÉNEROS
  ↓
PACKS
  ↓
PEDIR CANCIÓN
  ↓
FOOTER
```

Visual conceptual:

```text
🔥 NUEVOS KARAOKES

▶ Canción        Artista        S/ X      🛒 AGREGAR
▶ Canción        Artista        S/ X      🛒 AGREGAR
▶ Canción        Artista        S/ X      🛒 AGREGAR

VER TODOS →

⭐ TOP KARAOKE

▶ Canción        Artista        S/ X      🛒 AGREGAR
▶ Canción        Artista        S/ X      🛒 AGREGAR

VER TODOS →

🎵 GÉNEROS
Cumbia | Salsa | Baladas | Criollo | Rock | Pop | Huayno | etc.

📦 PACKS
[Pack] [Pack] [Pack]

¿NO ENCUENTRAS UNA CANCIÓN?
[ PEDIR CANCIÓN ]
```

### No incluir en V1

- slider gigante de publicidad.
- login grande en portada.
- sidebar.
- categorías duplicadas.
- segundo carrito.
- gift cards si no son necesarias.
- software mezclado con karaokes individuales.

---

# 13. Carrito

El carrito debe mantenerse sencillo.

Concepto:

```text
🛒 CARRITO (3)

Amor Rebelde            S/ X
Mix Por Tu Amor         S/ X
Cervecero                S/ X
-----------------------------
TOTAL                    S/ X

[ CONTINUAR AL PAGO ]
```

Para productos digitales no mostrar Qty salvo que Medusa lo necesite internamente; en UI cada producto se compra una vez.

Desde `CONTINUAR AL PAGO`, se utiliza el checkout Medusa existente.

---

# 14. Medusa — NO REHACER

Todo lo siguiente pertenece a Medusa / Digital Products:

- carrito.
- cliente.
- autenticación.
- checkout.
- pago.
- creación de pedido.
- estado de pedido.
- historial de compras.
- Mis Karaokes.
- descarga protegida de compras.

El frontend nuevo debe consumir estas capacidades; no sustituirlas.

---

# 15. Flujo completo final

```text
HOME
 ↓
BUSCAR / NUEVOS / TOP / GÉNERO
 ↓
LISTADO COMPACTO
 ├──────────────▶ DEMO
 │                  ↓
 │            ID_CANCION
 │                  ↓
 │             API OVH
 │                  ↓
 │       audioUrl + cdgUrl temporal
 │                  ↓
 │          CDG_PLAYER_ONLINE
 │
 └──────────────▶ 🛒 AGREGAR
                    ↓
                MEDUSA CART
                    ↓
                seguir comprando
                    ↓
                  CARRITO
                    ↓
              CHECKOUT MEDUSA
                    ↓
                   PAGO
                    ↓
                  ORDER
                    ↓
               MIS KARAOKES
                    ↓
                DESCARGA
```

---

# 16. Prioridad de implementación

Orden recomendado:

1. Header + buscador.
2. Componente `SongRow` / listado compacto.
3. Integración DEMO mediante `ID_CANCION` y API OVH.
4. Integración CDG_PLAYER_ONLINE dentro del storefront.
5. `Add to Cart` con Medusa sin navegación forzada.
6. contador/cart drawer o página carrito.
7. Home con Nuevos + Top + Géneros + Packs.
8. página individual de producto.
9. responsive móvil.
10. checkout, cuenta, pedidos y Mis Karaokes reutilizando Medusa ya existente.

---

# 17. Regla para el siguiente chat/agente

Antes de modificar código:

1. Leer este archivo completo.
2. Revisar el estado real del repo `TIENDA_KARAOKES_WEB`.
3. Localizar la implementación actual de Medusa y sus endpoints/SDK.
4. Localizar el contrato real de la API demo TOP PERÚ ya desplegada en OVH.
5. No cambiar RSA V2 / Apps Script v82 / Maestro / Dropbox salvo que exista un bug demostrado.
6. No volver a diseñar desde cero la UX: las decisiones principales están documentadas aquí.
7. Implementar por capas y probar primero DEMO + carrito antes de ampliar la Home.

---

## Resultado deseado

Una tienda DJGABO sencilla y rápida, inspirada en la experiencia útil de BuyKaraokeDownloads, pero construida con componentes propios y conectada a la arquitectura existente:

**TOP PERÚ + demo seguro OVH + CDG_PLAYER_ONLINE + Medusa v2 + Digital Products.**
