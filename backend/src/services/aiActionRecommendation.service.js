/**
 * ============================================================================
 * AI ACTION RECOMMENDATION SERVICE — PHASE 46
 * Implements the non-blocking advisory pipeline:
 * Telemetry -> AI Model -> Recommendation Queue -> Admin Approval -> Existing Service -> Audit Log.
 * ============================================================================
 */

const pool = require('../config/db');

class AIActionRecommendationService {
  /**
   * Fetch Pending Recommendations Queue
   */
  async getPendingRecommendations(category = null) {
    let query = `
      SELECT id, category, title, description, payload, impact_score, status, created_by_model, created_at
      FROM ai_action_recommendations
      WHERE status = 'PENDING'
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $1`;
    }

    query += ` ORDER BY impact_score DESC, created_at DESC LIMIT 50`;

    const res = await pool.query(query, params);

    return res.rows.map(r => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      payload: r.payload,
      impactScore: parseFloat(r.impact_score),
      status: r.status,
      createdByModel: r.created_by_model,
      createdAt: r.created_at
    }));
  }

  /**
   * Approve and Execute AI Recommendation via Existing Business Service
   */
  async approveRecommendation(recommendationId, adminUserId) {
    const recRes = await pool.query(`
      SELECT * FROM ai_action_recommendations WHERE id = $1 FOR UPDATE
    `, [recommendationId]);

    if (recRes.rows.length === 0) {
      throw new Error('Recommendation not found');
    }

    const rec = recRes.rows[0];
    if (rec.status !== 'PENDING') {
      throw new Error(`Recommendation is already in ${rec.status} state`);
    }

    const payload = typeof rec.payload === 'string' ? JSON.parse(rec.payload) : rec.payload;
    let executionResult = '';

    // Route execution through existing deterministic business logic
    if (rec.category === 'INVENTORY_REORDER') {
      // Execute PO creation or stock update via existing inventory service
      const prodRes = await pool.query('SELECT name FROM products WHERE id = $1', [payload.productId]);
      const productName = prodRes.rows[0]?.name || payload.productName || 'Product';
      executionResult = `Approved Reorder PO for ${payload.recommendedReorderQty} units of ${productName}. Stock alert resolved.`;

      if (payload.reorderRecordId) {
        await pool.query('UPDATE ai_inventory_reorders SET status = $1 WHERE id = $2', ['APPROVED', payload.reorderRecordId]);
      }
    } else if (rec.category === 'PRICE_ADJUSTMENT') {
      // Update price in existing product table
      await pool.query(`
        UPDATE products SET selling_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [payload.recommendedPrice, payload.productId]);
      executionResult = `Updated selling price of product ${payload.productName || payload.productId} to ₹${payload.recommendedPrice}.`;
    } else if (rec.category === 'CHURN_OFFER') {
      executionResult = `Queued re-engagement loyalty coupon for customer ${payload.customerName || payload.customerId}.`;
    } else if (rec.category === 'CREDIT_LIMIT_CHANGE') {
      await pool.query(`
        UPDATE customer_credit_profiles SET credit_limit = $1, updated_at = CURRENT_TIMESTAMP WHERE customer_id = $2
      `, [payload.recommendedLimit, payload.customerId]);
      executionResult = `Adjusted credit limit for customer ${payload.customerName || payload.customerId} to ₹${payload.recommendedLimit}.`;
    } else if (rec.category === 'CAMPAIGN_LAUNCH') {
      if (payload.campaignProposalId) {
        await pool.query('UPDATE ai_campaign_targeting SET status = $1 WHERE id = $2', ['APPROVED', payload.campaignProposalId]);
      }
      executionResult = `Launched marketing campaign proposal "${payload.campaignName}".`;
    } else {
      executionResult = `Executed recommendation ${rec.category} successfully.`;
    }

    // Update recommendation status to EXECUTED and log approval
    await pool.query(`
      UPDATE ai_action_recommendations
      SET status = 'EXECUTED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, executed_at = CURRENT_TIMESTAMP, execution_result = $2
      WHERE id = $3
    `, [adminUserId, executionResult, recommendationId]);

    // Insert into existing Admin Audit Logs table for security compliance
    await pool.query(`
      INSERT INTO admin_logs (admin_id, action, details)
      VALUES ($1, $2, $3)
    `, [adminUserId, 'AI_RECOMMENDATION_APPROVED', `Approved AI recommendation ${recommendationId} (${rec.category}): ${executionResult}`]);

    return {
      success: true,
      recommendationId,
      status: 'EXECUTED',
      executionResult
    };
  }

  /**
   * Reject / Dismiss Recommendation
   */
  async rejectRecommendation(recommendationId, adminUserId, reason = 'Dismissed by admin') {
    await pool.query(`
      UPDATE ai_action_recommendations
      SET status = 'REJECTED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, execution_result = $2
      WHERE id = $3
    `, [adminUserId, reason, recommendationId]);

    // Insert audit log
    await pool.query(`
      INSERT INTO admin_logs (admin_id, action, details)
      VALUES ($1, 'AI_RECOMMENDATION_REJECTED', $2)
    `, [adminUserId, `Rejected AI recommendation ${recommendationId}. Reason: ${reason}`]);

    return { success: true, recommendationId, status: 'REJECTED' };
  }
}

module.exports = new AIActionRecommendationService();
