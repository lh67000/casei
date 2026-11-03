#!/usr/bin/env bash
# usage : ./convert_csv.sh [dossier]   (par défaut : dossier courant)
set -euo pipefail

DIR="${1:-.}"
BACKUP="${DIR%/}_backup_$(date +%Y%m%d_%H%M%S)"

# Sauvegarde complète avant toute modification
cp -r "$DIR" "$BACKUP"
echo "Sauvegarde : $BACKUP"

find "$DIR" -type f -name "*.csv" -print0 | python3 -c '
import csv, sys, os, tempfile

files = sys.stdin.buffer.read().split(b"\0")
done = skipped = 0
for raw in files:
    if not raw:
        continue
    path = raw.decode()
    with open(path, newline="", encoding="utf-8-sig") as f:
        header = f.readline()
        f.seek(0)
        # déjà en ";" (ou pas de virgule dans l en-tête) -> on ne touche pas
        if "," not in header:
            skipped += 1
            continue
        rows = list(csv.reader(f))
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path) or ".")
    with os.fdopen(fd, "w", newline="", encoding="utf-8") as g:
        csv.writer(g, delimiter=";", lineterminator="\n").writerows(rows)
    os.replace(tmp, path)
    done += 1
print(f"{done} fichiers convertis, {skipped} ignorés (déjà en ;)")
'
