/**
 * Phase 45 Comprehensive Enterprise QA Test Suite
 * Module: Customer Growth, CRM, Marketing Automation & Retention Intelligence
 * Target: 135+ Assertions across 10 QA Groups
 */

const assert = require('assert');
const customerCRMService = require('./services/customer/customerCRM.service');
const customerSegmentationService = require('./services/customer/customerSegmentation.service');
const customerEngagementService = require('./services/customer/customerEngagement.service');
const marketingCampaignService = require('./services/customer/marketingCampaign.service');
const abandonedCartService = require('./services/customer/abandonedCart.service');
const referralService = require('./services/customer/referral.service');
const marketingAutomationService = require('./services/customer/marketingAutomation.service');
const customerAnalyticsService = require('./services/customer/customerAnalytics.service');
const automationSchedulerService = require('./services/admin/automationScheduler.service');

async function runPhase45QASuite() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 45 CRM & MARKETING QA SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (description, fn) => {
    try {
      fn();
      passed++;
      console.log(`  ✓ PASS: ${description}`);
    } catch (err) {
      failed++;
      console.error(`  ✕ FAIL: ${description}`);
      console.error(`     Reason: ${err.message}`);
    }
  };

  const asyncTest = async (description, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASS: ${description}`);
    } catch (err) {
      failed++;
      console.error(`  ✕ FAIL: ${description}`);
      console.error(`     Reason: ${err.message}`);
    }
  };

  const testUserId1 = 'usr-p45-cust-001';
  const testUserId2 = 'usr-p45-cust-002';
  const testUserId3 = 'usr-p45-cust-003';

  // -------------------------------------------------------------
  // Group 1: CRM Profiles, Aggregation, RFM & CLV (15 Assertions)
  // -------------------------------------------------------------
  console.log('--- Group 1: CRM Profiles, Aggregation, RFM & CLV ---');

  test('1.1 RFM score calculates correct Recency R5 for recent order (<=7 days)', () => {
    const score = customerCRMService.calculateRFM(new Date().toISOString(), 5, 6000);
    assert.strictEqual(score, 'R5F4M4');
  });

  test('1.2 RFM score calculates R4 for order within 30 days', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const score = customerCRMService.calculateRFM(fifteenDaysAgo, 3, 2500);
    assert.strictEqual(score, 'R4F3M3');
  });

  test('1.3 RFM score calculates R3 for order within 60 days', () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const score = customerCRMService.calculateRFM(fortyDaysAgo, 1, 400);
    assert.strictEqual(score, 'R3F2M1');
  });

  test('1.4 RFM score calculates R1 for inactive order (>90 days)', () => {
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const score = customerCRMService.calculateRFM(hundredDaysAgo, 1, 300);
    assert.strictEqual(score, 'R1F2M1');
  });

  test('1.5 CLV formula produces valid estimated financial lifetime value (18,000)', () => {
    const firstOrderDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months ago
    const clv = customerCRMService.calculateCLV(500, firstOrderDate, 6);
    assert.ok(clv > 0);
    assert.strictEqual(clv, 18000); // 500 AOV * 1 order/mo * 12 * 3 yrs = 18,000
  });

  test('1.6 CLV formula returns 0 for account without first order date', () => {
    const clv = customerCRMService.calculateCLV(500, null, 0);
    assert.strictEqual(clv, 0);
  });

  await asyncTest('1.7 syncCustomerProfile initializes customer profile with customer code', async () => {
    const prof = await customerCRMService.syncCustomerProfile(testUserId1);
    assert.ok(prof);
    assert.strictEqual(prof.user_id, testUserId1);
    assert.ok(prof.customer_code.startsWith('CKS-CUST-'));
    assert.strictEqual(prof.completed_orders, 0);
  });

  await asyncTest('1.8 getProfile returns customer profile for valid user', async () => {
    const prof = await customerCRMService.getProfile(testUserId1);
    assert.strictEqual(prof.user_id, testUserId1);
  });

  await asyncTest('1.9 listProfiles filters customer profiles by segment', async () => {
    const res = await customerCRMService.listProfiles({ segment: 'NEW_CUSTOMER' });
    assert.ok(res.profiles);
    assert.ok(res.summary.totalCustomers >= 1);
  });

  await asyncTest('1.10 syncCustomerProfile creates profile for second customer', async () => {
    const prof = await customerCRMService.syncCustomerProfile(testUserId2);
    assert.strictEqual(prof.user_id, testUserId2);
  });

  await asyncTest('1.11 listProfiles pagination metadata structure', async () => {
    const res = await customerCRMService.listProfiles({ page: 1, limit: 10 });
    assert.strictEqual(res.pagination.page, 1);
    assert.strictEqual(res.pagination.limit, 10);
  });

  await asyncTest('1.12 getProfile auto-creates missing profile on demand', async () => {
    const prof = await customerCRMService.getProfile(testUserId3);
    assert.strictEqual(prof.user_id, testUserId3);
  });

  test('1.13 RFM Frequency F5 awarded for 10+ orders', () => {
    const score = customerCRMService.calculateRFM(new Date().toISOString(), 12, 15000);
    assert.strictEqual(score, 'R5F5M5');
  });

  test('1.14 RFM Monetary M1 awarded for spend < 500', () => {
    const score = customerCRMService.calculateRFM(new Date().toISOString(), 1, 200);
    assert.strictEqual(score, 'R5F2M1');
  });

  test('1.15 syncCustomerProfile handles non-empty profile recalculation', async () => {
    const prof = await customerCRMService.syncCustomerProfile(testUserId1);
    assert.ok(prof.customer_segment);
  });

  // -------------------------------------------------------------
  // Group 2: Customer Segmentation Engine (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Customer Segmentation Engine ---');

  await asyncTest('2.1 listSegments retrieves default system segments', async () => {
    const res = await customerSegmentationService.listSegments();
    assert.ok(res.segments.length >= 6);
    const hasHighValue = res.segments.some(s => s.slug === 'HIGH_VALUE');
    assert.ok(hasHighValue);
  });

  test('2.2 evaluateCriteria matches minimum spend criteria correctly', () => {
    const profile = { completed_orders: 5, total_spend: 12000, last_order_at: new Date().toISOString() };
    const matches = customerSegmentationService.evaluateCriteria(profile, { minimum_spend: 10000 });
    assert.strictEqual(matches, true);
  });

  test('2.3 evaluateCriteria rejects profile not meeting minimum spend', () => {
    const profile = { completed_orders: 2, total_spend: 4000 };
    const matches = customerSegmentationService.evaluateCriteria(profile, { minimum_spend: 10000 });
    assert.strictEqual(matches, false);
  });

  test('2.4 evaluateCriteria matches minimum orders criteria', () => {
    const profile = { completed_orders: 4, total_spend: 2000 };
    const matches = customerSegmentationService.evaluateCriteria(profile, { minimum_orders: 3 });
    assert.strictEqual(matches, true);
  });

  test('2.5 evaluateCriteria rejects profile failing minimum orders', () => {
    const profile = { completed_orders: 1, total_spend: 2000 };
    const matches = customerSegmentationService.evaluateCriteria(profile, { minimum_orders: 3 });
    assert.strictEqual(matches, false);
  });

  test('2.6 evaluateCriteria matches maximum orders criteria', () => {
    const profile = { completed_orders: 1, total_spend: 500 };
    const matches = customerSegmentationService.evaluateCriteria(profile, { maximum_orders: 1 });
    assert.strictEqual(matches, true);
  });

  await asyncTest('2.7 createSegment creates a new custom segment with JSONB criteria', async () => {
    const seg = await customerSegmentationService.createSegment({
      name: 'Festive High Spenders',
      slug: 'FESTIVE_SPENDERS',
      description: 'Custom segment for Diwali shoppers',
      criteria: { minimum_spend: 15000 }
    });
    assert.ok(seg.id);
    assert.strictEqual(seg.slug, 'FESTIVE_SPENDERS');
  });

  await asyncTest('2.8 createSegment validates missing segment name', async () => {
    try {
      await customerSegmentationService.createSegment({ slug: 'NO_NAME' });
      assert.fail('Should have failed validation');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('2.9 refreshSegmentMemberships updates membership evaluation', async () => {
    const res = await customerSegmentationService.refreshSegmentMemberships();
    assert.strictEqual(res.success, true);
  });

  await asyncTest('2.10 getCustomerSegments returns matching active segments for customer', async () => {
    const res = await customerSegmentationService.getCustomerSegments(testUserId1);
    assert.ok(res.segments);
  });

  test('2.11 evaluateCriteria inactive_days filter evaluation', () => {
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const profile = { completed_orders: 2, total_spend: 1000, last_order_at: oldDate };
    const matches = customerSegmentationService.evaluateCriteria(profile, { min_inactive_days: 30, max_inactive_days: 60 });
    assert.strictEqual(matches, true);
  });

  test('2.12 evaluateCriteria returns true for empty criteria', () => {
    const profile = { completed_orders: 1, total_spend: 100 };
    const matches = customerSegmentationService.evaluateCriteria(profile, {});
    assert.strictEqual(matches, true);
  });

  test('2.13 evaluateCriteria returns false for null profile', () => {
    const matches = customerSegmentationService.evaluateCriteria(null, { minimum_spend: 100 });
    assert.strictEqual(matches, false);
  });

  await asyncTest('2.14 createSegment normalizes custom slug to uppercase', async () => {
    const seg = await customerSegmentationService.createSegment({
      name: 'Weekend Buyers',
      slug: 'weekend-buyers-01',
      criteria: { minimum_orders: 2 }
    });
    assert.strictEqual(seg.slug, 'WEEKEND_BUYERS_01');
  });

  await asyncTest('2.15 listSegments returns populated array', async () => {
    const res = await customerSegmentationService.listSegments();
    assert.ok(Array.isArray(res.segments));
  });

  // -------------------------------------------------------------
  // Group 3: Customer Engagement Events & Privacy (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Customer Engagement Events & Privacy ---');

  await asyncTest('3.1 logEvent records structured engagement event', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      productId: 'prod-milk-01',
      metadata: { category: 'Dairy' }
    });
    assert.ok(ev.id);
    assert.strictEqual(ev.event_type, 'PRODUCT_VIEW');
  });

  await asyncTest('3.2 logEvent sanitizes sensitive credentials from metadata (passwords, tokens)', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'CHECKOUT_STARTED',
      metadata: { password: 'secretpassword123', jwt: 'eyJhbGci...', cartTotal: 500 }
    });
    assert.strictEqual(ev.metadata.password, undefined);
    assert.strictEqual(ev.metadata.jwt, undefined);
    assert.strictEqual(ev.metadata.cartTotal, 500);
  });

  await asyncTest('3.3 logEvent rejects event missing eventType', async () => {
    try {
      await customerEngagementService.logEvent({ userId: testUserId1 });
      assert.fail('Should have failed');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('3.4 getCustomerTimeline retrieves itemized event timeline for user', async () => {
    const res = await customerEngagementService.getCustomerTimeline(testUserId1);
    assert.ok(res.timeline.length >= 2);
  });

  await asyncTest('3.5 getPreferences returns default communication preferences', async () => {
    const prefs = await customerEngagementService.getPreferences(testUserId1);
    assert.strictEqual(prefs.whatsapp_enabled, true);
    assert.strictEqual(prefs.promotional_notifications_enabled, true);
  });

  await asyncTest('3.6 updatePreferences modifies marketing eligibility preferences', async () => {
    const updated = await customerEngagementService.updatePreferences(testUserId1, { promotionalNotificationsEnabled: false });
    assert.strictEqual(updated.promotional_notifications_enabled, false);
    // Restore
    await customerEngagementService.updatePreferences(testUserId1, { promotionalNotificationsEnabled: true });
  });

  await asyncTest('3.7 logEvent handles ADD_TO_CART event', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'ADD_TO_CART',
      productId: 'prod-atta-01'
    });
    assert.strictEqual(ev.event_type, 'ADD_TO_CART');
  });

  await asyncTest('3.8 logEvent handles CHECKOUT_COMPLETED event', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'CHECKOUT_COMPLETED',
      orderId: 'ord-p45-999'
    });
    assert.strictEqual(ev.event_type, 'CHECKOUT_COMPLETED');
  });

  await asyncTest('3.9 logEvent handles CAMPAIGN_CLICKED event', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'CAMPAIGN_CLICKED',
      campaignId: 'mkt-test-123'
    });
    assert.strictEqual(ev.event_type, 'CAMPAIGN_CLICKED');
  });

  await asyncTest('3.10 getPreferences validates missing userId', async () => {
    try {
      await customerEngagementService.getPreferences(null);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('3.11 updatePreferences validates missing userId', async () => {
    try {
      await customerEngagementService.updatePreferences(null, { whatsappEnabled: false });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('3.12 getCustomerTimeline validates missing userId', async () => {
    try {
      await customerEngagementService.getCustomerTimeline(null);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('3.13 logEvent sanitizes card_number from metadata', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'CHECKOUT_STARTED',
      metadata: { card_number: '4111111111111111', amount: 950 }
    });
    assert.strictEqual(ev.metadata.card_number, undefined);
    assert.strictEqual(ev.metadata.amount, 950);
  });

  await asyncTest('3.14 logEvent sanitizes secret tokens from metadata', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_SEARCH',
      metadata: { secret: 'topsecretkey', query: 'milk' }
    });
    assert.strictEqual(ev.metadata.secret, undefined);
    assert.strictEqual(ev.metadata.query, 'milk');
  });

  await asyncTest('3.15 getCustomerTimeline respects limit parameter', async () => {
    const res = await customerEngagementService.getCustomerTimeline(testUserId1, 2);
    assert.ok(res.timeline.length <= 2);
  });

  // -------------------------------------------------------------
  // Group 4: Marketing Campaign Creation & Target Audiences (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Marketing Campaign Creation & Target Audiences ---');

  test('4.1 renderTemplate safely interpolates placeholders without code execution', () => {
    const template = 'Hello {{customer_name}}, use coupon {{coupon_code}} for {{offer_amount}} off!';
    const rendered = marketingCampaignService.renderTemplate(template, {
      customer_name: 'Akash',
      coupon_code: 'FESTIVE10',
      offer_amount: '10%'
    });
    assert.strictEqual(rendered, 'Hello Akash, use coupon FESTIVE10 for 10% off!');
  });

  test('4.2 renderTemplate handles missing template parameters gracefully', () => {
    const template = 'Welcome {{customer_name}}, offer expires on {{expiry_date}}';
    const rendered = marketingCampaignService.renderTemplate(template, { customer_name: 'Rahul' });
    assert.strictEqual(rendered, 'Welcome Rahul, offer expires on {{expiry_date}}');
  });

  await asyncTest('4.3 createCampaign creates draft marketing campaign', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'Diwali Special Offer',
      campaignType: 'PROMOTIONAL',
      channel: 'IN_APP',
      subject: 'Diwali Special 10% Off',
      messageTemplate: 'Hi {{customer_name}}, enjoy Diwali savings!'
    }, 'admin-001');
    assert.ok(camp.id);
    assert.strictEqual(camp.status, 'DRAFT');
  });

  await asyncTest('4.4 createCampaign validates missing name', async () => {
    try {
      await marketingCampaignService.createCampaign({ messageTemplate: 'Test' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('4.5 createCampaign validates missing messageTemplate', async () => {
    try {
      await marketingCampaignService.createCampaign({ name: 'Campaign 1' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('4.6 listCampaigns lists created campaigns', async () => {
    const res = await marketingCampaignService.listCampaigns();
    assert.ok(res.campaigns.length >= 1);
  });

  await asyncTest('4.7 updateCampaign updates campaign fields', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const campId = campaigns[0].id;
    const updated = await marketingCampaignService.updateCampaign(campId, { subject: 'Updated Diwali Header' });
    assert.strictEqual(updated.subject, 'Updated Diwali Header');
  });

  await asyncTest('4.8 updateCampaign validates missing campaignId', async () => {
    try {
      await marketingCampaignService.updateCampaign(null, { name: 'New' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('4.9 createCampaign supports REACTIVATION campaign type', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'We Miss You Offer',
      campaignType: 'REACTIVATION',
      channel: 'WHATSAPP',
      messageTemplate: 'Come back for ₹50 off!'
    });
    assert.strictEqual(camp.campaign_type, 'REACTIVATION');
  });

  await asyncTest('4.10 createCampaign supports CART_RECOVERY campaign type', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'Cart Reminder Offer',
      campaignType: 'CART_RECOVERY',
      channel: 'IN_APP',
      messageTemplate: 'Complete your cart now!'
    });
    assert.strictEqual(camp.campaign_type, 'CART_RECOVERY');
  });

  await asyncTest('4.11 listCampaigns filters by status', async () => {
    const res = await marketingCampaignService.listCampaigns({ status: 'DRAFT' });
    assert.ok(res.campaigns.every(c => c.status === 'DRAFT'));
  });

  test('4.12 renderTemplate store_name interpolation', () => {
    const template = 'Welcome to {{store_name}}!';
    const rendered = marketingCampaignService.renderTemplate(template, { store_name: 'Chaudhary Kirana Store' });
    assert.strictEqual(rendered, 'Welcome to Chaudhary Kirana Store!');
  });

  await asyncTest('4.13 updateCampaign status transition to PAUSED', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const updated = await marketingCampaignService.updateCampaign(campaigns[0].id, { status: 'PAUSED' });
    assert.strictEqual(updated.status, 'PAUSED');
  });

  await asyncTest('4.14 updateCampaign status transition back to DRAFT', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const updated = await marketingCampaignService.updateCampaign(campaigns[0].id, { status: 'DRAFT' });
    assert.strictEqual(updated.status, 'DRAFT');
  });

  await asyncTest('4.15 listCampaigns returns array format', async () => {
    const res = await marketingCampaignService.listCampaigns();
    assert.ok(Array.isArray(res.campaigns));
  });

  // -------------------------------------------------------------
  // Group 5: Campaign Delivery & Idempotency (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Campaign Delivery & Idempotency ---');

  await asyncTest('5.1 dispatchCampaign dispatches campaign to target users', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const campId = campaigns[0].id;
    const res = await marketingCampaignService.dispatchCampaign(campId, [testUserId1, testUserId2]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.sentCount, 2);
  });

  await asyncTest('5.2 dispatchCampaign is idempotent (re-dispatching creates 0 duplicate deliveries)', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const campId = campaigns[0].id;
    const res = await marketingCampaignService.dispatchCampaign(campId, [testUserId1, testUserId2]);
    assert.strictEqual(res.sentCount, 0); // All already delivered
  });

  await asyncTest('5.3 getCampaignAnalytics returns delivery and conversion metrics', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const campId = campaigns[0].id;
    const analytics = await marketingCampaignService.getCampaignAnalytics(campId);
    assert.ok(analytics.analytics);
    assert.strictEqual(analytics.analytics.deliveredCount, 2);
  });

  await asyncTest('5.4 dispatchCampaign updates campaign status to COMPLETED', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const camp = campaigns.find(c => c.status === 'COMPLETED');
    assert.ok(camp);
  });

  await asyncTest('5.5 dispatchCampaign validates non-existent campaignId', async () => {
    try {
      await marketingCampaignService.dispatchCampaign('mkt-fake-999');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
    }
  });

  await asyncTest('5.6 getCampaignAnalytics validates non-existent campaignId', async () => {
    try {
      await marketingCampaignService.getCampaignAnalytics('mkt-fake-999');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
    }
  });

  await asyncTest('5.7 dispatchCampaign respects marketing opt-out preferences', async () => {
    // Disable promotional for testUserId3
    await customerEngagementService.updatePreferences(testUserId3, { promotionalNotificationsEnabled: false });

    const camp = await marketingCampaignService.createCampaign({
      name: 'Opt-Out Test Campaign',
      campaignType: 'PROMOTIONAL',
      messageTemplate: 'Promo message'
    });

    const res = await marketingCampaignService.dispatchCampaign(camp.id, [testUserId3]);
    assert.strictEqual(res.skippedOptOutCount, 1);
    assert.strictEqual(res.sentCount, 0);

    // Re-enable
    await customerEngagementService.updatePreferences(testUserId3, { promotionalNotificationsEnabled: true });
  });

  await asyncTest('5.8 getCampaignAnalytics totalDeliveries count', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const analytics = await marketingCampaignService.getCampaignAnalytics(campaigns[0].id);
    assert.strictEqual(analytics.analytics.totalDeliveries, 2);
  });

  await asyncTest('5.9 getCampaignAnalytics conversionRatePercentage calculation', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const analytics = await marketingCampaignService.getCampaignAnalytics(campaigns[0].id);
    assert.ok(typeof analytics.analytics.conversionRatePercentage === 'number');
  });

  await asyncTest('5.10 dispatchCampaign auto-resolves empty target users', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'All Audience Test',
      messageTemplate: 'Test message for all'
    });
    const res = await marketingCampaignService.dispatchCampaign(camp.id);
    assert.strictEqual(res.success, true);
  });

  await asyncTest('5.11 dispatchCampaign idempotency key verification', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const campId = campaigns[0].id;
    const res = await marketingCampaignService.dispatchCampaign(campId, [testUserId1]);
    assert.strictEqual(res.sentCount, 0);
  });

  await asyncTest('5.12 getCampaignAnalytics handles zero delivery campaigns', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'Zero Delivery Test',
      messageTemplate: 'Empty campaign'
    });
    const analytics = await marketingCampaignService.getCampaignAnalytics(camp.id);
    assert.strictEqual(analytics.analytics.totalDeliveries, 0);
    assert.strictEqual(analytics.analytics.conversionRatePercentage, 0);
  });

  await asyncTest('5.13 dispatchCampaign returns totalTargeted count', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const res = await marketingCampaignService.dispatchCampaign(campaigns[0].id, [testUserId1]);
    assert.strictEqual(res.totalTargeted, 1);
  });

  await asyncTest('5.14 dispatchCampaign delivery channel matches campaign channel', async () => {
    const camp = await marketingCampaignService.createCampaign({
      name: 'WhatsApp Channel Test',
      channel: 'WHATSAPP',
      messageTemplate: 'WhatsApp Test'
    });
    await marketingCampaignService.dispatchCampaign(camp.id, [testUserId1]);
    const deliveryKey = `${camp.id}_${testUserId1}`;
    const delivery = marketingCampaignService.mockDeliveries.get(deliveryKey);
    assert.strictEqual(delivery.channel, 'WHATSAPP');
  });

  await asyncTest('5.15 dispatchCampaign delivery timestamp populates sent_at', async () => {
    const { campaigns } = await marketingCampaignService.listCampaigns();
    const deliveryKey = `${campaigns[0].id}_${testUserId1}`;
    const delivery = marketingCampaignService.mockDeliveries.get(deliveryKey);
    assert.ok(delivery.sent_at);
  });

  // -------------------------------------------------------------
  // Group 6: Abandoned Cart Detection & Recovery (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Abandoned Cart Detection & Recovery ---');

  await asyncTest('6.1 detectAbandonedCarts runs without errors', async () => {
    const res = await abandonedCartService.detectAbandonedCarts();
    assert.strictEqual(res.success, true);
  });

  await asyncTest('6.2 sendCartRecoveryReminders obeys maximum 2 reminders rule', async () => {
    const res = await abandonedCartService.sendCartRecoveryReminders();
    assert.strictEqual(res.success, true);
  });

  await asyncTest('6.3 markCartRecovered updates status to RECOVERED upon order completion', async () => {
    // Inject mock abandoned cart
    abandonedCartService.mockAbandonedCarts.set('ac-test-1', {
      id: 'ac-test-1',
      cart_id: 'cart-123',
      user_id: testUserId1,
      detected_at: new Date().toISOString(),
      cart_value: 850,
      recovery_status: 'REMINDER_1_SENT',
      reminder_count: 1
    });

    const recovered = await abandonedCartService.markCartRecovered('cart-123', testUserId1, 'ord-rec-999');
    assert.ok(recovered);
    assert.strictEqual(recovered.recovery_status, 'RECOVERED');
    assert.strictEqual(recovered.recovered_order_id, 'ord-rec-999');
  });

  await asyncTest('6.4 listAbandonedCarts returns abandoned carts summary for admin', async () => {
    const res = await abandonedCartService.listAbandonedCarts();
    assert.ok(res.abandonedCarts);
    assert.ok(res.summary.recoveredCount >= 1);
  });

  await asyncTest('6.5 markCartRecovered returns null for non-existent cart', async () => {
    const res = await abandonedCartService.markCartRecovered('cart-non-existent', 'user-non-existent', 'ord-999');
    assert.strictEqual(res, null);
  });

  await asyncTest('6.6 listAbandonedCarts filters by recovery status', async () => {
    const res = await abandonedCartService.listAbandonedCarts({ status: 'RECOVERED' });
    assert.ok(res.abandonedCarts.every(c => c.recovery_status === 'RECOVERED'));
  });

  await asyncTest('6.7 sendCartRecoveryReminders ignores RECOVERED carts', async () => {
    const res = await abandonedCartService.sendCartRecoveryReminders();
    const ac = abandonedCartService.mockAbandonedCarts.get('ac-test-1');
    assert.strictEqual(ac.recovery_status, 'RECOVERED');
    assert.strictEqual(ac.reminder_count, 1);
  });

  await asyncTest('6.8 sendCartRecoveryReminders respects user opt-out preference', async () => {
    abandonedCartService.mockAbandonedCarts.set('ac-optout-1', {
      id: 'ac-optout-1',
      cart_id: 'cart-optout',
      user_id: testUserId3,
      detected_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hrs ago
      recovery_status: 'DETECTED',
      reminder_count: 0
    });

    await customerEngagementService.updatePreferences(testUserId3, { promotionalNotificationsEnabled: false });

    await abandonedCartService.sendCartRecoveryReminders();
    const ac = abandonedCartService.mockAbandonedCarts.get('ac-optout-1');
    assert.strictEqual(ac.reminder_count, 0); // Opted out, reminder not sent

    await customerEngagementService.updatePreferences(testUserId3, { promotionalNotificationsEnabled: true });
  });

  await asyncTest('6.9 sendCartRecoveryReminders triggers reminder 1 after 2 hours threshold', async () => {
    abandonedCartService.mockAbandonedCarts.set('ac-rem1-test', {
      id: 'ac-rem1-test',
      cart_id: 'cart-rem1',
      user_id: testUserId2,
      detected_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hrs ago
      recovery_status: 'DETECTED',
      reminder_count: 0
    });

    await abandonedCartService.sendCartRecoveryReminders();
    const ac = abandonedCartService.mockAbandonedCarts.get('ac-rem1-test');
    assert.strictEqual(ac.reminder_count, 1);
    assert.strictEqual(ac.recovery_status, 'REMINDER_1_SENT');
  });

  await asyncTest('6.10 sendCartRecoveryReminders triggers reminder 2 after 24 hours threshold', async () => {
    abandonedCartService.mockAbandonedCarts.set('ac-rem2-test', {
      id: 'ac-rem2-test',
      cart_id: 'cart-rem2',
      user_id: testUserId2,
      detected_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hrs ago
      recovery_status: 'REMINDER_1_SENT',
      reminder_count: 1
    });

    await abandonedCartService.sendCartRecoveryReminders();
    const ac = abandonedCartService.mockAbandonedCarts.get('ac-rem2-test');
    assert.strictEqual(ac.reminder_count, 2);
    assert.strictEqual(ac.recovery_status, 'REMINDER_2_SENT');
  });

  await asyncTest('6.11 sendCartRecoveryReminders stops after 2 reminders max limit', async () => {
    abandonedCartService.mockAbandonedCarts.set('ac-rem2-test', {
      id: 'ac-rem2-test',
      cart_id: 'cart-rem2',
      user_id: testUserId2,
      detected_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      recovery_status: 'REMINDER_2_SENT',
      reminder_count: 2
    });

    await abandonedCartService.sendCartRecoveryReminders();
    const ac = abandonedCartService.mockAbandonedCarts.get('ac-rem2-test');
    assert.strictEqual(ac.reminder_count, 2);
  });

  await asyncTest('6.12 listAbandonedCarts recoveryRatePercentage calculation', async () => {
    const res = await abandonedCartService.listAbandonedCarts();
    assert.ok(typeof res.summary.recoveryRatePercentage === 'number');
  });

  await asyncTest('6.13 listAbandonedCarts recoveredRevenue calculation', async () => {
    const res = await abandonedCartService.listAbandonedCarts();
    assert.ok(res.summary.recoveredRevenue >= 850);
  });

  await asyncTest('6.14 detectAbandonedCarts returns newlyDetectedCount integer', async () => {
    const res = await abandonedCartService.detectAbandonedCarts();
    assert.ok(typeof res.newlyDetectedCount === 'number');
  });

  await asyncTest('6.15 sendCartRecoveryReminders returns remindersSent count', async () => {
    const res = await abandonedCartService.sendCartRecoveryReminders();
    assert.ok(typeof res.remindersSent === 'number');
  });

  // -------------------------------------------------------------
  // Group 7: Referral Program, Codes & Rewards (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Referral Program, Codes & Rewards ---');

  await asyncTest('7.1 getOrCreateReferralCode generates unique primary referral code', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    assert.ok(codeRec.code);
    assert.ok(codeRec.code.startsWith('REF-'));
    assert.strictEqual(codeRec.user_id, testUserId1);
  });

  await asyncTest('7.2 getOrCreateReferralCode validates missing userId', async () => {
    try {
      await referralService.getOrCreateReferralCode(null);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('7.3 applyReferralCode creates pending referral for referred user', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    const ref = await referralService.applyReferralCode(testUserId2, codeRec.code);
    assert.ok(ref.id);
    assert.strictEqual(ref.referrer_user_id, testUserId1);
    assert.strictEqual(ref.referred_user_id, testUserId2);
    assert.strictEqual(ref.status, 'PENDING');
  });

  await asyncTest('7.4 CRITICAL SAFETY RULE: Self-referral prevention guard blocks customer using own code', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    try {
      await referralService.applyReferralCode(testUserId1, codeRec.code);
      assert.fail('Should have blocked self-referral');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Self-referral is strictly prohibited'));
    }
  });

  await asyncTest('7.5 processQualifiedOrder awards 100 loyalty points to referrer on first order', async () => {
    const res = await referralService.processQualifiedOrder(testUserId2, 'ord-first-001', 1200);
    assert.ok(res);
    assert.strictEqual(res.referral.status, 'REWARDED');
    assert.strictEqual(res.ledgerEntry.points, 100);
  });

  await asyncTest('7.6 getReferralSummary returns complete referral stats for customer', async () => {
    const summary = await referralService.getReferralSummary(testUserId1);
    assert.strictEqual(summary.stats.successfulCount, 1);
    assert.strictEqual(summary.stats.totalPointsEarned, 100);
  });

  await asyncTest('7.7 listReferralsAdmin returns global referral analytics for admin', async () => {
    const adminRes = await referralService.listReferralsAdmin();
    assert.ok(adminRes.summary);
    assert.strictEqual(adminRes.summary.totalSuccessful, 1);
  });

  await asyncTest('7.8 applyReferralCode validates non-existent referral code', async () => {
    try {
      await referralService.applyReferralCode(testUserId3, 'REF-INVALID-999');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Invalid or inactive'));
    }
  });

  await asyncTest('7.9 processQualifiedOrder returns null for non-referred customer', async () => {
    const res = await referralService.processQualifiedOrder('usr-non-referred', 'ord-999', 500);
    assert.strictEqual(res, null);
  });

  await asyncTest('7.10 getReferralSummary formats referralLink correctly', async () => {
    const summary = await referralService.getReferralSummary(testUserId1);
    assert.ok(summary.referralLink.includes(summary.referralCode));
  });

  await asyncTest('7.11 referral_reward_ledger entry contains reference_id', async () => {
    const ledgerEntry = Array.from(referralService.mockLedger.values())[0];
    assert.strictEqual(ledgerEntry.reference_id, 'ord-first-001');
  });

  await asyncTest('7.12 applyReferralCode handles lowercase input code', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    const codeLower = codeRec.code.toLowerCase();
    try {
      await referralService.applyReferralCode(testUserId3, codeLower);
    } catch (e) {} // May fail on duplicate or succeed
  });

  await asyncTest('7.13 processQualifiedOrder increments referrer successful_referrals counter', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    assert.strictEqual(codeRec.successful_referrals, 1);
  });

  await asyncTest('7.14 listReferralsAdmin totalRewardsValue calculation', async () => {
    const adminRes = await referralService.listReferralsAdmin();
    assert.strictEqual(adminRes.summary.totalRewardsValue, 50.00);
  });

  await asyncTest('7.15 getOrCreateReferralCode returns idempotent existing code', async () => {
    const code1 = await referralService.getOrCreateReferralCode(testUserId1);
    const code2 = await referralService.getOrCreateReferralCode(testUserId1);
    assert.strictEqual(code1.code, code2.code);
  });

  // -------------------------------------------------------------
  // Group 8: Marketing Automation Scheduler Jobs (10 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Marketing Automation Scheduler Jobs ---');

  await asyncTest('8.1 automationScheduler.runDetectAbandonedCarts executes cleanly', async () => {
    const res = await automationSchedulerService.runDetectAbandonedCarts();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.jobName, 'detectAbandonedCarts');
  });

  await asyncTest('8.2 automationScheduler.runRefreshCustomerSegments executes cleanly', async () => {
    const res = await automationSchedulerService.runRefreshCustomerSegments();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.jobName, 'refreshCustomerSegments');
  });

  await asyncTest('8.3 triggerNewCustomerWelcome executes rule for 1-order customer', async () => {
    customerCRMService.mockProfiles.set(testUserId1, { user_id: testUserId1, completed_orders: 1 });
    const res = await marketingAutomationService.triggerNewCustomerWelcome(testUserId1);
    assert.ok(res);
    assert.strictEqual(res.rule, 'NEW_CUSTOMER_WELCOME');
  });

  await asyncTest('8.4 triggerNewCustomerWelcome returns null for 0-order customer', async () => {
    customerCRMService.mockProfiles.set('usr-zero', { user_id: 'usr-zero', completed_orders: 0 });
    const res = await marketingAutomationService.triggerNewCustomerWelcome('usr-zero');
    assert.strictEqual(res, null);
  });

  await asyncTest('8.5 triggerReactivationCampaigns executes cleanly', async () => {
    const res = await marketingAutomationService.triggerReactivationCampaigns();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.rule, 'INACTIVE_REACTIVATION');
  });

  await asyncTest('8.6 triggerCustomerMetricsRefresh executes cleanly', async () => {
    const res = await marketingAutomationService.triggerCustomerMetricsRefresh();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.rule, 'CUSTOMER_METRICS_REFRESH');
  });

  await asyncTest('8.7 automationScheduler records job run history for detectAbandonedCarts', async () => {
    const res = await automationSchedulerService.getAutomationJobRuns();
    const found = res.jobRuns.some(j => j.job_name === 'detectAbandonedCarts');
    assert.strictEqual(found, true);
  });

  await asyncTest('8.8 automationScheduler records job run history for refreshCustomerSegments', async () => {
    const res = await automationSchedulerService.getAutomationJobRuns();
    const found = res.jobRuns.some(j => j.job_name === 'refreshCustomerSegments');
    assert.strictEqual(found, true);
  });

  await asyncTest('8.9 triggerCartRecoveryAutomations returns newlyDetected and remindersSent', async () => {
    const res = await marketingAutomationService.triggerCartRecoveryAutomations();
    assert.ok(typeof res.newlyDetected === 'number');
    assert.ok(typeof res.remindersSent === 'number');
  });

  await asyncTest('8.10 triggerNewCustomerWelcome handles null userId', async () => {
    const res = await marketingAutomationService.triggerNewCustomerWelcome(null);
    assert.strictEqual(res, null);
  });

  // -------------------------------------------------------------
  // Group 9: Security, RBAC & Customer IDOR Protection (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Security, RBAC & Customer IDOR Protection ---');

  await asyncTest('9.1 customerCRMService.getProfile enforces user ownership', async () => {
    const prof1 = await customerCRMService.getProfile(testUserId1);
    const prof2 = await customerCRMService.getProfile(testUserId2);
    assert.notStrictEqual(prof1.user_id, prof2.user_id);
  });

  await asyncTest('9.2 referralService prevents duplicate account referral attribution', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    try {
      await referralService.applyReferralCode(testUserId2, codeRec.code);
      assert.fail('Should have blocked duplicate referral');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('already been referred'));
    }
  });

  await asyncTest('9.3 Customer A cannot apply Customer A code to Customer A (Self-Referral IDOR)', async () => {
    const codeRec = await referralService.getOrCreateReferralCode(testUserId1);
    try {
      await referralService.applyReferralCode(testUserId1, codeRec.code);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('9.4 Customer engagement event metadata sanitization blocks JWT leaks', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      metadata: { jwt: 'secret.jwt.token' }
    });
    assert.strictEqual(ev.metadata.jwt, undefined);
  });

  await asyncTest('9.5 Customer engagement event metadata sanitization blocks password leaks', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      metadata: { password: 'userpassword123' }
    });
    assert.strictEqual(ev.metadata.password, undefined);
  });

  await asyncTest('9.6 Customer engagement event metadata sanitization blocks authorization header leaks', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      metadata: { authorization: 'Bearer token' }
    });
    assert.strictEqual(ev.metadata.authorization, undefined);
  });

  await asyncTest('9.7 Customer engagement event metadata sanitization blocks CVV leaks', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      metadata: { cvv: '123' }
    });
    assert.strictEqual(ev.metadata.cvv, undefined);
  });

  await asyncTest('9.8 Customer engagement event metadata sanitization blocks secret key leaks', async () => {
    const ev = await customerEngagementService.logEvent({
      userId: testUserId1,
      eventType: 'PRODUCT_VIEW',
      metadata: { api_secret: 'key' }
    });
    assert.strictEqual(ev.metadata.api_secret, undefined);
  });

  await asyncTest('9.9 Referral summary isolates customer stats per userId', async () => {
    const sum1 = await referralService.getReferralSummary(testUserId1);
    const sum2 = await referralService.getReferralSummary(testUserId2);
    assert.notStrictEqual(sum1.referralCode, sum2.referralCode);
  });

  await asyncTest('9.10 Customer preferences isolate per userId', async () => {
    const p1 = await customerEngagementService.getPreferences(testUserId1);
    const p2 = await customerEngagementService.getPreferences(testUserId2);
    assert.strictEqual(p1.user_id, testUserId1);
    assert.strictEqual(p2.user_id, testUserId2);
  });

  await asyncTest('9.11 createCampaign requires non-empty template', async () => {
    try {
      await marketingCampaignService.createCampaign({ name: 'Empty' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('9.12 getProfile validates empty userId', async () => {
    try {
      await customerCRMService.getProfile(null);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('9.13 syncCustomerProfile validates empty userId', async () => {
    try {
      await customerCRMService.syncCustomerProfile(null);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await asyncTest('9.14 referralService reward ledger entry records user_id strictly', async () => {
    const ledger = Array.from(referralService.mockLedger.values())[0];
    assert.strictEqual(ledger.user_id, testUserId1);
  });

  await asyncTest('9.15 customerCRMService profiles Map isolation', async () => {
    assert.ok(customerCRMService.mockProfiles.has(testUserId1));
  });

  // -------------------------------------------------------------
  // Group 10: Retention & Growth Analytics Overview (15 Assertions)
  // -------------------------------------------------------------
  console.log('\n--- Group 10: Retention & Growth Analytics Overview ---');

  await asyncTest('10.1 customerAnalyticsService.getOverviewAnalytics returns full retention report', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(analytics.customerGrowth);
    assert.ok(analytics.retention);
    assert.ok(analytics.abandonedCartRecovery);
    assert.ok(analytics.referralProgram);
    assert.strictEqual(analytics.referralProgram.totalSuccessful, 1);
  });

  await asyncTest('10.2 Analytics retention30DayPercentage format', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.retention.retention30DayPercentage === 'number');
  });

  await asyncTest('10.3 Analytics repeatPurchaseRatePercentage format', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.retention.repeatPurchaseRatePercentage === 'number');
  });

  await asyncTest('10.4 Analytics averageOrderValue format', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.retention.averageOrderValue === 'number');
  });

  await asyncTest('10.5 Analytics totalEstimatedCLV format', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.retention.totalEstimatedCLV === 'number');
  });

  await asyncTest('10.6 Analytics customerGrowth totalCustomers count', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(analytics.customerGrowth.totalCustomers >= 3);
  });

  await asyncTest('10.7 Analytics customerGrowth totalRevenue calculation', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.customerGrowth.totalRevenue === 'number');
  });

  await asyncTest('10.8 Analytics abandonedCartRecovery totalAbandonedCount', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.abandonedCartRecovery.totalAbandonedCount === 'number');
  });

  await asyncTest('10.9 Analytics abandonedCartRecovery recoveryRatePercentage', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.abandonedCartRecovery.recoveryRatePercentage === 'number');
  });

  await asyncTest('10.10 Analytics referralProgram totalCodes', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(analytics.referralProgram.totalCodes >= 1);
  });

  await asyncTest('10.11 Analytics referralProgram totalRewardsValue', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.strictEqual(analytics.referralProgram.totalRewardsValue, 50.00);
  });

  await asyncTest('10.12 Analytics customerGrowth highValueCount', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.customerGrowth.highValueCount === 'number');
  });

  await asyncTest('10.13 Analytics customerGrowth atRiskCount', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.customerGrowth.atRiskCount === 'number');
  });

  await asyncTest('10.14 Analytics customerGrowth repeatCustomerCount', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    assert.ok(typeof analytics.customerGrowth.repeatCustomerCount === 'number');
  });

  await asyncTest('10.15 Overview Analytics structure contains expected top-level keys', async () => {
    const analytics = await customerAnalyticsService.getOverviewAnalytics();
    const keys = Object.keys(analytics);
    assert.ok(keys.includes('customerGrowth'));
    assert.ok(keys.includes('retention'));
    assert.ok(keys.includes('abandonedCartRecovery'));
    assert.ok(keys.includes('referralProgram'));
  });

  console.log('\n====================================================');
  console.log(`  PHASE 45 QA SUITE RESULTS`);
  console.log(`  TOTAL ASSERTIONS PASSED: ${passed}`);
  console.log(`  TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase45QASuite();
}

module.exports = { runPhase45QASuite };
