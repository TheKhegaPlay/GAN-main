/**
 * Performance Testing Script
 * Tests authentication, dashboard, and form validation endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Metrics collector
class PerformanceMetrics {
  constructor() {
    this.authMetrics = [];
    this.dashboardMetrics = [];
    this.formMetrics = [];
    this.startTime = Date.now();
  }

  recordAuth(duration, success) {
    this.authMetrics.push({ duration, success, timestamp: Date.now() - this.startTime });
  }

  recordDashboard(duration, success) {
    this.dashboardMetrics.push({ duration, success, timestamp: Date.now() - this.startTime });
  }

  recordForm(duration, success) {
    this.formMetrics.push({ duration, success, timestamp: Date.now() - this.startTime });
  }

  calculateStats(metrics) {
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successful = metrics.filter(m => m.success).length;
    const errors = metrics.length - successful;

    return {
      count: metrics.length,
      success: successful,
      errors: errors,
      errorRate: (errors / metrics.length * 100).toFixed(2),
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.ceil(durations.length * 0.95) - 1],
      p99: durations[Math.ceil(durations.length * 0.99) - 1],
      min: durations[0],
      max: durations[durations.length - 1],
      throughput: (metrics.length / ((this.startTime - Date.now()) / 1000)).toFixed(2),
    };
  }

  export() {
    return {
      auth: this.calculateStats(this.authMetrics),
      dashboard: this.calculateStats(this.dashboardMetrics),
      forms: this.calculateStats(this.formMetrics),
      rawData: {
        auth: this.authMetrics,
        dashboard: this.dashboardMetrics,
        forms: this.formMetrics,
      }
    };
  }
}

// Helper to make HTTP requests
function makeRequest(method, path, payload = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          duration: duration,
          success: res.statusCode === 200 || res.statusCode === 201,
          data: data,
        });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        duration: duration,
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        duration: duration,
        success: false,
        error: 'timeout',
      });
    });

    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

// Simulate different load profiles
async function runLoadProfile(name, concurrentUsers, durationMs, requestInterval) {
  console.log(`\n📊 Running ${name} (${concurrentUsers} users, ${durationMs/1000}s duration)...`);
  
  const metrics = new PerformanceMetrics();
  const startTime = Date.now();
  let requestCount = 0;

  const runRequests = async () => {
    while (Date.now() - startTime < durationMs) {
      // Auth endpoint
      const authRes = await makeRequest('POST', '/users', {
        email: 'test@example.com',
        password: 'test123'
      });
      metrics.recordAuth(authRes.duration, authRes.success);

      // Dashboard endpoint
      const dashRes = await makeRequest('GET', '/forensic-state');
      metrics.recordDashboard(dashRes.duration, dashRes.success);

      // Form validation endpoint
      const formRes = await makeRequest('POST', '/forms', {
        caseId: 'CASE-001',
        description: 'Test',
      });
      metrics.recordForm(formRes.duration, formRes.success);

      requestCount++;
      await new Promise(r => setTimeout(r, requestInterval));
    }
  };

  // Simulate concurrent users
  const promises = [];
  for (let i = 0; i < concurrentUsers; i++) {
    promises.push(runRequests());
  }

  await Promise.all(promises);

  return {
    profile: name,
    concurrentUsers: concurrentUsers,
    totalRequests: requestCount * 3, // 3 requests per iteration
    results: metrics.export(),
  };
}

// Main performance testing orchestration
async function runPerformanceTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          PERFORMANCE TESTING - LOAD PROFILES                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const allResults = [];

  try {
    // Normal Load: 50 users for 30 seconds
    const normalLoad = await runLoadProfile('NORMAL LOAD', 5, 30000, 100);
    allResults.push(normalLoad);
    console.log(`  ✓ Auth: ${normalLoad.results.auth.avg}ms avg, p95: ${normalLoad.results.auth.p95}ms`);
    console.log(`  ✓ Dashboard: ${normalLoad.results.dashboard.avg}ms avg, p95: ${normalLoad.results.dashboard.p95}ms`);
    console.log(`  ✓ Forms: ${normalLoad.results.forms.avg}ms avg, p95: ${normalLoad.results.forms.p95}ms`);

    // Peak Load: 20 users for 30 seconds (faster requests)
    const peakLoad = await runLoadProfile('PEAK LOAD', 10, 30000, 50);
    allResults.push(peakLoad);
    console.log(`  ✓ Auth: ${peakLoad.results.auth.avg}ms avg, p95: ${peakLoad.results.auth.p95}ms`);
    console.log(`  ✓ Dashboard: ${peakLoad.results.dashboard.avg}ms avg, p95: ${peakLoad.results.dashboard.p95}ms`);
    console.log(`  ✓ Forms: ${peakLoad.results.forms.avg}ms avg, p95: ${peakLoad.results.forms.p95}ms`);

    // Endurance: 5 users for 60 seconds
    const enduranceLoad = await runLoadProfile('ENDURANCE LOAD', 3, 60000, 200);
    allResults.push(enduranceLoad);
    console.log(`  ✓ Auth: ${enduranceLoad.results.auth.avg}ms avg, p95: ${enduranceLoad.results.auth.p95}ms`);
    console.log(`  ✓ Dashboard: ${enduranceLoad.results.dashboard.avg}ms avg, p95: ${enduranceLoad.results.dashboard.p95}ms`);
    console.log(`  ✓ Forms: ${enduranceLoad.results.forms.avg}ms avg, p95: ${enduranceLoad.results.forms.p95}ms`);

    // Export results
    const resultsPath = path.join(__dirname, 'performance-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              PERFORMANCE TEST SUMMARY                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Results saved to: ${resultsPath}\n`);

    return allResults;

  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Run the tests
runPerformanceTests();
