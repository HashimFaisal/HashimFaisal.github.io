const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let activeFilter = 'all';
let activeDownloadsDevice = 'mobile';
let currentLang = 'ar';
try {
  const savedLang = localStorage.getItem('nuvio-language');
  if (['ar', 'en'].includes(savedLang)) {
    currentLang = savedLang;
    localStorage.setItem('nuvio-language', savedLang);
  }
} catch (error) {
  console.warn('Language preference unavailable:', error);
}
let latestReport = null;

const translations = {
  'الإضافات': 'Add-ons',
  'نسخ Nuvio': 'Nuvio Editions',
  'مركز التنزيلات': 'Download Center',
  'مكتبة مستقلة بالكامل. اختر جهازك ثم حمّل النسخة المناسبة من مصدرها الأصلي.': 'A standalone library. Choose your device and download the matching build from its original source.',
  'أقسام الأجهزة': 'Device sections',
  'روابط أصلية': 'Original links',
  'الموبايل': 'Mobile',
  'التلفاز': 'TV',
  'الكمبيوتر': 'Desktop',
  'Smart TV': 'Smart TV',
  'مكتبة تنزيلات Nuvio': 'Nuvio Download Library',
  'ملفات الإصدار الأخير': 'Latest release files',
  'مكتبة واحدة مرتبة حسب نوع الجهاز، مع روابط تنزيل مباشرة وأحدث ملفات الإصدار.': 'One library organized by device, with direct download links and the latest release files.',
  'ملفات مباشرة مرتبطة بالإصدار المنشور، مع فحص حالة الروابط.': 'Direct files from the published release, with link health checks.',
  '4 أقسام': '4 sections',
  '3 أجهزة': '3 devices',
  'اختر جهازك للوصول إلى النسخة المناسبة. روابط التنزيل المباشر متاحة عندما ينشر المطوّر ملف تثبيت.': 'Choose your device to find the right edition. Direct downloads are available when the developer publishes an installer.',
  'الموبايل · Android وiPhone': 'Mobile · Android & iPhone',
  'نسخ الهواتف، مع روابط APK وIPA المباشرة عند توفرها.': 'Phone editions, with direct APK and IPA links where available.',
  'Android · رسمي': 'Android · Official',
  'التطبيق الرسمي لهواتف Android. اختر ملف APK حسب معمارية جهازك.': 'The official Android phone app. Choose the APK that matches your device architecture.',
  'تنزيل APK · ARM64': 'Download APK · ARM64',
  'تنزيل APK · ARMv7': 'Download APK · ARMv7',
  'تنزيل APK · x86_64': 'Download APK · x86_64',
  'كل ملفات وإصدارات Android ↗': 'All Android assets & releases ↗',
  'إذا لم تعرف معمارية هاتفك، راجع صفحة الإصدار أو استخدم ملف ARM64 للأجهزة الحديثة المتوافقة.': 'If you are unsure of your phone architecture, check the release page or use ARM64 for compatible modern devices.',
  'iPhone · iOS': 'iPhone · iOS',
  'Nuvio Mobile for iOS': 'Nuvio Mobile for iOS',
  'ملف IPA الرسمي المنشور من مطوّر Nuvio.': 'The official IPA file published by the Nuvio developer.',
  'تنزيل ملف IPA': 'Download IPA',
  'صفحة الإصدار الأصلية ↗': 'Original release page ↗',
  'تثبيت IPA على iPhone قد يتطلب أداة تثبيت جانبي؛ هذا ليس رابط App Store.': 'Installing an IPA on iPhone may require a sideloading tool; this is not an App Store link.',
  'Android · مجتمعي': 'Android · Community',
  'تفرّع مجتمعي للموبايل مع تعديلات على المشغّل والترجمات وتجربة الاستخدام.': 'A community mobile fork with player, subtitle, and usability changes.',
  'فتح الإصدارات ↗': 'Open releases ↗',
  'لم نعثر على ملف إصدار منشور يمكن ربطه مباشرةً حالياً؛ لذلك يفتح الرابط صفحة المطوّر.': 'No published release asset could be verified for a direct link, so this opens the developer page.',
  'التلفزيون · Android TV وGoogle TV': 'TV · Android TV & Google TV',
  'ملفات APK مباشرة للتلفزيون، مع اختيار المعمارية المناسبة.': 'Direct TV APK files, with architecture choices.',
  'Android TV · رسمي': 'Android TV · Official',
  'التطبيق الرسمي المصمم للشاشة الكبيرة والتحكم عن بُعد.': 'The official app designed for the big screen and remote control.',
  'تنزيل APK · Universal': 'Download APK · Universal',
  'كل ملفات وإصدارات التلفزيون ↗': 'All TV assets & releases ↗',
  'Android TV · مجتمعي': 'Android TV · Community',
  'نسخة تجريبية مستقلة مبنية على Nuvio TV وتضيف تعديلات من صاحب المشروع.': 'An independent experimental fork based on Nuvio TV with maintainer-specific changes.',
  'صفحة الإصدارات ↗': 'Releases page ↗',
  'مشروع مجتمعي مستقل؛ لا ترسل مشكلاته إلى دعم التطبيق الرسمي.': 'An independent community project; do not send its issues to official app support.',
  'نسخة خفيفة تستهدف أجهزة التلفزيون ذات الموارد المحدودة.': 'A lightweight edition targeting TVs with limited resources.',
  'تنزيل APK · Universal': 'Download APK · Universal',
  'كل ملفات الإصدار ↗': 'All release assets ↗',
  'تعطّل هذه النسخة JavaScript Plugins وبعض الوظائف؛ اقرأ التفاصيل قبل التثبيت.': 'This edition disables JavaScript Plugins and some features; read the details before installing.',
  'تفرّع Reshaped المخصص لتجربة الشاشة الكبيرة.': 'The Reshaped fork designed for the big-screen experience.',
  'التلفزيونات الذكية · Samsung وLG': 'Smart TVs · Samsung & LG',
  'روابط منفصلة حسب نظام التلفزيون ونوع حزمة التثبيت.': 'Separate links based on the TV operating system and installer package.',
  'Samsung Tizen': 'Samsung Tizen',
  'Nuvio Native Legacy · Tizen': 'Nuvio Native Legacy · Tizen',
  'نسخة مخصصة لبعض تلفزيونات Samsung بنظام Tizen. اختر الحزمة المطابقة لجيل جهازك.': 'An edition for selected Samsung Tizen TVs. Choose the package matching your device generation.',
  'تنزيل WGT': 'Download WGT',
  'تنزيل TPK': 'Download TPK',
  'Tizen 4.0': 'Tizen 4.0',
  'Tizen 6.0': 'Tizen 6.0',
  'Tizen 6.5': 'Tizen 6.5',
  'قد تتطلب ملفات TPK/WGT تفعيل وضع المطوّر وطريقة تثبيت خاصة بالتلفزيون.': 'TPK/WGT files may require Developer Mode and a TV-specific installation process.',
  'LG webOS': 'LG webOS',
  'Nuvio Native Legacy · webOS': 'Nuvio Native Legacy · webOS',
  'حزمة IPK لتلفزيونات LG المتوافقة بنظام webOS.': 'An IPK package for compatible LG webOS TVs.',
  'تنزيل IPK': 'Download IPK',
  'تنزيل IPK · High Cache': 'Download IPK · High Cache',
  'صفحة المطوّر ↗': 'Developer page ↗',
  'تأكد من توافق إصدار webOS وطراز التلفزيون قبل التثبيت.': 'Check your webOS version and TV model compatibility before installing.',
  'Android TV / Android Box': 'Android TV / Android Box',
  'Nuvio Native Legacy · Android': 'Nuvio Native Legacy · Android',
  'ملفات APK مستقلة ضمن مشروع Native Legacy لأجهزة Android المتوافقة.': 'Standalone APK files in the Native Legacy project for compatible Android devices.',
  'تنزيل APK': 'Download APK',
  'APK Lite · ARM64': 'APK Lite · ARM64',
  'APK Lite · ARMv7': 'APK Lite · ARMv7',
  'الكمبيوتر · Windows': 'Desktop · Windows',
  'نسخ سطح المكتب المتاحة وروابط مشاريعها الأصلية.': 'Available desktop editions and their original project links.',
  'Windows · مجتمعي': 'Windows · Community',
  'تفرّع مجتمعي لسطح المكتب على Windows مع تعديلات على المشغّل والترجمات.': 'A community Windows desktop fork with player and subtitle changes.',
  'فتح صفحة المشروع والإصدارات ↗': 'Open project & releases ↗',
  'لا توجد حالياً حزمة إصدار مباشرة منشورة في صفحة Releases؛ سنعرض صفحة المشروع بدلاً من رابط تنزيل غير متحقق.': 'There is currently no published direct release asset; we show the project page instead of an unverified download link.',
  'هذه قائمة مستقلة للوصول إلى المشاريع الأصلية. لا نستضيف ملفات التثبيت. روابط APK وIPA وWGT وTPK وIPK المباشرة مأخوذة من ملفات الإصدارات المنشورة لدى المطوّرين، وقد تتغير عند صدور تحديث جديد. افحص توافق جهازك دائماً؛ المشاريع المجتمعية غير رسمية وقد يختلف دعمها وميزاتها.': 'This independent directory links to original projects. We do not host installers. Direct APK, IPA, WGT, TPK, and IPK links come from developer release assets and may change with new releases. Always check device compatibility; community projects are unofficial and may differ in support and features.',
  'تنزيل APK · ARM32': 'Download APK · ARM32',
  'تنزيل APK · x64': 'Download APK · x64',
  'تنزيل APK · x86': 'Download APK · x86',
  'المصدر · كل الإصدارات ↗': 'Source · All releases ↗',
  'هذه نسخة مجتمعية تجريبية؛ تحقق من توافق معمارية هاتفك قبل التثبيت.': 'This is an experimental community build; check your phone architecture before installing.',
  'تنزيل Windows · EXE': 'Download Windows · EXE',
  'الموبايل': 'Mobile',
  'التلفزيون': 'TV',
  'الكمبيوتر': 'Desktop',
  'التلفزيونات الذكية': 'Smart TVs',
  'اكتشف التطبيقات الرسمية والنسخ المجتمعية حسب جهازك، ونزّلها من مستودعات مطوريها.': 'Explore official apps and community editions by device, and download them from their developers’ repositories.',
  'رسمي': 'Official',
  'مجتمعي': 'Community',
  'Android وiOS بحسب ملفات الإصدار المتاحة.': 'Android and iOS, subject to available release assets.',
  'تابع القنوات المستقرة والتجريبية من صفحة الإصدارات.': 'Check the releases page for stable and beta channels.',
  'التنزيلات والإصدارات ↗': 'Downloads & Releases ↗',
  'تحقق من توافق إصدار نظام جهازك قبل التثبيت.': 'Check your device OS compatibility before installing.',
  'واجهة مناسبة للتحكم عن بُعد.': 'A TV interface designed for remote control.',
  'اختر ملف الإصدار المناسب لمعمارية جهازك.': 'Choose the release asset matching your device architecture.',
  'راجع متطلبات النظام وملاحظات الإصدار في المستودع.': 'Review system requirements and release notes in the repository.',
  'تفرّع مجتمعي لتجربة التلفزيون، مع تعديلات وميزات إضافية مقارنة بالتطبيق الأساسي.': 'A community TV fork with changes and extra features compared with the base app.',
  'موجّه لأجهزة Android TV.': 'Designed for Android TV devices.',
  'راجع سجل التغييرات قبل الانتقال إليه.': 'Review the changelog before switching.',
  'صفحة الإصدارات ↗': 'Releases ↗',
  'مشروع مستقل غير رسمي؛ التوافق والدعم من صاحب المستودع.': 'An unofficial independent project; compatibility and support are provided by its maintainer.',
  'نسخة خفيفة تستهدف أجهزة التلفزيون ذات الموارد المحدودة.': 'A lightweight edition targeting TVs with limited resources.',
  'مصممة لتقليل استهلاك الموارد.': 'Designed to reduce resource usage.',
  'تعطّل JavaScript Plugins وبعض الوظائف؛ ليست مناسبة لمن يعتمد على Plugins.': 'Disables JavaScript Plugins and some features; not suitable if you rely on Plugins.',
  'اقرأ قائمة الميزات المستبعدة قبل التثبيت.': 'Read the list of excluded features before installing.',
  'تفرّع للموبايل يضيف تحسينات على المشغّل والترجمات وتجربة الاستخدام.': 'A mobile fork with player, subtitle, and usability improvements.',
  'يتضمن تحسينات مثل مزامنة الترجمة التلقائية بحسب وصف المشروع.': 'Includes improvements such as automatic subtitle synchronization, according to the project description.',
  'تحقق من قناة Stable أو Beta قبل التنزيل.': 'Check whether the Stable or Beta channel is right for you before downloading.',
  'نسخة مجتمعية وليست إصداراً رسمياً من Nuvio.': 'A community edition, not an official Nuvio release.',
  'تفرّع Reshaped المخصص لأجهزة التلفزيون.': 'The Reshaped fork designed for TV devices.',
  'واجهة معدّلة لتجربة الشاشة الكبيرة.': 'A modified interface for the big-screen experience.',
  'راجع ملفات الإصدار والمتطلبات في المستودع.': 'Review release assets and requirements in the repository.',
  'مشروع مجتمعي مستقل.': 'An independent community project.',
  'مشروع عميل لأجهزة التلفزيون ذات الأنظمة المختلفة، ويحتاج اختيار حزمة التثبيت المطابقة لطراز الجهاز.': 'A client project for selected smart TV platforms; choose the installation package that matches your device model.',
  'تحقق من دعم نظام وتوليفة جهازك في صفحة المشروع.': 'Check your OS and device model support on the project page.',
  'قد تختلف طريقة التثبيت عن تثبيت APK المعتاد.': 'The installation method may differ from a standard APK install.',
  'لا تثبّت حزمة قبل التأكد من توافقها مع جهازك.': 'Do not install a package until you confirm device compatibility.',
  'تفرّع لسطح المكتب على Windows مع تحسينات للمشغّل والترجمات وميزات إضافية.': 'A Windows desktop fork with player, subtitle, and additional feature improvements.',
  'ليس تطبيقاً رسمياً.': 'Not an official app.',
  'راجع نوع ملف التثبيت ومتطلبات Windows في صفحة الإصدار.': 'Check the installer type and Windows requirements on the release page.',
  'الميزات والتحديثات تخضع لصاحب المشروع المستقل.': 'Features and updates are maintained by the independent project owner.',
  'هذه قائمة مستقلة لتسهيل الوصول إلى المشاريع. لا نستضيف ملفات التثبيت ولا نضمن توافق كل نسخة مع جميع الأجهزة. روابط التنزيل تفتح صفحات المطورين الأصلية. دعم Plugins وميزات Debrid يختلف حسب التطبيق والإضافات المستخدمة.': 'This independent directory helps you find projects. We do not host installers or guarantee compatibility with every device. Download links open the original developer pages. Plugin support and Debrid features vary by app and the add-ons you use.',
  'NUVIO EDITIONS': 'NUVIO EDITIONS',
  'APP DIRECTORY': 'APP DIRECTORY',

  'التنزيلات': 'Downloads',
  'حالة النظام': 'System Status',
  'سجل التغييرات': 'Changelog',
  'كل إضافات Nuvio': 'All Nuvio add-ons',
  'في مركز واحد': 'in one place',
  'اكتشف الإضافات، ثبّتها بسهولة، وتابع الإصدارات وحالة الخدمات من مكان واحد.': 'Discover add-ons, install them easily, and follow releases and service status in one place.',
  'استكشف الإضافات': 'Explore Add-ons',
  'أحدث التنزيلات': 'Latest Downloads',
  'روابط مباشرة': 'Direct Links',
  'فحص تلقائي': 'Automated Checks',
  'تحديثات الإصدارات': 'Release Updates',
  'حالة الفحص': 'Check Status',
  'جارٍ التحميل': 'Loading',
  'نقرأ آخر تقرير': 'Reading latest report',
  'الإضافات المفحوصة': 'Checked Add-ons',
  'أحدث إصدار': 'Latest Release',
  'ملفات التنزيل': 'Download Files',
  'مصادر سليمة': 'Healthy Sources',
  'مصادر متعطلة': 'Unavailable Sources',
  'اختبار جلب المصادر': 'Stream retrieval test',
  'نتيجة مرشحة': 'candidates',
  'الخادم ردّ، لكن ما رجّع مصادر للفيلم التجريبي': 'The server responded but returned no sources for the test movie.',
  'الفيلم التجريبي غير موجود بفهرس المزود؛ النتيجة غير حاسمة': 'The test movie is not indexed by this provider; result is inconclusive.',
  'تعذر اختبار جلب المصادر': 'Stream retrieval test failed',
  'فحص ملفات المزود': 'Provider file check',
  'Manifest متاح': 'Manifest Available',
  'تحتاج مراجعة': 'Needs Review',
  'آخر فحص': 'Last Check',
  'وقت التحديث': 'Last Updated',
  'التقرير حديث': 'Report is fresh',
  'التقرير متأخر': 'Report is delayed',
  'التقرير قديم': 'Report is stale',
  'بانتظار التقرير': 'Waiting for report',
  'إضافة': 'Added',
  'تحديث إصدار': 'Version Update',
  'تغيّر حالة': 'Status Change',
  'إصدار Nuvio': 'Nuvio Release',
  'النظام': 'System',
  'وقت التقرير غير معروف': 'Report time unavailable',
  'مكتبة الإضافات': 'Add-on Library',
  'روابط Manifest واضحة، مع نسخ مباشر من نفس الصفحة.': 'Clear manifest links with one-click copying.',
  'ابحث عن إضافة...': 'Search add-ons...',
  'الكل': 'All',
  'إضافات Nuvio Add-ons': 'Nuvio Add-ons',
  'الكتالوجات': 'Catalogs',
  'مصادر البث': 'Streaming Sources',
  'مصدر بث': 'Streaming Source',
  'يوفّر مصادر تشغيل للأفلام والمسلسلات والأنمي عبر مزودي تورنت متعددين. يمكن تخصيص مزودي المصادر وخدمات Debrid من صفحة الإعداد.': 'Provides movie, series, and anime streams from multiple torrent providers. Provider and Debrid service settings are available on the configuration page.',
  'إعداد Torrentio ↗': 'Configure Torrentio ↗',
  'مصدر بث · إعدادات اختيارية': 'Streaming source · Optional settings',
  'الترجمات': 'Subtitles',
  'التقييمات والبيانات': 'Ratings & Metadata',
  'ما لقينا موارد تطابق بحثك.': 'No resources match your search.',
  'موارد': 'RESOURCES',
  'جارٍ تحميل روابط التنزيل...': 'Loading download links...',
  'تعذر تأكيد الرابط حالياً؛ الرابط محفوظ ويمكن تجربته.': 'Link verification failed; the saved download link is still available to try.',
  'بيانات إصدار محفوظة مؤقتاً بسبب تعذر التحديث.': 'Showing the saved release because the latest update could not be fetched.',
  'بيانات التنزيل محفوظة لكن الكاش قديم؛ استخدمها بحذر.': 'Saved download data is stale; use these links with caution.',
  'تحديث': 'Update',
  'نسخ الرابط': 'Copy Link',
  'تثبيت في Nuvio': 'Install in Nuvio',
  'ضغط للنسخ والفتح Nuvio': 'Tap to copy and open Nuvio',
  'تم نسخ رابط المشاركة': 'Share link copied',
  'فتح Manifest ↗': 'Open Manifest ↗',
  'جارٍ التحقق': 'Checking',
  'إضافة مستقلة لمشاريع Nuvio.': 'An independent add-on for Nuvio projects.',
  'مشروع إضافة مستقل ضمن مكتبة Nuvio.': 'An independent add-on in the Nuvio library.',
  'إضافة All-in-One لمشروع Nuvio من المستودع الأصلي.': 'The All-in-One add-on for Nuvio from its original repository.',
  'إضافة للبحث عن الترجمات وعرضها.': 'An add-on for searching and displaying subtitles.',

  'إضافة رسمية للبحث عن ترجمات الأفلام والمسلسلات عبر Manifest عام مباشر، بدون إعداد رابط شخصي.': 'An official add-on for searching movie and series subtitles through a public direct manifest, with no personal setup required.',
  'إضافة ترجمات للأفلام والمسلسلات. رابط Manifest عام مباشر؛ إعداد اللغات والخيارات الإضافية متاح من صفحة المزود.': 'Movie and series subtitle add-on with a public direct manifest; language preferences and extra options are available on the provider site.',
  'إضافة ترجمات متوافقة مع Nuvio. تجمع مصادر متعددة، واختر English وArabic فقط عند إعدادها لتوليد Manifest الخاص بك.': 'A subtitle add-on tested and compatible with Nuvio. It aggregates multiple sources; select English and Arabic only during setup to generate your manifest.',
  'اختيار العربية والإنجليزية وتوليد Manifest ↗': 'Choose Arabic & English and Generate Manifest ↗',
  'بعد فتح الصفحة، فعّل English وArabic ثم اضغط Copy link. انسخ رابط Manifest الناتج وأضفه يدوياً من داخل Nuvio؛ رابط الصفحة نفسه ليس Manifest.': 'On the page, select English and Arabic, then tap Copy link. Copy the generated manifest URL and add it manually inside Nuvio; the page URL itself is not a manifest.',
  'متوافق مع Nuvio · تم الاختبار': 'Nuvio compatible · Tested',
  'متوافق مع Nuvio · تم الاختبار': 'Nuvio compatible · Tested',
  'إضافة للبحث عن ترجمات الأفلام والمسلسلات والأنمي.': 'An add-on for searching subtitles for movies, series, and anime.',

  'نسخة مجتمعية من OpenSubtitles V3 بواجهة إعداد منفصلة. افتح صفحة الإعداد وأنشئ رابط Manifest الخاص بك قبل إضافته إلى Nuvio.': 'A community OpenSubtitles V3 build with a separate configuration page. Generate your personal manifest URL before adding it to Nuvio.',
  'مجتمع لمشاركة الترجمات ورفعها وتقييم جودتها. يتطلب إنشاء حساب للحصول على رابط تثبيت شخصي.': 'A community for sharing, uploading, and rating subtitles. Create an account to receive a personal installation link.',
  'مصدر إضافي للبحث عن ترجمات متعددة اللغات. اضبط اللغات وأدخل API key المطلوب ثم أنشئ رابط الإضافة.': 'An additional multilingual subtitle source. Select languages, enter the required API key, and generate your addon link.',
  'يجمع الترجمات من عدة مزودين مثل OpenSubtitles وSubDL وSubSource. اختر اللغات، ويمكن ربط مفاتيح API لمصادر إضافية.': 'Aggregates subtitles from providers such as OpenSubtitles, SubDL, and SubSource. Select languages and optionally connect API keys for additional sources.',
  'يجلب الترجمات من عدة مصادر ويدعم إنشاء ترجمات مترجمة بالذكاء الاصطناعي. يمكن استخدامه لجلب الترجمات فقط، أما الترجمة الآلية فتحتاج إعداد مزود AI.': 'Fetches subtitles from multiple sources and supports AI translation. It can fetch subtitles without translation; AI translation requires a configured provider.',
  'إضافة ترجمة تجمع مصادر مثل Subscene وOpenSubtitles وKitsu، وتدعم ترجمة ملفات الترجمة. رابط الإعداد وارد ضمن دليل Nuvio؛ تحقق من توافر الخدمة قبل الاعتماد عليها.': 'A subtitle addon combining sources such as Subscene, OpenSubtitles, and Kitsu, with subtitle translation. The setup URL is listed by Nuvio Wiki; verify service availability before relying on it.',
  'إعداد إضافة SubDL ↗': 'Configure SubDL Add-on ↗',
  'الحصول على API ↗': 'Get API ↗',
  'فتح إعداد OpenSubtitles PRO ↗': 'Configure OpenSubtitles PRO ↗',
  'فتح Community Subtitles ↗': 'Open Community Subtitles ↗',
  'إعداد SubSource ↗': 'Configure SubSource ↗',
  'إعداد SubSense ↗': 'Configure SubSense ↗',
  'إعداد SubMaker ↗': 'Configure SubMaker ↗',
  'فتح AIO Subtitles ↗': 'Open AIO Subtitles ↗',
  'الحصول على رابط Manifest ↗': 'Get Manifest URL ↗',
  'API SubDL الاختياري ↗': 'Optional SubDL API ↗',
  'API SubSource الاختياري ↗': 'Optional SubSource API ↗',
  'API للترجمة الذكية (اختياري) ↗': 'AI Translation API (optional) ↗',
  'يتطلب إعداداً قبل الإضافة إلى Nuvio': 'Configuration required before adding to Nuvio',
  'يتطلب إعداداً ورابط Manifest شخصياً': 'Configuration and personal manifest URL required',
  'يتطلب حساباً ورابطاً شخصياً': 'Account and personal link required',
  'يتطلب API key وإعداداً': 'API key and configuration required',
  'يتطلب إعداد اللغات؛ مفاتيح بعض المصادر اختيارية': 'Language setup required; some provider keys are optional',
  'يتطلب إعداد المصادر واللغات؛ الترجمة الذكية اختيارية': 'Source and language setup required; AI translation is optional',
  'رابط موصى به في دليل Nuvio؛ التوافر يحتاج تحققاً': 'Listed by Nuvio Wiki; availability needs verification',
  'اضغط للحصول على API.': 'Click to get API.',
  'إعداد الإضافة من الموقع الرسمي لـ SubDL.': 'Configure the add-on on the official SubDL website.',
  'الحصول على API وإعداد الإضافة': 'Get API & Configure Add-on',
  "كتالوج لاكتشاف العناوين وبيانات الأفلام والمسلسلات، وليس مشغّل فيديو.": "A catalog for discovering titles and movie/series metadata, not a video player.",
  'مصدر بيانات الأفلام والمسلسلات. توافقه مع Nuvio يحتاج اختباراً.': 'A source for movie and series metadata. Compatibility with Nuvio still needs testing.',
  'إضافة قنوات YouTube إلى Nuvio. توافقها يحتاج اختباراً.': 'Adds YouTube channels to Nuvio. Compatibility still needs testing.',
  'ما لقينا إضافات تطابق بحثك.': 'No add-ons match your search.',
  'تحديثات المصادر وحالات الفحص وإصدارات Nuvio.': 'Source updates, check results, and Nuvio releases.',
  'جارٍ تحميل سجل التغييرات...': 'Loading changelog...',
  'لا توجد تغييرات مسجلة حالياً.': 'No changes recorded yet.',
  'تعذر تحميل سجل التغييرات حالياً.': 'Could not load the changelog.',
  'تنزيلات Nuvio': 'Nuvio Downloads',
  'الإصدارات الرسمية وملفات التثبيت المباشرة، مع حالة التحقق من كل ملف.': 'Official releases and direct installer files, with each file verification status.',
  'صفحة الإصدارات ↗': 'Releases Page ↗',
  'تاريخ النشر': 'Published',
  'ملفات التثبيت': 'Installer files',
  'الإصدار الأحدث المتاح من Nuvio': 'The latest available Nuvio release',
  'ملفات التنزيل': 'Download files',
  'روابط مباشرة · فحص حالة الملفات': 'Direct links · File health checks',
  'LATEST RELEASE': 'LATEST RELEASE',
  'جارٍ تحميل الإصدار...': 'Loading release...',
  'مصادر المطوّرين': 'Developer Resources',
  'التطبيق الرسمي · GitHub ↗': 'Official App · GitHub ↗',
  'مستودع إضافات المجتمع ↗': 'Community Add-ons Repository ↗',
  'الموقع الرسمي ↗': 'Official Website ↗',
  'مطور مستقل · GitHub ↗': 'Independent Developer · GitHub ↗',
  'الدعم والملاحظات': 'Support & Feedback',
  'الدعم ومصادر المطوّرين': 'Support & Developer Resources',
  'الدعم والتواصل': 'Support & Contact',
  'واجهت مشكلة أو عندك اقتراح؟': 'Found an issue or have a suggestion?',
  'ساعدنا على تحسين مركز Nuvio بإرسال ملاحظات واضحة.': 'Help improve Nuvio Control Center by sharing clear feedback.',
  'مركز مستقل يطوّره Hashim Faisal لتسهيل اكتشاف إضافات Nuvio ومتابعة تحديثاتها. واجهت مشكلة أو عندك اقتراح؟ نرحّب بملاحظاتك.': 'An independent hub maintained by Hashim Faisal to make Nuvio add-ons and updates easier to discover. Have an issue or suggestion? Your feedback is welcome.',
  'تابع آخر تحديثات الإضافات والنظام ↗': 'Follow the latest add-on and system updates ↗',
  'الإبلاغ عن مشكلة': 'Report a Problem',
  'أرسل وصف المشكلة وخطوات تكرارها عبر GitHub ↗': 'Describe the issue and how to reproduce it on GitHub ↗',
  'اقتراح إضافة': 'Suggest an Add-on',
  'شارك اسم الإضافة ورابط Manifest إن توفر ↗': 'Share the add-on name and its Manifest link if available ↗',
  'يتطلب إرسال البلاغ أو الاقتراح تسجيل الدخول إلى GitHub.': 'You need to sign in to GitHub to submit a report or suggestion.',
  'Independent Nuvio Projects ·': 'Independent Nuvio Projects ·',
  'تم نسخ رابط Manifest بنجاح': 'Manifest link copied successfully',
  'تم نسخ الرابط': 'Link copied',
  'تعذر النسخ من هذا المتصفح': 'Could not copy in this browser',
  'الحجم غير متاح': 'Size unavailable',
  'تاريخ النشر غير متاح': 'Publication date unavailable',
  'الإصدار': 'Version',
  'متاح': 'Available',
  'الإصدار غير متاح': 'Version unavailable',
  'رابط Manifest شخصي جاهز للتثبيت': 'Personal Manifest ready to install',
  'متاح · الإصدار 0.0.15 · إعدادات اختيارية': 'Available · Version 0.0.15 · Optional settings',
  'رابط Manifest شخصي جاهز للتثبيت · الإصدار غير متاح': 'Personal Manifest ready to install · Version unavailable',
  'متاح · الإصدار 4.1.0': 'Available · Version 4.1.0',
  'متاح · الإصدار 2.14.7': 'Available · Version 2.14.7',
  'تاريخ الرفع': 'Uploaded',
  'تاريخ الرفع غير متاح': 'Upload date unavailable',
  'لا توجد بيانات إصدار': 'No release information',
  'تعذر جلب معلومات الإصدار الأخير.': 'Could not retrieve the latest release information.',
  'ملف غير متاح': 'File unavailable',
  'تنزيل مباشر ↗': 'Direct Download ↗',
  'غير متاح حالياً': 'Currently Unavailable',
  'سليم': 'Healthy',
  'يحتاج مراجعة': 'Needs Attention',
  'فحوصات ناجحة': 'checks passed',
  'متاح · الإصدار': 'Available · Version',
  'غير محدد': 'Unknown',
  'فشل الفحص': 'Check Failed',
  'غير متاح': 'Unavailable',
  'تعذر تحميل تقرير الفحص': 'Could not load the health report',
  'إضافة مصدر جديد: YouTube Channels': 'New source added: YouTube Channels',
  'إضافة مصدر جديد: Cinemeta': 'New source added: Cinemeta',
  'بدء سجل التغييرات': 'Changelog initialized',
  'تم إدراج Manifest ضمن قائمة المصادر التي يفحصها النظام.': 'The manifest was added to the list of sources monitored by the system.',
  'تم تفعيل سجل التغييرات الآلي في لوحة التحكم.': 'The automated changelog was enabled in the control panel.',
  'طريقة التثبيت: اضغط للفتح في Nuvio، وانتقل إلى الإعدادات، ثم المحتوى والاكتشاف، ثم الملحقات، والصق الرابط في خانة Manifest.': 'Installation method: Tap to open in Nuvio, then go to Settings → Content & Discovery → Plugins and paste the link into the Manifest field.',
  'كتالوج لاكتشاف الأفلام والمسلسلات ضمن إضافة Nuvio Catalog.': 'A catalog for discovering movies and series through the Nuvio Catalog add-on.',
  'كتالوج وبيانات للأفلام والمسلسلات من TMDB، مع خيارات للبحث والتصنيفات واللغات.': 'A movie and series catalog powered by TMDB, with search, categories, and language options.',
  'كتالوج للأفلام والمسلسلات مع بيانات ومصادر إضافية.': 'A movie and series catalog with additional metadata and sources.',
  'كتالوج لاكتشاف العناوين الشعبية اعتماداً على IMDb.': 'A catalog for discovering popular titles based on IMDb.',
  'كتالوجات لقوائمك الشخصية من TMDB وTrakt وMDBList، مع دعم الأفلام والمسلسلات.': 'Catalogs for your personal lists from TMDB, Trakt, and MDBList, with support for movies and series.',
  'يجمع تقييمات من IMDb وTMDB وMetacritic ومصادر أخرى. طريقة ظهور التقييمات داخل Nuvio تحتاج اختباراً.': 'Combines ratings from IMDb, TMDB, Metacritic, and other sources. How ratings appear in Nuvio still needs testing.',
  'يجمع بيانات الأفلام والمسلسلات والأنمي من TMDB وTVDB وIMDb وAniList وMyAnimeList ومصادر أخرى. اضبط المصادر أولاً ثم انسخ Manifest الناتج إلى Nuvio.': 'Aggregates movie, series, and anime metadata from TMDB, TVDB, IMDb, AniList, MyAnimeList, and more. Configure your sources, then copy the generated manifest into Nuvio.',
  'فتح إعداد AIOMetadata ↗': 'Configure AIOMetadata ↗',
  'يتطلب إعداداً قبل التثبيت': 'Configuration required before installation',
  'كتالوجات وبيانات اكتشاف إضافية من TMDB. افتح صفحة الإعداد لتوليد رابط Manifest الخاص بك قبل تثبيته في Nuvio.': 'Additional TMDB discovery catalogs and metadata. Open the configurator to generate your personal manifest before installing it in Nuvio.',
  'فتح صفحة الإعداد ↗': 'Open configurator ↗',
  'يجمع بيانات الأفلام والمسلسلات والأنمي من TMDB وTVDB وIMDb وAniList وMyAnimeList ومصادر أخرى. اضبط المصادر أولاً ثم استخدم رابط Manifest الشخصي لتثبيته في Nuvio.': 'Aggregates movie, series, and anime metadata from TMDB, TVDB, IMDb, AniList, MyAnimeList, and other sources. Configure your sources first, then use your personal Manifest URL to install it in Nuvio.',
  'كتالوجات وبيانات اكتشاف إضافية من TMDB. هذا رابط Manifest الشخصي الذي تم توليده من صفحة الإعداد، وجاهز للتثبيت في Nuvio.': 'Additional TMDB discovery catalogs and metadata. This personal Manifest URL was generated by the configurator and is ready to install in Nuvio.',
  'الإصدار 0.0.15 · إعدادات اختيارية': 'Version 0.0.15 · Optional setup',
  'كتالوج وبيانات أنمي من Kitsu، مع قوائم الشائع والأعلى تقييماً والأنمي الجاري عرضه.': 'Anime catalog and metadata from Kitsu, including trending, highest-rated, and currently airing lists.',
  'يعرض تقييم IMDb للأفلام والمسلسلات والحلقات ضمن نتائج المصادر. لا يوفر كتالوجات مستقلة؛ يعتمد ظهوره على دعم Nuvio لمورد stream.': 'Displays IMDb ratings for movies, series, and episodes in stream results. It has no standalone catalogs; display depends on Nuvio support for the stream resource.',
  'يعرض درجات IMDb وRotten Tomatoes وMetacritic وTMDB وTrakt وLetterboxd، إضافة إلى التصنيفات العمرية. يحتاج مفاتيح TMDB وMDBList قبل التثبيت.': 'Displays IMDb, Rotten Tomatoes, Metacritic, TMDB, Trakt, and Letterboxd scores, plus age ratings. TMDB and MDBList API keys are required before installation.',
  'إعداد التقييمات ↗': 'Configure Ratings ↗',
  'يتطلب مفاتيح API وإعداداً': 'API keys and configuration required',
  'يعرض التصنيف العمري حسب الدولة وتصنيف Common Sense Media. يحتاج مفتاح MDBList لبعض معلومات التصنيف.': 'Displays country-specific age ratings and Common Sense Media ratings. An MDBList key is required for some rating data.',
  'إعداد التصنيفات العمرية ↗': 'Configure Age Ratings ↗',
  'يحسّن ملصقات Cinemeta ويضيف شارات التقييم والأنواع والاتجاهات والجودة والتصنيف العمري. الرابط الجاهز يغلّف Cinemeta فقط؛ عطّل Cinemeta الأصلي لتجنب تكرار الكتالوجات.': 'Enhances Cinemeta posters with rating, genre, trend, quality, and age badges. The ready-made link wraps Cinemeta only; disable the original Cinemeta to avoid duplicate catalogs.',
  'إعداد كتالوج آخر ↗': 'Configure another catalog ↗',
  "رسالة ترحيبية": "Welcome message",
  "Nuvio — حيث تلتقي التقنية بالإبداع، وتبدأ تجربة مختلفة.": "Nuvio — where technology meets creativity and a different experience begins.",
  "التفاصيل": "Details",
  "إضافة ترجمات متوافقة مع Nuvio، مضبوطة على اللغتين العربية والإنجليزية، وتجمع نتائج من عدة مزودين.": "A Nuvio-compatible subtitle add-on configured for Arabic and English, aggregating results from multiple providers.",
  "تعديل اللغات ↗": "Edit Languages ↗",
  "كتالوج": "Catalog",
  "التقييمات": "Ratings",
  "تنظيف بطاقة SubtitleVideo وتوحيد زر التثبيت": "Refined the SubtitleVideo card and standardized its install button",
  "إزالة النص التوضيحي أسفل زر التثبيت، وتوحيد حدود الزر وحوافه ومسافاته مع أزرار بطاقات الإضافات.": "Removed the helper text below the install button and aligned its border, radius, and spacing with the other add-on card buttons.",
  "تفعيل رابط Manifest مباشر لـ SubtitleVideo": "Enabled a direct Manifest link for SubtitleVideo",
  "إضافة Manifest الخاص باللغتين العربية والإنجليزية إلى بطاقة SubtitleVideo، وربطه بزر التثبيت في Nuvio وفحص الحالة التلقائي.": "Added the Arabic-and-English Manifest to the SubtitleVideo card and connected it to the Nuvio install button and automatic status check.",
  "توحيد بطاقة SubtitleVideo مع بطاقات الترجمات": "Aligned the SubtitleVideo card with the subtitle cards",
  "تحديث بطاقة SubtitleVideo لتستخدم نفس تنسيق بطاقات قسم الترجمات، وإزالة وسم تجريبي بعد تأكيد توافقها مع Nuvio.": "Updated the SubtitleVideo card to match the subtitle section layout and removed its experimental label after compatibility with Nuvio was confirmed.",
  "إضافة SubtitleVideo للاختبار": "Added SubtitleVideo for testing",
  "إضافة صفحة إعداد SubtitleVideo إلى قسم الترجمات بشكل تجريبي؛ اختر English وArabic لتوليد Manifest خاص، مع التنبيه إلى احتمال تداخل النتائج مع OpenSubtitles وSubDL.": "Temporarily added the SubtitleVideo setup page to the subtitles section. Select English and Arabic to generate a Manifest, noting that results may overlap with OpenSubtitles and SubDL.",
  "حصر قسم الترجمات بالعربية والإنجليزية": "Limited the subtitles section to Arabic and English",
  "إزالة Persian Subtitles من الموقع وفحوصات Manifest؛ أصبح قسم الترجمات يضم OpenSubtitles v3 وTheSubtitleDB فقط.": "Removed Persian Subtitles from the site and Manifest checks. The subtitles section now contains only OpenSubtitles v3 and TheSubtitleDB.",
  "اعتماد إضافات الترجمات ذات Manifest مباشر فقط": "Standardized on subtitle add-ons with direct Manifests",
  "استبدال بطاقات الإعداد والحسابات الشخصية بإضافات Manifest عامة مباشرة: TheSubtitleDB وPersian Subtitles، مع الإبقاء على OpenSubtitles v3.": "Replaced setup and personal-account cards with public direct-Manifest add-ons: TheSubtitleDB and Persian Subtitles, while retaining OpenSubtitles v3.",
  "توضيح متطلبات API وروابط Manifest للترجمات": "Clarified API requirements and subtitle Manifest links",
  "تمييز الإضافات التي تحتاج API فعلياً عن الإضافات التي تعمل بدونه، وإضافة روابط مفاتيح SubDL وSubSource الاختيارية في SubSense ورابط مزود AI الاختياري في SubMaker، وتوضيح أن روابط Manifest لبعض الخدمات شخصية وتُولّد من صفحات الإعداد.": "Clarified which add-ons actually require an API, added optional SubDL and SubSource key links for SubSense and an optional AI provider link for SubMaker, and explained that some services generate personal Manifest links through their setup pages.",
  "إضافة موارد جديدة لقسم الترجمات": "Added new resources to the subtitles section",
  "إضافة OpenSubtitles PRO وCommunity Subtitles وSubSource وSubSense وSubMaker وAIO Subtitles، مع ربط إعداد SubDL وتوثيق متطلبات كل خدمة.": "Added OpenSubtitles PRO, Community Subtitles, SubSource, SubSense, SubMaker, and AIO Subtitles, along with the SubDL setup link and each service's requirements.",

  'جارٍ فحص روابط الإصدار...': 'Checking edition links...',
  'الإصدار': 'Version',
  'تعذر التحقق من روابط الإصدار': 'Could not verify edition links',
  'روابط التنزيل سليمة': 'Download links are healthy',
  'رابط تنزيل غير متاح': 'A download link is unavailable',
  'لا توجد روابط تنزيل مباشرة': 'No direct download links',
  'فحص روابط التنزيل': 'Download link check',
  'ابحث عن ملف تنزيل...': 'Search download files...',
  'تصفّح ملفات الإصدار الرسمي، ابحث حسب اسم الملف أو معمارية الجهاز، ونزّل مباشرة.': 'Browse official release files, search by filename or device architecture, and download directly.',
  'تصفية ملفات التنزيل': 'Filter download files',

  'ملفات': 'FILES',
  'Android APK': 'Android APK',
  'iOS IPA': 'iOS IPA',
  'ملفات أخرى': 'Other files',
  'ما لقينا ملفات تطابق بحثك.': 'No files match your search.',
  'ملف تثبيت مباشر لـ Nuvio.': 'Direct Nuvio installer file.',
  'لا توجد ملفات تنزيل منشورة لهذا الإصدار.': 'No downloadable files are published for this release.',
  'ملف Android': 'Android installer',
  'ملف iOS': 'iOS installer',
  'ملف آخر': 'Other file',
  'ملفات متاحة': 'Available files',
  'إجمالي الملفات': 'Total files',
  'كل ملفات الإصدار': 'All release files',


  "ربط نسخ Nuvio بالفحص الذكي والأخبار وأرقام الإصدارات": "Connected Nuvio editions to smart link checks, news, and version numbers",
  "إضافة فحص مباشر لكل روابط APK وIPA وWGT وTPK وIPK وEXE في بطاقات نسخ Nuvio، وإظهار رقم الإصدار وحالة الروابط على كل بطاقة، مع دعم العربية والإنجليزية.": "Added live checks for every APK, IPA, WGT, TPK, IPK, and EXE link in Nuvio edition cards, displaying each version number and link status in Arabic and English.",
};

const reverseTranslations = Object.fromEntries(
  Object.entries(translations).map(([ar, en]) => [en, ar])
);

function t(ar) {
  if (currentLang === 'ar') return ar;
  return translations[ar] || ar;
}

const originalTextNodes = new WeakMap();

function translateStaticText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    if (node.parentElement?.closest('#live-updates')) return;

    if (!originalTextNodes.has(node)) {
      originalTextNodes.set(node, node.nodeValue);
    }

    const original = originalTextNodes.get(node);
    const trimmed = original.trim();
    if (!trimmed) return;

    const translated = currentLang === 'en'
      ? translations[trimmed]
      : reverseTranslations[trimmed];

    node.nodeValue = translated      ? original.replace(trimmed, translated)      : original;  });
}

function updateShareButtonLabels() {
  $$('.plugin-card').forEach(card => {
    const button = card.querySelector('.share-btn');
    if (!button) return;

    const name = card.querySelector('h3')?.textContent.trim() || 'Nuvio';
    const isExternal = card.querySelector('.type-tag')?.classList.contains('external');
    const label = card.classList.contains('subdl-card')
      ? (currentLang === 'en' ? 'Click to get API' : 'اضغط للحصول على API')
      : isExternal
        ? t('تثبيت في Nuvio')
        : t('ضغط للنسخ والفتح Nuvio');

    button.textContent = label;
    button.setAttribute('aria-label', `${label} ${name}`);
  });
}

function translateChangelogText(value) {
  if (currentLang === 'ar' || typeof value !== 'string') return value;

  let match = value.match(/^إضافة مصدر جديد:\s*(.+)$/);
  if (match) return `New source added: ${match[1]}`;

  match = value.match(/^صدور إصدار مستقر من Nuvio:\s*(.+)$/);
  if (match) return `Stable Nuvio release: ${match[1]}`;

  match = value.match(/^صدور تحديث Nuvio:\s*(.+)$/);
  if (match) return `Nuvio update released: ${match[1]}`;

  match = value.match(/^تحديث إصدار (.+)$/);
  if (match) return `${match[1]} version updated`;

  match = value.match(/^الإصدار المستقر السابق كان (.+)\.$/);
  if (match) return `Previous stable version was ${match[1]}.`;

  match = value.match(/^الإصدار السابق كان (.+)\.$/);
  if (match) return `Previous version was ${match[1]}.`;

  match = value.match(/^من (.+) إلى (.+)\.$/);
  if (match) return `From ${match[1]} to ${match[2]}.`;

  return translations[value] || value;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.title = currentLang === 'ar'
    ? 'Hashim Faisal — Nuvio Control Center'
    : 'Hashim Faisal — Nuvio Control Center';

  translateStaticText();
  updateShareButtonLabels();
  if (latestReport) renderDeviceCardStatuses(latestReport);
  loadLiveUpdates();

  const changelogList = $('#changelog-list');
  if (changelogList && changelogList.children.length) {
    loadChangelog();
  }

  const search = $('#search');
  if (search) {
    search.placeholder = currentLang === 'ar'
      ? 'ابحث عن إضافة...'
      : 'Search add-ons...';
    search.setAttribute(
      'aria-label',
      currentLang === 'ar' ? 'ابحث عن إضافة' : 'Search add-ons'
    );
  }

  const toggle = $('#language-toggle');
  if (toggle) {
    toggle.textContent = currentLang === 'ar' ? 'English' : 'العربية';
    toggle.setAttribute('aria-label', currentLang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  }

  const nav = $('nav');
  if (nav) {
    nav.setAttribute(
      'aria-label',
      currentLang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'
    );
  }

  filterCards();
  updateLastChecked();

  if (latestReport) {
    renderManifestStatuses(latestReport);
    renderDownloads(latestReport);
  }

}

$('#language-toggle').addEventListener('click', () => {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';

  try {
    localStorage.setItem('nuvio-language', currentLang);
  } catch (error) {
    console.warn('Language preference could not be saved:', error);
  }

  applyLanguage();
});

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 3000);
}

$$('.copy-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        toast(t('تم نسخ رابط Manifest بنجاح'));
        return;
      }
    } catch (error) {
      console.warn('Clipboard API failed; trying fallback:', error);
    }

    let field;

    try {
      field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();

      const copied = document.execCommand('copy');
      toast(copied ? t('تم نسخ الرابط') : t('تعذر النسخ من هذا المتصفح'));
    } catch (error) {
      console.error('Copy fallback failed:', error);
      toast(t('تعذر النسخ من هذا المتصفح'));
    } finally {
      field?.remove();
      button.focus();
    }
  });
});


function buildNuvioPluginDeepLink(manifestUrl) {
  try {
    const url = new URL(manifestUrl);
    if (url.protocol !== 'https:') return null;
    return 'nuvio://plugins';
  } catch {
    return null;
  }
}

function buildNuvioAddonDeepLink(manifestUrl) {
  try {
    const url = new URL(manifestUrl);
    if (url.protocol !== 'https:') return null;
    return `nuvio://${url.host}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function installShareButtons() {
  $$('.plugin-card').forEach(card => {
    if (card.querySelector('.share-btn')) return;

    const name = card.querySelector('h3')?.textContent.trim() || 'Nuvio';
    const manifestUrl = card.querySelector('.manifest-url')?.textContent.trim();
    const type = card.querySelector('.type-tag')?.classList.contains('external')
      ? 'stremio'
      : 'nuvio';
    if (type === 'nuvio') card.classList.add('nuvio-plugin-card');
    else card.classList.add('nuvio-addon-card');

    const deepLink = type === 'nuvio'
      ? buildNuvioPluginDeepLink(manifestUrl)
      : buildNuvioAddonDeepLink(manifestUrl);

    const actions = card.querySelector('.card-actions');

    if (!deepLink || !actions) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn share-btn';
    const buttonLabel = type === 'nuvio'
      ? t('ضغط للنسخ والفتح Nuvio')
      : t('تثبيت في Nuvio');

    button.textContent = buttonLabel;
    button.setAttribute('aria-label', `${buttonLabel} ${name}`);

    button.addEventListener('click', async () => {
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(manifestUrl);
          copied = true;
        }
      } catch (error) {
        console.warn('Clipboard API failed:', error);
      }

      if (!copied) {
        const field = document.createElement('textarea');
        field.value = manifestUrl;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        copied = document.execCommand('copy');
        field.remove();
      }

      toast(copied ? t('تم نسخ رابط Manifest بنجاح') : t('تعذر النسخ من هذا المتصفح'));
      window.location.href = deepLink;
    });

    actions.appendChild(button);
  });
}

function filterCards() {
  const term = $('#search').value.trim().toLowerCase();
  let count = 0;

  // Keep library filtering scoped to the library: download cards intentionally
  // reuse the plugin-card class for their shared visual design.
  $$('#plugins .plugin-card').forEach(card => {
    const type = card.dataset.category || 'nuvio';
    const matchType = activeFilter === 'all' || activeFilter === type;
    const matchText = card.innerText.toLowerCase().includes(term);
    card.hidden = !(matchType && matchText);
    if (!card.hidden) count++;
  });
  $('#visible-count').textContent = String(count).padStart(2, '0') + ' ' + t('موارد');
  $('#empty-state').hidden = count !== 0;
}

$('#search').addEventListener('input', filterCards);

$$('#plugins .filter[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    $$('#plugins .filter[data-filter]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    filterCards();
  });
});

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return t('الحجم غير متاح');
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function updateLastChecked() {
  const node = $('#last-checked');
  const freshness = $('#report-freshness');
  if (!node) return;

  const timestamp = latestReport?.checked_at
    ? new Date(latestReport.checked_at).getTime()
    : NaN;

  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) {
    node.textContent = '—';
    if (freshness) {
      freshness.textContent = t('وقت التقرير غير معروف');
      freshness.dataset.state = 'unknown';
    }
    return;
  }

  const now = Date.now();
  const ageMinutes = Math.max(0, (now - timestamp) / 60000);
  const locale = currentLang === 'ar' ? 'ar-IQ' : 'en-US';

  node.textContent = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(timestamp));

  if (freshness) {
    let state = 'stale';
    let label = 'التقرير قديم';

    if (ageMinutes <= 30) {
      state = 'fresh';
      label = 'التقرير حديث';
    } else if (ageMinutes <= 60) {
      state = 'delayed';
      label = 'التقرير متأخر';
    }

    freshness.textContent = t(label);
    freshness.dataset.state = state;
  }
}

function formatDate(value) {
  if (!value) return t('تاريخ النشر غير متاح');

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return t('تاريخ النشر غير متاح');
  }

  const locale = currentLang === 'ar' ? 'ar-IQ' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatRelativeDate(value) {
  if (!value) return t('تاريخ الرفع غير متاح');

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return t('تاريخ الرفع غير متاح');

  const seconds = (timestamp - Date.now()) / 1000;
  const abs = Math.abs(seconds);

  let unit = 'second';
  let amount = seconds;

  if (abs >= 86400) {
    unit = 'day';
    amount = seconds / 86400;
  } else if (abs >= 3600) {
    unit = 'hour';
    amount = seconds / 3600;
  } else if (abs >= 60) {
    unit = 'minute';
    amount = seconds / 60;
  }

  const locale = currentLang === 'ar' ? 'ar-IQ' : 'en-US';
  return new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto'
  }).format(Math.round(amount), unit);
}

function safeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderManifestStatuses(report) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const manifests = checks.filter(item => item.type === 'manifest');

  document.querySelectorAll('.card-status[data-check]').forEach(status => {
    const name = status.dataset.check;
    const item = manifests.find(check => check.name === name);
    if (!item) return;

    const healthy = Boolean(item.ok);
    status.classList.toggle('ok', healthy);
    status.classList.toggle('bad', !healthy);

    const indicator = document.createElement('i');
    const streamCheck = report?.source_retrieval?.stream_checks?.find(check => check.name === name);
    const providerBundle = name === 'ALL-IN-ONE'
      ? report?.source_retrieval?.provider_bundle
      : null;
    const renderSourceDetail = () => {
      // Keep internal retrieval diagnostics out of public install cards.
      // Manifest availability is the relevant installation signal for these
      // network/runtime-dependent providers; their probe results remain in the
      // private operational health report.
      if (['CinemaBox', 'Cinemana'].includes(name)) return;

      if (streamCheck) {
        const detail = document.createElement('small');
        detail.className = 'source-probe-detail';
        if (streamCheck.probe_status === 'streams_found') {
          detail.textContent = `${t('اختبار جلب المصادر')}: ${Number(streamCheck.stream_count) || 0} ${t('نتيجة مرشحة')}`;
        } else if (streamCheck.probe_status === 'no_streams') {
          detail.textContent = t('الخادم ردّ، لكن ما رجّع مصادر للفيلم التجريبي');
        } else if (streamCheck.probe_status === 'inconclusive') {
          detail.textContent = t('الفيلم التجريبي غير موجود بفهرس المزود؛ النتيجة غير حاسمة');
        } else {
          detail.textContent = `${t('تعذر اختبار جلب المصادر')}: ${streamCheck.failure_code || 'unknown'}`;
        }
        status.append(detail);
      } else if (providerBundle) {
        const detail = document.createElement('small');
        detail.className = 'source-probe-detail';
        const available = Array.isArray(providerBundle.available_provider_files)
          ? providerBundle.available_provider_files.length
          : 0;
        const sampled = Array.isArray(providerBundle.sampled_provider_files)
          ? providerBundle.sampled_provider_files.length
          : 0;
        detail.textContent = `${t('فحص ملفات المزود')}: ${available}/${sampled}`;
        status.append(detail);
      }
    };
    const renderVersion = version => {
      const versionLabel = version
        ? `${t('الإصدار')} ${version}`
        : t('الإصدار غير متاح');
      const label = healthy
        ? `${t('متاح')} · ${versionLabel}`
        : `${t('فشل الفحص')} · ${versionLabel}`;
      status.replaceChildren(indicator, document.createTextNode(label));
      renderSourceDetail();
    };

    renderVersion(item.version);

    const card = status.closest('.plugin-card');
    const manifestNode = card?.querySelector('.manifest-url');
    const manifestUrl = manifestNode?.textContent.trim();
    if (!manifestUrl || !/^https:\/\//i.test(manifestUrl)) return;

    fetch(manifestUrl, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(manifest => {
        if (typeof manifest?.version === 'string' && manifest.version.trim()) {
          renderVersion(manifest.version.trim());
        }
      })
      .catch(error => {
        console.debug(`Live manifest version unavailable for ${name}; using report version.`, error);
      });
  });
}


function renderDeviceCardStatuses(report) {
  const items = Array.isArray(report?.version_downloads?.items)
    ? report.version_downloads.items
    : (Array.isArray(report?.checks) ? report.checks.filter(item => item.type === 'version_download') : []);

  document.querySelectorAll('.downloads-device-card').forEach(card => {
    const status = card.querySelector('.downloads-device-status');
    if (!status) return;
    const title = card.querySelector('h3')?.textContent.trim();
    const cardItems = items.filter(item => item.card === title);
    if (!cardItems.length) {
      const tags = [...new Set([...card.querySelectorAll('a.downloads-device-link')].map(link => {
        try {
          const parts = new URL(link.href).pathname.split('/').filter(Boolean);
          const index = parts.indexOf('download');
          return index >= 0 ? parts[index + 1] : null;
        } catch {
          return null;
        }
      }).filter(Boolean))];
      const versionText = tags.length ? `${t('الإصدار')} ${tags.join(' / ')}` : t('الإصدار غير متاح');
      status.textContent = `${versionText} · ${t('تعذر التحقق من روابط الإصدار')}`;
      status.dataset.state = 'unknown';
      return;
    }

    const tags = [...new Set(cardItems.map(item => item.tag).filter(Boolean))];
    const failed = cardItems.filter(item => !item.ok).length;
    const versionText = tags.length ? `${t('الإصدار')} ${tags.join(' / ')}` : t('الإصدار غير متاح');
    const healthText = failed
      ? `${failed} · ${t('رابط تنزيل غير متاح')}`
      : t('روابط التنزيل سليمة');
    status.textContent = `${versionText} · ${healthText}`;
    status.dataset.state = failed ? 'warning' : 'healthy';
    status.title = `${t('فحص روابط التنزيل')}: ${cardItems.length}`;
  });
}


function downloadCategory(asset) {
  const name = `${asset?.label || ''} ${asset?.name || ''} ${asset?.download_url || ''}`.toLowerCase();
  if (/\.ipa(?:$|[?#])|\bios\b|iphone|ipad/.test(name)) return 'ios';
  if (/\.apk(?:$|[?#])|\bandroid\b|arm64|armv7|x86/.test(name)) return 'android';
  return 'other';
}

function setDownloadsDevice(device) {
  const validDevices = ['mobile', 'tv', 'desktop'];
  if (!validDevices.includes(device)) return;
  activeDownloadsDevice = device;
  document.querySelectorAll('#downloads-device-nav [data-download-device]').forEach(button => {
    const active = button.dataset.downloadDevice === device;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('#downloads .downloads-device-section').forEach(section => {
    section.hidden = section.dataset.deviceGroup !== device;
  });
}$('#downloads-device-nav')?.addEventListener('click', event => {
  const button = event.target.closest('[data-download-device]');
  if (button) setDownloadsDevice(button.dataset.downloadDevice);
});

function renderDownloads(report) {
  const release = report?.release;
  const grid = $('#download-grid');
  const heading = $('#release-heading');
  const published = $('#published-at');
  const fileCount = $('#downloads-file-count');
  const health = $('#release-health');
  const healthLabel = $('#release-health-label');
  const empty = $('#downloads-empty-state');

  if (!release) {
    if (heading) heading.textContent = t('لا توجد بيانات إصدار');
    if (published) published.textContent = '—';
    if (fileCount) fileCount.textContent = '0';
    if (healthLabel) healthLabel.textContent = t('غير متاح');
    if (health) health.dataset.state = 'unknown';
    if (grid) grid.querySelectorAll('.release-asset-card').forEach(card => card.remove());
    if (empty) empty.textContent = t('تعذر جلب معلومات الإصدار الأخير.');
    return;
  }

  const appVersion = String(release.app_version || release.tag || '—');
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const validAssets = assets.filter(asset => asset && typeof asset === 'object');
  const healthyAssets = validAssets.filter(asset => asset.ok === true && safeHttpsUrl(asset.download_url));
  const releaseHealthy = validAssets.length > 0 && healthyAssets.length === validAssets.length;

  if (heading) heading.innerHTML = `<bdi dir="ltr">${escapeHTML(appVersion)}</bdi>`;
  $('#release-version').textContent = appVersion;
  $('#release-date').textContent = formatDate(release.published_at);
  if (published) published.textContent = formatDate(release.published_at);
  if (fileCount) fileCount.textContent = validAssets.length;
  $('#download-count').textContent = validAssets.filter(asset => safeHttpsUrl(asset.download_url)).length;

  if (health) {
    health.dataset.state = releaseHealthy ? 'healthy' : 'warning';
    const dot = health.querySelector('.download-health-dot');
    if (dot) dot.className = `download-health-dot ${releaseHealthy ? 'is-healthy' : 'is-warning'}`;
  }
  if (healthLabel) healthLabel.textContent = t(releaseHealthy ? 'متاح' : 'يحتاج مراجعة');

  if (grid) {
    grid.querySelectorAll('.release-asset-card').forEach(card => card.remove());
    const renderedAssets = validAssets.map(asset => {
      const downloadUrl = safeHttpsUrl(asset.download_url);
      const displayName = asset.name || (
        asset.label === 'iOS IPA' ? 'iOS IPA package' : t('ملف غير متاح')
      );
      const ready = Boolean(downloadUrl);
      const healthy = ready && asset.ok === true;
      const category = downloadCategory(asset);
      const categoryLabel = category === 'android'
        ? 'Android APK'
        : category === 'ios' ? 'iOS IPA' : 'ملفات أخرى';
      const fileType = /\.ipa(?:$|[?#])/i.test(displayName) ? 'IPA'
        : /\.apk(?:$|[?#])/i.test(displayName) ? 'APK' : 'FILE';
      const versionStatus = healthy ? t('سليم') : (ready ? t('يحتاج مراجعة') : t('ملف غير متاح'));
      const staleNote = report.release_fallback_used
        ? `<small class="download-meta">${t(report.release_cache_stale ? 'بيانات التنزيل محفوظة لكن الكاش قديم؛ استخدمها بحذر.' : 'بيانات إصدار محفوظة مؤقتاً بسبب تعذر التحديث.')}</small>`
        : '';
      const verificationNote = ready && !healthy
        ? `<small class="download-meta">${t('تعذر تأكيد الرابط حالياً؛ الرابط محفوظ ويمكن تجربته.')}</small>`
        : '';
      const uploadDate = asset.uploaded_at
        ? `${t('تاريخ الرفع')}: ${formatDate(asset.uploaded_at)} · ${formatRelativeDate(asset.uploaded_at)}`
        : t('تاريخ الرفع غير متاح');

      return `<article class="downloads-device-card plugin-card release-asset-card" data-category="${category}" data-ready="${ready ? 'true' : 'false'}">
        <div class="downloads-device-card__meta release-asset-card__top">
          <span class="release-asset-icon" aria-hidden="true">${fileType}</span>
          <span class="downloads-device-kind release-asset-kind">${t(categoryLabel)}</span>
        </div>
        <h3 class="release-asset-name"><bdi dir="ltr">${escapeHTML(displayName)}</bdi></h3>
        <p class="release-asset-description">${t('ملف تثبيت مباشر لـ Nuvio.')}</p>
        <div class="release-asset-meta">
          <small>${formatBytes(asset.size_bytes)}</small>
          <small>${escapeHTML(uploadDate)}</small>
          ${staleNote ? `<small>${t(report.release_cache_stale ? 'بيانات التنزيل محفوظة لكن الكاش قديم؛ استخدمها بحذر.' : 'بيانات إصدار محفوظة مؤقتاً بسبب تعذر التحديث.')}</small>` : ''}
          ${verificationNote ? `<small>${t('تعذر تأكيد الرابط حالياً؛ الرابط محفوظ ويمكن تجربته.')}</small>` : ''}
        </div>
        <div class="release-asset-status" data-state="${healthy ? 'healthy' : 'warning'}">
          <i class="release-asset-status__dot ${healthy ? 'is-healthy' : 'is-warning'}" aria-hidden="true"></i>
          <span>${versionStatus} · ${t('الإصدار')} <bdi dir="ltr">${escapeHTML(appVersion)}</bdi></span>
        </div>
        <div class="release-asset-actions">
          ${ready
            ? `<a class="release-asset-action" href="${escapeHTML(downloadUrl)}" target="_blank" rel="noopener noreferrer">${t('تنزيل مباشر ↗')}</a>`
            : `<span class="release-asset-unavailable">${t('غير متاح حالياً')}</span>`}
        </div>
      </article>`;
    }).join('');
    grid.insertAdjacentHTML('beforeend', renderedAssets);
  }

}

async function loadStatus() {
  try {
    const response = await fetch('data/status.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const report = await response.json();

    $('#health-state').textContent = t(report.ok ? 'سليم' : 'يحتاج مراجعة');
    $('#health-detail').textContent =
      `${report.passed}/${report.total} ${t('فحوصات ناجحة')}`;

    $('#addon-count').textContent =
      (report.checks || []).filter(item => item.type === 'manifest').length;

    const checks = report.checks || [];
    const manifests = checks.filter(item => item.type === 'manifest');
    const healthyManifests = manifests.filter(item => item.ok);
    const unhealthyManifests = manifests.filter(item => !item.ok);

    $('#healthy-count').textContent = healthyManifests.length;
    $('#unhealthy-count').textContent = unhealthyManifests.length;

    const healthCard = $('#health-state')?.closest('.stat-card');
    const healthyCard = $('#healthy-count')?.closest('.stat-card');
    const unhealthyCard = $('#unhealthy-count')?.closest('.stat-card');
    if (healthCard) healthCard.dataset.health = report.ok ? 'healthy' : 'warning';
    if (healthyCard) healthyCard.dataset.health = healthyManifests.length ? 'healthy' : 'unknown';
    if (unhealthyCard) unhealthyCard.dataset.health = unhealthyManifests.length ? 'warning' : 'healthy';

    latestReport = report;
    updateLastChecked();

    // Render the release grid first so a secondary status-widget error cannot
    // leave the Download Center stuck on its loading placeholder.
    renderDownloads(report);
    renderManifestStatuses(report);
    renderDeviceCardStatuses(report);
  } catch (error) {
    $('#health-state').textContent = t('غير متاح');
    $('#health-detail').textContent = t('تعذر تحميل تقرير الفحص');
    const healthCard = $('#health-state')?.closest('.stat-card');
    if (healthCard) healthCard.dataset.health = 'unknown';
    $('#download-grid')?.querySelectorAll('.release-asset-card').forEach(card => card.remove());
    const downloadsEmpty = $('#downloads-empty-state');
    if (downloadsEmpty) downloadsEmpty.textContent = t('تعذر جلب معلومات الإصدار الأخير.');
    console.error('Status loading failed:', error);
  }
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}


let liveUpdatesRequestId = 0;
let liveUpdatesRefreshTimer = null;

function syncLiveUpdatesTicker() {
  const track = $('#live-updates-track');  const content = $('#live-updates-content');
  const viewport = track?.parentElement;

  if (!viewport || !track || !content) return;

  track.querySelectorAll('[data-live-clone]').forEach(clone => clone.remove());

  const direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';

  requestAnimationFrame(() => {
    track.querySelectorAll('[data-live-clone]').forEach(clone => clone.remove());

    const segmentWidth = content.getBoundingClientRect().width;
    const viewportWidth = viewport.getBoundingClientRect().width;

    if (!segmentWidth || !viewportWidth) return;

    const cloneCount = Math.ceil(viewportWidth / segmentWidth) + 2;

    for (let i = 0; i < cloneCount; i++) {
      const clone = content.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      clone.dataset.liveClone = 'true';
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    const speed = 24;
    const duration = Math.max(8, segmentWidth / speed);

    track.style.setProperty('--live-ticker-distance', `${segmentWidth}px`);
    track.style.setProperty('--live-ticker-duration', `${duration}s`);
    track.style.setProperty('--live-ticker-start', '0px');
    track.dataset.direction = direction;
  });
}

async function loadLiveUpdates() {
  const requestId = ++liveUpdatesRequestId;
  const label = $('#live-updates-label');
  const content = $('#live-updates-content');
  const link = $('#live-updates-link');

  if (!label || !content || !link) return;

  if (!liveUpdatesRefreshTimer) {
    liveUpdatesRefreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') loadLiveUpdates();
    }, 120_000);
  }

  const isArabic = currentLang === 'ar';
  const language = isArabic ? 'ar' : 'en';
  content.dir = language;
  content.lang = language;

  function showWelcome() {
    if (requestId !== liveUpdatesRequestId) return;

    label.textContent = isArabic ? 'رسالة ترحيبية' : 'WELCOME';
    content.replaceChildren();

    const welcome = document.createElement('strong');
    welcome.textContent = isArabic
      ? '👋 مرحباً بك في Nuvio، نتمنى لك وقتاً ممتعاً! ✨'
      : '👋 Welcome to Nuvio, we hope you have a wonderful time! ✨';

    content.appendChild(welcome);
    link.hidden = true;
    link.removeAttribute('href');
    syncLiveUpdatesTicker();
  }

  try {
    const response = await fetch('data/updates.json', { cache: 'no-cache' });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (requestId !== liveUpdatesRequestId) return;

    const now = Date.now();

    const active = (Array.isArray(data) ? data : [])
      .filter(item => {
        if (!item || typeof item !== 'object') return false;

        const expiry = Date.parse(item.expiresAt);
        const published = Date.parse(item.publishedAt);

        return Number.isFinite(expiry) &&
          Number.isFinite(published) &&
          expiry > now &&
          published <= now &&
          item.title && typeof item.title === 'object' &&
          item.description && typeof item.description === 'object';
      })
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const fragment = document.createDocumentFragment();
    let displayedCount = 0;

    active.forEach(update => {
      const localizedTitle = update.title[language];
      const localizedDescription = update.description[language];

      if (
        typeof localizedTitle !== 'string' || !localizedTitle.trim() ||
        typeof localizedDescription !== 'string' || !localizedDescription.trim()
      ) return;

      let safeUrl;

      try {
        safeUrl = new URL(update.url);
      } catch {
        return;
      }

      if (safeUrl.protocol !== 'https:') return;

      const item = document.createElement('span');
      item.className = 'live-updates__item';
      item.dir = language === 'ar' ? 'rtl' : 'ltr';
      item.lang = language;

      const title = document.createElement('strong');
      title.textContent = localizedTitle;

      const details = document.createElement('a');
      details.className = 'live-updates__item-link';
      details.textContent = isArabic ? 'التفاصيل' : 'Details';
      details.href = safeUrl.href;
      details.target = '_blank';
      details.rel = 'noopener noreferrer';

      item.append(title, details);
      fragment.appendChild(item);
      displayedCount++;
    });

    if (!displayedCount) {
      showWelcome();
      return;
    }

    if (requestId !== liveUpdatesRequestId) return;

    label.textContent = isArabic ? 'مباشر' : 'LIVE';
    content.replaceChildren(fragment);
    link.hidden = true;
    link.removeAttribute('href');
    syncLiveUpdatesTicker();

  } catch (error) {
    if (requestId !== liveUpdatesRequestId) return;

    showWelcome();
    console.warn('Live updates could not be loaded:', error);
  }
}

let changelogRequestId = 0;

async function loadChangelog() {
  const requestId = ++changelogRequestId;
  const container = $('#changelog-list');
  if (!container) return;

  try {
    const response = await fetch('data/changelog.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const entries = await response.json();
    if (requestId !== changelogRequestId) return;

    if (!Array.isArray(entries) || entries.length === 0) {
      container.innerHTML = `<p class="muted">${t('لا توجد تغييرات مسجلة حالياً.')}</p>`;
      return;
    }

    const eventTypes = {
      added: { className: 'added', label: 'إضافة' },
      version: { className: 'version', label: 'تحديث إصدار' },
      status: { className: 'status', label: 'تغيّر حالة' },
      release: { className: 'release', label: 'إصدار Nuvio' },
      system: { className: 'system', label: 'النظام' }
    };

    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = Date.parse(a?.date);
      const dateB = Date.parse(b?.date);
      return (Number.isFinite(dateB) ? dateB : -Infinity)
        - (Number.isFinite(dateA) ? dateA : -Infinity);
    });

    container.innerHTML = sortedEntries.map(entry => {
      const type = eventTypes[entry?.type] || {
        className: 'update',
        label: 'تحديث'
      };
      const validDate = Number.isFinite(Date.parse(entry?.date));
      const dateText = validDate
        ? `${formatDate(entry.date)} · ${formatRelativeDate(entry.date)}`
        : formatDate(entry?.date);

      return `
        <article class="changelog-entry changelog-entry--${type.className}">
          <span class="changelog-dot"></span>
          <div class="changelog-content">
            <div class="changelog-meta">
              <span class="changelog-type">${escapeHTML(t(type.label))}</span>
              <small>${escapeHTML(dateText)}</small>
            </div>
            <strong>${escapeHTML(translateChangelogText(entry?.title || 'تحديث'))}</strong>
            <p>${escapeHTML(translateChangelogText(entry?.detail || ''))}</p>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    if (requestId !== changelogRequestId) return;
    container.innerHTML = `<p class="muted">${t('تعذر تحميل سجل التغييرات حالياً.')}</p>`;
    console.error('Changelog loading failed:', error);
  }
}

$('#year').textContent = new Date().getFullYear();
setDownloadsDevice(activeDownloadsDevice);

applyLanguage();
installShareButtons();
loadStatus();
loadChangelog();


