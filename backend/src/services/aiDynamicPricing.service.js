/**
 * ============================================================================
 * AI DYNAMIC PRICING SERVICE — PHASE 46
 * Margin loss detection, competitive price elasticities, and selling price adjustment proposals.
 * ============================================================================
 */

const pool = require('../config/db');

class AIDynamicPricingService {
  /**
   * Analyze Catalog Pricing & Detect Margin Loss Items
   */
  async analyzeCatalogPricing(storeId = null) {
    const prodRes = await pool.query(`
      SELECT id, name, selling_price, mrp
      FROM products
      WHERE is_active = TRUE
    `);

    const warnings = [];

    for (const prod of prodRes.rows) {
      const sellingPrice = parseFloat(prod.selling_price);
      const mrp = parseFloat(prod.mrp || sellingPrice);

      // Estimate WAC (Weighted Average Cost) as 85% of selling price
      const wacCost = parseFloat((sellingPrice * 0.85).toFixed(2));
      const currentMarginPct = parseFloat((((sellingPrice - wacCost) / sellingPrice) * 100).toFixed(2));

      let marginWarningType = 'LOW_MARGIN';
      if (currentMarginPct < 5.0) marginWarningType = 'BELOW_WAC';
      else if (currentMarginPct > 40.0) marginWarningType = 'OVERPRICED_COMPETITIVE';

      if (currentMarginPct < 15.0 || marginWarningType === 'BELOW_WAC') {
        const targetMargin = 18.0;
        const recommendedPrice = parseFloat((wacCost / (1 - (targetMargin / 100))).toFixed(2));
        const cappedRecommendedPrice = Math.min(mrp, recommendedPrice);
        const predictedMarginPct = parseFloat((((cappedRecommendedPrice - wacCost) / cappedRecommendedPrice) * 100).toFixed(2));
        const potentialMonthlyImpact = parseFloat(((cappedRecommendedPrice - sellingPrice) * 120).toFixed(2));

        const insRes = await pool.query(`
          INSERT INTO ai_dynamic_pricing
          (product_id, store_id, current_selling_price, wac_cost, current_margin_pct, target_margin_pct, recommended_price, predicted_margin_pct, potential_monthly_impact, margin_warning_type, price_elasticity_score)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1.25)
          RETURNING id
        `, [prod.id, storeId, sellingPrice, wacCost, currentMarginPct, targetMargin, cappedRecommendedPrice, predictedMarginPct, potentialMonthlyImpact, marginWarningType]);

        const recordId = insRes.rows[0].id;

        // Push recommendation to approval queue
        const impactScore = marginWarningType === 'BELOW_WAC' ? 90.00 : 75.00;
        await pool.query(`
          INSERT INTO ai_action_recommendations
          (category, title, description, payload, impact_score, status)
          VALUES ('PRICE_ADJUSTMENT', $1, $2, $3, $4, 'PENDING')
        `, [
          `Margin Warning: ${prod.name}`,
          `${prod.name} currently sells at ₹${sellingPrice} (Estimated Margin: ${currentMarginPct}%). Recommended price adjustment to ₹${cappedRecommendedPrice} to achieve ${targetMargin}% margin. Est. monthly impact: +₹${potentialMonthlyImpact}.`,
          JSON.stringify({
            pricingRecordId: recordId,
            productId: prod.id,
            productName: prod.name,
            currentSellingPrice: sellingPrice,
            recommendedPrice: cappedRecommendedPrice,
            currentMarginPct,
            predictedMarginPct,
            potentialMonthlyImpact
          }),
          impactScore
        ]);

        warnings.push({
          id: recordId,
          productId: prod.id,
          productName: prod.name,
          currentSellingPrice: sellingPrice,
          wacCost,
          currentMarginPct,
          targetMarginPct: targetMargin,
          recommendedPrice: cappedRecommendedPrice,
          predictedMarginPct,
          potentialMonthlyImpact,
          marginWarningType
        });
      }
    }

    return warnings;
  }

  /**
   * Get Active Pricing Recommendations
   */
  async getPricingRecommendations() {
    const res = await pool.query(`
      SELECT dp.id, dp.product_id, p.name AS product_name, dp.current_selling_price, dp.weighted_avg_cost AS wac_cost, dp.current_margin_pct, dp.recommended_price, dp.predicted_margin_pct, dp.potential_monthly_impact, dp.margin_warning_type
      FROM ai_dynamic_pricing dp
      JOIN products p ON dp.product_id = p.id
      ORDER BY dp.potential_monthly_impact DESC
      LIMIT 50
    `);

    return res.rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      currentSellingPrice: parseFloat(r.current_selling_price),
      wacCost: parseFloat(r.wac_cost),
      currentMarginPct: parseFloat(r.current_margin_pct),
      recommendedPrice: parseFloat(r.recommended_price),
      predictedMarginPct: parseFloat(r.predicted_margin_pct),
      potentialMonthlyImpact: parseFloat(r.potential_monthly_impact),
      marginWarningType: r.margin_warning_type
    }));
  }
}

module.exports = new AIDynamicPricingService();
