const pool = require('./config/db');

async function fixExistingInvoices() {
  const invoices = await pool.query("SELECT * FROM invoices ORDER BY created_at ASC");
  console.log(`Found ${invoices.rows.length} invoices to inspect and populate items for.`);

  for (const inv of invoices.rows) {
    const itemsRes = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [inv.id]);
    if (itemsRes.rows.length === 0) {
      console.log(`Populating items for Invoice #${inv.invoice_number} (Subtotal: ₹${inv.subtotal})...`);
      
      let itemRows = [];

      if (inv.order_id) {
        const ordItemsRes = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [inv.order_id]);
        if (ordItemsRes.rows.length > 0) {
          itemRows = ordItemsRes.rows.map(oi => ({
            invoice_id: inv.id,
            product_id: oi.product_id,
            product_name: oi.product_name || 'Grocery Essentials Pack',
            sku: oi.sku || 'SKU-GROCERY-01',
            brand: 'Kirana',
            unit: oi.unit || 'kg',
            quantity: parseFloat(oi.quantity || 1),
            mrp: parseFloat(oi.mrp || oi.selling_price || oi.unit_price || 100),
            selling_price: parseFloat(oi.selling_price || oi.unit_price || 100),
            discount_amount: parseFloat(oi.discount_amount || 0),
            tax_percentage: 0,
            tax_amount: parseFloat(oi.tax_amount || 0),
            subtotal: parseFloat(oi.total_price || oi.total_amount || (oi.selling_price * oi.quantity)),
            total_amount: parseFloat(oi.total_price || oi.total_amount || (oi.selling_price * oi.quantity))
          }));
        }
      }

      if (itemRows.length === 0) {
        // Fallback default grocery item matching subtotal
        const subtotal = parseFloat(inv.subtotal || inv.total_amount || 100);
        itemRows = [{
          invoice_id: inv.id,
          product_id: null,
          product_name: inv.invoice_type === 'POS_SALE' ? 'Counter POS Grocery Sale' : 'Kirana Household Essentials Pack',
          sku: inv.invoice_type === 'POS_SALE' ? 'SKU-POS-GEN' : 'SKU-GROCERY-01',
          brand: 'Chaudhary Kirana',
          unit: 'pack',
          quantity: 1,
          mrp: subtotal,
          selling_price: subtotal,
          discount_amount: parseFloat(inv.discount_amount || 0),
          tax_percentage: 0,
          tax_amount: parseFloat(inv.tax_amount || 0),
          subtotal: subtotal,
          total_amount: subtotal
        }];
      }

      for (const item of itemRows) {
        await pool.query(`
          INSERT INTO invoice_items 
          (invoice_id, product_id, product_name, sku, brand, unit, quantity, mrp, selling_price, discount_amount, tax_percentage, tax_amount, subtotal, total_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          item.invoice_id, item.product_id, item.product_name, item.sku, item.brand, item.unit,
          item.quantity, item.mrp, item.selling_price, item.discount_amount, item.tax_percentage,
          item.tax_amount, item.subtotal, item.total_amount
        ]);
      }
      console.log(`  ✓ Inserted ${itemRows.length} items for Invoice #${inv.invoice_number}`);
    } else {
      console.log(`Invoice #${inv.invoice_number} already has ${itemsRes.rows.length} items.`);
    }
  }

  process.exit(0);
}

fixExistingInvoices().catch(e => {
  console.error("Fix error:", e);
  process.exit(1);
});
