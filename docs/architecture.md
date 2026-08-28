# Arquitectura del POC

## 1. Storefront DJGABO

La interfaz será propia. No se usará la apariencia genérica del starter como producto final.

Pantallas mínimas:

- Inicio
- Catálogo
- Búsqueda
- Detalle de karaoke
- Carrito
- Login / registro
- Checkout
- Mi Cuenta
- Mis Karaokes
- Historial de compras

## 2. Medusa v2

Medusa funcionará como motor de comercio:

- productos
- precios
- clientes
- sesiones
- carritos
- pedidos
- pagos
- asociación compra-cliente
- autorización de descargas

## 3. Producto digital Karaoke

Cada karaoke tendrá, como mínimo:

```text
id
artista
titulo
variante
genero
anio
cover
demo
archivo_final
precio
estado
```

El archivo final MP4 no debe publicarse como una URL permanente dentro del catálogo.

## 4. Descarga protegida

```text
Cliente pulsa Descargar
        |
        v
API verifica sesión
        |
        v
API verifica compra del karaoke
        |
     SI / NO
      |    |
      v    v
 URL temporal  403
      |
      v
 Descarga MP4
```

## 5. POC

Durante el POC se usarán karaokes de prueba y pago de prueba.

No se conectarán todavía:
- catálogo completo real
- archivos MP4 reales masivos
- Culqi/Yape productivo
- dominio productivo
