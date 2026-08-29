#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="https://github.com/medusajs/examples.git"
UPSTREAM_COMMIT="aae76657952903750dfcaaaf28b6746f20ab1af5"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

if [ -f "$BACKEND_DIR/package.json" ] && [ "${DJGABO_FORCE_BOOTSTRAP:-0}" != "1" ]; then
  echo "[DJGABO] apps/backend ya existe. No se sobrescribe."
  echo "[DJGABO] Usa DJGABO_FORCE_BOOTSTRAP=1 solo si deseas regenerarlo."
  exit 0
fi

echo "[DJGABO] Descargando Medusa Digital Product oficial..."
git clone --quiet "$UPSTREAM_REPO" "$TMP_DIR/examples"
git -C "$TMP_DIR/examples" checkout --quiet "$UPSTREAM_COMMIT"

rm -rf "$BACKEND_DIR"
mkdir -p "$BACKEND_DIR"
cp -R "$TMP_DIR/examples/digital-product/." "$BACKEND_DIR/"
rm -f "$BACKEND_DIR/.env"

node - "$BACKEND_DIR/package.json" <<'NODE'
const fs = require("fs")
const path = process.argv[2]
const pkg = JSON.parse(fs.readFileSync(path, "utf8"))
pkg.name = "djgabo-karaoke-medusa-backend"
pkg.description = "Backend Medusa v2 para tienda digital de karaokes DJGABO"
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n")
NODE

cat > "$BACKEND_DIR/UPSTREAM.md" <<EOF
# Upstream Medusa Digital Product

- Repositorio: medusajs/examples
- Ruta: digital-product
- Commit fijado: $UPSTREAM_COMMIT

Base oficial usada para productos digitales, preview, pedidos y descargas protegidas.
EOF

echo "[DJGABO] Backend preparado en: $BACKEND_DIR"
