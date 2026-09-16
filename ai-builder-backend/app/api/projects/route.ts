import { requireAuth, authErrorResponse } from '@/lib/auth';
import { saveProject, loadProject, listProjects } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    
    const body = await req.json();
    const { id, name, files, messages } = body;
    
    if (!id || !name || !files) {
      return Response.json(
        { error: 'id, name, and files are required' },
        { status: 400 }
      );
    }
    
    await saveProject(user.userId, {
      id,
      name,
      files,
      messages: messages || [],
    });
    
    return Response.json({
      success: true,
      id,
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
    const id = url.searchParams.get('id');
    
    if (id) {
      // Load specific project
      const project = await loadProject(user.userId, id);
      
      if (!project) {
        return Response.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      
      return Response.json(project);
    } else {
      // List all projects
      const projects = await listProjects(user.userId);
      
      return Response.json({
        projects,
      });
    }
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
