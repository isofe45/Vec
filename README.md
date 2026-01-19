# CineVault (Starter)

موقع أفلام/مسلسلات جاهز كبداية احترافية (واجهة + باك إند) مع:

- صفحة رئيسية بأقسام (Featured / Continue Watching / Series / Movies)
- صفحة تفاصيل العمل + مواسم/حلقات
- **مشغل مدمج** (HLS) مع:
  - اختيار الجودة (Auto + الجودات المتاحة من الـHLS)
  - سرعات التشغيل (0.5x,1x,1.5x,2x)
  - ترجمات متعددة + إعدادات حجم/موضع
  - حفظ تقدم المشاهدة تلقائيًا
  - اختصارات كيبورد (YouTube-like)
- **القوائم الذكية**:
  - إنشاء/تسمية/حذف/تعديل الخصوصية (Private / Unlisted / Public)
  - إضافة/إزالة عناوين
  - مشاركة القائمة عبر رابط (/share/<token>)

> ملاحظة: هذا مشروع **هيكل**. قم بتوصيل مصادر فيديو **مرخّصة لك** (CDN/Storage) بدل روابط الديمو.

## التشغيل محليًا / Replit

1) ثبّت الحزم:

```bash
npm i
```

2) انسخ ملف البيئة:

```bash
cp .env.example .env
```

3) حدّث `AUTH_SECRET` بسلسلة عشوائية طويلة.

4) جهّز قاعدة البيانات:

```bash
npm run prisma:migrate -- --name init
npm run seed
```

5) شغل:

```bash
npm run dev
```

- Demo login: `demo@cinevault.local` / `DemoPass123!`

## نشر سريع
- **Vercel**: اربط GitHub repo → ضَع متغيرات البيئة → استخدم Postgres (Neon/Supabase) بدل SQLite.
- لتغيير DB إلى Postgres: عدّل `prisma/schema.prisma` إلى provider = "postgresql" وحدّث `DATABASE_URL`.

---

## هيكلة البث (المهم)
أفضل طريقة للجودات المتعددة هي **HLS Master Playlist** (مستوى واحد يحتوي 480/720/1080/4K). المشغل هنا سيقرأ الجودات تلقائيًا من الـHLS.
