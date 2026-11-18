# تشغيل جمبزة كتطبيق سطح مكتب (Windows / Tauri)

يوضّح هذا المستند ما يلزم لتشغيل نسخة سطح المكتب المبنية بـ Tauri مع Supabase، خصوصاً عناوين إعادة التوجيه (Redirect URLs) المطلوبة للمصادقة.

## المتطلبات

- **Node.js 20.9+** و **npm** لبناء واجهة الويب (`out/`).
- **Rust** (أداة `rustup` مع سلسلة أدوات MSVC المستقرة: `stable-x86_64-pc-windows-msvc`).
- **أدوات بناء Visual Studio C++** (MSVC) و **Windows SDK**.
- **WebView2 Runtime** (مثبّت عادةً على Windows 10/11).
- لبناء مثبت NSIS (`.exe`): أداة **NSIS** (يقوم Tauri بتحميلها تلقائياً عند الحاجة في بعض البيئات، أو يمكن تثبيتها مسبقاً).

> ملاحظة: مفاتيح Supabase العامة (`NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY`) تُدمج داخل الحزمة الثابتة وقت البناء (`npm run build` / `npm run tauri:build`). تأكد من وجود ملف `.env.local` (أو متغيرات البيئة المكافئة) قبل البناء، ولا تضف أي مفتاح سري (service role) إلى التطبيق.

## البناء

```bash
npm install
npm run tauri:build
```

ينتج عن ذلك:
- تصدير الويب الثابت في `out/`.
- حزمة سطح المكتب في `src-tauri/target/release/`.
- مثبت NSIS بامتداد `.exe` داخل `src-tauri/target/release/bundle/nsis/` (عند اكتمال البناء بنجاح).

## عناوين إعادة التوجيه في Supabase (Redirect URLs)

تطبيق سطح المكتب يعمل داخل WebView بأصل (origin) مختلف عن موقع الويب. يجب إضافة أصول سطح المكتب إلى إعدادات Supabase لكي تعمل تدفقات المصادقة التي تعتمد على إعادة التوجيه (مثل تأكيد البريد الإلكتروني بعد إنشاء الحساب).

من لوحة تحكم Supabase: **Authentication → URL Configuration**

1. **Site URL**: أبقِ عنوان موقع الويب الإنتاجي (مثلاً `https://your-app.vercel.app`) كما هو للاستخدام على الويب، أو استخدم أحد أصول سطح المكتب أدناه إذا كانت نسخة سطح المكتب هي الاستخدام الأساسي.
2. **Redirect URLs**: أضف عناوين سطح المكتب التالية (مع الإبقاء على عناوين الويب الحالية):

   - `tauri://localhost`
   - `http://tauri.localhost`
   - `https://tauri.localhost`
   - `https://tauri.localhost/**`
   - `http://tauri.localhost/**`
   - `tauri://localhost/**`

> قد يختلف الأصل الفعلي باختلاف إصدار Tauri/النظام. للتحقق: شغّل التطبيق في وضع التطوير (`npm run tauri dev`)، وافتح أدوات المطوّر (إن توفرت) وتحقق من قيمة `window.location.origin`، ثم أضفها حرفياً إلى Redirect URLs في Supabase.

## ملاحظات

- تسجيل الدخول بالبريد الإلكتروني وكلمة المرور يعمل مباشرة ولا يعتمد على إعادة توجيه خارجية، لكن **تأكيد البريد** (إن كان مفعّلاً في Supabase) يحتاج إلى Redirect URL صالح ليعيد المستخدم إلى التطبيق بعد النقر على الرابط.
- التطبيق يستخدم فقط `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY`. لا تستخدم مفتاح `service_role` في العميل أو داخل حزمة سطح المكتب.
- الجلسات تُخزّن محلياً في WebView؛ تسجيل الخروج يمسح الجلسة المحلية كما في نسخة الويب.