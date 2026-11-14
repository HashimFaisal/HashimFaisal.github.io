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
    "روابط مباشرة":"Direct links",
    "فحص تلقائي":"Automatic checks",
    "تحديثات الإصدارات":"Release updates",
    "حالة الفحص":"Check status",
    "جارٍ التحميل":"Loading",
    "نقرأ آخر تقرير":"Reading latest report",
    "الإضافات المفحوصة":"Checked add-ons",
    "أحدث إصدار":"Latest release",
    "ملفات التنزيل":"Download files",
    "مصادر سليمة":"Healthy sources",
    "مصادر متعطلة":"Unavailable sources",
    "تحتاج مراجعة":"Needs review",
    "آخر فحص":"Last check",
    "وقت التحديث":"Updated at",
    "Manifest متاح":"Manifest available",
    "مكتبة الإضافات":"Add-on Library",
    "ابحث عن إضافة...":"Search add-ons...",
    "الكل":"All",
    "نسخ الرابط":"Copy link",
    "فتح Manifest ↗":"Open Manifest ↗",
    "جارٍ التحقق":"Checking",
    "ما لقينا إضافات تطابق بحثك.":"No add-ons match your search.",
    "إضافة مستقلة لمشاريع Nuvio.":"An independent add-on for Nuvio projects.",
    "مشروع إضافة مستقل ضمن مكتبة Nuvio.":"An independent add-on in the Nuvio library.",
    "إضافة All-in-One لمشروع Nuvio من المستودع الأصلي.":"The All-in-One add-on for Nuvio from its original repository.",
    "إضافة للبحث عن الترجمات وعرضها.":"An add-on for searching and displaying subtitles.",
    "كتالوج لاكتشاف العناوين وبيانات الأفلام والمسلسلات، وليس مشغّل فيديو.":"A catalog for discovering movies and series metadata, not a video player.",
    "المصدر الرسمي لبيانات الأفلام والمسلسلات في Stremio. توافقه مع Nuvio يحتاج اختباراً.":"The official source for movie and series metadata in Stremio. Nuvio compatibility needs testing.",
    "إضافة قنوات YouTube إلى Stremio. توافقها مع Nuvio يحتاج اختباراً.":"Adds YouTube channels to Stremio. Nuvio compatibility needs testing.",
    "سجل التغييرات":"Changelog",
    "تحديثات المصادر وحالات الفحص وإصدارات Nuvio.":"Source updates, check results, and Nuvio releases.",
    "لا توجد تغييرات مسجلة حالياً.":"No changes have been recorded yet.",
    "تعذر تحميل سجل التغييرات حالياً.":"Unable to load the changelog right now.",
    "تنزيلات Nuvio":"Nuvio Downloads",
    "ملفات الإصدار الأحدث تُقرأ من تقرير الفحص.":"Latest release files are loaded from the health report.",
    "صفحة الإصدارات ↗":"Releases page ↗",
    "جارٍ تحميل الإصدار...":"Loading release...",
    "مصادر المطوّرين":"Developer Resources",
    "التطبيق الرسمي · GitHub ↗":"Official app · GitHub ↗",
    "مستودع إضافات المجتمع ↗":"Community add-ons repository ↗",
    "الموقع الرسمي ↗":"Official website ↗",
    "لا توجد بيانات إصدار":"No release information",
    "تعذر جلب معلومات الإصدار الأخير.":"Unable to load the latest release information.",
    "ملف غير متاح":"File unavailable",
    "غير متاح حالياً":"Currently unavailable",
    "الحجم غير متاح":"Size unavailable",
    "تاريخ النشر غير متاح":"Publication date unavailable",
    "غير متاح":"Unavailable",
    "سليم":"Healthy",
    "يحتاج مراجعة":"Needs review",
    "تعذر تحميل تقرير الفحص":"Unable to load the health report",
    "تقرير الحالة غير متاح حالياً.":"The status report is currently unavailable.",
    "متاح":"Available",
    "فشل الفحص":"Check failed",
    "تنزيل مباشر ↗":"Direct download ↗",
    "موارد":"Resources"
  };

  const reverse = Object.fromEntries(
    Object.entries(translations).map(([ar, en]) => [en, ar])
  );

  let lang = "ar";
  try {
    lang = localStorage.getItem("hashimxc12-language") || "ar";
  } catch (_) {}

  const originalText = new WeakMap();

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);

    const original = originalText.get(node);
    const trimmed = original.trim();
    const translated = lang === "en" ? translations[trimmed] : reverse[trimmed];

    if (translated) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = leading + translated + trailing;
    } else {
      node.nodeValue = original;
    }
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) translateNode(node);

    const search = document.querySelector("#search");
    if (search) {
      search.placeholder = lang === "ar" ? "ابحث عن إضافة..." : "Search add-ons...";
    }

    const button = document.querySelector("#language-toggle");
    if (button) {
      button.textContent = lang === "ar" ? "English" : "العربية";
    }

    try {
      localStorage.setItem("hashimxc12-language", lang);
    } catch (_) {}
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("#language-toggle");
    if (!button) return;

    lang = lang === "ar" ? "en" : "ar";
    applyLanguage();
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          translateNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let child;
          while ((child = walker.nextNode())) translateNode(child);
        }
      }
    }
  });

  function start() {
    applyLanguage();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
