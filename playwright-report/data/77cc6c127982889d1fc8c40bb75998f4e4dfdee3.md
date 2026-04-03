# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance\performance.spec.ts >> Performance Tests (TC19-TC20) >> TC20: Should return web-vitals from API in <2000ms
- Location: tests\performance\performance.spec.ts:14:7

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:4000
Call log:
  - → GET http://localhost:4000/api/metrics/web-vitals
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```