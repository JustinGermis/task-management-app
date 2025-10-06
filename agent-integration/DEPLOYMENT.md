# Deployment Guide for AI Agent Integration

## Required API Keys

You'll need the following keys:

1. **OpenAI API Key** - For AI processing
2. **Supabase Service Role Key** - For database access
3. **AI Agent Secret Key** - For authenticating agent requests (you create this)

## Step 1: Set Up Supabase Secrets

```bash
# Set OpenAI API key for Edge Functions
supabase secrets set OPENAI_API_KEY=sk-...your-openai-key...

# Set Agent Secret Key (generate a secure random string)
supabase secrets set AI_AGENT_SECRET_KEY=your-secure-random-key-here

# The service role key is already available in Edge Functions as SUPABASE_SERVICE_ROLE_KEY
```

## Step 2: Deploy Edge Functions

```bash
# Navigate to your project root
cd /Users/justin/Projects/Task\ Management\ App

# Create function directories
mkdir -p supabase/functions/ai-agent-api
mkdir -p supabase/functions/content-processor
mkdir -p supabase/functions/ai-task-processor

# Copy the functions
cp agent-integration/edge-functions/ai-agent-api.ts supabase/functions/ai-agent-api/index.ts
cp agent-integration/edge-functions/content-processor.ts supabase/functions/content-processor/index.ts
cp agent-integration/edge-functions/ai-task-processor.ts supabase/functions/ai-task-processor/index.ts

# Deploy each function
supabase functions deploy ai-agent-api
supabase functions deploy content-processor
supabase functions deploy ai-task-processor
```

## Step 3: Configure Python Agents

```bash
cd agent-integration/python-agents

# Create .env file
cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Agent Secret Key (must match Supabase secret)
AI_AGENT_SECRET_KEY=your-secure-random-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-...your-openai-key...

# Default Organization ID
ORGANIZATION_ID=your-org-id
EOF
```

## Step 4: Test the Integration

### Test Edge Functions
```bash
# Test AI task processor
curl -X POST https://your-project.supabase.co/functions/v1/ai-task-processor \
  -H "x-agent-key: your-secure-random-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze_task",
    "data": {
      "task": {
        "title": "Update API documentation",
        "description": "Update the REST API docs with new endpoints",
        "priority": "medium",
        "status": "todo"
      }
    }
  }'

# Test task listing
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-api \
  -H "x-agent-key: your-secure-random-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_tasks",
    "params": {"status": "todo", "limit": 5}
  }'
```

### Test Python Agents
```bash
cd agent-integration/python-agents
source venv/bin/activate

# Test in Python
python -c "
from task_management_tools import list_tasks
import os
from dotenv import load_dotenv

load_dotenv()
result = list_tasks(status='todo', limit=5)
print(result)
"
```

## Step 5: Run the Agent Swarm

```bash
# Interactive mode
python agent_swarm.py

# Or use programmatically
python << EOF
import asyncio
from agent_swarm import TaskManagementSwarm

async def test():
    swarm = TaskManagementSwarm('your-org-id')
    result = await swarm.analyze_and_assign_tasks()
    print(result)

asyncio.run(test())
EOF
```

## Security Checklist

- [ ] Generated a strong, random AI_AGENT_SECRET_KEY
- [ ] Set all required secrets in Supabase
- [ ] Verified Edge Functions are deployed
- [ ] Tested authentication with curl
- [ ] Confirmed Python agents can connect
- [ ] Reviewed activity logs for agent actions

## Monitoring

### View Edge Function Logs
```bash
supabase functions logs ai-agent-api --tail
supabase functions logs content-processor --tail
supabase functions logs ai-task-processor --tail
```

### Check Agent Activity in Database
```sql
-- View recent agent activities
SELECT * FROM activity_logs 
WHERE user_id = 'ai-agent' 
ORDER BY created_at DESC 
LIMIT 20;

-- View tasks created by agents
SELECT * FROM tasks 
WHERE created_by = 'ai-agent' 
ORDER BY created_at DESC;
```

## Troubleshooting

### "Unauthorized: Invalid agent key"
- Verify AI_AGENT_SECRET_KEY matches in:
  - Supabase secrets
  - Python .env file
  - curl test commands

### "OpenAI API error: 401"
- Check OPENAI_API_KEY is valid
- Ensure you have API credits
- Verify key starts with "sk-"

### "Failed to create task"
- Check SUPABASE_SERVICE_ROLE_KEY
- Verify organization_id exists
- Check project_id is valid

### Rate Limiting
If you hit OpenAI rate limits:
1. Reduce parallel agent calls
2. Add delays between requests
3. Upgrade OpenAI plan if needed

## Cost Considerations

- **OpenAI API**: ~$0.01-0.03 per task analysis
- **Supabase Edge Functions**: Free tier includes 500K invocations
- **Database**: Minimal impact on storage

## Production Recommendations

1. Use environment-specific keys (dev/staging/prod)
2. Implement rate limiting in Edge Functions
3. Set up alerts for high usage
4. Regular audit of agent activities
5. Implement cost tracking