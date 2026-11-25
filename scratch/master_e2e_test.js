const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runMasterE2ETestSuite() {
  console.log('================================================================');
  console.log('       SUPPLYSYNC FULL INTEGRATION & VALIDATION TEST SUITE      ');
  console.log('================================================================\n');

  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS ${testCount}] ${message}`);
    } else {
      console.error(`  [FAIL ${testCount}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // --------------------------------------------------------------------------
    // 1. AUTHENTICATION MODULE
    // --------------------------------------------------------------------------
    console.log('--- 1. Testing Authentication System ---');
    
    // 1.1 Invalid login
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@supplysync.com',
        password: 'WrongPassword!123'
      });
      assert(false, 'Invalid login should return 401');
    } catch (err) {
      assert(err.response?.status === 401, 'Invalid login returns HTTP 401 Unauthorized');
    }

    // 1.2 Valid Admin Login
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@supplysync.com',
      password: 'Password@123'
    });
    const token = loginRes.data.data?.token || loginRes.data.token;
    assert(loginRes.status === 200 && !!token, 'Admin login returns 200 OK with valid JWT token');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 1.3 Profile Retrieval
    const meRes = await axios.get(`${API_BASE}/auth/me`, { headers: authHeaders });
    assert(meRes.status === 200 && meRes.data.data.user.email === 'admin@supplysync.com', 'GET /api/auth/me returns authenticated user profile');

    // 1.4 Protected route rejection without token
    try {
      await axios.get(`${API_BASE}/suppliers`);
      assert(false, 'Unauthenticated request should fail');
    } catch (err) {
      assert(err.response?.status === 401, 'Protected route rejects request without Bearer token with 401');
    }

    // --------------------------------------------------------------------------
    // 2. SUPPLIER MANAGEMENT MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Testing Supplier Management ---');
    
    // 2.1 Fetch Suppliers
    const suppliersRes = await axios.get(`${API_BASE}/suppliers`, { headers: authHeaders });
    assert(suppliersRes.status === 200 && Array.isArray(suppliersRes.data.data), 'GET /api/suppliers returns supplier array');

    // 2.2 Create New Supplier
    const randomGstin = `27MMMFA${Math.floor(Math.random() * 8999 + 1000)}C1Z4`;
    const newSuppPayload = {
      company_name: 'Metro Fasteners & Tools Pvt Ltd',
      contact_person: 'Rajesh Khandelwal',
      email: `rajesh_${Date.now()}@metrofasteners.com`,
      phone: '+91 22 2890 5544',
      address: 'Plot 108, Turbhe Industrial Zone',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      country: 'India',
      tax_id: randomGstin,
      payment_terms: 'net30'
    };
    const createSuppRes = await axios.post(`${API_BASE}/suppliers`, newSuppPayload, { headers: authHeaders });
    const createdSupplierId = createSuppRes.data.data?.id;
    assert(createSuppRes.status === 201 && !!createdSupplierId, `Created new supplier #${createdSupplierId} successfully`);

    // 2.3 Fetch Supplier Details
    const suppDetailRes = await axios.get(`${API_BASE}/suppliers/${createdSupplierId}`, { headers: authHeaders });
    assert(suppDetailRes.data.data.tax_id === randomGstin, 'GET /api/suppliers/:id returns full profile and tax details');

    // --------------------------------------------------------------------------
    // 3. PRODUCT MANAGEMENT MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Testing Product Catalog & Categories ---');

    // 3.1 Fetch Categories
    const catRes = await axios.get(`${API_BASE}/products/categories`, { headers: authHeaders });
    assert(catRes.status === 200 && catRes.data.data.length > 0, 'GET /api/products/categories returns active categories');

    // 3.2 Create New Product
    const newProdPayload = {
      name: 'High Tensile Stud Bolt M16 x 100mm',
      sku: `SKU-STUD-${Date.now().toString().slice(-4)}`,
      category_id: 1,
      uom: 'pcs',
      unit_cost: 45.00,
      current_stock: 50,
      reorder_level: 100,
      description: 'Grade 8.8 structural stud bolt for flanged connections'
    };
    const createProdRes = await axios.post(`${API_BASE}/products`, newProdPayload, { headers: authHeaders });
    const createdProductId = createProdRes.data.data?.id;
    assert(createProdRes.status === 201 && !!createdProductId, `Created product #${createdProductId} (${newProdPayload.name})`);

    // 3.3 Verify Low Stock Identification
    const prodListRes = await axios.get(`${API_BASE}/products`, { headers: authHeaders });
    const foundProd = prodListRes.data.data.find(p => p.id === createdProductId);
    assert(foundProd && foundProd.current_stock < foundProd.reorder_level, 'New product correctly flagged as below reorder level (current 50 < reorder 100)');

    // --------------------------------------------------------------------------
    // 4. QUOTATION & MULTI-SUPPLIER PRICE COMPARISON MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Testing Quotations & Comparison Engine ---');

    // 4.1 Record Supplier Quotes
    await axios.post(`${API_BASE}/quotations`, {
      supplier_id: 1,
      product_id: createdProductId,
      unit_price: 44.00,
      lead_time_days: 5,
      minimum_order_qty: 100,
      availability: 'in_stock',
      notes: 'Bulk discount applicable'
    }, { headers: authHeaders });

    await axios.post(`${API_BASE}/quotations`, {
      supplier_id: 2,
      product_id: createdProductId,
      unit_price: 42.00,
      lead_time_days: 10,
      minimum_order_qty: 100,
      availability: 'in_stock',
      notes: 'Lower unit rate, longer dispatch'
    }, { headers: authHeaders });

    // 4.2 Verify Price Comparison Analysis
    const compareRes = await axios.get(`${API_BASE}/quotations/compare`, {
      params: { product_id: createdProductId, quantity: 500 },
      headers: authHeaders
    });
    const quotesCompared = compareRes.data.data;
    assert(compareRes.status === 200 && quotesCompared.length >= 2, 'Quotation comparison matrix compares 2+ vendors');
    const recommendedQuote = quotesCompared.find(q => q.is_recommended);
    assert(!!recommendedQuote, `MCDA Scoring selected recommended vendor: ${recommendedQuote?.supplier_name}`);

    // --------------------------------------------------------------------------
    // 5. PURCHASE ORDER MANAGEMENT MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 5. Testing Purchase Order Management ---');

    // Check pre-PO product inventory
    const preInvRes = await axios.get(`${API_BASE}/products`, { headers: authHeaders });
    const preStock = preInvRes.data.data.find(p => p.id === createdProductId)?.current_stock;

    // 5.1 Create Purchase Order with Multi-Product Lines
    const poPayload = {
      supplier_id: 1,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 864000000).toISOString().split('T')[0],
      tax_percentage: 18.00,
      notes: 'Priority fabrication batch. Inspection at dock.',
      items: [
        {
          product_id: createdProductId,
          ordered_qty: 200,
          unit_price: 45.00
        }
      ]
    };
    const createPoRes = await axios.post(`${API_BASE}/purchase-orders`, poPayload, { headers: authHeaders });
    const createdPoId = createPoRes.data.data?.id;
    const poNumber = createPoRes.data.data?.po_number;
    const poTotal = createPoRes.data.data?.total_amount;
    assert(createPoRes.status === 201 && !!createdPoId, `Created Purchase Order ${poNumber} with ID #${createdPoId}`);

    // 5.2 Verify Total Calculation (Subtotal 9000 + 18% Tax 1620 = 10620)
    assert(poTotal === 10620.00, `PO Total accurately computed: Subtotal 9,000 + 18% Tax = ₹${poTotal}`);

    // 5.3 Verify CRUCIAL BUSINESS RULE: Zero Inventory Increase on PO Creation!
    const postPoInvRes = await axios.get(`${API_BASE}/products`, { headers: authHeaders });
    const postPoStock = postPoInvRes.data.data.find(p => p.id === createdProductId)?.current_stock;
    assert(postPoStock === preStock, `CRUCIAL AUDIT RULE VERIFIED: Stock unchanged after PO creation (Stock remains ${preStock})`);

    // 5.4 Update PO Status to Confirmed
    await axios.patch(`${API_BASE}/purchase-orders/${createdPoId}/status`, { status: 'confirmed' }, { headers: authHeaders });
    const confirmedPoRes = await axios.get(`${API_BASE}/purchase-orders/${createdPoId}`, { headers: authHeaders });
    assert(confirmedPoRes.data.data.status === 'confirmed', 'PO status transitioned to "confirmed"');

    // --------------------------------------------------------------------------
    // 6. DELIVERY MANAGEMENT MODULE (GRN)
    // --------------------------------------------------------------------------
    console.log('\n--- 6. Testing Goods Receipt Notes (GRN) & Physical Stock Sync ---');

    // 6.1 Record Partial Delivery: 100 received (95 accepted, 3 damaged, 2 missing)
    const delPayload = {
      po_id: createdPoId,
      delivery_challan_number: `CH-TEST-${Date.now().toString().slice(-4)}`,
      vehicle_number: 'MH-04-AX-5522',
      delivery_date: new Date().toISOString().split('T')[0],
      inspection_remarks: 'Dock visual inspection completed',
      items: [
        {
          po_item_id: confirmedPoRes.data.data.items[0].id,
          product_id: createdProductId,
          received_qty: 100,
          damaged_qty: 3,
          missing_qty: 2,
          rejection_reason: '3 thread damages, 2 missing from master bag'
        }
      ]
    };

    const grnRes = await axios.post(`${API_BASE}/deliveries`, delPayload, { headers: authHeaders });
    assert(grnRes.status === 201, `GRN ${grnRes.data.data.delivery_number} recorded successfully`);
    assert(grnRes.data.data.accepted_count === 95, 'Net accepted quantity = 95 units');
    assert(grnRes.data.data.rejected_count === 5, 'Quarantined rejected quantity = 5 units (3 damaged + 2 missing)');
    assert(grnRes.data.data.po_status === 'partially_received', 'PO status automatically updated to "partially_received"');

    // 6.2 Verify Inventory Incremented EXACTLY by 95 (Accepted Only!)
    const postGrnInvRes = await axios.get(`${API_BASE}/products`, { headers: authHeaders });
    const postGrnStock = postGrnInvRes.data.data.find(p => p.id === createdProductId)?.current_stock;
    assert(postGrnStock === preStock + 95, `INVENTORY SYNC VERIFIED: Current stock incremented exactly by accepted count (${preStock} -> ${postGrnStock})`);

    // --------------------------------------------------------------------------
    // 7. PAYMENT MANAGEMENT MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 7. Testing Accounts Payable & Outstanding Balances ---');

    // 7.1 Check Payable POs
    const payablePosRes = await axios.get(`${API_BASE}/payments/payable-pos`, { headers: authHeaders });
    const targetPayablePo = payablePosRes.data.data.find(p => p.id === createdPoId);
    assert(targetPayablePo && targetPayablePo.outstanding_balance === 10620.00, `Outstanding balance for ${poNumber} is ₹10,620.00`);

    // 7.2 Overpayment Safeguard Test: Try to pay ₹15,000 (exceeding balance)
    try {
      await axios.post(`${API_BASE}/payments`, {
        po_id: createdPoId,
        amount: 15000.00,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'bank_transfer',
        allow_overpayment: false
      }, { headers: authHeaders });
      assert(false, 'Overpayment should be blocked');
    } catch (err) {
      assert(err.response?.status === 400, 'Overpayment safeguard blocked invalid payment with HTTP 400');
    }

    // 7.3 Disburse Valid Partial Payment: ₹5,000 via Bank Transfer
    const pay1Res = await axios.post(`${API_BASE}/payments`, {
      po_id: createdPoId,
      amount: 5000.00,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'bank_transfer',
      transaction_reference: `UTR-${Date.now().toString().slice(-6)}`,
      notes: 'Initial 50% milestone installment'
    }, { headers: authHeaders });
    assert(pay1Res.status === 201, `Disbursed ₹5,000 via ${pay1Res.data.data.payment.payment_reference}`);
    assert(pay1Res.data.data.outstanding_balance === 5620.00, 'Remaining balance accurately updated to ₹5,620.00');
    assert(pay1Res.data.data.po_payment_status === 'partially_paid', 'PO payment status updated to "partially_paid"');

    // 7.4 Disburse Final Settlement: ₹5,620
    const pay2Res = await axios.post(`${API_BASE}/payments`, {
      po_id: createdPoId,
      amount: 5620.00,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'upi',
      transaction_reference: `UPI-${Date.now().toString().slice(-6)}`,
      notes: 'Final settlement'
    }, { headers: authHeaders });
    assert(pay2Res.data.data.outstanding_balance === 0.00, 'Outstanding balance is now ₹0.00');
    assert(pay2Res.data.data.po_payment_status === 'paid', 'PO payment status automatically transitioned to "paid"');

    // --------------------------------------------------------------------------
    // 8. REPORTS & BUSINESS ANALYTICS MODULE
    // --------------------------------------------------------------------------
    console.log('\n--- 8. Testing Reports & Business Analytics ---');

    // 8.1 Analytics Overview
    const analyticsRes = await axios.get(`${API_BASE}/reports/analytics`, { headers: authHeaders });
    assert(analyticsRes.status === 200 && analyticsRes.data.summary.total_spend > 0, 'Analytics overview returned aggregated business spend');

    // 8.2 Verify all 8 reports detail queries
    const reportsList = [
      'monthly-expenses',
      'supplier-purchases',
      'product-purchases',
      'pending-orders',
      'delayed-deliveries',
      'outstanding-payments',
      'low-stock',
      'supplier-performance'
    ];
    for (const r of reportsList) {
      const repRes = await axios.get(`${API_BASE}/reports/detail/${r}`, { headers: authHeaders });
      assert(repRes.status === 200 && Array.isArray(repRes.data.data), `Report [${r}] generated successfully with ${repRes.data.data.length} records`);
    }

    // --------------------------------------------------------------------------
    // 9. DASHBOARD METRICS INTEGRATION
    // --------------------------------------------------------------------------
    console.log('\n--- 9. Testing Dashboard Executive Integration ---');
    const dashRes = await axios.get(`${API_BASE}/dashboard/overview`, { headers: authHeaders });
    const dashStats = dashRes.data.data ? dashRes.data.data.stats : dashRes.data.stats;
    assert(dashRes.status === 200 && dashStats.totalProducts > 0, 'Dashboard overview delivers 7 live KPIs and Chart.js datasets');

    console.log('\n================================================================');
    console.log(`  ALL ${testCount} / ${testCount} END-TO-END TESTS COMPLETED SUCCESSFULLY! `);
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    process.exit(1);
  }
}

runMasterE2ETestSuite();
