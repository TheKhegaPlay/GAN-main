import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Gauge, Rate } from 'k6/metrics';

// Custom metrics
const authLoginDuration = new Trend('auth_login_duration');
const dashboardLoadDuration = new Trend('dashboard_load_duration');
const formValidationDuration = new Trend('form_validation_duration');
const loginSuccessRate = new Rate('login_success_rate');
const dashboardSuccessRate = new Rate('dashboard_success_rate');
const formSuccessRate = new Rate('form_success_rate');
const errorCount = new Counter('errors');

// Test configuration
export const options = {
  scenarios: {
    // Normal Load: 50 concurrent users for 5 minutes
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 50 },   // Stay at 50 users
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:4200';
const API_URL = 'http://localhost:3001'; // Mock API

export default function () {
  // Test 1: Login endpoint
  group('Authentication - Login', function () {
    const loginPayload = JSON.stringify({
      email: 'demo@forensics.gov',
      password: 'demo123',
    });

    const loginParams = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const loginResponse = http.post(`${API_URL}/users`, loginPayload, loginParams);
    
    const loginSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login response has token': (r) => r.json('token') !== undefined,
      'login time < 500ms': (r) => r.timings.duration < 500,
    });

    authLoginDuration.add(loginResponse.timings.duration);
    loginSuccessRate.add(loginSuccess);
    if (!loginSuccess) errorCount.add(1);
  });

  sleep(1);

  // Test 2: Dashboard data loading
  group('Dashboard - Load Data', function () {
    const dashboardParams = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token',
      },
    };

    const dashboardResponse = http.get(`${API_URL}/forensic-state`, dashboardParams);
    
    const dashboardSuccess = check(dashboardResponse, {
      'dashboard status is 200': (r) => r.status === 200,
      'dashboard response has cases': (r) => r.json('cases') !== undefined,
      'dashboard load time < 800ms': (r) => r.timings.duration < 800,
    });

    dashboardLoadDuration.add(dashboardResponse.timings.duration);
    dashboardSuccessRate.add(dashboardSuccess);
    if (!dashboardSuccess) errorCount.add(1);
  });

  sleep(1);

  // Test 3: Form validation
  group('Forms - Validate Input', function () {
    const formPayload = JSON.stringify({
      caseId: 'CASE-001',
      description: 'Test evidence submission',
      status: 'pending',
      evidence: ['file1.pdf', 'file2.jpg'],
    });

    const formParams = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const formResponse = http.post(`${API_URL}/validate-form`, formPayload, formParams);
    
    const formSuccess = check(formResponse, {
      'form validation status is 200': (r) => r.status === 200,
      'form validation passed': (r) => r.json('valid') === true,
      'validation time < 300ms': (r) => r.timings.duration < 300,
    });

    formValidationDuration.add(formResponse.timings.duration);
    formSuccessRate.add(formSuccess);
    if (!formSuccess) errorCount.add(1);
  });

  sleep(2);
}
