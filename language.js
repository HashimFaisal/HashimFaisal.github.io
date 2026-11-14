(() => {
  const translations = {
    "الإضافات":"Add-ons",
    "التنزيلات":"Downloads",
    "حالة النظام":"System Status",
    "سجل التغييرات":"Changelog",
    "كل مشاريع Nuvio،":"All Nuvio projects,",
    "في مركز واحد.":"in one place.",
    "استكشف الإضافات":"Explore add-ons",
    "أحدث التنزيلات":"Latest downloads",
    "مكتبة الإضافات":"Add-on Library",
    "ابحث عن إضافة...":"Search add-ons...",
    "الكل":"All",
    "نسخ الرابط":"Copy link",
    "فتح Manifest ↗":"Open Manifest ↗",
    "جارٍ التحقق":"Checking",
    "ما لقينا إضافات تطابق بحثك.":"No add-ons match your search.",
    "تنزيلات Nuvio":"Nuvio Downloads",
    "مصادر المطوّرين":"Developer Resources",
    "لا توجد تغييرات مسجلة حالياً.":"No changes have been recorded yet.",
    "تعذر تحميل سجل التغييرات حالياً.":"Unable to load the changelog right now.",
    "صفحة الإصدارات ↗":"Releases page ↗",
    "التطبيق الرسمي · GitHub ↗":"Official app · GitHub ↗",
    "مستودع إضافات المجتمع ↗":"Community add-ons repository ↗",
    "الموقع الرسمي ↗":"Official website ↗",
    "حالة الفحص":"Check status",
    "جارٍ التحميل":"Loading",
    "الإضافات المفحوصة":"Checked add-ons",
    "أحدث إصدار":"Latest release",
    "ملفات التنزيل":"Download files",
    "مصادر سليمة":"Healthy sources",
    "مصادر متعطلة":"Unavailable sources",
    "تحتاج مراجعة":"Needs review",
    "آخر فحص":"Last check",
    "وقت التحديث":"Updated at",
    "روابط مباشرة":"Direct links",
    "فحص تلقائي":"Automated checks",
    "تحديثات الإصدارات":"Release updates",
    "إضافة مستقلة لمشاريع Nuvio.":"An independent add-on for Nuvio projects.",
    "مشروع إضافة مستقل ضمن مكتبة Nuvio.":"An independent add-on in the Nuvio library.",
    "إضافة All-in-One لمشروع Nuvio من المستودع الأصلي.":"The All-in-One add-on for Nuvio from its original repository.",
    "إضافة للبحث عن الترجمات وعرضها.":"An add-on for searching and displaying subtitles.",
    "لا توجد بيانات إصدار":"No release information",
    "تعذر جلب معلومات الإصدار الأخير.":"Unable to load the latest release information.",
    "غير متاح حالياً":"Currently unavailable",
    "الحجم غير متاح":"Size unavailable",
    "تاريخ النشر غير متاح":"Publication date unavailable",
    "غير متاح":"Unavailable",
    "سليم":"Healthy",
    "يحتاج مراجعة":"Needs review",
    "تعذر تحميل تقرير الفحص":"Unable to load the health report",
    "تقرير الحالة غير متاح حالياً.":"The status report is currently unavailable."
  };

  const reverse = Object.fromEntries(
    Object.entries(translations).map(([ar, en]) => [en, ar])
  );

  let lang = localStorage.getItem("hashimxc12-language") || "ar";
  const originals = new Map();

  function collectText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
    }
  }

  function applyLanguage(next) {
    lang = next;
    collectText();

    for (const [node, original] of originals) {
      if (!node.isConnected) continue;
      const trimmed = original.trim();
      const translated = lang === "en" ? translations[trimmed] : reverse[trimmed];
      if (translated) {
        const start = original.match(/^\s*/)?.[0] || "";
        const end = original.match(/\s*$/)?.[0] || "";
        node.nodeValue = start + translated + end;
      } else {
        node.nodeValue = original;
      }
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    const search = document.querySelector("#search");
    if (search) search.placeholder = lang === "ar" ? "ابحث عن إضافة..." : "Search add-ons...";

    const button = document.querySelector("#language-toggle");
    if (button) button.textContent = lang === "ar" ? "English" : "العربية";

    localStorage.setItem("hashimxc12-language", lang);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector("#language-toggle");
    if (button) button.addEventListener("click", () => applyLanguage(lang === "ar" ? "en" : "ar"));
    applyLanguage(lang);
  });
})();
