const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let activeFilter = 'all';
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
  'التنزيلات': 'Downloads',
  'حالة النظام': 'System Status',
  'سجل التغييرات': 'Changelog',
  'كل ما تحتاجه لعالم': 'Everything you need for the world of',
  'Nuvio في تجربة واحدة': 'Nuvio in one experience',

  'اكتشف أدواتك، واستكشف إمكانياتك، وانطلق بلا حدود.': 'Discover your tools, explore your possibilities, and move forward without limits.',
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
  'ملفات الإصدار الأحدث تُقرأ من تقرير الفحص.': 'Latest release files are loaded from the health report.',
  'صفحة الإصدارات ↗': 'Releases Page ↗',
  'LATEST RELEASE': 'LATEST RELEASE',
  'جارٍ تحميل الإصدار...': 'Loading release...',
  'مصادر المطوّرين': 'Developer Resources',
  'التطبيق الرسمي · GitHub ↗': 'Official App · GitHub ↗',
  'مستودع إضافات المجتمع ↗': 'Community Add-ons Repository ↗',
  'الموقع الرسمي ↗': 'Official Website ↗',
  'مطور مستقل · GitHub ↗': 'Independent Developer · GitHub ↗',
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

  $$('.plugin-card').forEach(card => {
    const type = card.dataset.category || 'nuvio';
    const matchType = activeFilter === 'all' || activeFilter === type;
    const matchText = card.innerText.toLowerCase().includes(term);
    card.hidden = !(matchType && matchText);
    if (!card.hidden) count++;
  });
  $('#visible-count').textContent =    `${String(count).padStart(2, '0')} ${t('موارد')}`;
  $('#empty-state').hidden = count !== 0;}

$('#search').addEventListener('input', filterCards);

$$('.filter').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    $$('.filter').forEach(item => {
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

function renderDownloads(report) {
  const release = report.release;

  if (!release) {
    $('#release-heading').textContent = t('لا توجد بيانات إصدار');
    $('#download-grid').innerHTML = `<p class="muted">${t('تعذر جلب معلومات الإصدار الأخير.')}</p>`;
    return;
  }

  const appVersion = release.app_version || '—';
  $('#release-heading').textContent = appVersion;
  $('#release-version').textContent = appVersion;
  $('#release-date').textContent = formatDate(release.published_at);
  $('#published-at').textContent = formatDate(release.published_at);

  const assets = release.assets || [];
  $('#download-count').textContent = assets.filter(item => safeHttpsUrl(item.download_url)).length;
  $('#download-grid').innerHTML = assets.map(asset => {
    const downloadUrl = safeHttpsUrl(asset.download_url);
    const displayName = asset.name || (
      asset.label === 'iOS IPA' ? 'iOS IPA package' : t('ملف غير متاح')
    );
    const ready = Boolean(downloadUrl);
    return `<article class="download-card" data-ready="${ready ? 'true' : 'false'}">
      <strong class="download-file"><bdi dir="ltr">${escapeHTML(displayName)} · ${formatBytes(asset.size_bytes)}</bdi></strong>
      <small class="download-platform">Nuvio · ${escapeHTML(asset.label || 'Download')}</small>
      ${report.release_fallback_used ? `<small class="download-meta">${t(report.release_cache_stale ? 'بيانات التنزيل محفوظة لكن الكاش قديم؛ استخدمها بحذر.' : 'بيانات إصدار محفوظة مؤقتاً بسبب تعذر التحديث.')}</small>` : ''}
      <small class="download-meta">${t('الإصدار')}: ${escapeHTML(appVersion)}</small>
      ${ready && !asset.ok ? `<small class="download-meta">${t('تعذر تأكيد الرابط حالياً؛ الرابط محفوظ ويمكن تجربته.')}</small>` : ''}
      <small class="download-meta">${asset.uploaded_at
        ? `${t('تاريخ الرفع')}: ${formatDate(asset.uploaded_at)} · ${formatRelativeDate(asset.uploaded_at)}`
        : t('تاريخ الرفع غير متاح')}</small>
      ${ready
        ? `<a class="download-action" href="${escapeHTML(downloadUrl)}" target="_blank" rel="noopener noreferrer">${t('تنزيل مباشر ↗')}</a>`
        : `<span class="download-unavailable muted">${t('غير متاح حالياً')}</span>`}
    </article>`;
  }).join('');
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

    renderManifestStatuses(report);
    renderDownloads(report);
  } catch (error) {
    $('#health-state').textContent = t('غير متاح');
    $('#health-detail').textContent = t('تعذر تحميل تقرير الفحص');
    const healthCard = $('#health-state')?.closest('.stat-card');
    if (healthCard) healthCard.dataset.health = 'unknown';
    $('#download-grid').innerHTML =
      `<p class="muted">${t('تعذر جلب معلومات الإصدار الأخير.')}</p>`;
    console.error('Status loading failed:', error);  }
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

applyLanguage();
installShareButtons();
loadStatus();
loadChangelog();