# AI Agent Integration for Task Management System

This integration enables AI agents to interact with your Task Management System using OpenAI's Agents SDK. The system can analyze tasks, assign them to specialized agents, and process emails/transcripts into actionable tasks.

## Features

### 1. Task Analysis & Automation
- Automatically identify tasks suitable for AI automation
- Assign tasks to specialized agents based on content
- Monitor progress and provide updates

### 2. Email/Transcript Processing
- Extract action items from emails and meeting transcripts
- Create projects and tasks automatically
- Assign priorities and due dates based on content

### 3. Agent Swarm Capabilities
- **Coordinator Agent**: Orchestrates task distribution
- **Developer Agent**: Handles code-related tasks
- **Writer Agent**: Creates documentation and content
- **QA Agent**: Manages testing and quality assurance
- **Research Agent**: Conducts research and analysis

## Quick Start

### Prerequisites
- Python 3.8+
- Supabase CLI
- OpenAI API key
- Supabase project with service role key

### Installation

1. **Run the setup script:**
   ```bash
   cd /path/to/task-management-app
   ./agent-integration/setup.sh
   ```

2. **Configure environment variables:**
   ```bash
   cd agent-integration/python-agents
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy ai-agent-api
   supabase functions deploy content-processor
   
   # Set the agent secret key
   supabase secrets set AI_AGENT_SECRET_KEY=your-secret-key
   ```

## Usage

### Running the Agent Swarm

```bash
cd agent-integration/python-agents
source venv/bin/activate
python agent_swarm.py
```

### Programmatic Usage

```python
from agent_swarm import TaskManagementSwarm

# Initialize swarm
swarm = TaskManagementSwarm(organization_id="your-org-id")

# Analyze and assign tasks
result = await swarm.analyze_and_assign_tasks()

# Process email content
email_result = await swarm.process_email(
    email_content="Meeting notes: Need to update documentation...",
    metadata={"sender": "john@example.com"}
)

# Execute specific task
task_result = await swarm.execute_task(
    task_id="task-123",
    task_details={"title": "Update README", "description": "..."}
)
```

### API Endpoints

The Edge Functions provide REST API endpoints:

#### Task Operations
```bash
# List tasks
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-api \
  -H "x-agent-key: your-secret-key" \
  -d '{"action": "list_tasks", "params": {"status": "todo"}}'

# Create task
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-api \
  -H "x-agent-key: your-secret-key" \
  -d '{"action": "create_task", "params": {"title": "New Task", "project_id": "..."}}'
```

#### Content Processing
```bash
# Process email
curl -X POST https://your-project.supabase.co/functions/v1/content-processor \
  -H "x-agent-key: your-secret-key" \
  -d '{
    "content_type": "email",
    "content": "Email body text...",
    "organization_id": "..."
  }'
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Python Agents  │────▶│  Edge Functions  │────▶│    Supabase     │
│   (OpenAI SDK)  │     │   (Deno/TypeScript)│    │   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
   Agent Swarm            API Gateway               Database + RLS
   - Coordinator         - Authentication         - Tasks/Projects
   - Specialists         - Rate Limiting          - Real-time updates
   - Tools               - Validation             - Activity logs
```

## Security

- **Authentication**: Uses secret key authentication for agent requests
- **Isolation**: Edge Functions provide a secure API layer
- **Audit Trail**: All agent actions are logged
- **No Direct Access**: Agents cannot access database directly
- **Rate Limiting**: Built-in protection against abuse

## Testing

### Unit Tests (Python Agents)
```bash
cd agent-integration/python-agents
python -m pytest tests/
```

### Integration Tests
```bash
# Test Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/ai-agent-api \
  -H "x-agent-key: your-secret-key" \
  -d '{"action": "analyze_workload", "params": {}}'
```

### Manual Testing
Use the interactive CLI:
```bash
python agent_swarm.py
# Follow the prompts to test different features
```

## Monitoring

- Check Edge Function logs: `supabase functions logs ai-agent-api`
- View activity logs in the database
- Monitor agent performance metrics

## Troubleshooting

### Common Issues

1. **"Unauthorized: Invalid agent key"**
   - Ensure AI_AGENT_SECRET_KEY matches in both .env and Supabase secrets

2. **"Failed to create task"**
   - Check that the project_id exists
   - Verify service role key has proper permissions

3. **Agent not finding suitable tasks**
   - Ensure tasks have descriptive titles/descriptions
   - Check that tasks are unassigned and in 'todo' status

### Debug Mode
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Development

### Adding New Agent Capabilities

1. **Create new tool in `task_management_tools.py`:**
```python
@function_tool
def my_new_tool(param1: str) -> Dict:
    """Tool description"""
    # Implementation
```

2. **Add tool to agent:**
```python
my_agent = Agent(
    name="My Agent",
    tools=[my_new_tool]
)
```

3. **Update Edge Function if needed**

### Extending the Swarm

Add specialized agents for specific domains:
```python
legal_agent = Agent(
    name="Legal Agent",
    instructions="Review contracts and legal documents...",
    tools=[...]
)
```

## Best Practices

1. **Start Small**: Test with non-critical tasks first
2. **Monitor Closely**: Review agent actions regularly
3. **Set Limits**: Use rate limiting and task filters
4. **Backup Data**: Ensure database backups before automation
5. **Human Review**: Keep humans in the loop for critical decisions

## Support

- Documentation: `/agent-integration/docs/ARCHITECTURE.md`
- Issues: Create an issue in the project repository
- Logs: Check Supabase dashboard for Edge Function logs