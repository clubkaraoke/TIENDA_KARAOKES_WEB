# Demo en Cloudflare Pages

La demo visual vive en:

```
site/
```

Configuración recomendada para Cloudflare Pages:

- Git repository: `clubkaraoke/TIENDA_KARAOKES_WEB`
- Production branch (mientras sea demo): `desarrollo`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `site`
- Root directory: dejar vacío

La carpeta `site/` contiene `index.html` en el nivel superior del output y está preparada para despliegue estático.

## Seguridad de demo

Se incluyen:

- `robots.txt` con `Disallow: /`
- `_headers` con `X-Robots-Tag: noindex, nofollow, noarchive`

Esto reduce el riesgo de que buscadores indexen el prototipo.

## Producción

Cuando la tienda real esté aprobada:

1. `main` será la rama de producción.
2. `desarrollo` seguirá generando previews.
3. Se revisarán dominio, autenticación, pagos y almacenamiento privado antes de permitir compras reales.
