#!/usr/bin/env python3
"""
Simple AI Agent Interface - No complex setup needed!
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
AI_AGENT_KEY = os.getenv('AI_AGENT_SECRET_KEY')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'x-agent-key': AI_AGENT_KEY
}

def process_text_to_tasks(text_content):
    """Turn any text (email, notes, etc.) into tasks"""
    print("🤖 Processing your text to extract tasks...")
    
    url = f"{SUPABASE_URL}/functions/v1/ai-task-processor"
    response = requests.post(url, headers=headers, json={
        'action': 'process_email',
        'data': {
            'content': text_content,
            'metadata': {'source': 'user_input'}
        }
    })
    
    if response.status_code == 200:
        result = response.json()['processed']
        print("✅ Extracted tasks:")
        for i, task in enumerate(result.get('standalone_tasks', []), 1):
            print(f"  {i}. {task['title']} (Priority: {task['priority']})")
        return result
    else:
        print(f"❌ Error: {response.text}")
        return None

def create_task_directly(title, description, project_id, priority='medium'):
    """Create a task directly"""
    print(f"📝 Creating task: {title}")
    
    url = f"{SUPABASE_URL}/functions/v1/ai-agent-api"
    response = requests.post(url, headers=headers, json={
        'action': 'create_task',
        'params': {
            'title': title,
            'description': description,
            'project_id': project_id,
            'priority': priority
        }
    })
    
    if response.status_code == 200:
        task = response.json()['task']
        print(f"✅ Task created: {task['id']}")
        return task
    else:
        print(f"❌ Error: {response.text}")
        return None

def list_my_tasks():
    """Show current tasks"""
    print("📋 Your current tasks:")
    
    url = f"{SUPABASE_URL}/functions/v1/ai-agent-api"
    response = requests.post(url, headers=headers, json={
        'action': 'list_tasks',
        'params': {'limit': 5}
    })
    
    if response.status_code == 200:
        tasks = response.json()['tasks']
        for task in tasks:
            project_name = task.get('project', {}).get('name', 'No Project')
            print(f"  • {task['title']} ({task['status']}) - {project_name}")
        return tasks
    else:
        print(f"❌ Error: {response.text}")
        return None

def main():
    print("🤖 Simple AI Agent Interface")
    print("=" * 40)
    
    while True:
        print("\nWhat would you like to do?")
        print("1. Turn text/email into tasks")
        print("2. Create a single task")
        print("3. Show my current tasks")
        print("4. Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == '1':
            print("\nPaste your text content (email, meeting notes, etc.):")
            print("Type 'DONE' on a new line when finished:")
            lines = []
            while True:
                line = input()
                if line.strip().upper() == 'DONE':
                    break
                lines.append(line)
            
            content = '\n'.join(lines)
            if content.strip():
                process_text_to_tasks(content)
            else:
                print("No content provided.")
                
        elif choice == '2':
            title = input("Task title: ").strip()
            description = input("Description (optional): ").strip()
            priority = input("Priority (low/medium/high/critical) [medium]: ").strip() or 'medium'
            
            # Use first available project
            tasks = list_my_tasks()
            if tasks:
                project_id = tasks[0]['project']['id']
                create_task_directly(title, description, project_id, priority)
            else:
                print("No projects found. Please create a project first.")
                
        elif choice == '3':
            list_my_tasks()
            
        elif choice == '4':
            print("Goodbye! 👋")
            break
            
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()







