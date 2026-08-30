const pool = require('./config/db');

async function cleanup() {
  const allowedCodes = ['SAVE1000', 'SAVE2000', 'SAVE5000', 'SAVE10000'];
  
  const selectRes = await pool.query(
    `SELECT id, code FROM coupons WHERE UPPER(code) NOT IN (${allowedCodes.map((_, i) => `$${i + 1}`).join(', ')})`,
    allowedCodes
  );
  
  console.log('Coupons identified for removal:', selectRes.rows.length, selectRes.rows.map(r => r.code));
  
  if (selectRes.rows.length > 0) {
    const ids = selectRes.rows.map(r => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    
    // Delete usages
    const delUsages = await pool.query(`DELETE FROM coupon_usages WHERE coupon_id IN (${placeholders})`, ids);
    console.log('Deleted coupon_usages rows:', delUsages.rowCount);
    
    // Nullify orders
    const nullOrders = await pool.query(`UPDATE orders SET coupon_id = NULL WHERE coupon_id IN (${placeholders})`, ids);
    console.log('Nullified orders coupon_id references:', nullOrders.rowCount);
    
    // Delete coupons
    const delCoupons = await pool.query(`DELETE FROM coupons WHERE id IN (${placeholders})`, ids);
    console.log('Deleted coupons from DB:', delCoupons.rowCount);
  }
  
  const remaining = await pool.query(
    'SELECT id, code, description, discount_type, discount_value, minimum_order_amount, is_active FROM coupons ORDER BY minimum_order_amount ASC'
  );
  console.log(`\n--- PRODUCTION TIERED COUPONS REMAINING IN DB (${remaining.rows.length}) ---`);
  console.table(remaining.rows);
  
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup Error:', err);
  process.exit(1);
});
