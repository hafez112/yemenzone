#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
#  يمن زون — نشر آلي كامل على VPS (Ubuntu 24.04)
#  الاستخدام:  bash deploy.sh yourdomain.com
# ═══════════════════════════════════════════════════
set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "❌ الاستخدام: bash deploy.sh yourdomain.com"
  exit 1
fi

echo "🇾🇪 ═══ نشر منصة يمن زون على $DOMAIN ═══"

# 1) تحديث النظام وتثبيت Docker
echo "📦 [1/5] تثبيت Docker..."
if ! command -v docker &>/dev/null; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg ufw
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker --version && echo "✅ Docker جاهز"

# 2) الجدار الناري
echo "🛡️ [2/5] الجدار الناري..."
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "✅ المنافذ المفتوحة: 22 (SSH) · 80 · 443 فقط"

# 3) ملف البيئة بأسرار عشوائية قوية
echo "🔐 [3/5] توليد الأسرار..."
if [ ! -f .env ]; then
  gen() { openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64; }
  cat > .env <<EOF
DOMAIN=$DOMAIN
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(gen | head -c 24)
POSTGRES_DB=yemenzone
JWT_SECRET=$(gen)
JWT_REFRESH_SECRET=$(gen)
EOF
  echo "✅ أُنشئ .env بأسرار عشوائية — احتفظ بنسخة منه!"
else
  sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env
  echo "✅ .env موجود — حُدّث الدومين فقط"
fi

# 4) البناء والتشغيل
echo "🏗️ [4/5] بناء المنصة (أول مرة يأخذ 5-10 دقائق)..."
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# 5) الفحص
echo "🔍 [5/5] انتظار جاهزية الخدمات..."
sleep 15
docker compose -f docker-compose.prod.yml ps

echo ""
echo "═══════════════════════════════════════════════════"
echo "🎉 تم! منصتك تعمل الآن:"
echo "   🌐 المنصة:      https://$DOMAIN"
echo "   🛡️ لوحة الإدارة: https://$DOMAIN/auth/admin-login"
echo "      admin@yemenzone.com / admin123456  ⚠️ غيّرها فوراً!"
echo "═══════════════════════════════════════════════════"
echo "📋 أوامر مفيدة:"
echo "   السجلات:     docker compose -f docker-compose.prod.yml logs -f"
echo "   إعادة تشغيل: docker compose -f docker-compose.prod.yml restart"
echo "   تحديث:       git pull && bash deploy.sh $DOMAIN"
