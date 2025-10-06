#!/usr/bin/env python3
"""
Test the AI Agent Integration
"""

import os
import asyncio
from dotenv import load_dotenv
from agents import Agent, Runner
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Define simple tools without strict schema issues
def list_tasks_simple(status: str = "todo", limit: int = 5) -> str:
    """List tasks from the task management system."""
    import requests
    
    url = os.getenv('SUPABASE_URL') + '/functions/v1/ai-agent-api'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('SUPABASE_ANON_KEY')}",
        'x-agent-key': os.getenv('AI_AGENT_SECRET_KEY')
    }
    body = {
        'action': 'list_tasks',
        'params': {'status': status, 'limit': limit}
    }
    
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        tasks = response.json()['tasks']
        result = f"Found {len(tasks)} tasks:\n"
        for task in tasks:
            result += f"- {task['title']} (Priority: {task['priority']}, Project: {task['project']['name']})\n"
        return result
    return f"Error: {response.text}"

def analyze_task_for_automation(task_title: str, task_description: str) -> str:
    """Analyze if a task is suitable for automation."""
    import requests
    
    url = os.getenv('SUPABASE_URL') + '/functions/v1/ai-task-processor'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('SUPABASE_ANON_KEY')}",
        'x-agent-key': os.getenv('AI_AGENT_SECRET_KEY')
    }
    body = {
        'action': 'analyze_task',
        'data': {
            'task': {
                'title': task_title,
                'description': task_description,
                'priority': 'medium',
                'status': 'todo'
            }
        }
    }
    
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        analysis = response.json()['analysis']
        return f"""
Task Analysis:
- Suitable for automation: {analysis.get('suitable_for_automation', 'Unknown')}
- Recommended agent: {analysis.get('recommended_agent', 'none')}
- Complexity: {analysis.get('complexity', 'unknown')}
- Estimated time: {analysis.get('estimated_time', 'unknown')}
- Reasoning: {analysis.get('reasoning', 'No reasoning provided')}
"""
    return f"Error: {response.text}"

def process_email_content(email_content: str) -> str:
    """Process email content to extract tasks."""
    import requests
    
    url = os.getenv('SUPABASE_URL') + '/functions/v1/ai-task-processor'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('SUPABASE_ANON_KEY')}",
        'x-agent-key': os.getenv('AI_AGENT_SECRET_KEY')
    }
    body = {
        'action': 'process_email',
        'data': {
            'content': email_content,
            'metadata': {'source': 'test_email'}
        }
    }
    
    response = requests.post(url, headers=headers, json=body)
    if response.status_code == 200:
        processed = response.json()['processed']
        result = f"Email Processing Summary: {processed.get('summary', 'No summary')}\n\n"
        
        if processed.get('projects'):
            result += "Projects to create:\n"
            for project in processed['projects']:
                result += f"- {project['name']}: {project.get('description', 'No description')}\n"
                if project.get('tasks'):
                    result += "  Tasks:\n"
                    for task in project['tasks']:
                        result += f"    • {task['title']} ({task['priority']})\n"
        
        if processed.get('standalone_tasks'):
            result += "\nStandalone tasks:\n"
            for task in processed['standalone_tasks']:
                result += f"- {task['title']} ({task['priority']})\n"
        
        return result
    return f"Error: {response.text}"

# Create agents
coordinator_agent = Agent(
    name="Task Coordinator",
    instructions="""You are the coordinator of a task management agent swarm.
    Your responsibilities:
    1. List and review available tasks
    2. Identify tasks suitable for automation
    3. Process emails to extract actionable items
    
    Start by listing available tasks, then analyze one for automation potential.""",
    tools=[list_tasks_simple, analyze_task_for_automation, process_email_content],
    model="gpt-4o",
)

async def test_agent_integration():
    """Test the agent integration with the task management system."""
    print("🚀 Starting AI Agent Integration Test\n")
    
    # Initialize runner
    runner = Runner(
        client=client,
        agent=coordinator_agent
    )
    
    # Test 1: List tasks
    print("📋 Test 1: Listing available tasks...")
    response = await runner.run_async(
        messages=[{"role": "user", "content": "List the available todo tasks."}],
    )
    print(f"Response: {response.messages[-1]['content']}\n")
    
    # Test 2: Analyze a task
    print("🔍 Test 2: Analyzing task for automation...")
    response = await runner.run_async(
        messages=[{
            "role": "user", 
            "content": "Analyze this task for automation: Title: 'Update API documentation', Description: 'Update the REST API documentation with new endpoints and examples'"
        }],
    )
    print(f"Response: {response.messages[-1]['content']}\n")
    
    # Test 3: Process email
    print("📧 Test 3: Processing email content...")
    email_content = """
    Hi team,
    
    Following up from our meeting, here are the action items:
    
    1. We need to update the user authentication system by next Friday - this is critical
    2. Someone should research new payment providers and create a comparison report
    3. The mobile app needs bug fixes for the login screen
    4. Documentation for the new API endpoints needs to be written
    
    Please prioritize the authentication work as it's blocking other teams.
    
    Thanks,
    John
    """
    
    response = await runner.run_async(
        messages=[{
            "role": "user",
            "content": f"Process this email and extract tasks:\n\n{email_content}"
        }],
    )
    print(f"Response: {response.messages[-1]['content']}\n")
    
    print("✅ AI Agent Integration Test Complete!")

if __name__ == "__main__":
    asyncio.run(test_agent_integration())