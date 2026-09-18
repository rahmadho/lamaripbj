#!/usr/bin/env bash
# Backup harian aplikasi arsip: database (pg_dump) + folder storage.
# Hasil disimpan ke <BACKUP_DIR>/<YYYY-MM-DD>/.
#
# Pemakaian:
#   bash scripts/backup.sh
#
# Konfigurasi via env (opsional):
#   DATABASE_URL  default: postgresql://postgres@localhost:5432/arsip
#   STORAGE_DIR   default: ./storage  (relatif ke akar repo, atau absolut)
#   BACKUP_DIR    default: ./backups
#   PG_DUMP       path binary pg_dump bila tidak ada di PATH

set -euo pipefail

AKAR="$(cd "$(dirname "$0")/.." && pwd)"

DATABASE_URL="${DATABASE_URL:-postgresql://postgres@localhost:5432/arsip}"
STORAGE_DIR="${STORAGE_DIR:-$AKAR/storage}"
BACKUP_DIR="${BACKUP_DIR:-$AKAR/backups}"

# Path default pg_dump (Laragon) bila tidak disediakan lewat env.
if [[ -z "${PG_DUMP:-}" ]]; then
  KANDIDAT="/e/MASTER/Developement/Laragon/laragon/bin/postgresql/postgresql-13.2-1-windows-x64-binaries/bin/pg_dump.exe"
  if [[ -x "$KANDIDAT" ]]; then
    PG_DUMP="$KANDIDAT"
  else
    PG_DUMP="pg_dump"
  fi
fi

TGL="$(date +%Y-%m-%d)"
JAM="$(date +%H%M%S)"
TUJUAN="$BACKUP_DIR/$TGL"
mkdir -p "$TUJUAN"

echo "== Backup arsip =="
echo "Tanggal   : $TGL $JAM"
echo "DB        : $DATABASE_URL"
echo "Storage   : $STORAGE_DIR"
echo "Tujuan    : $TUJUAN"
echo

# 1) Database
DB_FILE="$TUJUAN/arsip-$JAM.sql"
echo "[1/2] pg_dump database -> $DB_FILE"
"$PG_DUMP" --no-owner --no-privileges "$DATABASE_URL" > "$DB_FILE"
echo "      OK ($(du -h "$DB_FILE" | cut -f1))"

# 2) Folder storage
if [[ -d "$STORAGE_DIR" ]]; then
  ST_FILE="$TUJUAN/storage-$JAM.tar.gz"
  echo "[2/2] arsipkan storage -> $ST_FILE"
  tar -czf "$ST_FILE" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
  echo "      OK ($(du -h "$ST_FILE" | cut -f1))"
else
  echo "[2/2] WARN: folder storage '$STORAGE_DIR' tidak ditemukan, dilewati."
fi

echo
echo "Selesai. Isi folder backup:"
ls -lh "$TUJUAN"

# Simpan hanya N hari terakhir (default 14).
SIMPAN_HARI="${SIMPAN_HARI:-14}"
if [[ "$SIMPAN_HARI" -gt 0 ]]; then
  echo
  echo "Membersihkan backup lebih tua dari $SIMPAN_HARI hari..."
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$SIMPAN_HARI" -print -exec rm -rf {} \;
fi

echo
echo "Backup selesai: $TUJUAN"
