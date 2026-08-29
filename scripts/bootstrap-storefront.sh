#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="https://github.com/medusajs/dtc-starter.git"
UPSTREAM_COMMIT="b08e6d9d3a8b75de2902e8a0cf4f9f179237b40c"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STOREFRONT_DIR="$ROOT_DIR/apps/storefront"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

if [ -f "$STOREFRONT_DIR/package.json" ] && [ "${DJGABO_FORCE_BOOTSTRAP:-0}" != "1" ]; then
  echo "[DJGABO] apps/storefront ya existe. No se sobrescribe."
  echo "[DJGABO] Usa DJGABO_FORCE_BOOTSTRAP=1 solo si deseas regenerarlo."
  exit 0
fi

echo "[DJGABO] Descargando storefront oficial Medusa DTC..."
git clone --quiet "$UPSTREAM_REPO" "$TMP_DIR/dtc"
git -C "$TMP_DIR/dtc" checkout --quiet "$UPSTREAM_COMMIT"

rm -rf "$STOREFRONT_DIR"
mkdir -p "$STOREFRONT_DIR"
cp -R "$TMP_DIR/dtc/apps/storefront/." "$STOREFRONT_DIR/"
rm -f "$STOREFRONT_DIR/.env" "$STOREFRONT_DIR/.env.local"

node - "$STOREFRONT_DIR/package.json" <<'NODE'
const fs = require("fs")
const path = process.argv[2]
const pkg = JSON.parse(fs.readFileSync(path, "utf8"))
pkg.name = "djgabo-karaoke-storefront"
pkg.description = "Storefront Next.js para la tienda de karaokes DJGABO"
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n")
NODE

cat > "$STOREFRONT_DIR/UPSTREAM.md" <<EOF
# Upstream Medusa DTC Storefront

- Repositorio: medusajs/dtc-starter
- Ruta: apps/storefront
- Commit fijado: $UPSTREAM_COMMIT

Esta es la base funcional de cuenta, carrito, checkout y pedidos.
La apariencia final se reemplazará por el diseño de TIENDA_PISTAS_WEB.
EOF

echo "[DJGABO] Storefront preparado en: $STOREFRONT_DIR"
