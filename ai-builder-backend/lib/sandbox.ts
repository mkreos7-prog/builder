import type { GeneratedFile } from './types';

// Vercel Sandbox wrapper
// NOTE: The @vercel/sandbox package doesn't exist in npm yet.
// This is a placeholder implementation showing the intended interface.
// Replace with actual Vercel Sandbox SDK when available, or use an alternative like E2B.
// 
// For Sprint 0 testing, this will throw errors when sandbox operations are attempted.
// The rest of the backend works without actual sandbox integration.

interface SandboxInstance {
  sandboxId: string;
  previewUrl: string;
}

const sandboxCache = new Map<string, SandboxInstance>();

function getSandboxName(projectId: string): string {
  return `sbx-${projectId.replace(/[^a-z0-9]/g, '').slice(0, 24)}`;
}

export async function createOrGetSandbox(projectId: string): Promise<{
  sandboxId: string;
  previewUrl: string;
}> {
  const cached = sandboxCache.get(projectId);
  if (cached) {
    return cached;
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !vercelProjectId) {
    throw new Error('Vercel credentials not configured');
  }

  try {
    // Import dynamically to handle SDK presence
    // NOTE: @vercel/sandbox package doesn't exist - throwing error for Sprint 0
    throw new Error(
      '@vercel/sandbox package not available. ' +
      'Use E2B (e2b.dev) or wait for Vercel Sandbox public release. ' +
      'The rest of the backend works without actual sandbox integration.'
    );
    
    /* Intended implementation when SDK is available:
    const { Sandbox } = await import('@vercel/sandbox');
    
    const sandboxName = getSandboxName(projectId);
    
    // Create or get existing sandbox
    const sandbox = await Sandbox.create({
      name: sandboxName,
      token: vercelToken,
      projectId: vercelProjectId,
      teamId: vercelTeamId,
    });

    // Get preview URL (default to port 3000)
    const previewUrl = await sandbox.getPreviewUrl?.(3000) || `https://${sandboxName}.vercel.app`;

    const instance: SandboxInstance = {
      sandboxId: sandbox.id || sandboxName,
      previewUrl,
    };

    sandboxCache.set(projectId, instance);
    return instance;
    */
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
    // NOTE: @vercel/sandbox package doesn't exist - throwing error for Sprint 0
    throw new Error(
      '@vercel/sandbox package not available. ' +
      'Sandbox operations are not functional in Sprint 0 without the actual SDK.'
    );
    
    /* Intended implementation when SDK is available:
    const { Sandbox } = await import('@vercel/sandbox');
    
    // Get sandbox instance
    const sandbox = await Sandbox.get(instance.sandboxId);
    
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    // Write files to sandbox
    for (const file of files) {
      await sandbox.writeFile?.(file.path, file.content);
    }

    // Check if package.json exists - if so, run install and dev
    const hasPackageJson = files.some(f => f.path === 'package.json');
    
    if (hasPackageJson) {
      // Install dependencies
      await sandbox.exec?.('npm install');
      
      // Start dev server (non-blocking)
      sandbox.exec?.('npm run dev').catch(() => {
        // Dev server will run in background
      });
    } else {
      // Static files only - start a simple server
      const serverCode = `
const http = require('http');
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
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
`;
      
      await sandbox.writeFile?.('server.js', serverCode);
      sandbox.exec?.('node server.js').catch(() => {
        // Server will run in background
      });
    }
    */
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
    // NOTE: @vercel/sandbox package doesn't exist
    throw new Error('@vercel/sandbox package not available');
    
    /* Intended implementation when SDK is available:
    const { Sandbox } = await import('@vercel/sandbox');
    
    const sandbox = await Sandbox.get(instance.sandboxId);
    
    if (sandbox) {
      await sandbox.stop?.();
    }
    */
    
    sandboxCache.delete(projectId);
  } catch (error) {
    console.error('Failed to stop sandbox:', error);
    // Clean up cache anyway
    sandboxCache.delete(projectId);
  }
}
