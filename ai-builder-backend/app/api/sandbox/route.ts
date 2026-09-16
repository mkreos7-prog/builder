import { requireAuth, authErrorResponse } from '@/lib/auth';
import { loadProject } from '@/lib/db';
import { createOrGetSandbox, writeFilesToSandbox, stopSandbox } from '@/lib/sandbox';
import type { GeneratedFile } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    
    const body = await req.json();
    const { projectId, files } = body as { projectId?: string; files?: GeneratedFile[] };
    
    if (!projectId || !files || !Array.isArray(files)) {
      return Response.json(
        { error: 'projectId and files array are required' },
        { status: 400 }
      );
    }
    
    // Verify user owns this project
    const project = await loadProject(user.userId, projectId);
    if (!project) {
      return Response.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }
    
    // Create or get sandbox
    const sandbox = await createOrGetSandbox(projectId);
    
    // Write files
    await writeFilesToSandbox(projectId, files);
    
    return Response.json({
      success: true,
      sandboxId: sandbox.sandboxId,
      previewUrl: sandbox.previewUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return authErrorResponse(error);
    }
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return Response.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }
    
    // Verify user owns this project
    const project = await loadProject(user.userId, projectId);
    if (!project) {
      return Response.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }
    
    // Get current sandbox status
    const sandbox = await createOrGetSandbox(projectId);
    
    return Response.json({
      sandboxId: sandbox.sandboxId,
      previewUrl: sandbox.previewUrl,
      status: 'running',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return authErrorResponse(error);
    }
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth(req);
    
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return Response.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }
    
    // Verify user owns this project
    const project = await loadProject(user.userId, projectId);
    if (!project) {
      return Response.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }
    
    // Stop sandbox
    await stopSandbox(projectId);
    
    return Response.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return authErrorResponse(error);
    }
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
