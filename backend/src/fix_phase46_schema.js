const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function fixSchema() {
  console.log('🔧 Dropping & Re-creating Phase 46 Tables for Clean Schema Alignment...');

  const dropSql = `
    DROP TABLE IF EXISTS ai_action_recommendations CASCADE;
    DROP TABLE IF EXISTS ai_copilot_messages CASCADE;
    DROP TABLE IF EXISTS ai_copilot_conversations CASCADE;
    DROP TABLE IF EXISTS ai_anomaly_logs CASCADE;
    DROP TABLE IF EXISTS ai_sales_forecasts CASCADE;
    DROP TABLE IF EXISTS ai_subscription_insights CASCADE;
    DROP TABLE IF EXISTS ai_credit_risk_assessments CASCADE;
    DROP TABLE IF EXISTS ai_campaign_targeting CASCADE;
    DROP TABLE IF EXISTS ai_product_recommendations CASCADE;
    DROP TABLE IF EXISTS ai_churn_predictions CASCADE;
    DROP TABLE IF EXISTS ai_dynamic_pricing CASCADE;
    DROP TABLE IF EXISTS ai_inventory_reorders CASCADE;
    DROP TABLE IF EXISTS ai_demand_forecasts CASCADE;
    DROP TABLE IF EXISTS ai_retail_models CASCADE;
  `;

  try {
    await pool.query(dropSql);
    console.log('  ✓ Old Phase 46 AI tables dropped successfully.');

    const sqlPath = path.join(__dirname, '../../database/migrations/048_phase46_retail_intelligence_ai.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('  ✓ Phase 46 Schema successfully re-created!');

    // Also check if admin_logs exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  ✓ admin_logs table verified.');

  } catch (err) {
    console.error('❌ Error executing Phase 46 SQL:', err.message);
  } finally {
    process.exit(0);
  }
}

fixSchema();
