#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="https://github.com/medusajs/examples.git"
UPSTREAM_COMMIT="aae76657952903750dfcaaaf28b6746f20ab1af5"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "[DJGABO] Descargando Medusa Digital Product..."
git clone --quiet "$UPSTREAM_REPO" "$TMP_DIR/examples"
git -C "$TMP_DIR/examples" checkout --quiet "$UPSTREAM_COMMIT"

mkdir -p "$BACKEND_DIR"

# Conserva archivos propios del POC y trae el backend oficial.
cp -R "$TMP_DIR/examples/digital-product/." "$BACKEND_DIR/"

# Nunca copiar un .env real desde upstream.
rm -f "$BACKEND_DIR/.env"

# Nombre propio del proyecto.
node - "$BACKEND_DIR/package.json" <<'NODE'
const fs = require("fs")
const path = process.argv[2]
const pkg = JSON.parse(fs.readFileSync(path, "utf8"))
pkg.name = "djgabo-karaoke-medusa-backend"
pkg.description = "Backend Medusa v2 para tienda digital de karaokes DJGABO"
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n")
NODE

cat > "$BACKEND_DIR/UPSTREAM.md" <<EOF
# Upstream Medusa

Este backend parte del ejemplo oficial:

- Repositorio: medusajs/examples
- Ruta: digital-product
- Commit fijado: $UPSTREAM_COMMIT

Se adapta para el POC de tienda digital de karaokes DJGABO.
EOF

echo "[DJGABO] Backend preparado en: $BACKEND_DIR"
echo "[DJGABO] Siguiente: configurar .env, PostgreSQL e instalar dependencias."
