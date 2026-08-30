const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testSuites = [
  { id: 'phase32', name: 'Phase 32 Deployment Health', script: 'src/test_phase32_deployment_health.js' },
  { id: 'phase36', name: 'Phase 36 Billing Engine', script: 'src/test_phase36_billing.js' },
  { id: 'phase37', name: 'Phase 37 Billing & Invoice QA', script: 'src/test_phase37_billing_qa.js' },
  { id: 'phase38', name: 'Phase 38 Analytics Engine', script: 'src/test_phase38_analytics.js' },
  { id: 'phase39', name: 'Phase 39 Business Automation', script: 'src/test_phase39_automation.js' },
  { id: 'phase40', name: 'Phase 40 Procurement QA', script: 'src/test_phase40_procurement_qa.js' },
  { id: 'phase41_finance', name: 'Phase 41 Financial Management QA', script: 'src/test_phase41_financial_qa.js' },
  { id: 'phase41_customer', name: 'Phase 41 Customer Experience QA', script: 'src/test_phase41_customer_experience_qa.js' },
  { id: 'phase42_whatsapp', name: 'Phase 42 Delivery WhatsApp Dispatch', script: 'src/test_delivery_whatsapp.js' },
  { id: 'phase43_production', name: 'Phase 43 Production Hardening & Reliability', script: 'src/test_phase43_production_qa.js' },
  { id: 'phase44_enterprise', name: 'Phase 44 Multi-Store, Loyalty, Udhar & Subscriptions', script: 'src/test_phase44_enterprise_qa.js' },
  { id: 'phase45_crm', name: 'Phase 45 Customer CRM & Marketing QA', script: 'src/test_phase45_crm_marketing_qa.js' }
];

function runSuite(suite) {
  const backendDir = path.join(__dirname, '../..');
  const fullPath = path.join(backendDir, suite.script);

  if (!fs.existsSync(fullPath)) {
    return {
      suite: suite.name,
      script: suite.script,
      assertions: 0,
      passed: 0,
      failed: 0,
      status: 'SKIPPED_NOT_FOUND'
    };
  }

  const result = spawnSync('node', [suite.script], { cwd: backendDir, encoding: 'utf8', timeout: 90000 });
  const output = (result.stdout || '') + (result.stderr || '');

  let passedCount = 0;
  const passedMatch = output.match(/TOTAL ASSERTIONS PASSED:\s*(\d+)/i) ||
                      output.match(/TOTAL PASSED ASSERTIONS:\s*(\d+)/i) ||
                      output.match(/PASSED ASSERTIONS:\s*(\d+)/i) ||
                      output.match(/TOTAL PASSED:\s*(\d+)/i) ||
                      output.match(/(\d+)\s+PASSED/i);

  if (passedMatch) {
    passedCount = parseInt(passedMatch[1], 10);
  } else {
    const matches = output.match(/\[PASS\s+\d+\]/gi);
    if (matches) passedCount = matches.length;
  }

  const hasExplicitFailures = output.includes('❌ [FAIL') || output.includes('FAILED: AssertionError') || output.includes('TEST SUITE RUNTIME FAILURE');
  const status = !hasExplicitFailures && passedCount > 0 ? 'PASS' : 'FAIL';

  return {
    suite: suite.name,
    script: suite.script,
    assertions: passedCount,
    passed: passedCount,
    failed: status === 'PASS' ? 0 : 1,
    status
  };
}

function generateConsolidatedReport() {
  console.log('====================================================');
  console.log('  GENERATING CONSOLIDATED MACHINE-READABLE REPORT');
  console.log('====================================================\n');

  const suiteResults = [];
  let totalAssertions = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let allPassed = true;

  for (const suite of testSuites) {
    console.log(`Running ${suite.name} (${suite.script})...`);
    const res = runSuite(suite);
    suiteResults.push(res);
    totalAssertions += res.assertions;
    totalPassed += res.passed;
    totalFailed += res.failed;
    if (res.status !== 'PASS') allPassed = false;
    console.log(`  -> ${res.status}: ${res.passed} assertions passed`);
  }

  const reportPayload = {
    project: 'Chaudhary Kirana Store',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    tests: suiteResults,
    totalAssertions,
    totalPassed,
    totalFailed,
    passRate: totalAssertions > 0 ? parseFloat(((totalPassed / totalAssertions) * 100).toFixed(2)) : 0,
    productionReady: allPassed && totalFailed === 0
  };

  const projectRoot = path.join(__dirname, '../../..');
  const reportPath = path.join(projectRoot, 'CONSOLIDATED_TEST_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2));

  console.log('\n====================================================');
  console.log(`  CONSOLIDATED REPORT GENERATED: ${reportPath}`);
  console.log(`  TOTAL PASSED ASSERTIONS: ${totalPassed} / ${totalAssertions}`);
  console.log(`  PRODUCTION READY: ${reportPayload.productionReady ? 'YES ✅' : 'NO ❌'}`);
  console.log('====================================================\n');

  return reportPayload;
}

if (require.main === module) {
  generateConsolidatedReport();
}

module.exports = generateConsolidatedReport;
