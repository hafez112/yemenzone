#!/usr/bin/env bash
# نسخة SQL مجدولة أسبوعياً (إضافة لنسخ JSON من لوحة الإدارة)
# الاستخدام: bash setup-backup-cron.sh
set -e
mkdir -p /root/yz-sql-backups
CRON_LINE="0 3 * * 0 docker exec yz-db pg_dump -U postgres yemenzone | gzip > /root/yz-sql-backups/yz-\$(date +\%Y\%m\%d).sql.gz && ls -t /root/yz-sql-backups/*.sql.gz | tail -n +9 | xargs -r rm"
(crontab -l 2>/dev/null | grep -v yz-sql-backups; echo "$CRON_LINE") | crontab -
echo "✅ نسخة SQL كل أحد 3 فجراً → /root/yz-sql-backups (تحفظ آخر 8)"
echo "💡 للنسخ الفوري: docker exec yz-db pg_dump -U postgres yemenzone | gzip > backup.sql.gz"
