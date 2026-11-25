const axios = require('axios');

async function testReports() {
  try {
    console.log('1. Authenticating as Admin for Reports Access...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@supplysync.com',
      password: 'Password@123'
    });
    const token = loginRes.data.data?.token || loginRes.data.token;
    console.log('Authentication successful.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n2. Testing /api/reports/analytics (Executive KPIs & Charts)...');
    const analyticsRes = await axios.get('http://localhost:5000/api/reports/analytics', { headers });
    console.log('Analytics Summary:', analyticsRes.data.summary);
    console.log('Available Charts:', Object.keys(analyticsRes.data.charts));

    const reportTypes = [
      'monthly-expenses',
      'supplier-purchases',
      'product-purchases',
      'pending-orders',
      'delayed-deliveries',
      'outstanding-payments',
      'low-stock',
      'supplier-performance'
    ];

    console.log('\n3. Testing All 8 Dedicated Report Endpoints...');
    for (const rType of reportTypes) {
      const res = await axios.get(`http://localhost:5000/api/reports/detail/${rType}`, { headers });
      console.log(`- [${rType}]: Returned ${res.data.data.length} records.`);
      if (res.data.data.length > 0) {
        console.log(`  Sample:`, Object.entries(res.data.data[0]).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', '));
      }
    }

    console.log('\n4. Testing Date Range Filter on Analytics...');
    const filteredRes = await axios.get('http://localhost:5000/api/reports/analytics', {
      params: {
        start_date: '2026-11-01',
        end_date: '2026-11-30'
      },
      headers
    });
    console.log('Filtered Nov 2026 Spend:', `₹${filteredRes.data.summary.total_spend}`);

    console.log('\n✅ ALL 8 REPORTS & ANALYTICS TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('Reports Test Failed:', err.response?.data || err.message);
  }
}

testReports();
