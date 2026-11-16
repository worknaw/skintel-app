(function () {
  document.documentElement.dataset.adminBuild = 'operations-20261107';

  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.publishableKey && window.supabase);
  const authGate = document.getElementById('authGate');
  const appShell = document.getElementById('appShell');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  let client = null;
  let authBusy = false;
  let realtimeChannel = null;
  let reloadTimer = null;

  const withTimeout = (promise, label, ms = 18000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} ใช้เวลานานเกินไป กรุณาตรวจสอบ Supabase URL, key และ RLS`)), ms)),
  ]);

  const setAuthVisible = (visible) => {
    authGate.hidden = !visible;
    authGate.style.display = visible ? 'grid' : 'none';
    appShell.style.visibility = visible ? 'hidden' : 'visible';
  };

  const setAdminIdentity = (user, admin) => {
    const email = user?.email || '—';
    const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || email;
    const initials = String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—';
    const nameElement = document.getElementById('adminName');
    const roleElement = document.getElementById('adminRole');
    const avatarElement = document.getElementById('adminAvatar');
    if (nameElement) nameElement.textContent = name;
    if (roleElement) roleElement.textContent = admin?.role || '—';
    if (avatarElement) avatarElement.textContent = initials;
    const dateElement = document.getElementById('todayLabel');
    if (dateElement) dateElement.textContent = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full' }).format(new Date());
  };

  const mapOrder = (row, itemsByOrder) => ({
    id: `#${String(row.id).slice(0, 8).toUpperCase()}`,
    rawId: row.id,
    initials: 'SC',
    name: row.user_id ? `ผู้ใช้ ${String(row.user_id).slice(0, 6)}` : 'ผู้ใช้งาน',
    userId: row.user_id,
    date: row.created_at ? new Date(row.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '-',
    createdAt: row.created_at,
    totalMinor: Number(row.total_minor || 0),
    total: new Intl.NumberFormat('th-TH', { style: 'currency', currency: row.currency || 'THB', maximumFractionDigits: 0 }).format(Number(row.total_minor || 0) / 100),
    subtotalMinor: Number(row.subtotal_minor || 0),
    shippingFeeMinor: Number(row.shipping_fee_minor || 0),
    currency: row.currency || 'THB',
    status: row.status,
    label: ({ awaiting_payment: 'รอชำระเงิน', payment_submitted: 'รอตรวจสลิป', paid: 'ชำระเงินแล้ว', shipped: 'จัดส่งแล้ว', completed: 'สำเร็จแล้ว', cancelled: 'ยกเลิก' })[row.status] || row.status,
    tone: ({ awaiting_payment: 'waiting', payment_submitted: 'waiting', paid: 'paid', shipped: 'paid', completed: 'paid', cancelled: 'failed' })[row.status] || 'waiting',
    addressSnapshot: row.address_snapshot || {},
    paymentReference: row.payment_reference,
    paymentInstructions: row.payment_instructions,
    shippingCarrier: row.shipping_carrier,
    trackingNumber: row.tracking_number,
    shippedAt: row.shipped_at,
    items: itemsByOrder.get(row.id) || [],
  });

  const queryError = (label, result) => result?.error ? [label, result.error.message || String(result.error)] : null;

  const resetLiveState = () => {
    window.__liveReady = false;
    window.__liveLoading = true;
    window.__liveError = null;
    window.__livePartialErrors = [];
    window.__liveStats = null;
    orders.splice(0, orders.length);
    window.__liveOrdersRaw = [];
    window.__liveOrderItems = [];
    window.__livePayments = [];
    window.__liveScans = [];
    window.__liveUsers = [];
    window.__liveSkinProfiles = [];
    window.__liveAnalysisResults = [];
    window.__liveProducts = [];
    window.__liveBrands = [];
    window.__liveCategories = [];
    window.__liveVariants = [];
    window.__liveOffers = [];
    window.__liveShipping = [];
    window.__liveSupport = [];
    window.__liveSupportReplies = [];
    window.__liveCheckoutConfig = null;
    window.__liveAuditLogs = [];
    window.__liveAdminUsers = [];
  };

  async function loadLiveData() {
    resetLiveState();
    render(window.__activeSection || 'overview');
    const ownerOnly = window.__adminRole === 'owner';
    const results = await withTimeout(Promise.all([
      client.from('store_orders').select('id,user_id,status,address_snapshot,subtotal_minor,shipping_fee_minor,total_minor,currency,created_at,payment_reference,payment_instructions,shipping_carrier,tracking_number,shipped_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      client.from('store_payment_proofs').select('id,order_id,user_id,storage_path,status,submitted_at,reviewed_at,reviewer_note', { count: 'exact' }).order('submitted_at', { ascending: false }).limit(200),
      client.from('skin_scans').select('id,user_id,status,created_at,updated_at,completed_at,error_code', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      client.from('skin_analysis_results').select('id,scan_id,user_id,schema_version,model_name,model_version,observations,created_at').order('created_at', { ascending: false }).limit(200),
      client.from('profiles').select('id,display_name,created_at,updated_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      client.from('skin_profiles').select('user_id,skin_type,concern_ids,monthly_budget_minor,budget_currency,onboarding_completed_at,updated_at').limit(200),
      client.from('products').select('id,name,active,brand_id,category_id,size,rating,review_count,description,updated_at,created_at', { count: 'exact' }).order('updated_at', { ascending: false }).limit(200),
      client.from('brands').select('id,name').order('name').limit(200),
      client.from('categories').select('id,label').order('label').limit(200),
      client.from('store_variants').select('id,product_id,sku,label,price_minor,currency,stock,active,updated_at').order('updated_at', { ascending: false }).limit(500),
      client.from('store_offers').select('id,product_id,store_name,price_minor,currency,product_url,available,last_updated_at').order('last_updated_at', { ascending: false }).limit(500),
      client.from('store_order_items').select('order_id,user_id,variant_id,product_name,variant_label,unit_price_minor,quantity').limit(1000),
      client.from('support_requests').select('id,user_id,subject,message,app_version,status,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      client.from('support_replies').select('id,support_request_id,admin_user_id,message,created_at').order('created_at', { ascending: true }).limit(500),
      client.rpc('get_store_checkout_config_v4'),
      client.from('admin_audit_logs').select('id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at', { ascending: false }).limit(200),
      ownerOnly ? client.rpc('list_admin_users') : Promise.resolve({ data: [], error: null }),
    ]), 'การโหลดข้อมูลจาก Supabase');

    const [ordersResult, paymentsResult, scansResult, analysisResult, usersResult, profilesResult, productsResult, brandsResult, categoriesResult, variantsResult, offersResult, itemsResult, supportResult, repliesResult, configResult, auditResult, adminUsersResult] = results;
    const failures = [
      queryError('store_orders', ordersResult),
      queryError('store_payment_proofs', paymentsResult),
      queryError('skin_scans', scansResult),
      queryError('skin_analysis_results', analysisResult),
      queryError('profiles', usersResult),
      queryError('skin_profiles', profilesResult),
      queryError('products', productsResult),
      queryError('brands', brandsResult),
      queryError('categories', categoriesResult),
      queryError('store_variants', variantsResult),
      queryError('store_offers', offersResult),
      queryError('store_order_items', itemsResult),
      queryError('support_requests', supportResult),
      queryError('support_replies', repliesResult),
      queryError('get_store_checkout_config_v4', configResult),
      queryError('admin_audit_logs', auditResult),
      queryError('list_admin_users', adminUsersResult),
    ].filter(Boolean);
    window.__livePartialErrors = failures.map(([label, message]) => ({ label, message }));

    const orderItems = itemsResult.data || [];
    const itemsByOrder = new Map();
    orderItems.forEach((item) => {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id).push(item);
    });
    const orderRows = ordersResult.data || [];
    const payments = paymentsResult.data || [];
    const scans = scansResult.data || [];
    const users = usersResult.data || [];
    const skinProfiles = profilesResult.data || [];
    const products = productsResult.data || [];
    const checkoutRows = Array.isArray(configResult.data) ? configResult.data : [configResult.data].filter(Boolean);

    orders.splice(0, orders.length, ...orderRows.map((row) => mapOrder(row, itemsByOrder)));
    window.__liveOrdersRaw = orderRows;
    window.__liveOrderItems = orderItems;
    window.__livePayments = payments;
    window.__liveScans = scans;
    window.__liveAnalysisResults = analysisResult.data || [];
    window.__liveUsers = users;
    window.__liveSkinProfiles = skinProfiles;
    window.__liveProducts = products;
    window.__liveBrands = brandsResult.data || [];
    window.__liveCategories = categoriesResult.data || [];
    window.__liveVariants = variantsResult.data || [];
    window.__liveOffers = offersResult.data || [];
    window.__liveShipping = orderRows.filter((order) => ['paid', 'shipped'].includes(order.status)).map((row) => mapOrder(row, itemsByOrder));
    window.__liveSupport = supportResult.data || [];
    window.__liveSupportReplies = repliesResult.data || [];
    window.__liveCheckoutConfig = checkoutRows[0] || null;
    window.__liveAuditLogs = auditResult.data || [];
    window.__liveAdminUsers = adminUsersResult.data || [];
    window.__liveStats = {
      users: usersResult.count ?? users.length,
      orders: ordersResult.count ?? orderRows.length,
      pendingPayments: payments.filter((payment) => payment.status === 'submitted').length,
      totalPayments: paymentsResult.count ?? payments.length,
      failedScans: scans.filter((scan) => scan.status === 'failed').length,
      totalScans: scansResult.count ?? scans.length,
      products: products.filter((product) => product.active).length,
      totalProducts: productsResult.count ?? products.length,
      support: supportResult.count ?? (supportResult.data || []).length,
      totalSales: orderRows.filter((row) => ['paid', 'shipped', 'completed'].includes(row.status)).reduce((sum, row) => sum + Number(row.total_minor || 0), 0),
      salesRowsLoaded: orderRows.length,
      variants: (variantsResult.data || []).length,
      realtime: Boolean(window.__realtimeReady),
    };
    window.__liveReady = true;
    window.__liveLoading = false;
    window.__liveError = null;
    updateNavBadges();
    render(window.__activeSection || 'overview');
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      void loadLiveData().catch((error) => {
        window.__liveLoading = false;
        window.__liveReady = false;
        window.__liveError = error?.message || 'โหลดข้อมูลไม่สำเร็จ';
        render(window.__activeSection || 'overview');
        showToast(window.__liveError);
      });
    }, 500);
  }

  function subscribeRealtime() {
    if (!client || realtimeChannel) return;
    realtimeChannel = client.channel('skincycle-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_orders' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_payment_proofs' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skin_scans' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, scheduleReload)
      .subscribe((status) => {
        window.__realtimeReady = status === 'SUBSCRIBED';
        if (window.__liveStats) window.__liveStats.realtime = window.__realtimeReady;
        updateNavBadges();
      });
  }

  const actions = {
    async reload() {
      await loadLiveData();
    },
    async reviewPayment(proofId, approved, note) {
      const { error } = await withTimeout(client.rpc('admin_review_payment_proof', { p_proof_id: proofId, p_approved: approved, p_reviewer_note: note || null }), 'การตรวจสลิป');
      if (error) throw error;
      await loadLiveData();
    },
    async updateOrder(orderId, status, carrier, tracking) {
      const { error } = await withTimeout(client.rpc('admin_update_store_order', { p_order_id: orderId, p_status: status, p_shipping_carrier: carrier || null, p_tracking_number: tracking || null }), 'การอัปเดตคำสั่งซื้อ');
      if (error) throw error;
      await loadLiveData();
    },
    async getPaymentProofUrl(storagePath) {
      const { data, error } = await withTimeout(client.storage.from('payment-proofs').createSignedUrl(storagePath, 600), 'การเปิดรูปสลิป');
      if (error) throw error;
      return data?.signedUrl || null;
    },
    async saveProduct(payload, isNew) {
      const query = isNew ? client.from('products').insert(payload) : client.from('products').update(payload).eq('id', payload.id);
      const { error } = await withTimeout(query, 'การบันทึกสินค้า');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: isNew ? 'catalog.product_created' : 'catalog.product_updated', p_entity_type: 'product', p_entity_id: payload.id, p_metadata: { name: payload.name } });
      await loadLiveData();
    },
    async setProductActive(productId, active) {
      const { error } = await withTimeout(client.from('products').update({ active }).eq('id', productId), active ? 'การเปิดสินค้า' : 'การปิดสินค้า');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: active ? 'catalog.product_activated' : 'catalog.product_archived', p_entity_type: 'product', p_entity_id: productId });
      await loadLiveData();
    },
    async saveVariant(payload, isNew) {
      const query = isNew ? client.from('store_variants').insert(payload) : client.from('store_variants').update(payload).eq('id', payload.id);
      const { error } = await withTimeout(query, 'การบันทึกตัวเลือกสินค้า');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: isNew ? 'catalog.variant_created' : 'catalog.variant_updated', p_entity_type: 'store_variant', p_entity_id: payload.id });
    },
    async saveOffer(payload, isNew) {
      const query = isNew ? client.from('store_offers').insert(payload) : client.from('store_offers').update(payload).eq('id', payload.id);
      const { error } = await withTimeout(query, 'การบันทึกแหล่งซื้อสินค้า');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: isNew ? 'catalog.offer_created' : 'catalog.offer_updated', p_entity_type: 'store_offer', p_entity_id: payload.id });
    },
    async saveBrand(payload) {
      const { error } = await withTimeout(client.from('brands').upsert(payload), 'การบันทึกแบรนด์');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: 'catalog.brand_upserted', p_entity_type: 'brand', p_entity_id: payload.id, p_metadata: { name: payload.name } });
      await loadLiveData();
    },
    async saveCategory(payload) {
      const { error } = await withTimeout(client.from('categories').upsert(payload), 'การบันทึกหมวดหมู่');
      if (error) throw error;
      await client.rpc('record_admin_audit', { p_action: 'catalog.category_upserted', p_entity_type: 'category', p_entity_id: payload.id, p_metadata: { label: payload.label } });
      await loadLiveData();
    },
    async saveSupportStatus(requestId, status) {
      const { error } = await withTimeout(client.rpc('admin_update_support_request', { p_request_id: requestId, p_status: status }), 'การอัปเดตคำขอช่วยเหลือ');
      if (error) throw error;
      await loadLiveData();
    },
    async replySupport(requestId, message) {
      const { error } = await withTimeout(client.rpc('admin_add_support_reply', { p_request_id: requestId, p_message: message }), 'การส่งข้อความตอบกลับ');
      if (error) throw error;
      await loadLiveData();
    },
    async saveCheckoutConfig(payload) {
      const { error } = await withTimeout(client.rpc('admin_update_store_checkout_config', payload), 'การบันทึกตั้งค่าร้านค้า');
      if (error) throw error;
      await loadLiveData();
    },
    async updateAdminUser(userId, role, active) {
      const { error } = await withTimeout(client.rpc('update_admin_user_access', { p_user_id: userId, p_role: role, p_active: active }), 'การอัปเดตสิทธิ์แอดมิน');
      if (error) throw error;
      await loadLiveData();
    },
  };
  window.adminActions = actions;
  window.reloadAdminData = actions.reload;

  async function authorizeSession(user) {
    const { data: admin, error: adminError } = await withTimeout(client.from('admin_users').select('role,active').eq('user_id', user.id).maybeSingle(), 'การตรวจสอบสิทธิ์แอดมิน');
    if (adminError || !admin?.active) {
      await client.auth.signOut();
      throw new Error(adminError ? `ตรวจสอบสิทธิ์ไม่ได้: ${adminError.message}` : 'บัญชีนี้ยังไม่มีสิทธิ์ใน admin_users');
    }
    window.__adminUserId = user.id;
    window.__adminRole = admin.role;
    setAdminIdentity(user, admin);
    setAuthVisible(false);
    try {
      await loadLiveData();
      subscribeRealtime();
    } catch (loadError) {
      window.__liveLoading = false;
      window.__liveReady = false;
      window.__liveError = loadError?.message || 'ไม่สามารถโหลดข้อมูลจาก Supabase ได้';
      render('overview');
      showToast(`เชื่อมต่อข้อมูลไม่สำเร็จ: ${window.__liveError}`);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    if (authBusy || !client) return;
    authBusy = true;
    loginError.textContent = 'กำลังตรวจสอบบัญชี...';
    const watchdog = setTimeout(() => {
      loginError.textContent = 'Supabase ไม่ตอบกลับภายใน 5 วินาที — ตรวจสอบ URL, Publishable Key และ Project status';
    }, 5000);
    try {
      const { data, error } = await withTimeout(client.auth.signInWithPassword({ email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value }), 'การเข้าสู่ระบบ');
      if (error || !data.user) {
        loginError.textContent = error?.message || 'เข้าสู่ระบบไม่สำเร็จ';
        return;
      }
      loginError.textContent = 'Auth ผ่านแล้ว กำลังตรวจสอบ admin_users...';
      try {
        await authorizeSession(data.user);
      } catch (error) {
        loginError.textContent = error?.message || 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน';
      }
    } catch (error) {
      loginError.textContent = error?.message || 'เชื่อมต่อระบบไม่สำเร็จ';
    } finally {
      clearTimeout(watchdog);
      authBusy = false;
    }
  }

  if (!hasConfig) {
    setAuthVisible(true);
    loginError.textContent = 'ยังไม่ได้ตั้งค่า Supabase บน Vercel (SKINCYCLE_SUPABASE_URL และ SKINCYCLE_SUPABASE_PUBLISHABLE_KEY)';
    loginForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  client = window.supabase.createClient(config.url, config.publishableKey);
  window.__adminClient = client;
  setAuthVisible(true);
  loginForm.addEventListener('submit', signIn);
  void client.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      void authorizeSession(data.session.user).catch((error) => {
        setAuthVisible(true);
        loginError.textContent = error?.message || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
      });
    }
  });
})();
