#!/usr/bin/env bash
# Buat ulang berkas PNG dari berkas .drawio.
# Butuh: python3, google-chrome, dan koneksi internet ke viewer.diagrams.net.
# Cara pakai: bash render.sh
set -euo pipefail
cd "$(dirname "$0")"

render_one() {
  local name="$1" width="$2" height="$3"
  local url
  url=$(python3 - "$name.drawio" <<'PY'
import zlib, base64, urllib.parse, sys
xml = open(sys.argv[1], encoding="utf-8").read()
c = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS)
enc = base64.b64encode(c.compress(xml.encode("utf-8")) + c.flush()).decode().replace("\n", "")
print("https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&edit=_blank#R" + urllib.parse.quote(enc, safe=""))
PY
)
  google-chrome --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --window-size="${width},${height}" --virtual-time-budget=12000 \
    --screenshot="${name}.png" "$url" 2>/dev/null
  echo "OK  ${name}.png"
}

command -v google-chrome >/dev/null || { echo "google-chrome tidak ditemukan"; exit 1; }
command -v python3 >/dev/null || { echo "python3 tidak ditemukan"; exit 1; }

render_one 01-arsitektur-sistem       2100 1150
render_one 02-peran-dan-akses         2100 1850
render_one 03-alur-pengajuan-seleksi  2100 1500
render_one 04-alur-penilaian-laporan  2100 2700
render_one 05-aturan-perhitungan-skor 2100 2100
render_one 06-model-data              2100 1750
render_one 07-peta-halaman-per-role   2100 1850

echo "Selesai. Berkas PNG siap dibuka."
