import { Sandbox } from '@vercel/sandbox';
import type { GeneratedFile } from './types';

interface SandboxInstance {
  sandbox: Sandbox;
  sandboxId: string;
  previewUrl: string;
}

const sandboxCache = new Map<string, SandboxInstance>();

function getSandboxName(projectId: string): string {
  return `sbx-${projectId.replace(/[^a-z0-9]/g, '').slice(0, 24).toLowerCase()}`;
}

export async function createOrGetSandbox(projectId: string): Promise<{
  sandboxId: string;
  previewUrl: string;
}> {
  const cached = sandboxCache.get(projectId);
  if (cached) {
    return {
      sandboxId: cached.sandboxId,
      previewUrl: cached.previewUrl,
    };
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    throw new Error(
      'VERCEL_TOKEN not configured. Set it in .env.local to use Vercel Sandbox.'
    );
  }

  if (!vercelProjectId) {
    throw new Error(
      'VERCEL_PROJECT_ID not configured. Set it in .env.local to use Vercel Sandbox.'
    );
  }

  try {
    const sandboxName = getSandboxName(projectId);
    
    // Create or get existing sandbox
    const sandbox = await Sandbox.getOrCreate({
      name: sandboxName,
      ports: [3000],
      timeout: 20 * 60 * 1000,
      token: vercelToken,
      projectId: vercelProjectId,
      teamId: vercelTeamId, // optional; undefined is fine
    });

    // Get preview URL for port 3000
    const previewUrl = sandbox.domain(3000);

    const instance: SandboxInstance = {
      sandbox,
      sandboxId: sandbox.name,
      previewUrl,
    };

    sandboxCache.set(projectId, instance);
    
    return {
      sandboxId: instance.sandboxId,
      previewUrl: instance.previewUrl,
    };
  } catch (error) {
    throw new Error(
      `Failed to create sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function writeFilesToSandbox(
  projectId: string,
  files: GeneratedFile[]
): Promise<void> {
  const instance = sandboxCache.get(projectId);
  
  if (!instance) {
    throw new Error('Sandbox not initialized for this project');
  }

  try {
    const { sandbox } = instance;
    
    // Write files to sandbox using the batch writeFiles API
    await sandbox.writeFiles(
      files.map(file => ({
        path: file.path.startsWith('/') ? file.path : `/${file.path}`,
        content: file.content,
      }))
    );

    // Check if package.json exists - if so, run install and dev
    const hasPackageJson = files.some(f => f.path === 'package.json' || f.path === '/package.json');
    
    if (hasPackageJson) {
      // Install dependencies
      console.log('[Sandbox] Running npm install...');
      await sandbox.runCommand({
        cmd: 'npm',
        args: ['install'],
        cwd: '/',
      });
      
      // Start dev server in detached mode (non-blocking)
      console.log('[Sandbox] Starting npm run dev...');
      await sandbox.runCommand({
        cmd: 'npm',
        args: ['run', 'dev', '--', '-p', '3000'],
        cwd: '/',
        detached: true,
      });
      
      // Poll the preview URL until it responds or timeout (max 15s)
      const previewUrl = instance.previewUrl;
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(previewUrl, { method: 'GET' });
          if (res.status < 500) {
            console.log(`[Sandbox] Preview ready after ${i * 500}ms`);
            break;
          }
        } catch {
          // Server not ready yet — keep polling
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      // Static files only - write and run a simple HTTP server
      const serverCode = `const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = path.join(process.cwd(), filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    // Guess content type
    const ext = path.extname(fullPath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
`;
      
      await sandbox.writeFiles([
        { path: '/server.js', content: serverCode },
      ]);
      
      // Start the server in detached mode
      console.log('[Sandbox] Starting static server...');
      await sandbox.runCommand({
        cmd: 'node',
        args: ['server.js'],
        cwd: '/',
        detached: true,
      });
      
      // Poll the preview URL until it responds or timeout (max 15s)
      const previewUrl = instance.previewUrl;
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(previewUrl, { method: 'GET' });
          if (res.status < 500) {
            console.log(`[Sandbox] Preview ready after ${i * 500}ms`);
            break;
          }
        } catch {
          // Server not ready yet — keep polling
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to write files to sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function stopSandbox(projectId: string): Promise<void> {
  const instance = sandboxCache.get(projectId);
  
  if (!instance) {
    return; // Already stopped or never created
  }

  try {
    const { sandbox } = instance;
    await sandbox.stop();
    sandboxCache.delete(projectId);
  } catch (error) {
    console.error('[Sandbox] Failed to stop sandbox:', error);
    // Clean up cache anyway
    sandboxCache.delete(projectId);
  }
}
