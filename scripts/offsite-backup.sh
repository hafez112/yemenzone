#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# 🛡️ يمن زون — النسخ الاحتياطي الخارجي التلقائي
# pg_dump كامل (كل الجداول — لا يتأثر بأي تحديث مستقبلي)
# + إرسال لتيليجرام + تدوير محلي (14 يومية + 8 أسبوعية)
# الإعدادات تُقرأ من قاعدة البيانات (لوحة الإدارة ← النسخ الاحتياطي)
# ═══════════════════════════════════════════════════════════════

DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
DIR=/app/backups
DAILY=$DIR/daily
WEEKLY=$DIR/weekly
STATUS=$DIR/offsite-status.json
TRIGGER=$DIR/TRIGGER_NOW
LOCK=$DIR/.backup-running
TG_LIMIT=49000000   # حد بوتات تيليجرام ~50MB — نرسل تنبيهاً بدل الملف إن تجاوزه

mkdir -p "$DAILY" "$WEEKLY"

# قراءة حقل من إعدادات النسخ (Postgres يحلل JSON — لا حاجة لأدوات إضافية)
cfg() {
  psql "$DB_URL" -t -A -c "SELECT COALESCE(value->>'$1','') FROM settings WHERE key='backup.offsite'" 2>/dev/null | head -1
}

write_status() { # $1 ok, $2 file, $3 size, $4 telegram, $5 error
  cat > "$STATUS" <<EOF
{"lastRun":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","ok":$1,"file":"$2","size":${3:-0},"telegram":"$4","error":"$5"}
EOF
}

send_telegram() { # $1 file, $2 caption
  [ -z "$TG_TOKEN" ] || [ -z "$TG_CHAT" ] && { echo "skipped"; return; }
  SIZE=$(stat -c%s "$1" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt "$TG_LIMIT" ]; then
    curl -s -m 30 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -d chat_id="$TG_CHAT" --data-urlencode "text=⚠️ نسخة يمن زون جاهزة لكنها أكبر من حد تيليجرام (50MB): $(basename "$1") — انسخها يدوياً من السيرفر" >/dev/null
    echo "too-big"
    return
  fi
  RES=$(curl -s -m 300 -F chat_id="$TG_CHAT" -F document=@"$1" --form-string caption="$2" \
    "https://api.telegram.org/bot${TG_TOKEN}/sendDocument")
  echo "$RES" | grep -q '"ok":true' && echo "sent" || echo "failed"
}

run_backup() { # $1 = manual|auto
  [ -f "$LOCK" ] && return
  touch "$LOCK"
  TS=$(date +%Y%m%d-%H%M)
  FILE="$DAILY/yemenzone-$TS.dump"
  TMP="$FILE.tmp"

  TG_TOKEN=$(cfg tgToken); TG_CHAT=$(cfg tgChatId)

  if pg_dump "$DB_URL" -Fc --compress=6 -f "$TMP" 2>"$DIR/.last-dump-error"; then
    mv "$TMP" "$FILE"
    SIZE=$(stat -c%s "$FILE" 2>/dev/null || echo 0)
    # 📅 نسخة أسبوعية كل أحد
    [ "$(date +%u)" = "7" ] && cp "$FILE" "$WEEKLY/yemenzone-week-$TS.dump"
    TG=$(send_telegram "$FILE" "🛡️ نسخة يمن زون الاحتياطية — $(date '+%Y-%m-%d %H:%M') | الحجم: $((SIZE/1024))KB | النوع: $1")
    write_status true "$(basename "$FILE")" "$SIZE" "$TG" ""
    echo "[$(date)] ✅ backup ok: $FILE ($SIZE bytes) telegram=$TG"
  else
    ERR=$(tail -1 "$DIR/.last-dump-error" | tr '"' "'" | head -c 200)
    rm -f "$TMP"
    write_status false "" 0 "error" "$ERR"
    # تنبيه فشل عبر تيليجرام إن كانت البيانات مضبوطة
    [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] && curl -s -m 30 -X POST \
      "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" -d chat_id="$TG_CHAT" \
      --data-urlencode "text=🔴 فشل النسخ الاحتياطي ليمن زون: $ERR" >/dev/null
    echo "[$(date)] 🔴 backup failed: $ERR"
  fi

  # 🔄 التدوير: 14 يومية + 8 أسبوعية
  ls -1t "$DAILY"/*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
  ls -1t "$WEEKLY"/*.dump 2>/dev/null | tail -n +9 | xargs -r rm -f
  rm -f "$LOCK"
}

echo "🛡️ خدمة النسخ الاحتياطي الخارجي تعمل — الفحص كل 60 ثانية"
while true; do
  # تشغيل فوري من لوحة الإدارة
  [ -f "$TRIGGER" ] && { rm -f "$TRIGGER"; run_backup manual; }

  # الموعد اليومي المضبوط من لوحة الإدارة
  ENABLED=$(cfg enabled)
  HOUR=$(cfg hour); HOUR=${HOUR:-3}
  NOW_H=$((10#$(date +%H)))
  TODAY=$(date +%F)
  if [ "$ENABLED" = "true" ] && [ "$NOW_H" -eq "$HOUR" ] && [ ! -f "$DIR/.done-$TODAY" ]; then
    touch "$DIR/.done-$TODAY"
    run_backup auto
  fi

  sleep 60
done
