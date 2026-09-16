export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>AI Builder Backend</h1>
      <p>API is running. Use the following endpoints:</p>
      <ul>
        <li><code>GET /api/health</code> - Health check</li>
        <li><code>POST /api/agent</code> - Agent streaming endpoint</li>
        <li><code>POST /api/sandbox</code> - Create/update sandbox</li>
        <li><code>GET /api/sandbox?projectId=...</code> - Get sandbox status</li>
        <li><code>DELETE /api/sandbox?projectId=...</code> - Stop sandbox</li>
        <li><code>POST /api/projects</code> - Save project</li>
        <li><code>GET /api/projects?id=...</code> - Load project</li>
        <li><code>GET /api/projects</code> - List projects</li>
      </ul>
    </div>
  );
}
