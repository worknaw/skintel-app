const orders = [];
const pageNames = {
  overview: 'ภาพรวม',
  analytics: 'Analytics',
  orders: 'คำสั่งซื้อ',
  payments: 'ตรวจสลิป',
  catalog: 'แคตตาล็อกสินค้า',
  shipping: 'การจัดส่ง',
  users: 'ผู้ใช้งาน',
  scans: 'Skin Scan',
  ai: 'AI Monitor',
  support: 'ช่วยเหลือ',
  audit: 'บันทึกกิจกรรม',
  settings: 'ตั้งค่าร้านค้า',
};

const pageWrap = document.getElementById('pageWrap');
const breadcrumb = document.getElementById('breadcrumbCurrent');
const toast = document.getElementById('toast');
const modal = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');

const escapeHtml = (value) => String(value ?? '—')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const formatCount = (value) => value == null ? '—' : Number(value).toLocaleString('th-TH');
const formatDate = (value) => value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const localDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const ORDERS_PAGE_SIZE = 20;
const money = (minor) => minor == null ? '—' : new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(minor) / 100);
const stats = () => window.__liveStats || null;
const stat = (key) => formatCount(stats()?.[key]);
const status = (label, tone = 'waiting') => `<span class="status ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
const button = (label, action, tone = 'secondary', attrs = '') => `<button type="button" class="${tone}-btn" data-action="${action}" ${attrs}>${label}</button>`;
const header = (kicker, title, description, action = '') => `<div class="page-heading"><div><p class="eyebrow">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action ? `<div class="btn-row">${action}</div>` : ''}</div>`;
const empty = (title, detail = 'ยังไม่มีข้อมูลจาก Supabase') => `<div class="empty-state"><div class="empty-icon">◌</div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
const paymentState = (value) => ({ submitted: ['รอตรวจ', 'waiting'], approved: ['อนุมัติแล้ว', 'paid'], rejected: ['ปฏิเสธ', 'failed'] })[value] || [value || 'ไม่ทราบสถานะ', 'waiting'];
const can = (permission) => {
  const role = window.__adminRole;
  if (role === 'owner' || role === 'admin') return true;
  return {
    payment: ['support'].includes(role),
    catalog: ['content'].includes(role),
    fulfillment: ['fulfillment'].includes(role),
    support: ['support'].includes(role),
    settings: false,
    manageUsers: false,
  }[permission] === true;
};

function updateNavBadges() {
  const values = {
    navOrdersCount: stats()?.orders,
    navPaymentsCount: stats()?.pendingPayments,
    navScansCount: stats()?.failedScans,
    navSupportCount: stats()?.support,
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value == null ? '' : formatCount(value);
    element.hidden = value == null || Number(value) === 0;
  });
}

function partialErrorBanner() {
  const errors = window.__livePartialErrors || [];
  if (!errors.length) return '';
  return `<section class="panel partial-warning"><strong>โหลดข้อมูลได้บางส่วน</strong><span>${escapeHtml(errors.map((item) => `${item.label}: ${item.message}`).join(' · '))}</span></section>`;
}

function roleLabel(role) {
  return ({ owner: 'Owner', admin: 'Administrator', support: 'Support', content: 'Content', fulfillment: 'Fulfillment' })[role] || role || '—';
}

function overview() {
  const live = Boolean(window.__liveReady);
  const loading = Boolean(window.__liveLoading);
  const rows = orders.slice(0, 5).map((order) => `<tr data-order="${escapeHtml(order.id)}"><td><span class="order-id">${escapeHtml(order.id)}</span></td><td><div class="customer"><span class="mini-avatar">${escapeHtml(order.initials)}</span>${escapeHtml(order.name)}</div></td><td>${escapeHtml(order.date)}</td><td><strong>${escapeHtml(order.total)}</strong></td><td>${status(order.label, order.tone)}</td></tr>`).join('');
  const partial = (window.__livePartialErrors || []).length > 0;
  const stateLabel = live ? (partial ? 'PARTIAL' : 'LIVE') : loading ? 'LOADING' : 'WAITING';
  const stateTone = live && !partial ? 'paid' : 'waiting';
  const chart = analyticsBars(orders, 'orders');
  return header('SYSTEM OVERVIEW', 'ภาพรวมระบบ', live ? 'ข้อมูลล่าสุดจาก Supabase' : loading ? 'กำลังโหลดข้อมูลจาก Supabase...' : 'ยังไม่มีข้อมูลจาก Supabase', button('↻ รีเฟรชข้อมูล', 'refresh'))
    + `<div class="metric-grid"><article class="metric-card"><div class="metric-head"><span>ผู้ใช้งานทั้งหมด</span><span class="metric-icon">♙</span></div><div class="metric-value">${stat('users')}</div><div class="metric-foot">จาก profiles</div></article><article class="metric-card"><div class="metric-head"><span>คำสั่งซื้อทั้งหมด</span><span class="metric-icon">▣</span></div><div class="metric-value">${stat('orders')}</div><div class="metric-foot"><span class="up">${money(stats()?.totalSales)}</span> ยอดที่ชำระแล้ว</div></article><article class="metric-card"><div class="metric-head"><span>รอตรวจสลิป</span><span class="metric-icon">◈</span></div><div class="metric-value">${stat('pendingPayments')}</div><div class="metric-foot">จาก payment proofs</div></article><article class="metric-card"><div class="metric-head"><span>Skin Scan ผิดพลาด</span><span class="metric-icon">◉</span></div><div class="metric-value">${stat('failedScans')}</div><div class="metric-foot">จาก ${stat('totalScans')} scans</div></article></div>`
    + partialErrorBanner()
    + (window.__liveError ? `<section class="panel" style="margin-bottom:20px">${empty('โหลดข้อมูล Supabase ไม่สำเร็จ', window.__liveError)}</section>` : '')
    + `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>คำสั่งซื้อล่าสุด</h2><p>ข้อมูลจาก store_orders</p></div><button class="text-btn" data-nav="orders">ดูทั้งหมด →</button></div><table class="order-table"><thead><tr><th>คำสั่งซื้อ</th><th>ผู้ใช้งาน</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>${rows || `<tr><td colspan="5">${empty(loading ? 'กำลังโหลดคำสั่งซื้อ...' : 'ยังไม่มีคำสั่งซื้อ')}</td></tr>`}</tbody></table></section><section class="panel"><div class="panel-head"><div><h2>สถานะระบบ</h2><p>ข้อมูลจากตารางที่เชื่อมต่อ</p></div>${status(stateLabel, stateTone)}</div><div class="activity-list"><div class="activity"><span class="activity-icon">▣</span><div><strong>สินค้า active ${stat('products')} รายการ</strong><span>จาก products</span></div></div><div class="activity"><span class="activity-icon">◉</span><div><strong>Scan ล้มเหลว ${stat('failedScans')} รายการ</strong><span>จาก skin_scans</span></div></div><div class="activity"><span class="activity-icon">◈</span><div><strong>สลิปรอตรวจ ${stat('pendingPayments')} รายการ</strong><span>จาก store_payment_proofs</span></div></div></div><div class="insight-card"><h3>การเชื่อมต่อ</h3><p>${window.__realtimeReady ? 'Realtime เปิดใช้งานอยู่' : 'ใช้ปุ่มรีเฟรชเพื่อดึงข้อมูลล่าสุด'}</p></div></section></div><section class="panel analytics-panel"><div class="panel-head"><div><h2>คำสั่งซื้อ 7 วันล่าสุด</h2><p>คำนวณจาก store_orders ที่โหลดจาก Supabase</p></div><button class="text-btn" data-nav="analytics">ดู Analytics →</button></div>${chart}</section>`;
}

function analyticsBars(list, mode) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const values = days.map((date) => list.filter((item) => {
    const created = new Date(item.createdAt || item.created_at || 0);
    return created.toDateString() === date.toDateString();
  }).reduce((sum, item) => sum + (mode === 'sales' ? Number(item.totalMinor || 0) : 1), 0));
  const max = Math.max(...values, 1);
  return `<div class="bar-chart">${values.map((value, index) => `<div class="bar-column"><span class="bar-value">${mode === 'sales' ? escapeHtml(money(value)) : formatCount(value)}</span><div class="bar-track"><div class="bar-fill" style="height:${Math.max(4, Math.round((value / max) * 100))}%"></div></div><small>${days[index].toLocaleDateString('th-TH', { weekday: 'short' })}</small></div>`).join('')}</div>`;
}

const orderRows = (list) => list.length ? list.map((order) => `<tr data-order="${escapeHtml(order.id)}"><td><span class="order-id">${escapeHtml(order.id)}</span></td><td><div class="customer"><span class="mini-avatar">${escapeHtml(order.initials)}</span>${escapeHtml(order.name)}</div></td><td>${escapeHtml(order.date)}</td><td><strong>${escapeHtml(order.total)}</strong></td><td>${status(order.label, order.tone)}</td><td style="text-align:right">›</td></tr>`).join('') : `<tr><td colspan="6">${empty('ยังไม่มีคำสั่งซื้อ')}</td></tr>`;

function orderMatchesFilter(order, query, statusValue, fromDate, toDate) {
  const createdDate = localDateKey(order.createdAt);
  return (statusValue === 'all' || order.status === statusValue)
    && `${order.id} ${order.name}`.toLowerCase().includes(query)
    && (!fromDate || (createdDate && createdDate >= fromDate))
    && (!toDate || (createdDate && createdDate <= toDate));
}

function orderFilterState() {
  return window.__orderFilters || { query: '', status: 'all', fromDate: '', toDate: '', page: 1 };
}

function orderView() {
  const filters = orderFilterState();
  const filtered = orders.filter((order) => orderMatchesFilter(order, filters.query, filters.status, filters.fromDate, filters.toDate));
  const pages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(filters.page) || 1), pages);
  if (page !== filters.page) window.__orderFilters = { ...filters, page };
  const start = (page - 1) * ORDERS_PAGE_SIZE;
  return { filtered, pages, page, visible: filtered.slice(start, start + ORDERS_PAGE_SIZE) };
}

function orderPagination(total, pages, page) {
  const numbers = [];
  const first = Math.max(1, page - 2);
  const last = Math.min(pages, page + 2);
  for (let value = first; value <= last; value += 1) {
    numbers.push(`<button type="button" class="${value === page ? 'primary' : 'secondary'}-btn pagination-btn" data-action="orders-page" data-page="${value}">${value}</button>`);
  }
  return `<div class="pagination"><span class="pagination-label">แสดง ${formatCount(total)} รายการ · หน้า ${page} / ${pages}</span><div class="pagination-actions"><button type="button" class="secondary-btn pagination-btn" data-action="orders-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>ก่อนหน้า</button>${numbers.join('')}<button type="button" class="secondary-btn pagination-btn" data-action="orders-page" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>ถัดไป</button></div></div>`;
}

function renderOrderResults() {
  const view = orderView();
  const body = document.getElementById('ordersBody');
  if (body) body.innerHTML = orderRows(view.visible);
  const count = document.getElementById('ordersCount');
  if (count) count.textContent = formatCount(view.visible.length);
  const pagination = document.getElementById('ordersPagination');
  if (pagination) pagination.innerHTML = orderPagination(view.filtered.length, view.pages, view.page);
  return view;
}

function ordersPage() {
  const filters = orderFilterState();
  const view = orderView();
  return header('STORE OPERATIONS', 'คำสั่งซื้อ', 'ข้อมูลจาก store_orders ใน Supabase', button('↓ ส่งออก CSV', 'export'))
    + `<section class="panel table-panel"><div class="toolbar"><input class="search-input" id="orderSearch" value="${escapeHtml(filters.query)}" placeholder="⌕ ค้นหาเลขคำสั่งซื้อหรือลูกค้า"/><select class="select" id="orderFilter"><option value="all" ${filters.status === 'all' ? 'selected' : ''}>ทุกสถานะ</option><option value="awaiting_payment" ${filters.status === 'awaiting_payment' ? 'selected' : ''}>รอชำระเงิน</option><option value="payment_submitted" ${filters.status === 'payment_submitted' ? 'selected' : ''}>รอตรวจสลิป</option><option value="paid" ${filters.status === 'paid' ? 'selected' : ''}>ชำระเงินแล้ว</option><option value="shipped" ${filters.status === 'shipped' ? 'selected' : ''}>จัดส่งแล้ว</option><option value="completed" ${filters.status === 'completed' ? 'selected' : ''}>สำเร็จแล้ว</option><option value="cancelled" ${filters.status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option></select><label class="date-filter"><span>จากวันที่</span><input class="date-input" id="orderDateFrom" type="date" value="${escapeHtml(filters.fromDate)}" aria-label="จากวันที่"/></label><label class="date-filter"><span>ถึงวันที่</span><input class="date-input" id="orderDateTo" type="date" value="${escapeHtml(filters.toDate)}" aria-label="ถึงวันที่"/></label><button type="button" class="secondary-btn clear-date-btn" data-action="clear-order-dates">ล้างวันที่</button><span class="toolbar-spacer"></span><span class="metric-foot">ทั้งหมด ${stat('orders')} รายการ · แสดง <span id="ordersCount">${formatCount(view.visible.length)}</span> รายการ</span></div><table class="order-table"><thead><tr><th>คำสั่งซื้อ</th><th>ผู้ใช้งาน</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr></thead><tbody id="ordersBody">${orderRows(view.visible)}</tbody></table><div id="ordersPagination">${orderPagination(view.filtered.length, view.pages, view.page)}</div></section>`;
}

function paymentRows(list) {
  return list.length ? list.map((item) => {
    const [label, tone] = paymentState(item.status);
    return `<tr data-payment="${escapeHtml(item.id)}"><td><span class="order-id">#${escapeHtml(String(item.order_id).slice(0, 8).toUpperCase())}</span></td><td>${escapeHtml(formatDate(item.submitted_at))}</td><td>${escapeHtml(item.storage_path)}</td><td>${status(label, tone)}</td><td>${escapeHtml(item.reviewer_note || '')}</td><td style="text-align:right">ดู →</td></tr>`;
  }).join('') : `<tr><td colspan="6">${empty(window.__liveLoading ? 'กำลังโหลดสลิป...' : 'ไม่พบรายการตามตัวกรอง')}</td></tr>`;
}

function paymentsPage() {
  const all = window.__livePayments || [];
  const filter = window.__paymentFilter || 'submitted';
  const action = can('payment') ? 'ตรวจสอบและเปลี่ยนสถานะได้' : 'ดูข้อมูลได้';
  const list = all.filter((item) => filter === 'all' || item.status === filter);
  return header('PAYMENT REVIEW', 'ตรวจสลิปการชำระเงิน', `ข้อมูลจาก store_payment_proofs · ${action}`, `${button('↓ ส่งออก CSV', 'export-payments')} ${button('↻ รีเฟรช', 'refresh')}`)
    + `<section class="panel table-panel"><div class="toolbar"><input class="search-input" id="paymentSearch" placeholder="⌕ ค้นหาเลขคำสั่งซื้อหรือ path"/><select class="select" id="paymentFilter"><option value="submitted" ${filter === 'submitted' ? 'selected' : ''}>รอตรวจ</option><option value="approved" ${filter === 'approved' ? 'selected' : ''}>อนุมัติแล้ว</option><option value="rejected" ${filter === 'rejected' ? 'selected' : ''}>ปฏิเสธ</option><option value="all" ${filter === 'all' ? 'selected' : ''}>ทั้งหมด</option></select><span class="toolbar-spacer"></span><span class="metric-foot">ทั้งหมด ${formatCount(all.length)} รายการ · แสดง ${formatCount(list.length)} รายการ</span></div><table class="order-table"><thead><tr><th>คำสั่งซื้อ</th><th>ส่งเมื่อ</th><th>ไฟล์หลักฐาน</th><th>สถานะ</th><th>หมายเหตุ</th><th></th></tr></thead><tbody id="paymentsBody">${paymentRows(list)}</tbody></table></section>`;
}

function brandOptions(selected) {
  return (window.__liveBrands || []).map((brand) => `<option value="${escapeHtml(brand.id)}" ${brand.id === selected ? 'selected' : ''}>${escapeHtml(brand.name)}</option>`).join('');
}

function categoryOptions(selected) {
  return (window.__liveCategories || []).map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === selected ? 'selected' : ''}>${escapeHtml(category.label)}</option>`).join('');
}

function productSummary(product) {
  const variants = (window.__liveVariants || []).filter((variant) => variant.product_id === product.id);
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const price = variants.length ? money(Math.min(...variants.map((variant) => Number(variant.price_minor || 0)))) : '—';
  return { variants, stock, price };
}

function catalogPage() {
  const list = window.__liveProducts || [];
  const actions = can('catalog') ? `${button('＋ เพิ่มสินค้า', 'new-product', 'primary')} ${button('＋ แบรนด์', 'new-brand')} ${button('＋ หมวดหมู่', 'new-category')}` : button('↻ รีเฟรช', 'refresh');
  return header('PRODUCT CONTENT', 'แคตตาล็อกสินค้า', 'ข้อมูลจาก products, store_variants และ store_offers ใน Supabase', actions)
    + `<section class="panel table-panel"><div class="toolbar"><input class="search-input" id="catalogSearch" placeholder="⌕ ค้นหาสินค้า"/><span class="toolbar-spacer"></span><span class="metric-foot">active ${stat('products')} / ทั้งหมด ${stat('totalProducts')} รายการ</span></div><table class="order-table"><thead><tr><th>สินค้า</th><th>แบรนด์</th><th>หมวดหมู่</th><th>ราคาเริ่มต้น</th><th>สต็อก</th><th>สถานะ</th></tr></thead><tbody id="catalogBody">${list.length ? list.map((product) => { const summary = productSummary(product); return `<tr data-product="${escapeHtml(product.id)}"><td><strong>${escapeHtml(product.name)}</strong><small class="cell-subtitle">${escapeHtml(product.size)}</small></td><td>${escapeHtml((window.__liveBrands || []).find((brand) => brand.id === product.brand_id)?.name || product.brand_id)}</td><td>${escapeHtml((window.__liveCategories || []).find((category) => category.id === product.category_id)?.label || product.category_id)}</td><td>${escapeHtml(summary.price)}</td><td>${formatCount(summary.stock)}</td><td>${status(product.active ? 'active' : 'inactive', product.active ? 'paid' : 'failed')}</td></tr>`; }).join('') : `<tr><td colspan="6">${empty(window.__liveLoading ? 'กำลังโหลดสินค้า...' : 'ยังไม่มีสินค้า')}</td></tr>`}</tbody></table></section>`;
}

function shippingPage() {
  const list = window.__liveShipping || [];
  return header('FULFILLMENT', 'การจัดส่ง', 'คำสั่งซื้อ paid หรือ shipped จาก Supabase', button('↻ รีเฟรช', 'refresh'))
    + `<section class="panel table-panel"><table class="order-table"><thead><tr><th>คำสั่งซื้อ</th><th>สถานะ</th><th>ขนส่ง</th><th>Tracking</th><th>วันที่</th></tr></thead><tbody>${list.length ? list.map((order) => `<tr data-order="${escapeHtml(order.id)}"><td><span class="order-id">${escapeHtml(order.id)}</span></td><td>${status(order.label, order.tone)}</td><td>${escapeHtml(order.shippingCarrier)}</td><td>${escapeHtml(order.trackingNumber)}</td><td>${escapeHtml(order.date)}</td></tr>`).join('') : `<tr><td colspan="5">${empty(window.__liveLoading ? 'กำลังโหลดการจัดส่ง...' : 'ยังไม่มีคำสั่งซื้อที่พร้อมจัดส่ง')}</td></tr>`}</tbody></table></section>`;
}

function usersPage() {
  const list = window.__liveUsers || [];
  return header('CUSTOMERS', 'ผู้ใช้งาน', 'ข้อมูลจาก profiles, skin_profiles และประวัติคำสั่งซื้อ', button('↓ ส่งออกข้อมูล', 'export-users'))
    + `<section class="panel table-panel"><div class="toolbar"><input class="search-input" id="userSearch" placeholder="⌕ ค้นหาชื่อผู้ใช้งาน"/><span class="toolbar-spacer"></span><span class="metric-foot">ทั้งหมด ${stat('users')} คน · แสดง ${formatCount(list.length)} คน</span></div><table class="order-table"><thead><tr><th>ผู้ใช้งาน</th><th>สมัครเมื่อ</th><th>Skin profile</th><th>คำสั่งซื้อ</th><th>สถานะข้อมูล</th></tr></thead><tbody id="usersBody">${list.length ? list.map((user) => { const name = user.display_name || user.id; const initials = String(name).slice(0, 2).toUpperCase(); const profile = (window.__liveSkinProfiles || []).find((item) => item.user_id === user.id); const orderCount = orders.filter((order) => order.userId === user.id).length; return `<tr data-user="${escapeHtml(user.id)}"><td><div class="customer"><span class="mini-avatar">${escapeHtml(initials)}</span><strong>${escapeHtml(name)}</strong></div></td><td>${escapeHtml(formatDate(user.created_at))}</td><td>${escapeHtml(profile?.skin_type || 'ยังไม่กรอก')}</td><td>${formatCount(orderCount)}</td><td>${status(profile ? 'มีข้อมูล profile' : 'รอข้อมูล', profile ? 'paid' : 'waiting')}</td></tr>`; }).join('') : `<tr><td colspan="5">${empty(window.__liveLoading ? 'กำลังโหลดผู้ใช้งาน...' : 'ยังไม่มีข้อมูลจาก profiles')}</td></tr>`}</tbody></table></section>`;
}

function scansPage() {
  const list = window.__liveScans || [];
  const failed = list.filter((scan) => scan.status === 'failed').length;
  const created = list.filter((scan) => scan.status === 'created').length;
  const completed = list.filter((scan) => scan.status === 'completed').length;
  return header('AI OPERATIONS', 'Skin Scan', 'ข้อมูลจาก skin_scans และ skin_analysis_results', button('↻ รีเฟรช', 'refresh'))
    + `<div class="scan-summary"><div class="scan-chip"><b>${window.__liveReady ? formatCount(created) : '—'}</b><span>created</span></div><div class="scan-chip"><b>${window.__liveReady ? formatCount(failed) : '—'}</b><span>failed</span></div><div class="scan-chip"><b>${window.__liveReady ? formatCount(completed) : '—'}</b><span>completed</span></div></div><section class="panel table-panel"><table class="order-table"><thead><tr><th>Scan ID</th><th>ผู้ใช้งาน</th><th>สร้างเมื่อ</th><th>Error</th><th>ผลลัพธ์</th><th>สถานะ</th></tr></thead><tbody>${list.length ? list.slice(0, 100).map((scan) => { const result = (window.__liveAnalysisResults || []).find((item) => item.scan_id === scan.id); return `<tr data-scan="${escapeHtml(scan.id)}"><td><span class="order-id">${escapeHtml(String(scan.id).slice(0, 8).toUpperCase())}</span></td><td>${escapeHtml(String(scan.user_id || '').slice(0, 8))}</td><td>${escapeHtml(formatDate(scan.created_at))}</td><td>${escapeHtml(scan.error_code)}</td><td>${result ? escapeHtml(result.model_name) : '—'}</td><td>${status(scan.status, scan.status === 'failed' ? 'failed' : scan.status === 'completed' ? 'paid' : 'waiting')}</td></tr>`; }).join('') : `<tr><td colspan="6">${empty(window.__liveLoading ? 'กำลังโหลด Skin Scan...' : 'ยังไม่มีข้อมูล Skin Scan')}</td></tr>`}</tbody></table></section>`;
}

function supportPage() {
  const list = window.__liveSupport || [];
  return header('CUSTOMER CARE', 'ช่วยเหลือ', 'ข้อมูลจาก support_requests และ support_replies', button('↻ รีเฟรช', 'refresh'))
    + `<section class="panel table-panel"><div class="toolbar"><span class="metric-foot">คำขอทั้งหมด ${stat('support')} รายการ · แสดง ${formatCount(list.length)} รายการ</span></div>${list.length ? `<table class="order-table"><thead><tr><th>หัวข้อ</th><th>ผู้ใช้</th><th>สถานะ</th><th>สร้างเมื่อ</th></tr></thead><tbody>${list.map((item) => `<tr data-support="${escapeHtml(item.id)}"><td><strong>${escapeHtml(item.subject)}</strong><small class="cell-subtitle">${escapeHtml(item.message)}</small></td><td>${escapeHtml(String(item.user_id).slice(0, 8))}</td><td>${status(item.status, item.status === 'resolved' ? 'paid' : item.status === 'in_progress' ? 'waiting' : 'failed')}</td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join('')}</tbody></table>` : empty(window.__liveLoading ? 'กำลังโหลดคำขอช่วยเหลือ...' : 'ยังไม่มีคำขอช่วยเหลือ')}</section>`;
}

function settingsPage() {
  const config = window.__liveCheckoutConfig || {};
  const owner = window.__adminRole === 'owner';
  const fields = config ? `<form id="settingsForm" class="form-grid"><label>เปิด Checkout<input type="checkbox" name="checkout_enabled" ${config.checkout_enabled ? 'checked' : ''} ${can('settings') ? '' : 'disabled'} /></label><label>ค่าจัดส่ง (สตางค์)<input name="shipping_fee_minor" type="number" min="0" value="${escapeHtml(config.shipping_fee_minor)}" ${can('settings') ? '' : 'disabled'} /></label><label>บริษัทขนส่ง<input name="default_shipping_carrier" value="${escapeHtml(config.shipping_carrier)}" ${can('settings') ? '' : 'disabled'} /></label><label>PromptPay<input name="promptpay_target" value="${escapeHtml(config.promptpay_target)}" ${can('settings') ? '' : 'disabled'} /></label><label>ชื่อผู้รับเงิน<input name="promptpay_display_name" value="${escapeHtml(config.promptpay_display_name)}" ${can('settings') ? '' : 'disabled'} /></label><label class="full-field">คำแนะนำการชำระเงิน<textarea name="payment_instructions" rows="4" ${can('settings') ? '' : 'disabled'}>${escapeHtml(config.payment_instructions)}</textarea></label>${can('settings') ? `<div class="form-actions full-field">${button('บันทึกตั้งค่า', 'save-settings', 'primary')}</div>` : ''}</form>` : empty(window.__liveLoading ? 'กำลังโหลดการตั้งค่า...' : 'ยังไม่มีข้อมูลการตั้งค่าร้านค้า');
  const admins = owner ? `<section class="panel nested-panel"><div class="panel-head"><div><h2>สิทธิ์แอดมิน</h2><p>Owner เท่านั้น</p></div></div>${adminUsersTable()}</section>` : '';
  return header('STORE CONFIG', 'ตั้งค่าร้านค้า', 'ค่าจาก get_store_checkout_config_v4 และ admin_users', button('↻ รีเฟรช', 'refresh')) + `<section class="panel settings-panel">${fields}</section>${admins}`;
}

function adminUsersTable() {
  const list = window.__liveAdminUsers || [];
  return list.length ? `<table class="order-table"><thead><tr><th>User ID</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>${list.map((user) => `<tr><td><code>${escapeHtml(user.user_id)}</code></td><td><select class="select admin-role-select" data-admin-role="${escapeHtml(user.user_id)}"><option value="owner" ${user.role === 'owner' ? 'selected' : ''}>owner</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option><option value="support" ${user.role === 'support' ? 'selected' : ''}>support</option><option value="content" ${user.role === 'content' ? 'selected' : ''}>content</option><option value="fulfillment" ${user.role === 'fulfillment' ? 'selected' : ''}>fulfillment</option></select></td><td><input type="checkbox" data-admin-active="${escapeHtml(user.user_id)}" ${user.active ? 'checked' : ''} /></td><td>${button('บันทึก', 'save-admin-user', 'secondary', `data-admin-id="${escapeHtml(user.user_id)}"`)}</td></tr>`).join('')}</tbody></table>` : empty('ไม่มีข้อมูล admin_users');
}

function analyticsPage() {
  const scans = window.__liveScans || [];
  return header('ANALYTICS', 'Analytics', 'ตัวเลขคำนวณจากข้อมูลจริงที่โหลดจาก Supabase', button('↻ รีเฟรช', 'refresh')) + `<div class="metric-grid"><article class="metric-card"><div class="metric-head"><span>ยอดชำระแล้ว</span><span class="metric-icon">฿</span></div><div class="metric-value">${money(stats()?.totalSales)}</div><div class="metric-foot">paid / shipped / completed</div></article><article class="metric-card"><div class="metric-head"><span>จำนวนตัวเลือกสินค้า</span><span class="metric-icon">▦</span></div><div class="metric-value">${stat('variants')}</div><div class="metric-foot">จาก store_variants</div></article><article class="metric-card"><div class="metric-head"><span>Scan สำเร็จ</span><span class="metric-icon">✓</span></div><div class="metric-value">${formatCount(scans.filter((scan) => scan.status === 'completed').length)}</div><div class="metric-foot">จากรายการที่โหลด</div></article><article class="metric-card"><div class="metric-head"><span>Realtime</span><span class="metric-icon">◉</span></div><div class="metric-value">${window.__realtimeReady ? 'ON' : 'OFF'}</div><div class="metric-foot">สถานะช่องข้อมูลสด</div></article></div><div class="dashboard-grid"><section class="panel analytics-panel"><div class="panel-head"><div><h2>คำสั่งซื้อรายวัน</h2><p>7 วันที่ผ่านมา</p></div></div>${analyticsBars(orders, 'orders')}</section><section class="panel analytics-panel"><div class="panel-head"><div><h2>ยอดขายรายวัน</h2><p>เฉพาะสถานะชำระแล้ว</p></div></div>${analyticsBars(orders.filter((order) => ['paid', 'shipped', 'completed'].includes(order.status)), 'sales')}</section></div>`;
}

function auditPage() {
  const logs = window.__liveAuditLogs || [];
  return header('AUDIT LOG', 'บันทึกกิจกรรม', 'ประวัติการเปลี่ยนแปลงจาก admin_audit_logs', button('↻ รีเฟรช', 'refresh')) + `<section class="panel table-panel">${logs.length ? `<table class="order-table"><thead><tr><th>เวลา</th><th>Action</th><th>Entity</th><th>ผู้ทำรายการ</th><th>รายละเอียด</th></tr></thead><tbody>${logs.map((log) => `<tr><td>${escapeHtml(formatDate(log.created_at))}</td><td><strong>${escapeHtml(log.action)}</strong></td><td>${escapeHtml(log.entity_type)} ${escapeHtml(log.entity_id)}</td><td>${escapeHtml(String(log.actor_id).slice(0, 8))}</td><td><code>${escapeHtml(JSON.stringify(log.metadata || {}))}</code></td></tr>`).join('')}</tbody></table>` : empty(window.__liveLoading ? 'กำลังโหลด audit log...' : 'ยังไม่มีบันทึกกิจกรรม')}</section>`;
}

function aiPage() {
  const scans = window.__liveScans || [];
  return header('AI MONITOR', 'AI Monitor', 'สถานะงาน AI จาก skin_scans และ skin_analysis_results', button('↻ รีเฟรช', 'refresh')) + `<section class="panel"><div class="activity-list"><div class="activity"><span class="activity-icon">◉</span><div><strong>ทั้งหมด ${formatCount(scans.length)} scans ที่โหลด</strong><span>สถานะ realtime: ${window.__realtimeReady ? 'connected' : 'manual refresh'}</span></div></div><div class="activity"><span class="activity-icon">✓</span><div><strong>${formatCount(scans.filter((scan) => scan.status === 'completed').length)} completed</strong><span>มีผลลัพธ์ ${formatCount((window.__liveAnalysisResults || []).length)} รายการ</span></div></div><div class="activity"><span class="activity-icon">!</span><div><strong>${formatCount(scans.filter((scan) => scan.status === 'failed').length)} failed</strong><span>ตรวจสอบ error_code ได้จากหน้า Skin Scan</span></div></div></div></section>`;
}

function render(section = 'overview') {
  const current = pageNames[section] ? section : 'overview';
  window.__activeSection = current;
  breadcrumb.textContent = pageNames[current];
  const pages = { overview, analytics: analyticsPage, orders: ordersPage, payments: paymentsPage, catalog: catalogPage, shipping: shippingPage, users: usersPage, scans: scansPage, ai: aiPage, support: supportPage, audit: auditPage, settings: settingsPage };
  pageWrap.innerHTML = pages[current]();
  updateNavBadges();
  bindInteractions();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function openModal(content, wide = false) {
  modal.classList.toggle('wide-modal', wide);
  modalBody.innerHTML = content;
  modal.classList.add('show');
  bindInteractions();
}

function closeModal() {
  modal.classList.remove('show');
  modal.classList.remove('wide-modal');
}

function formatAddress(address) {
  if (!address || typeof address !== 'object') return '—';
  return [address.recipient, address.phone, address.address_line, address.subdistrict, address.district, address.province, address.postal_code].filter(Boolean).join(' · ');
}

function openOrder(id) {
  const order = orders.find((item) => item.id === id);
  if (!order) return;
  const editable = can('fulfillment');
  const items = order.items.length ? `<table class="order-table compact-table"><thead><tr><th>สินค้า</th><th>ตัวเลือก</th><th>จำนวน</th><th>ราคา</th></tr></thead><tbody>${order.items.map((item) => `<tr><td>${escapeHtml(item.product_name)}</td><td>${escapeHtml(item.variant_label)}</td><td>${formatCount(item.quantity)}</td><td>${escapeHtml(money(item.unit_price_minor))}</td></tr>`).join('')}</tbody></table>` : empty('ไม่มีรายการสินค้าใน order');
  openModal(`<p class="eyebrow">ORDER DETAIL</p><h2 class="modal-title">${escapeHtml(order.id)}</h2><p class="modal-subtitle">${escapeHtml(order.date)} · ${status(order.label, order.tone)}</p><div class="detail-grid"><div class="detail-item"><small>ยอดรวม</small><strong>${escapeHtml(order.total)}</strong></div><div class="detail-item"><small>Payment reference</small><strong>${escapeHtml(order.paymentReference)}</strong></div><div class="detail-item"><small>ที่อยู่จัดส่ง</small><strong>${escapeHtml(formatAddress(order.addressSnapshot))}</strong></div><div class="detail-item"><small>สร้างเมื่อ</small><strong>${escapeHtml(formatDate(order.createdAt))}</strong></div></div><h3 class="section-title">รายการสินค้า</h3>${items}<form id="orderForm" class="form-grid"><input type="hidden" name="order_id" value="${escapeHtml(order.rawId)}"/><label>สถานะ<select name="status" ${editable ? '' : 'disabled'}><option value="awaiting_payment" ${order.status === 'awaiting_payment' ? 'selected' : ''}>รอชำระเงิน</option><option value="payment_submitted" ${order.status === 'payment_submitted' ? 'selected' : ''}>รอตรวจสลิป</option><option value="paid" ${order.status === 'paid' ? 'selected' : ''}>ชำระเงินแล้ว</option><option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>จัดส่งแล้ว</option><option value="completed" ${order.status === 'completed' ? 'selected' : ''}>สำเร็จแล้ว</option><option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option></select></label><label>บริษัทขนส่ง<input name="shipping_carrier" value="${escapeHtml(order.shippingCarrier)}" ${editable ? '' : 'disabled'} /></label><label>เลข Tracking<input name="tracking_number" value="${escapeHtml(order.trackingNumber)}" ${editable ? '' : 'disabled'} /></label><div class="modal-actions full-field">${editable ? button('บันทึกคำสั่งซื้อ', 'save-order', 'primary') : ''}${button('ปิด', 'close-modal')}</div></form>`, true);
}

async function openPayment(id) {
  const payment = (window.__livePayments || []).find((item) => item.id === id);
  if (!payment) return;
  const editable = can('payment');
  const [paymentLabel, paymentTone] = paymentState(payment.status);
  const canReview = editable && payment.status === 'submitted';
  openModal(`<p class="eyebrow">PAYMENT REVIEW</p><h2 class="modal-title">#${escapeHtml(String(payment.order_id).slice(0, 8).toUpperCase())}</h2><p class="modal-subtitle">ส่งเมื่อ ${escapeHtml(formatDate(payment.submitted_at))} · ${status(paymentLabel, paymentTone)}</p><div id="proofPreview" class="proof-preview">กำลังเปิดรูปสลิปแบบปลอดภัย...</div><div class="detail-grid"><div class="detail-item"><small>Storage path</small><strong>${escapeHtml(payment.storage_path)}</strong></div><div class="detail-item"><small>ตรวจเมื่อ</small><strong>${escapeHtml(formatDate(payment.reviewed_at))}</strong></div></div><label class="full-field">หมายเหตุผู้ตรวจ<textarea id="paymentNote" rows="3" placeholder="ใส่หมายเหตุถ้าต้องการ" ${canReview ? '' : 'disabled'}>${escapeHtml(payment.reviewer_note)}</textarea></label><div class="modal-actions">${canReview ? button('อนุมัติ', 'approve-payment', 'primary', `data-proof-id="${escapeHtml(payment.id)}"`) : ''}${canReview ? button('ปฏิเสธ', 'reject-payment', 'danger', `data-proof-id="${escapeHtml(payment.id)}"`) : ''}${button('ปิด', 'close-modal')}</div>`, true);
  try {
    const url = await window.adminActions.getPaymentProofUrl(payment.storage_path);
    const preview = document.getElementById('proofPreview');
    if (preview) preview.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="หลักฐานการชำระเงิน" class="proof-image" />` : empty('ไม่พบรูปสลิป');
  } catch (error) {
    const preview = document.getElementById('proofPreview');
    if (preview) preview.innerHTML = empty('เปิดรูปสลิปไม่ได้', error.message);
  }
}

function variantRows(productId) {
  const variants = (window.__liveVariants || []).filter((variant) => variant.product_id === productId);
  return variants.map((variant) => `<div class="variant-row" data-variant-row><input type="hidden" name="variant_id" value="${escapeHtml(variant.id)}"/><input name="variant_sku" placeholder="SKU" value="${escapeHtml(variant.sku)}"/><input name="variant_label" placeholder="ตัวเลือก" value="${escapeHtml(variant.label)}"/><input name="variant_price" type="number" min="0" placeholder="ราคา (สตางค์)" value="${escapeHtml(variant.price_minor)}"/><input name="variant_stock" type="number" min="0" placeholder="สต็อก" value="${escapeHtml(variant.stock)}"/><label class="check-label"><input name="variant_active" type="checkbox" ${variant.active ? 'checked' : ''}/> active</label></div>`).join('');
}

function offerRows(productId) {
  const offers = (window.__liveOffers || []).filter((offer) => offer.product_id === productId);
  return offers.map((offer) => `<div class="offer-row" data-offer-row><input type="hidden" name="offer_id" value="${escapeHtml(offer.id)}"/><input name="offer_store" placeholder="ร้านค้า" value="${escapeHtml(offer.store_name)}"/><input name="offer_price" type="number" min="0" placeholder="ราคา (สตางค์)" value="${escapeHtml(offer.price_minor)}"/><input name="offer_url" type="url" placeholder="https://..." value="${escapeHtml(offer.product_url)}"/><label class="check-label"><input name="offer_available" type="checkbox" ${offer.available ? 'checked' : ''}/> available</label></div>`).join('');
}

function openProduct(id = null) {
  const product = id ? (window.__liveProducts || []).find((item) => item.id === id) : null;
  const editable = can('catalog');
  const variants = product ? variantRows(product.id) : '';
  const offers = product ? offerRows(product.id) : '';
  const toggleButton = product && editable ? button(product.active ? 'ปิดการขาย' : 'เปิดใช้งาน', product.active ? 'archive-product' : 'activate-product', product.active ? 'danger' : 'secondary', `data-product-id="${escapeHtml(product.id)}"`) : '';
  openModal(`<p class="eyebrow">PRODUCT CONTENT</p><h2 class="modal-title">${product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h2><form id="productForm" class="form-grid"><label>Product ID<input name="id" value="${escapeHtml(product?.id)}" ${product ? 'readonly' : ''} required /></label><label>ชื่อสินค้า<input name="name" value="${escapeHtml(product?.name)}" required /></label><label>แบรนด์<select name="brand_id" required><option value="">เลือกแบรนด์</option>${brandOptions(product?.brand_id)}</select></label><label>หมวดหมู่<select name="category_id" required><option value="">เลือกหมวดหมู่</option>${categoryOptions(product?.category_id)}</select></label><label>ขนาด<input name="size" value="${escapeHtml(product?.size)}" required /></label><label>Rating<input name="rating" type="number" step="0.1" min="0" max="5" value="${escapeHtml(product?.rating)}" /></label><label>Review count<input name="review_count" type="number" min="0" value="${escapeHtml(product?.review_count || 0)}" /></label><label class="check-label"><input name="active" type="checkbox" ${product?.active !== false ? 'checked' : ''}/> active</label><label class="full-field">คำอธิบาย<textarea name="description" rows="4" required>${escapeHtml(product?.description)}</textarea></label><div class="full-field"><div class="section-title-row"><h3 class="section-title">ตัวเลือกสินค้าและสต็อก</h3><button type="button" class="secondary-btn" data-action="add-variant-row">＋ เพิ่มตัวเลือก</button></div><div id="variantRows">${variants}</div></div><div class="full-field"><div class="section-title-row"><h3 class="section-title">แหล่งซื้อสินค้า</h3><button type="button" class="secondary-btn" data-action="add-offer-row">＋ เพิ่มร้านค้า</button></div><div id="offerRows">${offers}</div></div><div class="modal-actions full-field">${editable ? button('บันทึกสินค้า', 'save-product', 'primary') : ''}${toggleButton}${button('ปิด', 'close-modal')}</div></form>`, true);
}

function openTaxonomy(type) {
  const isBrand = type === 'brand';
  openModal(`<p class="eyebrow">CATALOG SETUP</p><h2 class="modal-title">เพิ่ม${isBrand ? 'แบรนด์' : 'หมวดหมู่'}</h2><form id="taxonomyForm" class="form-grid"><input type="hidden" name="type" value="${type}"/><label>ID<input name="id" required placeholder="เช่น ${isBrand ? 'anua' : 'serum'}" /></label><label>${isBrand ? 'ชื่อแบรนด์' : 'ชื่อหมวดหมู่'}<input name="label" required /></label><div class="modal-actions full-field">${button('บันทึก', 'save-taxonomy', 'primary')}${button('ปิด', 'close-modal')}</div></form>`);
}

function openUser(id) {
  const user = (window.__liveUsers || []).find((item) => item.id === id);
  if (!user) return;
  const profile = (window.__liveSkinProfiles || []).find((item) => item.user_id === id);
  const userOrders = orders.filter((order) => order.userId === id);
  const userScans = (window.__liveScans || []).filter((scan) => scan.user_id === id);
  openModal(`<p class="eyebrow">CUSTOMER PROFILE</p><h2 class="modal-title">${escapeHtml(user.display_name || user.id)}</h2><p class="modal-subtitle">${escapeHtml(user.id)}</p><div class="detail-grid"><div class="detail-item"><small>สมัครเมื่อ</small><strong>${escapeHtml(formatDate(user.created_at))}</strong></div><div class="detail-item"><small>Skin type</small><strong>${escapeHtml(profile?.skin_type)}</strong></div><div class="detail-item"><small>คำสั่งซื้อ</small><strong>${formatCount(userOrders.length)}</strong></div><div class="detail-item"><small>Skin scans</small><strong>${formatCount(userScans.length)}</strong></div></div><h3 class="section-title">คำสั่งซื้อล่าสุด</h3>${userOrders.length ? `<table class="order-table compact-table"><thead><tr><th>Order</th><th>วันที่</th><th>สถานะ</th></tr></thead><tbody>${userOrders.slice(0, 10).map((order) => `<tr data-order="${escapeHtml(order.id)}"><td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.date)}</td><td>${status(order.label, order.tone)}</td></tr>`).join('')}</tbody></table>` : empty('ยังไม่มีคำสั่งซื้อ')}${button('ปิด', 'close-modal')}`, true);
}

function openScan(id) {
  const scan = (window.__liveScans || []).find((item) => item.id === id);
  if (!scan) return;
  const result = (window.__liveAnalysisResults || []).find((item) => item.scan_id === id);
  const observations = result?.observations ? JSON.stringify(result.observations, null, 2) : '—';
  openModal(`<p class="eyebrow">SKIN SCAN DETAIL</p><h2 class="modal-title">${escapeHtml(String(scan.id).slice(0, 12).toUpperCase())}</h2><p class="modal-subtitle">${escapeHtml(formatDate(scan.created_at))} · ${status(scan.status, scan.status === 'failed' ? 'failed' : scan.status === 'completed' ? 'paid' : 'waiting')}</p><div class="detail-grid"><div class="detail-item"><small>User ID</small><strong>${escapeHtml(scan.user_id)}</strong></div><div class="detail-item"><small>Error code</small><strong>${escapeHtml(scan.error_code)}</strong></div><div class="detail-item"><small>Model</small><strong>${escapeHtml(result?.model_name)}</strong></div><div class="detail-item"><small>Model version</small><strong>${escapeHtml(result?.model_version)}</strong></div></div><h3 class="section-title">Observations</h3><pre class="json-viewer">${escapeHtml(observations)}</pre>${button('ปิด', 'close-modal')}`, true);
}

function openSupport(id) {
  const request = (window.__liveSupport || []).find((item) => item.id === id);
  if (!request) return;
  const replies = (window.__liveSupportReplies || []).filter((reply) => reply.support_request_id === id);
  const editable = can('support');
  openModal(`<p class="eyebrow">CUSTOMER CARE</p><h2 class="modal-title">${escapeHtml(request.subject)}</h2><p class="modal-subtitle">${escapeHtml(formatDate(request.created_at))} · ${escapeHtml(request.user_id)}</p><section class="message-card"><p>${escapeHtml(request.message)}</p><small>App version: ${escapeHtml(request.app_version)}</small></section><label>สถานะ<select id="supportStatus" ${editable ? '' : 'disabled'}><option value="open" ${request.status === 'open' ? 'selected' : ''}>open</option><option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>in_progress</option><option value="resolved" ${request.status === 'resolved' ? 'selected' : ''}>resolved</option></select></label>${replies.length ? `<h3 class="section-title">ประวัติการตอบกลับ</h3><div class="reply-list">${replies.map((reply) => `<div class="reply-item"><p>${escapeHtml(reply.message)}</p><small>${escapeHtml(formatDate(reply.created_at))}</small></div>`).join('')}</div>` : ''}${editable ? `<label>ตอบกลับ<textarea id="supportReply" rows="4" placeholder="พิมพ์ข้อความตอบกลับ"></textarea></label>` : ''}<div class="modal-actions">${editable ? button('บันทึกสถานะ', 'save-support-status', 'primary', `data-support-id="${escapeHtml(id)}"`) : ''}${editable ? button('ส่งข้อความ', 'reply-support', 'secondary', `data-support-id="${escapeHtml(id)}"`) : ''}${button('ปิด', 'close-modal')}</div>`, true);
}

function globalSearchResults(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return '<p class="modal-subtitle">พิมพ์เลขคำสั่งซื้อ ชื่อสินค้า ผู้ใช้ หรือหัวข้อช่วยเหลือ</p>';
  const rows = [];
  (window.__liveProducts || []).forEach((product) => {
    if (`${product.id} ${product.name} ${product.size}`.toLowerCase().includes(needle)) rows.push(`<button class="search-result" data-product="${escapeHtml(product.id)}"><span class="search-result-kind">สินค้า</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.id)}</small></button>`);
  });
  orders.forEach((order) => {
    if (`${order.rawId} ${order.id} ${order.name} ${order.status}`.toLowerCase().includes(needle)) rows.push(`<button class="search-result" data-order="${escapeHtml(order.id)}"><span class="search-result-kind">คำสั่งซื้อ</span><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(order.name)} · ${escapeHtml(order.label)}</small></button>`);
  });
  (window.__liveUsers || []).forEach((user) => {
    if (`${user.id} ${user.display_name || ''}`.toLowerCase().includes(needle)) rows.push(`<button class="search-result" data-user="${escapeHtml(user.id)}"><span class="search-result-kind">ผู้ใช้งาน</span><strong>${escapeHtml(user.display_name || user.id)}</strong><small>${escapeHtml(user.id)}</small></button>`);
  });
  (window.__liveSupport || []).forEach((item) => {
    if (`${item.subject} ${item.message} ${item.status}`.toLowerCase().includes(needle)) rows.push(`<button class="search-result" data-support="${escapeHtml(item.id)}"><span class="search-result-kind">ช่วยเหลือ</span><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.status)}</small></button>`);
  });
  return rows.length ? `<div class="search-results">${rows.slice(0, 30).join('')}</div>` : empty('ไม่พบข้อมูล', 'ลองค้นหาด้วยคำอื่น');
}

function openGlobalSearch() {
  openModal(`<p class="eyebrow">GLOBAL SEARCH</p><h2 class="modal-title">ค้นหาทั้งระบบ</h2><input class="search-input full-field" id="globalSearchInput" placeholder="ค้นหา..." autocomplete="off"/><div id="globalSearchResults">${globalSearchResults('')}</div>${button('ปิด', 'close-modal')}`, true);
  const input = document.getElementById('globalSearchInput');
  if (input) input.focus();
}

function openNotifications() {
  const items = [
    ['สลิปรอตรวจ', stat('pendingPayments'), 'payments'],
    ['คำสั่งซื้อทั้งหมด', stat('orders'), 'orders'],
    ['Skin Scan ผิดพลาด', stat('failedScans'), 'scans'],
    ['คำขอช่วยเหลือ', stat('support'), 'support'],
  ];
  openModal(`<p class="eyebrow">OPERATIONS ALERTS</p><h2 class="modal-title">การแจ้งเตือนระบบ</h2><div class="notification-list">${items.map(([label, value, section]) => `<button class="notification-row" data-nav="${section}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></button>`).join('')}</div>${button('ปิด', 'close-modal')}`);
}

function openHelp() {
  openModal(`<p class="eyebrow">ADMIN HELP</p><h2 class="modal-title">ศูนย์ช่วยเหลือ</h2><div class="message-card"><p>หลังบ้านนี้อ่านข้อมูลจริงจาก Supabase เท่านั้น ไม่มีข้อมูลตัวอย่าง</p><ul><li>ตรวจสลิป: เลือกรายการเพื่อเปิดไฟล์แบบ signed URL และอนุมัติ/ปฏิเสธ</li><li>คำสั่งซื้อ: แก้สถานะ บริษัทขนส่ง และ Tracking ตามสิทธิ์ Fulfillment</li><li>แคตตาล็อก: แก้สินค้า ตัวเลือก ราคา สต็อก และแหล่งซื้อ</li><li>ตั้งค่าร้านค้าและสิทธิ์แอดมิน: Owner/Admin เท่านั้น</li></ul></div>${button('ปิด', 'close-modal')}`);
}

function exportCsv(rows, filename) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRows(kind = 'orders') {
  if (kind === 'users') {
    exportCsv([['user_id', 'display_name', 'created_at'], ...(window.__liveUsers || []).map((user) => [user.id, user.display_name, user.created_at])], 'skincycle-users.csv');
    return;
  }
  if (kind === 'payments') {
    exportCsv([['proof_id', 'order_id', 'user_id', 'submitted_at', 'status', 'reviewed_at', 'reviewer_note'], ...(window.__livePayments || []).map((payment) => [payment.id, payment.order_id, payment.user_id, payment.submitted_at, payment.status, payment.reviewed_at, payment.reviewer_note])], 'skincycle-payment-proofs.csv');
    return;
  }
  exportCsv([['order_id', 'user_id', 'created_at', 'total_minor', 'status'], ...orders.map((order) => [order.rawId, order.userId, order.createdAt, order.totalMinor, order.status])], 'skincycle-orders.csv');
}

async function saveOrderFromModal() {
  const form = document.getElementById('orderForm');
  const data = new FormData(form);
  await window.adminActions.updateOrder(data.get('order_id'), data.get('status'), data.get('shipping_carrier'), data.get('tracking_number'));
  closeModal();
  showToast('บันทึกคำสั่งซื้อแล้ว');
}

async function savePayment(proofId, approved) {
  const note = document.getElementById('paymentNote')?.value || '';
  await window.adminActions.reviewPayment(proofId, approved, note);
  closeModal();
  showToast(approved ? 'อนุมัติสลิปแล้ว' : 'ปฏิเสธสลิปแล้ว');
}

async function saveProductFromModal() {
  const form = document.getElementById('productForm');
  const data = new FormData(form);
  const payload = {
    id: String(data.get('id') || '').trim(),
    name: String(data.get('name') || '').trim(),
    brand_id: String(data.get('brand_id') || '').trim(),
    category_id: String(data.get('category_id') || '').trim(),
    size: String(data.get('size') || '').trim(),
    rating: data.get('rating') ? Number(data.get('rating')) : null,
    review_count: Number(data.get('review_count') || 0),
    description: String(data.get('description') || '').trim(),
    active: data.get('active') === 'on',
  };
  const existing = (window.__liveProducts || []).some((product) => product.id === payload.id);
  await window.adminActions.saveProduct(payload, !existing);
  const rows = [...form.querySelectorAll('[data-variant-row]')];
  for (const row of rows) {
    const values = row.querySelectorAll('input');
    const rowData = Object.fromEntries([...values].map((input) => [input.name, input.type === 'checkbox' ? input.checked : input.value]));
    if (!rowData.variant_sku || !rowData.variant_label) continue;
    await window.adminActions.saveVariant({ id: rowData.variant_id || crypto.randomUUID(), product_id: payload.id, sku: rowData.variant_sku.trim(), label: rowData.variant_label.trim(), price_minor: Number(rowData.variant_price || 0), currency: 'THB', stock: Number(rowData.variant_stock || 0), active: Boolean(rowData.variant_active) }, !rowData.variant_id);
  }
  const offerRowsInForm = [...form.querySelectorAll('[data-offer-row]')];
  for (const row of offerRowsInForm) {
    const values = row.querySelectorAll('input');
    const rowData = Object.fromEntries([...values].map((input) => [input.name, input.type === 'checkbox' ? input.checked : input.value]));
    if (!rowData.offer_store || !rowData.offer_url) continue;
    await window.adminActions.saveOffer({ id: rowData.offer_id || `offer-${Date.now()}-${Math.random().toString(16).slice(2)}`, product_id: payload.id, store_name: rowData.offer_store.trim(), price_minor: Number(rowData.offer_price || 0), currency: 'THB', product_url: rowData.offer_url.trim(), available: Boolean(rowData.offer_available), last_updated_at: new Date().toISOString() }, !rowData.offer_id);
  }
  await window.adminActions.reload();
  closeModal();
  showToast('บันทึกสินค้าและสต็อกแล้ว');
}

function bindInteractions() {
  document.querySelectorAll('[data-nav]').forEach((element) => {
    element.onclick = () => {
      const section = element.dataset.nav;
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.section === section));
      closeModal();
      render(section);
    };
  });
  document.querySelectorAll('[data-order]').forEach((element) => { element.onclick = () => openOrder(element.dataset.order); });
  document.querySelectorAll('[data-payment]').forEach((element) => { element.onclick = () => void openPayment(element.dataset.payment); });
  document.querySelectorAll('[data-product]').forEach((element) => { element.onclick = () => openProduct(element.dataset.product); });
  document.querySelectorAll('[data-user]').forEach((element) => { element.onclick = () => openUser(element.dataset.user); });
  document.querySelectorAll('[data-scan]').forEach((element) => { element.onclick = () => openScan(element.dataset.scan); });
  document.querySelectorAll('[data-support]').forEach((element) => { element.onclick = () => openSupport(element.dataset.support); });
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.onclick = async () => {
      const action = element.dataset.action;
      try {
        if (action === 'refresh') {
          showToast('กำลังรีเฟรชข้อมูลจาก Supabase...');
          await window.reloadAdminData();
          showToast('ข้อมูลล่าสุดแล้ว');
        } else if (action === 'global-search') {
          openGlobalSearch();
        } else if (action === 'notifications') {
          openNotifications();
        } else if (action === 'help') {
          openHelp();
        } else if (action === 'signout') {
          await window.__adminClient?.auth.signOut();
          window.location.reload();
        } else if (action === 'close-modal') {
          closeModal();
        } else if (action === 'export') {
          exportRows('orders');
        } else if (action === 'export-users') {
          exportRows('users');
        } else if (action === 'export-payments') {
          exportRows('payments');
        } else if (action === 'orders-page') {
          window.__orderFilters = { ...orderFilterState(), page: Number(element.dataset.page) || 1 };
          renderOrderResults();
          bindInteractions();
        } else if (action === 'clear-order-dates') {
          window.__orderFilters = { ...orderFilterState(), fromDate: '', toDate: '', page: 1 };
          const from = document.getElementById('orderDateFrom');
          const to = document.getElementById('orderDateTo');
          if (from) from.value = '';
          if (to) to.value = '';
          renderOrderResults();
          bindInteractions();
        } else if (action === 'save-order') {
          await saveOrderFromModal();
        } else if (action === 'approve-payment') {
          await savePayment(element.dataset.proofId, true);
        } else if (action === 'reject-payment') {
          await savePayment(element.dataset.proofId, false);
        } else if (action === 'archive-product' || action === 'activate-product') {
          const active = action === 'activate-product';
          await window.adminActions.setProductActive(element.dataset.productId, active);
          closeModal();
          showToast(active ? 'เปิดใช้งานสินค้าแล้ว' : 'ปิดการขายสินค้าแล้ว');
        } else if (action === 'new-product') {
          openProduct();
        } else if (action === 'new-brand') {
          openTaxonomy('brand');
        } else if (action === 'new-category') {
          openTaxonomy('category');
        } else if (action === 'add-variant-row') {
          const target = document.getElementById('variantRows');
          if (target) target.insertAdjacentHTML('beforeend', `<div class="variant-row" data-variant-row><input type="hidden" name="variant_id" value=""/><input name="variant_sku" placeholder="SKU"/><input name="variant_label" placeholder="ตัวเลือก"/><input name="variant_price" type="number" min="0" placeholder="ราคา (สตางค์)"/><input name="variant_stock" type="number" min="0" placeholder="สต็อก"/><label class="check-label"><input name="variant_active" type="checkbox" checked/> active</label></div>`);
        } else if (action === 'add-offer-row') {
          const target = document.getElementById('offerRows');
          if (target) target.insertAdjacentHTML('beforeend', `<div class="offer-row" data-offer-row><input type="hidden" name="offer_id" value=""/><input name="offer_store" placeholder="ร้านค้า"/><input name="offer_price" type="number" min="0" placeholder="ราคา (สตางค์)"/><input name="offer_url" type="url" placeholder="https://..."/><label class="check-label"><input name="offer_available" type="checkbox" checked/> available</label></div>`);
        } else if (action === 'save-product') {
          await saveProductFromModal();
        } else if (action === 'save-taxonomy') {
          const form = document.getElementById('taxonomyForm');
          const data = new FormData(form);
          if (data.get('type') === 'brand') await window.adminActions.saveBrand({ id: String(data.get('id')).trim(), name: String(data.get('label')).trim() });
          else await window.adminActions.saveCategory({ id: String(data.get('id')).trim(), label: String(data.get('label')).trim() });
          closeModal();
          showToast('บันทึกข้อมูลแล้ว');
        } else if (action === 'save-support-status') {
          await window.adminActions.saveSupportStatus(element.dataset.supportId, document.getElementById('supportStatus').value);
          showToast('อัปเดตสถานะแล้ว');
        } else if (action === 'reply-support') {
          const message = document.getElementById('supportReply')?.value.trim();
          if (!message) throw new Error('กรุณาพิมพ์ข้อความตอบกลับ');
          await window.adminActions.replySupport(element.dataset.supportId, message);
          closeModal();
          showToast('ส่งข้อความตอบกลับแล้ว');
        } else if (action === 'save-settings') {
          const form = document.getElementById('settingsForm');
          const data = new FormData(form);
          await window.adminActions.saveCheckoutConfig({ p_checkout_enabled: data.get('checkout_enabled') === 'on', p_shipping_fee_minor: Number(data.get('shipping_fee_minor') || 0), p_payment_instructions: data.get('payment_instructions'), p_default_shipping_carrier: data.get('default_shipping_carrier'), p_promptpay_target: data.get('promptpay_target'), p_promptpay_display_name: data.get('promptpay_display_name') });
          showToast('บันทึกตั้งค่าร้านค้าแล้ว');
        } else if (action === 'save-admin-user') {
          const userId = element.dataset.adminId;
          const role = document.querySelector(`[data-admin-role="${CSS.escape(userId)}"]`).value;
          const active = document.querySelector(`[data-admin-active="${CSS.escape(userId)}"]`).checked;
          await window.adminActions.updateAdminUser(userId, role, active);
          showToast('บันทึกสิทธิ์แอดมินแล้ว');
        }
      } catch (error) {
        showToast(error?.message || 'ดำเนินการไม่สำเร็จ');
      }
    };
  });
  const search = document.getElementById('orderSearch');
  const filter = document.getElementById('orderFilter');
  const dateFrom = document.getElementById('orderDateFrom');
  const dateTo = document.getElementById('orderDateTo');
  if (search && filter && dateFrom && dateTo) {
    const apply = () => {
      window.__orderFilters = { query: search.value.toLowerCase(), status: filter.value, fromDate: dateFrom.value, toDate: dateTo.value, page: 1 };
      renderOrderResults();
      bindInteractions();
    };
    search.oninput = apply;
    filter.onchange = apply;
    dateFrom.onchange = apply;
    dateTo.onchange = apply;
  }
  const paymentSearch = document.getElementById('paymentSearch');
  const paymentFilter = document.getElementById('paymentFilter');
  if (paymentSearch && paymentFilter) {
    const applyPayments = () => {
      const query = paymentSearch.value.toLowerCase();
      window.__paymentFilter = paymentFilter.value;
      const list = (window.__livePayments || []).filter((payment) => (paymentFilter.value === 'all' || payment.status === paymentFilter.value) && `${payment.order_id} ${payment.storage_path} ${payment.reviewer_note || ''}`.toLowerCase().includes(query));
      const body = document.getElementById('paymentsBody');
      if (body) body.innerHTML = paymentRows(list);
      bindInteractions();
    };
    paymentSearch.oninput = applyPayments;
    paymentFilter.onchange = applyPayments;
  }
  const catalogSearch = document.getElementById('catalogSearch');
  if (catalogSearch) catalogSearch.oninput = () => document.querySelectorAll('#catalogBody tr[data-product]').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(catalogSearch.value.toLowerCase()); });
  const userSearch = document.getElementById('userSearch');
  if (userSearch) userSearch.oninput = () => document.querySelectorAll('#usersBody tr[data-user]').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(userSearch.value.toLowerCase()); });
}

document.querySelectorAll('.nav-item[data-section]').forEach((element) => {
  element.onclick = () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    element.classList.add('active');
    render(element.dataset.section);
    document.getElementById('sidebar').classList.remove('open');
  };
});
document.getElementById('mobileMenu').onclick = () => document.getElementById('sidebar').classList.toggle('open');
document.getElementById('modalClose').onclick = closeModal;
modal.onclick = (event) => { if (event.target === modal) closeModal(); };
render();
