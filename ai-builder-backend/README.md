# AI Builder Backend - Sprint 0

Backend API for an AI-powered website builder. This is the Sprint 0 implementation with core functionality only.

## Features

- **Intent Classification**: Automatically determines if user messages require project actions or are conversational
- **Streaming Responses**: Server-Sent Events (SSE) for real-time updates
- **Sandbox Integration**: Vercel Sandbox for isolated code execution
- **Authentication**: Supabase-based user authentication
- **Project Management**: Save, load, and list user projects
- **Multi-Provider LLM**: Gemini 2.5 Flash primary, Groq fallback

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Runtime**: Node.js (Vercel Functions)
- **Auth + DB**: Supabase
- **LLM**: Gemini 2.5 Flash, Groq Llama 3.3
- **Sandbox**: Vercel Sandbox
- **Streaming**: Server-Sent Events (SSE)

## Project Structure

```
ai-builder-backend/
├── app/
│   ├── api/
│   │   ├── agent/route.ts           # Main SSE streaming endpoint
│   │   ├── sandbox/route.ts         # Sandbox lifecycle management
│   │   ├── projects/route.ts        # Project CRUD operations
│   │   └── health/route.ts          # Health check endpoint
│   ├── layout.tsx                    # Minimal layout
│   └── page.tsx                      # API documentation page
├── lib/
│   ├── auth.ts                       # Supabase authentication
│   ├── db.ts                         # Database operations
│   ├── intent.ts                     # Intent classification
│   ├── llm.ts                        # LLM streaming with fallback
│   ├── sandbox.ts                    # Vercel Sandbox wrapper
│   ├── sse.ts                        # SSE utilities
│   ├── rate-limit.ts                 # In-memory rate limiting
│   └── types.ts                      # Shared TypeScript types
├── test/
│   ├── intent.test.ts                # Intent classifier tests
│   └── sse.test.ts                   # SSE encoding tests
└── README.md                         # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd ai-builder-backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required values:

#### Supabase Configuration

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Create a `projects` table in Supabase:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '{}',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own projects
CREATE POLICY "Users can only access their own projects"
  ON projects
  FOR ALL
  USING (user_id = auth.uid());
```

#### LLM Provider Configuration

```
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

Get API keys:
- **Gemini**: https://ai.google.dev/
- **Groq**: https://console.groq.com/

#### Vercel Sandbox Configuration

```
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-project-id
VERCEL_TEAM_ID=your-team-id  # Optional
```

Get credentials from: https://vercel.com/account/tokens

### 3. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 4. Run Tests

```bash
npm test
```

### 5. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

**GET** `/api/health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.1.0"
}
```

**Example:**
```bash
curl http://localhost:3000/api/health
```

---

### Agent Streaming Endpoint

**POST** `/api/agent`

Main endpoint for AI agent interactions. Streams responses via Server-Sent Events.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "message": "Build a landing page for a coffee shop",
  "projectId": "project-123",  // optional
  "image": "data:image/png;base64,...",  // optional
  "history": [  // optional
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:** Server-Sent Events stream

**SSE Event Types:**
- `start` - Stream started
- `intent` - Classified user intent
- `text_delta` - Text chunk
- `file_start` - File generation started
- `file_delta` - File content chunk
- `file_complete` - File generation complete
- `sandbox_ready` - Sandbox created and ready
- `error` - Error occurred
- `done` - Stream complete

**Example:**
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}' \
  --no-buffer
```

**Intent Classification:**

The agent automatically classifies user messages:

- **Conversational** (no files generated):
  - `GREETING`: "Hi", "Hello"
  - `QUESTION`: "What is React?"
  - `EXPLAIN`: "Explain this error"

- **Project Actions** (files generated):
  - `CREATE_PROJECT`: "Build a coffee shop website"
  - `MODIFY_PROJECT`: "Change the header"
  - `ADD_FEATURE`: "Add a contact form"
  - `FIX_BUG`: "Fix the login error"
  - `REFACTOR`: "Clean up the code"

---

### Sandbox Management

#### Create/Update Sandbox

**POST** `/api/sandbox`

Create or update a project sandbox.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "projectId": "project-123",
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "sandboxId": "sbx-project123",
  "previewUrl": "https://sbx-project123.vercel.app"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/sandbox \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-1",
    "files": [
      {
        "path": "index.html",
        "content": "<!DOCTYPE html><html><body>Hello</body></html>"
      }
    ]
  }'
```

#### Get Sandbox Status

**GET** `/api/sandbox?projectId=<id>`

Get current sandbox status.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "sandboxId": "sbx-project123",
  "previewUrl": "https://sbx-project123.vercel.app",
  "status": "running"
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/sandbox?projectId=test-1" \
  -H "Authorization: Bearer your-token"
```

#### Stop Sandbox

**DELETE** `/api/sandbox?projectId=<id>`

Stop a running sandbox.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/sandbox?projectId=test-1" \
  -H "Authorization: Bearer your-token"
```

---

### Project Management

#### Save Project

**POST** `/api/projects`

Save or update a project.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "id": "project-123",
  "name": "Coffee Shop Website",
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "style.css": "body { margin: 0; }"
  },
  "messages": [
    { "role": "user", "content": "Build a website" },
    { "role": "assistant", "content": "I'll create..." }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "id": "project-123"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "name": "Test Project",
    "files": {"index.html": "test"},
    "messages": []
  }'
```

#### Load Project

**GET** `/api/projects?id=<id>`

Load a specific project.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "id": "project-123",
  "user_id": "user-456",
  "name": "Coffee Shop Website",
  "files": { ... },
  "messages": [ ... ],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/projects?id=test-1" \
  -H "Authorization: Bearer your-token"
```

#### List Projects

**GET** `/api/projects`

List all projects for the authenticated user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "projects": [
    {
      "id": "project-123",
      "name": "Coffee Shop Website",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer your-token"
```

---

## Rate Limiting

**Sprint 0 Limitation**: Rate limiting is in-memory and per-instance only.

- **Limit**: 60 requests per hour per user
- **Scope**: Per server instance (resets on restart)
- **Production**: Migrate to Redis with distributed sliding window

Rate limit headers are not currently included in responses (Sprint 0 simplification).

---

## Error Handling

All endpoints return JSON error responses:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Authentication

Authentication uses Supabase with Bearer tokens.

### Getting a Token

Use Supabase Auth to get a token:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

const token = data.session.access_token
```

### Using the Token

Include in all authenticated requests:

```
Authorization: Bearer your-token-here
```

---

## Intent Classification Logic

The system uses a two-stage classifier:

### 1. Pattern-Based Pre-Filter (Fast)

- Greeting patterns (multilingual): `Hi`, `Hello`, `হ্যালো`, `नमस्ते`
- Question patterns: `What is...`, `How does...`, ends with `?`
- Build patterns: `Build me...`, `Create a...`, `Make a...`
- Modify patterns: `Change...`, `Add...`, `Fix...`, `Refactor...`

### 2. LLM Fallback (For Ambiguous Cases)

- Uses Gemini 2.5 Flash for fast classification
- Returns: action, confidence, requiresProjectAction, requiresSandbox
- Falls back to UNKNOWN if classification fails

**Confidence Levels:**
- `>0.8`: Use pattern result
- `<0.8`: Use LLM classification

---

## LLM Streaming with Fallback

The system tries multiple providers in order:

1. **Gemini 2.5 Flash** (primary)
2. **Gemini 1.5 Flash** (on 429/503)
3. **Groq Llama 3.3** (final fallback)

### Continuation Logic

If response is truncated (`finish_reason: "length"`):
- Append assistant message to history
- Send continuation prompt: "Continue exactly where you left off"
- Maximum 2 continuations allowed

---

## File Generation Format

The LLM generates files using this format:

````
```tsx filename=path/to/file.tsx
<file content here>
```
````

The backend parses these code blocks and extracts:
- File path from `filename=` attribute
- File content from code block body

---

## Sprint 0 Limitations

### What's NOT Included

❌ Orchestration system  
❌ Candidate pipelines  
❌ Evidence binding  
❌ MCP server mode  
❌ Visual verification  
❌ Behavioral tests  
❌ Credits/billing system  
❌ GitHub export  
❌ WebContainer support  
❌ Distributed rate limiting (Redis)  
❌ Advanced tool calling  

### What IS Included

✅ Intent classification  
✅ SSE streaming  
✅ Basic file generation  
✅ Vercel Sandbox integration  
✅ Supabase auth + storage  
✅ Multi-provider LLM with fallback  
✅ In-memory rate limiting  
✅ Project CRUD operations  

---

## Testing

### Run All Tests

```bash
npm test
```

### Test Intent Classifier

```bash
npm test -- intent.test.ts
```

### Test SSE Encoding

```bash
npm test -- sse.test.ts
```

### Manual API Testing

See the "Acceptance Tests" section below.

---

## Acceptance Tests

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected**: `{"status":"ok",...}` with HTTP 200

### Test 2: Unauthenticated Request Rejected

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}'
```

**Expected**: HTTP 401 with `{"error":"..."}`

### Test 3: Greeting Does NOT Generate Files

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}' \
  --no-buffer
```

**Expected SSE events**: `start`, `intent` (GREETING), `text_delta*`, `done`  
**Must NOT contain**: `file_start`, `sandbox_ready`

### Test 4: Build Request Generates Files + Sandbox

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Build a landing page for a coffee shop","projectId":"test-1"}' \
  --no-buffer
```

**Expected SSE events**: `start`, `intent` (CREATE_PROJECT), `text_delta*`, `file_start`, `file_delta`, `file_complete`, `sandbox_ready`, `done`

### Test 5: Unit Tests Pass

```bash
npm test
```

**Expected**: All tests pass (green)

---

## Architecture Notes

### Layered Model

1. **API Layer** (app/api/*): HTTP endpoints, request validation
2. **Business Logic** (lib/*): Intent classification, LLM streaming, sandbox management
3. **Data Layer** (lib/db.ts): Supabase integration

### Source of Truth

- Project files: Object storage (via Supabase)
- Project metadata: Postgres (Supabase)
- Sandbox: Ephemeral compute only (NOT persistent storage)

### Sandbox Lifecycle

```
User Request → Create Sandbox → Write Files → Run Server → Preview URL
                                                     ↓
                                              (on teardown)
                                                     ↓
                                          Flush to Persistent Storage
```

---

## Troubleshooting

### "GEMINI_API_KEY not configured"

Set `GEMINI_API_KEY` in `.env.local`

### "Supabase service unavailable"

Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### "Failed to create sandbox"

Verify `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` are set correctly

### "Rate limit exceeded"

Wait 1 hour or restart the server (in-memory limit resets)

### Tests failing

Ensure all dependencies are installed:
```bash
npm install
```

---

## Production Considerations

Before deploying to production:

1. **Rate Limiting**: Migrate from in-memory to Redis
2. **Sandbox Persistence**: Implement proper flush-to-storage on teardown
3. **Error Monitoring**: Add Sentry or similar
4. **Logging**: Structured logging with correlation IDs
5. **CORS**: Configure allowed origins
6. **Secrets**: Use environment-specific secrets, never commit
7. **Database**: Add indexes, enable connection pooling
8. **LLM**: Add token usage tracking and cost monitoring

---

## License

Proprietary - Sprint 0 Internal Release

---

## Support

For issues or questions, contact the development team.
