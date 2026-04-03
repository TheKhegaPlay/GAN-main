# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api\auth-api.spec.ts >> API Authentication Endpoints (TC15-TC16) >> Extended API: Should reject invalid credentials with 401
- Location: tests\api\auth-api.spec.ts:171:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [401, 403, 400]
```

# Test source

```ts
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
  120 |     expect(response.ok()).toBe(true);
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
> 198 |     expect([401, 403, 400]).toContain(statusCode);
      |                             ^ Error: expect(received).toContain(expected) // indexOf
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
  221 |     test.setTimeout(30000);
  222 |     
  223 |     console.log('[Extended-400] Starting test...');
  224 | 
  225 |     // Arrange - Missing email
  226 |     const incompletePayload = {
  227 |       password: validUser.password
  228 |       // email is missing
  229 |     };
  230 | 
  231 |     // Act
  232 |     let response;
  233 |     try {
  234 |       response = await apiContext.post(apiEndpoints.login, {
  235 |         data: incompletePayload
  236 |       });
  237 |       console.log(`[Extended-400] Response status: ${response.status()}`);
  238 |     } catch (e) {
  239 |       console.error(`[Extended-400] Request error: ${e}`);
  240 |       throw e;
  241 |     }
  242 | 
  243 |     // Assert - Should be 400 (Bad Request)
  244 |     const statusCode = response.status();
  245 |     console.log(`[Extended-400] Status code: ${statusCode}`);
  246 |     
  247 |     expect([400, 422, 401]).toContain(statusCode);
  248 |     console.log(`[Extended-400] ✓ Request rejected with status ${statusCode}`);
  249 | 
  250 |     // Verify error mentions missing field
  251 |     try {
  252 |       const body = await response.json();
  253 |       const errorText = JSON.stringify(body).toLowerCase();
  254 |       
  255 |       if (errorText.includes('email') || errorText.includes('required') || errorText.includes('missing')) {
  256 |         console.log('[Extended-400] ✓ Error indicates missing required field');
  257 |       } else {
  258 |         console.log('[Extended-400] Error response: ' + JSON.stringify(body));
  259 |       }
  260 |     } catch (e) {
  261 |       console.log(`[Extended-400] Could not parse error: ${e}`);
  262 |     }
  263 |   });
  264 | 
  265 |   /**
  266 |    * Extended API Test: Content-Type validation
  267 |    * Expected: Response headers have application/json
  268 |    */
  269 |   test('Extended API: Should return JSON content type', async () => {
  270 |     test.setTimeout(30000);
  271 |     
  272 |     console.log('[Extended-Headers] Starting test...');
  273 | 
  274 |     // Act
  275 |     let response;
  276 |     try {
  277 |       response = await apiContext.post(apiEndpoints.login, {
  278 |         data: {
  279 |           email: validUser.email,
  280 |           password: validUser.password
  281 |         }
  282 |       });
  283 |     } catch (e) {
  284 |       console.error(`[Extended-Headers] Request error: ${e}`);
  285 |       throw e;
  286 |     }
  287 | 
  288 |     // Assert - Check Content-Type header
  289 |     const headers = response.headers();
  290 |     const contentType = headers['content-type'] || '';
  291 |     
  292 |     console.log(`[Extended-Headers] Content-Type: ${contentType}`);
  293 |     
  294 |     // Should be JSON (handle both lowercase and case variations)
  295 |     expect(contentType.toLowerCase()).toContain('json');
  296 |     console.log('[Extended-Headers] ✓ Response is JSON format');
  297 | 
  298 |     // Verify no sensitive data in headers
```