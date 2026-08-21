FROM node:24-alpine AS builder
WORKDIR /app
COPY apps/api/package.json ./
RUN npm install
COPY apps/api ./
# Prisma 7 يتطلب وجود DATABASE_URL عند التوليد (لا يتصل فعلياً — قيمة بناء فقط)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./
RUN mkdir -p uploads
EXPOSE 4000
# 🛡️ الإقلاع المرن: فشل db push (تحذيرات حذر البيانات) لا يمنع تشغيل الخادم —
# يُسجَّل تنبيه ويُكمل الإقلاع، ويُطبَّق المخطط يدوياً بأمر واحد عند الحاجة
# ⚠️ Prisma 7 أزال خيار --skip-generate من db push — وجوده يجعل الأمر يفشل دائماً!
CMD ["sh", "-c", "npx prisma db push || echo '⚠️ db-push: رُفض تطبيق المخطط (تحذير بيانات) — طبّقه يدوياً: docker compose exec api npx prisma db push --accept-data-loss'; node prisma/seed.js || echo '⚠️ seed: تم تخطيه'; exec node dist/main.js"]
