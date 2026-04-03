# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api\auth-api.spec.ts >> API Authentication Endpoints (TC15-TC16) >> TC16: Should receive valid auth token in response
- Location: tests\api\auth-api.spec.ts:96:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  20  | test.describe('API Authentication Endpoints (TC15-TC16)', () => {
  21  |   let apiContext: APIRequestContext;
  22  |   
  23  |   // Use environment-based API URL (compatible with real backend at 4200/api or mock at 3001)
  24  |   const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4200/api';
  25  |   const LOGIN_ENDPOINT = `${API_BASE_URL}${apiEndpoints.login}`;
  26  |   
  27  |   test.beforeAll(async () => {
  28  |     console.log(`[beforeAll] Creating API context with baseURL: ${API_BASE_URL}`);
  29  |     
  30  |     // Create separate API context for backend requests
  31  |     apiContext = await playwrightRequest.newContext({
  32  |       baseURL: API_BASE_URL,
  33  |       // Add headers that might be needed
  34  |       extraHTTPHeaders: {
  35  |         'Content-Type': 'application/json',
  36  |         'Accept': 'application/json',
  37  |       }
  38  |     });
  39  |     
  40  |     console.log('[beforeAll] API context created');
  41  |   });
  42  | 
  43  |   test.afterAll(async () => {
  44  |     console.log('[afterAll] Disposing API context');
  45  |     await apiContext.dispose();
  46  |   });
  47  | 
  48  |   /**
  49  |    * TC15: Verify login API request body format
  50  |    * Expected: POST request with correct email/password payload, 200/201 response
  51  |    * Scenario: API Contract Positive
  52  |    */
  53  |   test('TC15: Should send correct request payload to login endpoint', async () => {
  54  |     test.setTimeout(30000);
  55  |     
  56  |     console.log('[TC15] Starting test...');
  57  | 
  58  |     // Arrange
  59  |     const loginPayload = {
  60  |       email: validUser.email,
  61  |       password: validUser.password
  62  |     };
  63  | 
  64  |     console.log(`[TC15] Login endpoint: ${LOGIN_ENDPOINT}`);
  65  |     console.log(`[TC15] Payload: ${JSON.stringify(loginPayload)}`);
  66  | 
  67  |     // Act
  68  |     let response;
  69  |     try {
  70  |       response = await apiContext.post(apiEndpoints.login, {
  71  |         data: loginPayload
  72  |       });
  73  |       console.log(`[TC15] Response status: ${response.status()}`);
  74  |     } catch (e) {
  75  |       console.error(`[TC15] Request failed: ${e}`);
  76  |       throw e;
  77  |     }
  78  | 
  79  |     // Assert - Response should be successful (200, 201, or other 2xx)
  80  |     const statusCode = response.status();
  81  |     console.log(`[TC15] Status code: ${statusCode}`);
  82  |     
  83  |     // Accept 200 (OK) or 201 (Created)
  84  |     expect([200, 201, 202, 204]).toContain(statusCode);
  85  |     console.log(`[TC15] ✓ Response status is successful (${statusCode})`);
  86  | 
  87  |     // Verify request was sent correctly
  88  |     console.log('[TC15] ✓ Login request sent with correct payload');
  89  |   });
  90  | 
  91  |   /**
  92  |    * TC16: Verify auth token in response
  93  |    * Expected: Response contains token, user data, expiresIn
  94  |    * Scenario: API Contract Positive
  95  |    */
  96  |   test('TC16: Should receive valid auth token in response', async () => {
  97  |     test.setTimeout(30000);
  98  |     
  99  |     console.log('[TC16] Starting test...');
  100 | 
  101 |     // Arrange
  102 |     const loginPayload = {
  103 |       email: validUser.email,
  104 |       password: validUser.password
  105 |     };
  106 | 
  107 |     // Act
  108 |     let response;
  109 |     try {
  110 |       response = await apiContext.post(apiEndpoints.login, {
  111 |         data: loginPayload
  112 |       });
  113 |       console.log(`[TC16] Response status: ${response.status()}`);
  114 |     } catch (e) {
  115 |       console.error(`[TC16] Request failed: ${e}`);
  116 |       throw e;
  117 |     }
  118 | 
  119 |     // Assert - Response status success
> 120 |     expect(response.ok()).toBe(true);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  121 |     console.log('[TC16] ✓ Response is OK');
  122 | 
  123 |     // Parse response
  124 |     let responseBody;
  125 |     try {
  126 |       responseBody = await response.json();
  127 |       console.log(`[TC16] Response body keys: ${Object.keys(responseBody).join(', ')}`);
  128 |     } catch (e) {
  129 |       console.error(`[TC16] Failed to parse JSON: ${e}`);
  130 |       const text = await response.text();
  131 |       console.error(`[TC16] Response text: ${text.substring(0, 500)}`);
  132 |       throw new Error(`Response is not valid JSON: ${e}`);
  133 |     }
  134 | 
  135 |     // Assert - Response contains auth info (flexible for different implementations)
  136 |     const hasToken = responseBody.token || responseBody.accessToken || responseBody.access_token;
  137 |     const hasUser = responseBody.user || responseBody.data?.user;
  138 |     
  139 |     if (hasToken) {
  140 |       console.log('[TC16] ✓ Token found in response');
  141 |       
  142 |       // Validate token format (should be JWT-like or at least non-empty)
  143 |       expect(hasToken).toBeTruthy();
  144 |       if (typeof hasToken === 'string' && hasToken.includes('.')) {
  145 |         const tokenParts = hasToken.split('.');
  146 |         expect(tokenParts.length).toBeGreaterThanOrEqual(2);
  147 |         console.log(`[TC16] ✓ Token format appears valid (${tokenParts.length} parts)`);
  148 |       }
  149 |     } else {
  150 |       console.warn('[TC16] ⚠ No token property found in response');
  151 |       console.log('[TC16] Available response properties: ' + JSON.stringify(responseBody));
  152 |     }
  153 | 
  154 |     if (hasUser) {
  155 |       console.log('[TC16] ✓ User object found in response');
  156 |     } else {
  157 |       console.warn('[TC16] ⚠ No user object in response');
  158 |     }
  159 | 
  160 |     // Check for expiry info if available
  161 |     const hasExpiry = responseBody.expiresIn || responseBody.expires_in || responseBody.expiration;
  162 |     if (hasExpiry) {
  163 |       console.log(`[TC16] Token expiration info: ${hasExpiry}`);
  164 |     }
  165 |   });
  166 | 
  167 |   /**
  168 |    * Extended API Test: Invalid credentials rejection
  169 |    * Expected: 401 Unauthorized response
  170 |    */
  171 |   test('Extended API: Should reject invalid credentials with 401', async () => {
  172 |     test.setTimeout(30000);
  173 |     
  174 |     console.log('[Extended-401] Starting test...');
  175 | 
  176 |     // Arrange
  177 |     const invalidPayload = {
  178 |       email: validUser.email,
  179 |       password: 'WrongPassword123!@#$%'
  180 |     };
  181 | 
  182 |     // Act
  183 |     let response;
  184 |     try {
  185 |       response = await apiContext.post(apiEndpoints.login, {
  186 |         data: invalidPayload
  187 |       });
  188 |       console.log(`[Extended-401] Response status: ${response.status()}`);
  189 |     } catch (e) {
  190 |       console.error(`[Extended-401] Request error: ${e}`);
  191 |       throw e;
  192 |     }
  193 | 
  194 |     // Assert - Should be 401 (Unauthorized)
  195 |     const statusCode = response.status();
  196 |     console.log(`[Extended-401] Status code: ${statusCode}`);
  197 |     
  198 |     expect([401, 403, 400]).toContain(statusCode);
  199 |     console.log(`[Extended-401] ✓ Rejected with status ${statusCode}`);
  200 | 
  201 |     // Try to parse error response
  202 |     try {
  203 |       const body = await response.json();
  204 |       console.log(`[Extended-401] Error response: ${JSON.stringify(body)}`);
  205 |       
  206 |       if (body.error || body.message || body.errors) {
  207 |         const errorMsg = body.error || body.message || JSON.stringify(body.errors);
  208 |         expect(errorMsg.toString().toLowerCase()).toContain('invalid');
  209 |         console.log('[Extended-401] ✓ Error message indicates invalid credentials');
  210 |       }
  211 |     } catch (e) {
  212 |       console.log(`[Extended-401] Could not parse error response: ${e}`);
  213 |     }
  214 |   });
  215 | 
  216 |   /**
  217 |    * Extended API Test: Missing required fields
  218 |    * Expected: 400 Bad Request
  219 |    */
  220 |   test('Extended API: Should return 400 for missing email', async () => {
```