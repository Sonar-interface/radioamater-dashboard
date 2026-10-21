#!/usr/bin/env bash
# Izgradi stranicu i kopiraj je u korijen repozitorija (GitHub Pages: grana main, mapa /).
set -euo pipefail
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
npx vite build
cd ..
rm -rf assets index.html borders.json
cp -r web/dist/* .
touch .nojekyll
echo "Gotovo: index.html, assets/, borders.json"
