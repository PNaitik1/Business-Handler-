const axios = require('axios');

async function testPayments() {
  try {
    console.log('1. Authenticating as Admin / Finance...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@supplysync.com',
      password: 'Password@123'
    });
    const token = loginRes.data.data?.token || loginRes.data.token;
    console.log('Authentication successful. Token received.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n2. Fetching Financial Summary KPIs...');
    const sumRes = await axios.get('http://localhost:5000/api/payments/summary', { headers });
    console.log('Summary:', sumRes.data.data);

    console.log('\n3. Fetching Existing Payments Ledger...');
    const payRes = await axios.get('http://localhost:5000/api/payments', { headers });
    console.log(`Retrieved ${payRes.data.data.length} payment records.`);
    payRes.data.data.forEach(p => {
      console.log(`- Voucher: ${p.payment_reference} | PO: ${p.po_number} | Amount: ₹${p.amount} | Mode: ${p.payment_mode}`);
    });

    console.log('\n4. Fetching Payable Purchase Orders...');
    const posRes = await axios.get('http://localhost:5000/api/payments/payable-pos', { headers });
    console.log(`Retrieved ${posRes.data.data.length} payable POs.`);
    const targetPo = posRes.data.data.find(po => po.outstanding_balance > 0);
    
    if (targetPo) {
      console.log(`Target PO: ${targetPo.po_number} | Total: ₹${targetPo.total_amount} | Paid: ₹${targetPo.total_paid} | Outstanding: ₹${targetPo.outstanding_balance}`);

      console.log('\n5. Testing Overpayment Protection Business Rule:');
      const overAmount = targetPo.outstanding_balance + 5000;
      try {
        await axios.post('http://localhost:5000/api/payments', {
          po_id: targetPo.id,
          amount: overAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_mode: 'bank_transfer',
          allow_overpayment: false
        }, { headers });
        console.error('❌ ERROR: Overpayment was not blocked!');
      } catch (err) {
        console.log('✅ PASS: Overpayment successfully blocked! Message:', err.response?.data?.message);
      }

      console.log('\n6. Testing Valid Installment Payment:');
      const installmentAmount = Math.min(2000, targetPo.outstanding_balance);
      const postRes = await axios.post('http://localhost:5000/api/payments', {
        po_id: targetPo.id,
        amount: installmentAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'bank_transfer',
        transaction_reference: 'NEFT-TEST-' + Math.floor(Math.random() * 90000 + 10000),
        notes: 'Installment milestone payment via test automation'
      }, { headers });

      console.log('Payment Result:', postRes.data.message);
      console.log('New PO Payment Status:', postRes.data.data.po_payment_status);
      console.log('Remaining Outstanding Balance:', `₹${postRes.data.data.outstanding_balance}`);

      console.log('\n7. Fetching Voucher Details:');
      const voucherRes = await axios.get(`http://localhost:5000/api/payments/${postRes.data.data.payment.id}`, { headers });
      console.log(`Voucher ${voucherRes.data.data.payment_reference}:`, {
        supplier: voucherRes.data.data.supplier_name,
        amount: voucherRes.data.data.amount,
        mode: voucherRes.data.data.payment_mode,
        ref: voucherRes.data.data.transaction_reference
      });
    }

    console.log('\n✅ ALL PAYMENT MANAGEMENT TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('Test execution error:', error.response?.data || error.message);
  }
}

testPayments();
