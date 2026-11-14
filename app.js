const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let activeFilter = 'all';

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2200);
}

$$('.copy-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      toast('تم نسخ رابط Manifest بنجاح');
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      toast(copied ? 'تم نسخ الرابط' : 'تعذر النسخ من هذا المتصفح');
    }
  });
});

function filterCards() {
  const term = $('#search').value.trim().toLowerCase();
  let count = 0;
  $$('.plugin-card').forEach(card => {
    const type = card.querySelector('.type-tag').classList.contains('external') ? 'stremio' : 'nuvio';
    const matchType = activeFilter === 'all' || activeFilter === type;
    const matchText = card.innerText.toLowerCase().includes(term);
    card.hidden = !(matchType && matchText);
    if (!card.hidden) count++;
  });
  $('#visible-count').textContent = `${String(count).padStart(2, '0')} RESOURCES`;
  $('#empty-state').hidden = count !== 0;
}
$('#search').addEventListener('input', filterCards);
$$('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  $$('.filter').forEach(item => item.classList.toggle('active', item === button));
  filterCards();
}));

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'الحجم غير متاح';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(value) {
  if (!value) return 'تاريخ النشر غير متاح';
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function renderDownloads(report) {
  const release = report.release;
  if (!release) {
    $('#release-heading').textContent = 'لا توجد بيانات إصدار';
    $('#download-grid').innerHTML = '<p class="muted">تعذر جلب معلومات الإصدار الأخير.</p>';
    return;
  }
  $('#release-heading').textContent = release.tag || release.name;
  $('#release-version').textContent = release.tag || '—';
  $('#release-date').textContent = formatDate(release.published_at);
  $('#published-at').textContent = formatDate(release.published_at);
  const assets = release.assets || [];
  $('#download-count').textContent = assets.filter(item => item.ok && item.download_url).length;
  $('#download-grid').innerHTML = assets.map(asset => {
    const ready = asset.ok && asset.download_url;
    return `<article class="download-card">
      <strong>${asset.label}</strong>
      <small>${asset.name || 'ملف غير متاح'} · ${formatBytes(asset.size_bytes)}</small>
      ${ready ? `<a href="${asset.download_url}" target="_blank" rel="noopener">تنزيل مباشر ↗</a>` : '<span class="muted">غير متاح حالياً</span>'}
    </article>`;
  }).join('');
}
async function loadStatus() {
  try {
    const response = await fetch(`data/status.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const report = await response.json();
    $('#health-state').textContent = report.ok ? 'سليم' : 'يحتاج مراجعة';
    $('#health-detail').textContent = `${report.passed}/${report.total} فحوصات ناجحة`;
    $('#addon-count').textContent = (report.checks || []).filter(item => item.type === 'manifest').length;
    const checks = report.checks || [];
    checks.filter(item => item.type === 'manifest').forEach(item => {
      const card = $$('.plugin-card').find(node => node.dataset.name === item.name || node.querySelector('h3').textContent === item.name);
      const status = card?.querySelector('.card-status');
      if (!status) return;
      status.classList.toggle('ok', !!item.ok);
      status.classList.toggle('bad', !item.ok);
      status.innerHTML = `<i></i>${item.ok ? `متاح · الإصدار ${item.version || 'غير محدد'}` : 'فشل الفحص'}`;
    });
    renderDownloads(report);
  } catch (error) {
    $('#health-state').textContent = 'غير متاح';
    $('#health-detail').textContent = 'تعذر تحميل تقرير الفحص';
    $('#download-grid').innerHTML = '<p class="muted">تقرير الحالة غير متاح حالياً.</p>';
    console.error('Status loading failed:', error);
  }
}
$('#year').textContent = new Date().getFullYear();
loadStatus();
