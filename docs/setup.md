# Preparación técnica — Medusa base

Esta rama usa dos fuentes oficiales, aisladas del diseño actual:

- **Backend digital:** `medusajs/examples/digital-product`
- **Storefront ecommerce:** `medusajs/dtc-starter/apps/storefront`

Los commits upstream quedan fijados en los scripts para que las pruebas sean reproducibles.

## Estructura

```text
apps/
  backend/      Medusa v2 + Digital Product
  storefront/   Next.js DTC Storefront
site/pruebas/    maqueta visual actual
```

## Bootstrap

```bash
bash scripts/bootstrap-backend.sh
bash scripts/bootstrap-storefront.sh
```

Los scripts **no sobrescriben** una app ya creada. Para regenerar conscientemente una base upstream se requiere:

```bash
DJGABO_FORCE_BOOTSTRAP=1 bash scripts/bootstrap-backend.sh
DJGABO_FORCE_BOOTSTRAP=1 bash scripts/bootstrap-storefront.sh
```

## Base de datos local

```bash
docker compose up -d postgres
```

Configuración de desarrollo:

```text
host: localhost
port: 5433
database: djgabo_karaoke_poc
user: medusa
password: change-me-local
```

No usar esa contraseña fuera del POC.

## Variables

Backend:

```bash
cd apps/backend
cp .env.template .env
```

Storefront:

```bash
cd apps/storefront
cp .env.template .env.local
```

Luego se conectará `NEXT_PUBLIC_MEDUSA_BACKEND_URL` al backend Medusa y se creará la publishable API key.

## Orden de integración

1. Levantar Backend + Admin.
2. Levantar Storefront DTC.
3. Crear un producto digital de prueba.
4. Validar cuenta, carrito y pedido.
5. Validar `Mis Karaokes` + descarga autorizada.
6. Reemplazar el aspecto visual del storefront por el diseño DJGABO.
7. Conectar catálogo real del Sheet.
8. Conectar `CDG_PLAYER_ONLINE` para demo y LABFAST para generar MP4.

Todavía no se conectan pagos productivos ni el catálogo completo.
