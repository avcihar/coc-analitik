#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=== 1. Python Paketleri Yükleniyor ==="
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "=== 2. Next.js Frontend Static Build (Export) ==="
cd frontend
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
cd ..

echo "=== Build Tamamlandı: Frontend ve Backend hazır ==="

