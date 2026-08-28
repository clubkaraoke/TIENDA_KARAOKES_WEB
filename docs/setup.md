# Preparación técnica del POC

## Requisitos

- Node.js compatible con la versión fijada por Medusa.
- Git.
- Docker + Docker Compose.
- npm o yarn.

## 1. Crear backend desde el ejemplo oficial

Desde `karaoke-store/`:

```bash
bash scripts/bootstrap-backend.sh
```

El script usa un commit fijo de `medusajs/examples` para que el POC sea reproducible.

## 2. Levantar PostgreSQL

```bash
docker compose up -d postgres
```

Base de desarrollo por defecto:

```text
host: localhost
port: 5433
database: djgabo_karaoke_poc
user: medusa
password: change-me-local
```

Cambiar la contraseña mediante variables de entorno antes de cualquier despliegue fuera del entorno de prueba.

## 3. Configurar backend

Copiar:

```bash
cd apps/backend
cp .env.template .env
```

Configurar `DATABASE_URL` apuntando a PostgreSQL.

No subir `.env` al repositorio.

## 4. Instalar y preparar Medusa

Seguir los scripts definidos por el ejemplo oficial en `apps/backend/package.json` para instalar dependencias, ejecutar migraciones/seed y arrancar el backend.

## Objetivo de la primera prueba

La prueba no necesita pasarela real. Primero validamos:

```text
producto digital
→ carrito
→ usuario
→ pedido de prueba
→ Mis Karaokes
→ autorización
→ descarga
```
