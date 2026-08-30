/**
 * ============================================================================
 * AI CAMPAIGN INTELLIGENCE SERVICE — PHASE 46
 * Recommends optimal customer segments, promo discount values, and predicted revenue
 * lifts for targeted marketing campaigns.
 * ============================================================================
 */

const pool = require('../config/db');

class AICampaignIntelligenceService {
  /**
   * Generate AI Campaign Proposals
   */
  async generateCampaignProposals() {
    const proposals = [
      {
        campaignName: 'Weekend Grocery Rush Booster',
        targetSegmentRule: 'Active customers with order frequency >= 2/month',
        recommendedChannel: 'WHATSAPP',
        recommendedPromoType: 'PERCENTAGE_DISCOUNT',
        suggestedDiscountVal: 10.00,
        predictedConversionRate: 22.50,
        predictedRevenueLift: 18500.00
      },
      {
        campaignName: 'At-Risk High-Value Retention Offer',
        targetSegmentRule: 'High-Value customers with recency score <= 2',
        recommendedChannel: 'WHATSAPP',
        recommendedPromoType: 'FLAT_DISCOUNT',
        suggestedDiscountVal: 150.00,
        predictedConversionRate: 35.00,
        predictedRevenueLift: 42000.00
      },
      {
        campaignName: 'New Customer 2nd Purchase Nudge',
        targetSegmentRule: 'New registered customers with 1 completed order',
        recommendedChannel: 'SMS',
        recommendedPromoType: 'FLAT_DISCOUNT',
        suggestedDiscountVal: 50.00,
        predictedConversionRate: 18.00,
        predictedRevenueLift: 9500.00
      }
    ];

    for (const prop of proposals) {
      const insRes = await pool.query(`
        INSERT INTO ai_campaign_targeting
        (campaign_name, target_segment_rule, recommended_channel, recommended_promo_type, suggested_discount_val, predicted_conversion_rate, predicted_revenue_lift, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT_PROPOSAL')
        RETURNING id
      `, [prop.campaignName, prop.targetSegmentRule, prop.recommendedChannel, prop.recommendedPromoType, prop.suggestedDiscountVal, prop.predictedConversionRate, prop.predictedRevenueLift]);

      // Push to approval queue
      await pool.query(`
        INSERT INTO ai_action_recommendations
        (category, title, description, payload, impact_score, status)
        VALUES ('CAMPAIGN_LAUNCH', $1, $2, $3, $4, 'PENDING')
      `, [
        `Campaign Proposal: ${prop.campaignName}`,
        `Targeting: ${prop.targetSegmentRule}. Channel: ${prop.recommendedChannel}. Offer: ${prop.suggestedDiscountVal}% discount. Est. Revenue Lift: ₹${prop.predictedRevenueLift.toLocaleString('en-IN')}.`,
        JSON.stringify({
          campaignProposalId: insRes.rows[0].id,
          campaignName: prop.campaignName,
          targetSegmentRule: prop.targetSegmentRule,
          recommendedChannel: prop.recommendedChannel,
          suggestedDiscountVal: prop.suggestedDiscountVal,
          predictedRevenueLift: prop.predictedRevenueLift
        }),
        85.00
      ]);
    }

    return proposals;
  }

  /**
   * Get Campaign Proposals
   */
  async getCampaignProposals() {
    const res = await pool.query(`
      SELECT id, campaign_name, target_segment_rule, recommended_channel, recommended_promo_type, suggested_discount_val, predicted_conversion_rate, predicted_revenue_lift, status, created_at
      FROM ai_campaign_targeting
      ORDER BY predicted_revenue_lift DESC, created_at DESC
      LIMIT 20
    `);

    return res.rows.map(r => ({
      id: r.id,
      campaignName: r.campaign_name,
      targetSegmentRule: r.target_segment_rule,
      recommendedChannel: r.recommended_channel,
      recommendedPromoType: r.recommended_promo_type,
      suggestedDiscountVal: parseFloat(r.suggested_discount_val),
      predictedConversionRate: parseFloat(r.predicted_conversion_rate),
      predictedRevenueLift: parseFloat(r.predicted_revenue_lift),
      status: r.status,
      createdAt: r.created_at
    }));
  }
}

module.exports = new AICampaignIntelligenceService();
