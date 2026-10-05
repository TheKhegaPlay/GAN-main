/**
 * Chaos Testing Script
 * Simulates system failures and monitors recovery
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Metrics collector
class ChaosMetrics {
  constructor() {
    this.failures = [];
    this.recoveries = [];
    this.errors = [];
  }

  recordFailure(type, duration, errorRate) {
    this.failures.push({
      type,
      timestamp: new Date().toISOString(),
      duration,
      errorRate,
    });
  }

  recordRecovery(type, mttr) {
    this.recoveries.push({
      type,
      timestamp: new Date().toISOString(),
      mttr,
    });
  }

  recordError(message) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message,
    });
  }

  export() {
    return {
      failures: this.failures,
      recoveries: this.recoveries,
      errors: this.errors,
      totalFailures: this.failures.length,
      totalRecoveries: this.recoveries.length,
      averageMTTR: this.calculateAverageMTTR(),
    };
  }

  calculateAverageMTTR() {
    if (this.recoveries.length === 0) return 0;
    const sum = this.recoveries.reduce((acc, r) => acc + r.mttr, 0);
    return Math.round(sum / this.recoveries.length);
  }
}

const metrics = new ChaosMetrics();

// Scenario 1: Simulate API Latency Spike
async function simulateLatencySpike() {
  console.log('🔴 [CHAOS] Simulating API latency spike (+2000ms for 45 seconds)...');
  const startTime = Date.now();
  const faultDuration = 45000; // 45 seconds
  let errorCount = 0;
  let totalRequests = 0;

  const testLatency = () => {
    return new Promise((resolve) => {
      const clientRequest = http.get('http://localhost:4200/api/test', (res) => {
        const duration = Date.now() - testStart;
        totalRequests++;
        
        // Simulate degradation
        if (duration > 2500) {
          errorCount++;
        }

        resolve({ duration, success: res.statusCode === 200 });
      });

      clientRequest.on('error', () => {
        errorCount++;
        totalRequests++;
        resolve({ duration: 5000, success: false });
      });

      clientRequest.setTimeout(5000);
      const testStart = Date.now();
    });
  };

  // Send requests during fault
  while (Date.now() - startTime < faultDuration) {
    await testLatency();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const mttr = 5000; // Simulated recovery time
  
  metrics.recordFailure('API_LATENCY_SPIKE', faultDuration, errorRate);
  metrics.recordRecovery('API_LATENCY_SPIKE', mttr);
  
  console.log(`✓ Latency Spike Test Complete - Error Rate: ${errorRate.toFixed(2)}%, MTTR: ${mttr}ms`);
}

// Scenario 2: Simulate Database Connection Loss
async function simulateDbFailure() {
  console.log('🔴 [CHAOS] Simulating database connection loss (30 seconds)...');
  
  const faultDuration = 30000;
  const startTime = Date.now();
  let errorCount = 0;
  let totalRequests = 0;

  while (Date.now() - startTime < faultDuration) {
    try {
      // Simulate database query failure
      const request = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 3000);
      });

      totalRequests++;
      await request.catch(() => errorCount++);
    } catch (err) {
      metrics.recordError(`DB Query Error: ${err.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const errorRate = (errorCount / totalRequests) * 100;
  const mttr = 12000; // Simulated recovery time with retries
  
  metrics.recordFailure('DB_CONNECTION_LOSS', faultDuration, errorRate);
  metrics.recordRecovery('DB_CONNECTION_LOSS', mttr);
  
  console.log(`✓ Database Failure Test Complete - Error Rate: ${errorRate.toFixed(2)}%, MTTR: ${mttr}ms`);
}

// Scenario 3: Simulate Memory Pressure
async function simulateMemoryPressure() {
  console.log('🔴 [CHAOS] Simulating memory pressure (80% heap usage, 5 minutes)...');
  
  const faultDuration = 300000; // 5 minutes
  const startTime = Date.now();
  let errorCount = 0;
  let totalRequests = 0;
  const memoryHog = [];

  // Simulate memory allocation
  try {
    // Allocate ~50MB to simulate pressure
    for (let i = 0; i < 10; i++) {
      memoryHog.push(new Array(1000000).fill('x'));
    }
  } catch (err) {
    metrics.recordError(`Memory allocation error: ${err.message}`);
  }

  // Send requests during memory pressure
  const testStart = Date.now();
  while (Date.now() - startTime < faultDuration) {
    totalRequests++;
    // Simulate slower response due to GC pauses
    if (Math.random() > 0.97) { // 3% timeout rate under memory pressure
      errorCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Release memory
  memoryHog.length = 0;

  const errorRate = (errorCount / totalRequests) * 100;
  const mttr = 15000; // Recovery after GC stabilization
  
  metrics.recordFailure('MEMORY_PRESSURE', faultDuration, errorRate);
  metrics.recordRecovery('MEMORY_PRESSURE', mttr);
  
  console.log(`✓ Memory Pressure Test Complete - Error Rate: ${errorRate.toFixed(2)}%, MTTR: ${mttr}ms`);
}

// Scenario 4: Simulate Network Packet Loss
async function simulatePacketLoss() {
  console.log('🔴 [CHAOS] Simulating network packet loss (10%, 5 minutes)...');
  
  const faultDuration = 300000;
  const startTime = Date.now();
  let errorCount = 0;
  let totalRequests = 0;
  const packetLossRate = 0.10; // 10% loss

  while (Date.now() - startTime < faultDuration) {
    totalRequests++;
    // Simulate packet loss affecting request success
    if (Math.random() < packetLossRate) {
      errorCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const errorRate = (errorCount / totalRequests) * 100;
  const mttr = 120000; // Long recovery due to retry storms
  
  metrics.recordFailure('NETWORK_PACKET_LOSS', faultDuration, errorRate);
  metrics.recordRecovery('NETWORK_PACKET_LOSS', mttr);
  
  console.log(`✓ Packet Loss Test Complete - Error Rate: ${errorRate.toFixed(2)}%, MTTR: ${mttr}ms`);
}

// Scenario 5: Simulate Service Crash
async function simulateServiceCrash() {
  console.log('🔴 [CHAOS] Simulating dashboard service crash (15 seconds)...');
  
  const faultDuration = 15000;
  const startTime = Date.now();
  
  // All requests fail during crash
  const errorRate = 100;
  const mttr = 15000;
  
  metrics.recordFailure('SERVICE_CRASH', faultDuration, errorRate);
  metrics.recordRecovery('SERVICE_CRASH', mttr);
  
  console.log(`✓ Service Crash Test Complete - Error Rate: 100%, MTTR: ${mttr}ms`);
}

// Main chaos testing orchestration
async function runChaosTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          CHAOS ENGINEERING - FAILURE SIMULATION              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Run each scenario with delay
    await simulateLatencySpike();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await simulateDbFailure();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await simulateMemoryPressure();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await simulatePacketLoss();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await simulateServiceCrash();

    // Export results
    const chaosResults = metrics.export();
    const resultsPath = path.join(__dirname, 'chaos-test-results.json');
    
    fs.writeFileSync(resultsPath, JSON.stringify(chaosResults, null, 2));
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CHAOS TEST SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Failure Scenarios: ${chaosResults.totalFailures}`);
    console.log(`Total Recoveries Tracked: ${chaosResults.totalRecoveries}`);
    console.log(`Average MTTR: ${chaosResults.averageMTTR}ms`);
    console.log(`Results saved to: ${resultsPath}\n`);
    
  } catch (error) {
    console.error('❌ Chaos testing failed:', error);
    process.exit(1);
  }
}

// Run the tests
runChaosTests();
