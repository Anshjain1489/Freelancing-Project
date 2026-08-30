const pool = require('./config/db');

async function inspectDairy() {
  const catRes = await pool.query("SELECT * FROM categories WHERE slug = 'dairy' OR lower(name) LIKE '%dairy%'");
  console.log("Dairy categories found:", catRes.rows);

  for (const cat of catRes.rows) {
    const prodRes = await pool.query("SELECT id, name, category_id, is_active FROM products WHERE category_id = $1", [cat.id]);
    console.log(`Products in category ${cat.name} (${cat.id}): ${prodRes.rows.length}`);
    console.table(prodRes.rows);
  }

  process.exit(0);
}

inspectDairy().catch(e => {
  console.error(e);
  process.exit(1);
});
