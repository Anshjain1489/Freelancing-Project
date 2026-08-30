-- ============================================================================
-- MIGRATION 048: PHASE 46 — AI-POWERED RETAIL INTELLIGENCE & STORE COPILOT
-- ============================================================================

-- 1. AI Retail Models & Configuration Registry
CREATE TABLE IF NOT EXISTS ai_retail_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL, -- DEMAND_FORECAST, CHURN_PREDICTION, DYNAMIC_PRICING, COPILOT, ANOMALY_DETECTION
    version VARCHAR(20) DEFAULT 'v1.0.0',
    provider VARCHAR(50) DEFAULT 'IN_HOUSE_STATISTICAL', -- OPENAI, GEMINI, LOCAL_LLM, IN_HOUSE_STATISTICAL
    system_prompt TEXT,
    confidence_threshold NUMERIC(5,2) DEFAULT 75.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Product Demand Forecasts
CREATE TABLE IF NOT EXISTS ai_demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    forecast_horizon_days INT DEFAULT 30,
    predicted_daily_demand NUMERIC(10,2) NOT NULL,
    forecast_lower_bound NUMERIC(10,2),
    forecast_upper_bound NUMERIC(10,2),
    trend_direction VARCHAR(20) DEFAULT 'STABLE', -- UPWARD, DOWNWARD, STABLE
    seasonality_factor NUMERIC(5,2) DEFAULT 1.00,
    confidence_score NUMERIC(5,2) DEFAULT 85.00,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI Inventory Reorder Predictions & Stock-Out Dates
CREATE TABLE IF NOT EXISTS ai_inventory_reorders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    current_stock NUMERIC(10,2) NOT NULL,
    predicted_stockout_date DATE NOT NULL,
    days_to_stockout INT NOT NULL,
    recommended_reorder_qty NUMERIC(10,2) NOT NULL,
    lead_time_days INT DEFAULT 3,
    safety_stock_qty NUMERIC(10,2) DEFAULT 10.00,
    risk_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, AUTO_REORDERED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Dynamic Pricing & Margin Loss Intelligence
CREATE TABLE IF NOT EXISTS ai_dynamic_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    current_selling_price NUMERIC(10,2) NOT NULL,
    weighted_avg_cost NUMERIC(10,2) NOT NULL,
    current_margin_pct NUMERIC(5,2) NOT NULL,
    recommended_price NUMERIC(10,2) NOT NULL,
    predicted_margin_pct NUMERIC(5,2) NOT NULL,
    price_elasticity_score NUMERIC(5,2) DEFAULT 1.00,
    margin_warning_type VARCHAR(50), -- BELOW_WAC, LOW_MARGIN, OVERPRICED_COMPETITIVE
    potential_monthly_impact NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI Customer Churn Predictions
CREATE TABLE IF NOT EXISTS ai_churn_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    churn_probability NUMERIC(5,2) NOT NULL, -- 0.00 to 100.00
    rfm_velocity_score NUMERIC(5,2) NOT NULL,
    risk_tier VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    estimated_revenue_at_risk NUMERIC(10,2) DEFAULT 0.00,
    recommended_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. AI Personalized Product Recommendations
CREATE TABLE IF NOT EXISTS ai_product_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recommended_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(30) NOT NULL, -- FREQUENTLY_BOUGHT_TOGETHER, REORDER_REMINDER, CROSS_SELL, UP_SELL
    affinity_score NUMERIC(5,2) DEFAULT 80.00,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. AI Campaign Targeting Intelligence
CREATE TABLE IF NOT EXISTS ai_campaign_targeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(150) NOT NULL,
    target_segment_rule TEXT NOT NULL,
    recommended_channel VARCHAR(30) DEFAULT 'WHATSAPP',
    recommended_promo_type VARCHAR(30) DEFAULT 'PERCENTAGE_DISCOUNT',
    suggested_discount_val NUMERIC(10,2) DEFAULT 10.00,
    predicted_conversion_rate NUMERIC(5,2) DEFAULT 15.00,
    predicted_revenue_lift NUMERIC(10,2) DEFAULT 5000.00,
    status VARCHAR(30) DEFAULT 'DRAFT_PROPOSAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI Udhar Credit Risk Assessments
CREATE TABLE IF NOT EXISTS ai_credit_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_credit_balance NUMERIC(10,2) NOT NULL,
    credit_limit NUMERIC(10,2) NOT NULL,
    default_risk_score NUMERIC(5,2) NOT NULL, -- 0 to 100
    repayment_delay_days INT DEFAULT 0,
    risk_rating VARCHAR(20) NOT NULL, -- SAFE, WATCHLIST, HIGH_RISK, DEFAULT_IMMINENT
    recommended_credit_limit NUMERIC(10,2),
    action_advice TEXT,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AI Grocery Subscription Intelligence
CREATE TABLE IF NOT EXISTS ai_subscription_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cancellation_risk_pct NUMERIC(5,2) NOT NULL,
    pause_frequency_30d INT DEFAULT 0,
    optimal_delivery_day VARCHAR(20),
    recommended_frequency VARCHAR(20),
    recommended_retention_perk TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AI Store Sales & Revenue Forecasts
CREATE TABLE IF NOT EXISTS ai_sales_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_revenue NUMERIC(12,2) NOT NULL,
    revenue_lower_bound NUMERIC(12,2),
    revenue_upper_bound NUMERIC(12,2),
    predicted_orders_count INT NOT NULL,
    confidence_pct NUMERIC(5,2) DEFAULT 90.00,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI Anomaly Detection Logs
CREATE TABLE IF NOT EXISTS ai_anomaly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(50) NOT NULL, -- SALES_SPIKE, REFUND_SURGE, DISCOUNT_SPIKE, CASH_MISMATCH, INVENTORY_VARIANCE
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    z_score NUMERIC(6,2) NOT NULL,
    metric_value NUMERIC(12,2) NOT NULL,
    expected_baseline NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AI Business Copilot Conversations & Messages
CREATE TABLE IF NOT EXISTS ai_copilot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT 'Store Copilot Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_copilot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_copilot_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- USER, AI, SYSTEM
    raw_prompt TEXT,
    sanitized_prompt TEXT,
    response_text TEXT,
    structured_data JSONB,
    telemetry_snapshot JSONB,
    tokens_used INT DEFAULT 0,
    model_provider VARCHAR(50) DEFAULT 'IN_HOUSE_STATISTICAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Central AI Recommendation Queue (Approval Engine Pipeline)
CREATE TABLE IF NOT EXISTS ai_action_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- INVENTORY_REORDER, PRICE_ADJUSTMENT, CHURN_OFFER, CREDIT_LIMIT_CHANGE, CAMPAIGN_LAUNCH
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    payload JSONB NOT NULL, -- Target entity ID & parameters to pass to existing business service
    impact_score NUMERIC(5,2) DEFAULT 80.00,
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXECUTED, FAILED
    created_by_model VARCHAR(100) DEFAULT 'PHASE46_AI_ENGINE',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST ANALYTICAL SEARCH
CREATE INDEX IF NOT EXISTS idx_ai_demand_product ON ai_demand_forecasts(product_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reorders_risk ON ai_inventory_reorders(risk_level, status);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_margin ON ai_dynamic_pricing(margin_warning_type);
CREATE INDEX IF NOT EXISTS idx_ai_churn_risk ON ai_churn_predictions(risk_tier, churn_probability DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_customer ON ai_product_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_severity ON ai_anomaly_logs(severity, is_resolved);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status ON ai_action_recommendations(status, category);
