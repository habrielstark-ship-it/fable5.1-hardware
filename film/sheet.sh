#!/usr/bin/env bash
# contact sheet: sheet.sh <stills dir> <out prefix> [cols] [thumb width] [rows per sheet]
set -euo pipefail
dir=$1; out=$2; cols=${3:-7}; tw=${4:-360}; rows=${5:-2}
font=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
tmp=$(mktemp -d)
i=0
for f in $(ls "$dir"/*.png "$dir"/*.jpg 2>/dev/null | sort); do
  label=$(basename "${f%.*}" | sed 's/^t0*//; s/^f0*//')
  ffmpeg -loglevel error -y -i "$f" -vf "scale=${tw}:-2:flags=lanczos,drawtext=fontfile=${font}:text='${label}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=5,format=rgb24" "$tmp/$(printf '%04d' $i).png"
  i=$((i+1))
done
per=$((cols*rows)); n=0; s=0
while [ $n -lt $i ]; do
  ffmpeg -loglevel error -y -framerate 1 -start_number $n -i "$tmp/%04d.png" -frames:v $per -vf "tile=${cols}x${rows}:padding=6:color=0x444444" -frames:v 1 -update 1 -q:v 3 "${out}_$s.jpg"
  n=$((n+per)); s=$((s+1))
done
rm -rf "$tmp"; echo "sheets: $s"
