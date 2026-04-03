# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api\auth-api.spec.ts >> API Authentication Endpoints (TC15-TC16) >> Extended API: Should return JSON content type
- Location: tests\api\auth-api.spec.ts:269:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "json"
Received string:    "text/html; charset=utf-8"
```

# Test source

```ts
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
> 295 |     expect(contentType.toLowerCase()).toContain('json');
      |                                       ^ Error: expect(received).toContain(expected) // indexOf
  296 |     console.log('[Extended-Headers] ✓ Response is JSON format');
  297 | 
  298 |     // Verify no sensitive data in headers
  299 |     const setCookie = headers['set-cookie'] || '';
  300 |     expect(setCookie.toLowerCase()).not.toContain('password');
  301 |     expect(setCookie.toLowerCase()).not.toContain('token');
  302 |     console.log('[Extended-Headers] ✓ No sensitive data in headers');
  303 |   });
  304 | 
  305 |   /**
  306 |    * Debug Test: Check API connectivity
  307 |    */
  308 |   test('Debug API: Verify API backend is accessible', async () => {
  309 |     console.log('[Debug] Testing API connectivity...');
  310 |     console.log(`[Debug] API Base URL: ${API_BASE_URL}`);
  311 |     console.log(`[Debug] Login Endpoint: ${LOGIN_ENDPOINT}`);
  312 | 
  313 |     // Try a simple GET or HEAD request to verify server is up
  314 |     try {
  315 |       // Try POST to login (will likely fail but should at least reach the server)
  316 |       const response = await apiContext.post(apiEndpoints.login, {
  317 |         data: { email: 'test@test.com', password: 'test' }
  318 |       });
  319 |       
  320 |       const status = response.status();
  321 |       console.log(`[Debug] ✓ API backend is accessible (status: ${status})`);
  322 |       console.log(`[Debug] Response headers: ${JSON.stringify(response.headers())}`);
  323 |     } catch (e) {
  324 |       console.error(`[Debug] ✗ API backend is NOT accessible: ${e}`);
  325 |       console.error(`[Debug] Make sure backend is running on ${API_BASE_URL}`);
  326 |       throw e;
  327 |     }
  328 |   });
  329 | });
  330 | 
```