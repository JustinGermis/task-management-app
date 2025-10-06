"""
Tools for Task Management System Integration
These tools allow agents to interact with the Supabase backend
"""

import os
import json
import requests
from typing import Dict, List, Optional, Any
from agents import function_tool
from pydantic import BaseModel, Field

# Get configuration from environment
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_EDGE_FUNCTION_URL = f"{SUPABASE_URL}/functions/v1"
AI_AGENT_KEY = os.getenv('AI_AGENT_SECRET_KEY')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

# Default headers for all requests
HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'x-agent-key': AI_AGENT_KEY
}

# ============= TASK TOOLS =============

@function_tool
def list_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    List tasks from the task management system.
    
    Args:
        project_id: Filter by project ID
        status: Filter by status (todo, in_progress, review, done, blocked)
        assignee_id: Filter by assignee user ID
        limit: Maximum number of tasks to return
    
    Returns:
        Dictionary containing list of tasks
    """
    params = {
        'project_id': project_id,
        'status': status,
        'assignee_id': assignee_id,
        'limit': limit
    }
    
    # Remove None values
    params = {k: v for k, v in params.items() if v is not None}
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'list_tasks', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to list tasks: {response.text}"}


@function_tool
def create_task(
    title: str,
    project_id: str,
    description: Optional[str] = None,
    priority: str = "medium",
    due_date: Optional[str] = None,
    status: str = "todo"
) -> Dict[str, Any]:
    """
    Create a new task in the task management system.
    
    Args:
        title: Task title (required)
        project_id: ID of the project (required)
        description: Task description
        priority: Priority level (low, medium, high, critical)
        due_date: Due date in YYYY-MM-DD format
        status: Initial status (todo, in_progress, review, done, blocked)
    
    Returns:
        Dictionary containing the created task
    """
    params = {
        'title': title,
        'project_id': project_id,
        'description': description,
        'priority': priority,
        'due_date': due_date,
        'status': status
    }
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'create_task', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to create task: {response.text}"}


@function_tool
def update_task(
    task_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing task.
    
    Args:
        task_id: ID of the task to update (required)
        title: New title
        description: New description
        status: New status (todo, in_progress, review, done, blocked)
        priority: New priority (low, medium, high, critical)
        due_date: New due date in YYYY-MM-DD format
    
    Returns:
        Dictionary containing the updated task
    """
    updates = {}
    if title: updates['title'] = title
    if description: updates['description'] = description
    if status: updates['status'] = status
    if priority: updates['priority'] = priority
    if due_date: updates['due_date'] = due_date
    
    params = {
        'task_id': task_id,
        'updates': updates
    }
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'update_task', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to update task: {response.text}"}


@function_tool
def assign_task(task_id: str, user_id: str) -> Dict[str, Any]:
    """
    Assign a task to a user.
    
    Args:
        task_id: ID of the task
        user_id: ID of the user to assign to
    
    Returns:
        Success status
    """
    params = {
        'task_id': task_id,
        'user_id': user_id
    }
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'assign_task', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to assign task: {response.text}"}


# ============= PROJECT TOOLS =============

@function_tool
def create_project(
    name: str,
    organization_id: str,
    description: Optional[str] = None,
    status: str = "planning"
) -> Dict[str, Any]:
    """
    Create a new project.
    
    Args:
        name: Project name (required)
        organization_id: Organization ID (required)
        description: Project description
        status: Project status (planning, active, on_hold, completed, archived)
    
    Returns:
        Dictionary containing the created project
    """
    params = {
        'name': name,
        'organization_id': organization_id,
        'description': description,
        'status': status
    }
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'create_project', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to create project: {response.text}"}


@function_tool
def list_projects(
    organization_id: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    List projects.
    
    Args:
        organization_id: Filter by organization
        limit: Maximum number of projects to return
    
    Returns:
        Dictionary containing list of projects
    """
    params = {
        'organization_id': organization_id,
        'limit': limit
    }
    
    # Remove None values
    params = {k: v for k, v in params.items() if v is not None}
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'list_projects', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to list projects: {response.text}"}


# ============= ANALYSIS TOOLS =============

@function_tool
def analyze_workload(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze workload metrics for a user or the entire team.
    
    Args:
        user_id: User ID to analyze (optional, analyzes all if not provided)
    
    Returns:
        Workload metrics including task counts by status and priority
    """
    params = {'user_id': user_id} if user_id else {}
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'analyze_workload', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to analyze workload: {response.text}"}


@function_tool
def find_suitable_agent_tasks() -> Dict[str, Any]:
    """
    Find tasks that are suitable for agent automation.
    
    Returns:
        Dictionary of tasks categorized by type (documentation, testing, etc.)
    """
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'find_suitable_agent_tasks', 'params': {}}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to find suitable tasks: {response.text}"}


@function_tool
def add_comment(task_id: str, content: str) -> Dict[str, Any]:
    """
    Add a comment to a task.
    
    Args:
        task_id: ID of the task
        content: Comment content
    
    Returns:
        Dictionary containing the created comment
    """
    params = {
        'task_id': task_id,
        'content': content
    }
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/ai-agent-api",
        headers=HEADERS,
        json={'action': 'add_comment', 'params': params}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to add comment: {response.text}"}


# ============= CONTENT PROCESSING TOOLS =============

class ProcessedContent(BaseModel):
    """Structure for processed content from emails/transcripts"""
    projects: List[Dict] = Field(default_factory=list)
    standalone_tasks: List[Dict] = Field(default_factory=list)
    summary: str


@function_tool
def process_email_content(
    content: str,
    organization_id: str,
    sender: Optional[str] = None,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process email content to extract tasks and projects.
    
    Args:
        content: Email body text
        organization_id: Organization to create tasks in
        sender: Email sender
        subject: Email subject
    
    Returns:
        Instructions for processing or results if already processed
    """
    metadata = {}
    if sender: metadata['sender'] = sender
    if subject: metadata['subject'] = subject
    
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/content-processor",
        headers=HEADERS,
        json={
            'content_type': 'email',
            'content': content,
            'metadata': metadata,
            'organization_id': organization_id
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to process email: {response.text}"}


@function_tool
def save_processed_content(
    processed_data: ProcessedContent,
    organization_id: str,
    content_type: str = "email"
) -> Dict[str, Any]:
    """
    Save processed content (tasks and projects) to the system.
    
    Args:
        processed_data: Structured data with projects and tasks
        organization_id: Organization to create items in
        content_type: Type of content (email, transcript, document)
    
    Returns:
        Results of task/project creation
    """
    response = requests.post(
        f"{SUPABASE_EDGE_FUNCTION_URL}/content-processor",
        headers=HEADERS,
        json={
            'content_type': content_type,
            'organization_id': organization_id,
            'processed_data': processed_data.model_dump()
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {'error': f"Failed to save processed content: {response.text}"}