# HashimFaisal Project Context

## معلومات المشروع
- اسم المشروع: HashimFaisal
- الموقع: https://hashimfaisal.github.io/
- مستودع GitHub:
  https://github.com/HashimFaisal/HashimFaisal.github.io
- مسار المشروع في Termux: ~/HashimFaisal
- الفرع الرئيسي: main
- الاستضافة: GitHub Pages

## طريقة العمل
1. نشتغل خطوة بخطوة.
2. أعطي أمراً واحداً في كل مرة.
3. المستخدم ينفذ الأمر ويرسل النتيجة.
4. نفحص النتيجة قبل الانتقال للخطوة التالية.
5. لا نغيّر ملفات غير مطلوبة.
6. لا نستخدم git add . أبداً.
7. نضيف الملفات المطلوبة بالاسم فقط.
8. لا ننفذ أوامر حذف أو تعديلات خطيرة دون موافقة.

## تصميم الموقع
- التصميم المعتمد: Midnight Prism (خلفية كحلية داكنة، أسطح زرقاء، سماوي وبنفسجي).
- الوضع النهاري محذوف نهائياً.
- لا نعيد زر تبديل الوضع الليلي والنهاري.

## ملفات المشروع المهمة
- index.html
- app.js
- style.css
- data/status.json
- data/changelog.json
- scripts/check_links.py
- .github/workflows/addon-health.yml

## تحديثات Nuvio
- المصدر المعتمد: luqmanfadlli/NuvioMobile-Enhanced
- رابط الإصدارات:
  https://github.com/luqmanfadlli/NuvioMobile-Enhanced/releases
- فحص الإصدارات يعمل بجدولة كل 15 دقيقة.
- السكربت يحدث بيانات الحالة وروابط الإصدارات عند نجاح الفحص.
- لا نغيّر المصدر إلى مستودع آخر دون موافقة المستخدم.

## التصميم الحالي
- لوحة Midnight Prism: خلفية #070B16، أسطح #111D33، سماوي #58D8E8، بنفسجي #A394FF، نص #F2F6FF.
- الوضع النهاري غير معتمد.
- ملفات الواجهة الرئيسية: index.html, style.css, premium-ui.css, app.js, premium-ui.js.
- ملفات البيانات: data/status.json, data/changelog.json, data/updates.json.
- التحقق: .github/workflows/health-validation.yml.

## ملاحظات مهمة
- توجد ملفات نسخ احتياطية وملفات غير متتبعة في المستودع.
- يجب عدم إضافتها عشوائياً إلى Git.
- يجب التحقق من git status قبل كل عملية Commit.
