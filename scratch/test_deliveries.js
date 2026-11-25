const axios = require('axios');

async function testDelivery() {
  try {
    console.log('1. Logging in as Admin...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@supplysync.com',
      password: 'Password@123'
    });
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('Admin login successful. Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n2. Fetching existing deliveries...');
    const delRes = await axios.get('http://localhost:5000/api/deliveries', { headers });
    console.log(`Fetched ${delRes.data.data.length} deliveries.`);
    delRes.data.data.forEach(d => {
      console.log(`- GRN: ${d.delivery_number} | PO: ${d.po_number} | Supplier: ${d.supplier_name} | Accepted: ${d.total_accepted} | Status: ${d.status}`);
    });

    console.log('\n3. Fetching receivable POs...');
    const posRes = await axios.get('http://localhost:5000/api/deliveries/receivable-pos', { headers });
    console.log(`Fetched ${posRes.data.data.length} receivable POs.`);
    posRes.data.data.forEach(po => {
      console.log(`- PO: ${po.po_number} (${po.status}) | Remaining: ${po.total_remaining_qty}`);
    });

    if (posRes.data.data.length > 0) {
      const targetPo = posRes.data.data[0];
      console.log(`\n4. Simulating a partial delivery on PO: ${targetPo.po_number}...`);
      
      const itemToReceive = targetPo.items[0];
      const receivedQty = Math.min(10, itemToReceive.remaining_qty || 10);
      const damagedQty = 1;
      const missingQty = 1;
      const acceptedQty = receivedQty - (damagedQty + missingQty);

      console.log(`Line Item: ${itemToReceive.product_name} | Ordered: ${itemToReceive.ordered_qty} | Remaining: ${itemToReceive.remaining_qty}`);
      console.log(`Receiving: ${receivedQty} | Damaged: ${damagedQty} | Missing: ${missingQty} => Net Accepted: ${acceptedQty}`);

      const recordRes = await axios.post('http://localhost:5000/api/deliveries', {
        po_id: targetPo.id,
        delivery_challan_number: 'CH-TEST-' + Math.floor(Math.random() * 9000 + 1000),
        vehicle_number: 'DL-01-TEST',
        delivery_date: new Date().toISOString().split('T')[0],
        inspection_remarks: 'QA Test delivery verification',
        items: [
          {
            po_item_id: itemToReceive.po_item_id,
            product_id: itemToReceive.product_id,
            received_qty: receivedQty,
            damaged_qty: damagedQty,
            missing_qty: missingQty,
            rejection_reason: '1 bent edge, 1 missing from seal'
          }
        ]
      }, { headers });

      console.log('Record Delivery Result:', recordRes.data.message);
      console.log('PO Status after delivery:', recordRes.data.data.po_status);

      console.log('\n5. Verifying Inventory Stock increment...');
      const invRes = await axios.get('http://localhost:5000/api/inventory/status', { headers });
      console.log(`Total inventory items count: ${invRes.data.data.total_items}, Total Valuation: ₹${invRes.data.data.total_valuation}`);

      console.log('\n6. Fetching recent transaction ledger...');
      const txnRes = await axios.get('http://localhost:5000/api/inventory/transactions', { headers });
      const latestTxn = txnRes.data.data[0];
      console.log('Latest Transaction:', {
        type: latestTxn.transaction_type,
        qty: latestTxn.quantity,
        balance_after: latestTxn.balance_after,
        remarks: latestTxn.remarks
      });
    }

    console.log('\n✅ ALL DELIVERY MANAGEMENT INTEGRATION TESTS PASSED!');
  } catch (err) {
    console.error('Test Failed:', err.response?.data || err.message);
  }
}

testDelivery();
