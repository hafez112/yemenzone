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
VTRIGGER=$DIR/TRIGGER_VERIFY
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

write_verify() { # $1 ok(true/false), $2 tables, $3 rows, $4 error
  cat > "$DIR/.verify-status.json" <<EOF
{"lastVerify":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","ok":$1,"tables":${2:-0},"sampleRows":${3:-0},"error":"$4"}
EOF
}

# 🧪 تجربة الاستعادة: نستعيد أحدث نسخة فعلياً في قاعدة مؤقتة ثم نحذفها
# نسخة لم تُختبر استعادتها = لا نسخة
run_verify() {
  [ -f "$LOCK" ] && return
  touch "$LOCK"
  LATEST=$(ls -1t "$DAILY"/*.dump 2>/dev/null | head -1)
  TG_TOKEN=$(cfg tgToken); TG_CHAT=$(cfg tgChatId)
  if [ -z "$LATEST" ]; then
    write_verify false 0 0 "لا توجد نسخة بعد"
  else
    TABLES=0; ROWS=0; ERR=""
    # ١) سلامة ملف النسخة (قائمة المحتويات)
    if ! pg_restore --list "$LATEST" >/dev/null 2>"$DIR/.last-verify-error"; then
      ERR="ملف النسخة تالف: $(tail -1 "$DIR/.last-verify-error" | head -c 150)"
    # ٢) استعادة فعلية كاملة في قاعدة مؤقتة
    elif psql "$DB_URL" -c "CREATE DATABASE yz_verify_tmp" >/dev/null 2>&1; then
      VURL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/yz_verify_tmp"
      if pg_restore -d "$VURL" --no-owner --no-privileges "$LATEST" >/dev/null 2>&1; then
        TABLES=$(psql "$VURL" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null)
        ROWS=$(psql "$VURL" -t -A -c "SELECT (SELECT count(*) FROM stores) + (SELECT count(*) FROM products) + (SELECT count(*) FROM orders)" 2>/dev/null)
      else
        ERR="فشلت الاستعادة في القاعدة المؤقتة"
      fi
      psql "$DB_URL" -c "DROP DATABASE IF EXISTS yz_verify_tmp" >/dev/null 2>&1
    else
      ERR="تعذر إنشاء قاعدة مؤقتة للفحص"
    fi
    [ -z "$ERR" ] && write_verify true "$TABLES" "$ROWS" "" || write_verify false "$TABLES" "$ROWS" "$ERR"
    # تنبيه تيليجرام بالنتيجة
    if [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ]; then
      if [ -z "$ERR" ]; then
        MSG="🧪✅ تجربة استعادة يمن زون نجحت: $(basename "$LATEST") — $TABLES جدولاً استُعيدت سليمة"
      else
        MSG="🧪🔴 تجربة الاستعادة فشلت: $ERR"
      fi
      curl -s -m 30 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" -d chat_id="$TG_CHAT" --data-urlencode "text=$MSG" >/dev/null
    fi
    echo "[$(date)] 🧪 verify: tables=$TABLES rows=$ROWS err=$ERR"
  fi
  rm -f "$LOCK"
}

echo "🛡️ خدمة النسخ الاحتياطي الخارجي تعمل — الفحص كل 60 ثانية"
while true; do
  # تشغيل فوري من لوحة الإدارة
  [ -f "$TRIGGER" ] && { rm -f "$TRIGGER"; run_backup manual; }

  # 🧪 تجربة استعادة فورية من لوحة الإدارة
  [ -f "$VTRIGGER" ] && { rm -f "$VTRIGGER"; run_verify; }

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
