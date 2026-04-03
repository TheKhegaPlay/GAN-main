import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
// In-memory user store for demo/test purposes.
interface UserRecord { email: string; password: string; name: string; role: string; }
const userStore: UserRecord[] = [
  {
    email: 'demo@forensics.gov',
    password: 'demo123',
    name: 'Forensic Investigator',
    role: 'investigator'
  }
];
/**
 * Webpack's server bundle often rewires `import.meta.url` to the source tree, so `dirname(import.meta.url)`
 * becomes the repo root — not `dist/.../server`. Prefer the real entry file (`process.argv[1]`) and cwd.
 */
function resolveDistFolders(): { serverDistFolder: string; browserDistFolder: string } {
  const fromArgv = process.argv[1] ? dirname(process.argv[1]) : '';
  const fromImportMeta = dirname(fileURLToPath(import.meta.url));
  const fromCwd = join(process.cwd(), 'dist', 'gan-front', 'server');

  for (const dir of [fromArgv, fromImportMeta, fromCwd]) {
    if (dir && existsSync(join(dir, 'index.server.html'))) {
      return { serverDistFolder: dir, browserDistFolder: resolve(dir, '..') };
    }
  }

  const fallback = (fromArgv && existsSync(fromArgv) ? fromArgv : null) || fromCwd;
  return { serverDistFolder: fallback, browserDistFolder: resolve(fallback, '..') };
}

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const { serverDistFolder, browserDistFolder } = resolveDistFolders();
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ limit: '10mb', extended: true }));

  // API Routes middleware - Health check
  server.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development'
    });
  });

  // API Routes middleware - Authentication check
  server.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    const matchedUser = userStore.find(u => u.email === email && u.password === password);

    if (matchedUser) {
      res.json({
        success: true,
        token: `demo-token-${Date.now()}`,
        user: {
          id: matchedUser.email,
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  });

  // API Routes middleware - Registration
  server.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existing = userStore.find(u => u.email === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const newUser: UserRecord = {
      email: email.toLowerCase(),
      password,
      name,
      role: 'investigator'
    };

    userStore.push(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered',
      user: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  });

  // API Routes middleware - Get forensic cases
  server.get('/api/forensic/cases', (req, res) => {
    res.json({
      success: true,
      data: [
        {
          id: 'case-001',
          name: 'Evidence Restoration Case 001',
          status: 'active',
          createdAt: new Date().toISOString(),
          evidence: []
        }
      ]
    });
  });

  // API Routes middleware - Performance metrics
  server.get('/api/metrics/web-vitals', (req, res) => {
    res.json({
      success: true,
      data: {
        lcp: null,
        cls: null,
        fcp: null,
        ttfb: performance.now(),
        timestamp: Date.now()
      }
    });
  });

  // API Routes middleware - Image optimization
  server.post('/api/images/optimize', (req, res) => {
    res.json({
      success: true,
      message: 'Image optimization started',
      formats: ['webp', 'avif']
    });
  });

  // Static browser bundle (skip index.html so `/` is rendered via SSR)
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        } else if (path.match(/\.(js|css)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Content-Type', getMimeType(path));
        }
      }
    })
  );

  // All other GET routes — Angular SSR
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Server-Timing', `render;dur=${Date.now()}`);
        res.send(html);
      })
      .catch((err) => next(err));
  });

  server.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('SSR / Express error:', err);
      res.status(500).send('Internal Server Error');
    }
  );

  return server;
}

// Helper function to get MIME types
function getMimeType(path: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  for (const [ext, type] of Object.entries(mimeTypes)) {
    if (path.endsWith(ext)) {
      return type;
    }
  }
  return 'application/octet-stream';
}

function run(): void {
  const port = Number(process.env['PORT']) || 4000;

  const server = app();
  server
    .listen(port, () => {
      console.log(`Node Express server listening on http://localhost:${port}`);
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${port} is already in use. Close the other process (e.g. an old "npm run serve:ssr") or run with a different port:\n` +
            `  set PORT=4001 && npm run serve:ssr   (cmd)\n` +
            `  $env:PORT=4001; npm run serve:ssr    (PowerShell)`
        );
      }
      throw err;
    });
}

run();
