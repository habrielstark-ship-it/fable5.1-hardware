#!/usr/bin/env bash
# Contact sheet straight from the encoded MP4.
# usage: sheet_mp4.sh <mp4> <out.png> <cols> <rows> <thumb width> <t1,t2,...>   (times in seconds)
set -euo pipefail
mp4=$1; out=$2; cols=$3; rows=$4; tw=$5; times=$6
font=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
sel=""
for t in ${times//,/ }; do
  n=$(python3 -c "print(round($t*60))")
  sel="${sel}${sel:++}eq(n\,${n})"
done
ffmpeg -loglevel error -y -i "$mp4" -vf "select='${sel}',scale=${tw}:-2:flags=lanczos,drawtext=fontfile=${font}:text='%{pts\:flt}s':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=5,tile=${cols}x${rows}:padding=6:color=0x555555" -fps_mode vfr -frames:v 1 -update 1 "$out"
echo "$out $(ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$out")"
