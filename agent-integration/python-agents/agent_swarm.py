"""
Task Management Agent Swarm
Multi-agent system for analyzing and executing tasks
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from agents import Agent, Runner
from task_management_tools import (
    list_tasks, create_task, update_task, assign_task,
    create_project, list_projects, analyze_workload,
    find_suitable_agent_tasks, add_comment,
    process_email_content, save_processed_content, ProcessedContent
)


# ============= SPECIALIZED AGENTS =============

# Coordinator Agent - Orchestrates the swarm
coordinator_agent = Agent(
    name="Task Coordinator",
    instructions="""You are the coordinator of a task management agent swarm. Your responsibilities:
    1. Analyze available tasks and determine which can be automated
    2. Assign tasks to appropriate specialized agents
    3. Monitor progress and reassign if needed
    4. Report results back to the team
    
    When analyzing tasks:
    - Check task descriptions for keywords indicating the type of work
    - Consider task priority and deadlines
    - Evaluate complexity and agent capabilities
    - Group related tasks for efficiency
    
    Available specialist agents:
    - Developer Agent: Code-related tasks, bug fixes, implementations
    - Writer Agent: Documentation, guides, content creation
    - QA Agent: Testing, quality assurance, bug verification
    - Research Agent: Information gathering, analysis, reports
    """,
    tools=[list_tasks, find_suitable_agent_tasks, analyze_workload, assign_task, add_comment],
    handoffs=[]  # Will be set after all agents are defined
)

# Developer Agent - Handles coding tasks
developer_agent = Agent(
    name="Developer Agent",
    handoff_description="Specialist for coding tasks, bug fixes, and technical implementations",
    instructions="""You are a developer agent specializing in coding tasks. Your capabilities:
    - Review code and suggest improvements
    - Create implementation plans
    - Fix bugs based on descriptions
    - Write technical specifications
    
    When working on a task:
    1. Analyze the requirements
    2. Break down into subtasks if needed
    3. Update task status as you progress
    4. Add comments with your findings/solutions
    """,
    tools=[update_task, add_comment, create_task]
)

# Writer Agent - Handles documentation
writer_agent = Agent(
    name="Writer Agent",
    handoff_description="Specialist for documentation, guides, and content creation",
    instructions="""You are a documentation specialist. Your capabilities:
    - Write user guides and documentation
    - Create README files
    - Draft emails and communications
    - Improve existing documentation
    
    When working on a task:
    1. Understand the audience and purpose
    2. Create clear, well-structured content
    3. Update task status when complete
    4. Add the content as a comment or attachment
    """,
    tools=[update_task, add_comment]
)

# QA Agent - Handles testing tasks
qa_agent = Agent(
    name="QA Agent",
    handoff_description="Specialist for testing, quality assurance, and bug verification",
    instructions="""You are a QA specialist. Your capabilities:
    - Create test plans and test cases
    - Verify bug fixes
    - Perform regression testing analysis
    - Document testing results
    
    When working on a task:
    1. Understand what needs testing
    2. Create comprehensive test scenarios
    3. Document findings clearly
    4. Update task with results
    """,
    tools=[update_task, add_comment, create_task]
)

# Research Agent - Handles research and analysis
research_agent = Agent(
    name="Research Agent",
    handoff_description="Specialist for research, analysis, and information gathering",
    instructions="""You are a research specialist. Your capabilities:
    - Gather information on topics
    - Analyze data and trends
    - Create research reports
    - Provide recommendations
    
    When working on a task:
    1. Define research objectives
    2. Gather relevant information
    3. Analyze and synthesize findings
    4. Present clear conclusions
    """,
    tools=[update_task, add_comment]
)

# Email Processing Agent - Processes emails into tasks
email_processor_agent = Agent(
    name="Email Processor",
    instructions="""You process emails and meeting transcripts to extract actionable tasks. Your process:
    1. Read and understand the content
    2. Identify action items, deadlines, and responsible parties
    3. Group related items into projects
    4. Create structured task data
    
    Extract:
    - Clear task titles (action-oriented)
    - Descriptions with context
    - Due dates (look for time references)
    - Priority (based on urgency words)
    - Assignees (from mentioned names/emails)
    
    Output format should be ProcessedContent structure.
    """,
    tools=[process_email_content, save_processed_content]
)

# Set up handoffs for the coordinator
coordinator_agent.handoffs = [
    developer_agent,
    writer_agent,
    qa_agent,
    research_agent
]


# ============= MAIN ORCHESTRATION =============

class TaskManagementSwarm:
    """Main class for running the agent swarm"""
    
    def __init__(self, organization_id: str):
        self.organization_id = organization_id
        self.runner = Runner()
    
    async def analyze_and_assign_tasks(self) -> Dict[str, Any]:
        """
        Analyze available tasks and assign to agents
        """
        prompt = """
        Please analyze the current unassigned tasks and:
        1. Use find_suitable_agent_tasks to identify tasks we can automate
        2. For each suitable task, determine which specialist agent should handle it
        3. Create a plan for task execution
        4. Report which tasks will be automated and which need human attention
        """
        
        result = await self.runner.run(
            coordinator_agent,
            input=prompt
        )
        
        return {
            'analysis': result.final_output,
            'agent_assignments': result.context.get('assignments', [])
        }
    
    async def process_email(self, email_content: str, metadata: Dict = None) -> Dict[str, Any]:
        """
        Process an email to extract tasks
        """
        prompt = f"""
        Process this email and extract all actionable tasks:
        
        Email Content:
        {email_content}
        
        Metadata: {metadata}
        
        Organization ID: {self.organization_id}
        
        Please:
        1. Extract all action items
        2. Group related tasks into projects
        3. Assign priorities based on urgency
        4. Create the tasks in the system
        """
        
        result = await self.runner.run(
            email_processor_agent,
            input=prompt
        )
        
        return {
            'processed': result.final_output,
            'created_items': result.context.get('created_items', {})
        }
    
    async def execute_task(self, task_id: str, task_details: Dict) -> Dict[str, Any]:
        """
        Execute a specific task with the appropriate agent
        """
        task_type = self._determine_task_type(task_details)
        
        if task_type == 'development':
            agent = developer_agent
        elif task_type == 'documentation':
            agent = writer_agent
        elif task_type == 'testing':
            agent = qa_agent
        elif task_type == 'research':
            agent = research_agent
        else:
            return {'error': 'Task type not suitable for automation'}
        
        prompt = f"""
        Please work on this task:
        Task ID: {task_id}
        Title: {task_details.get('title')}
        Description: {task_details.get('description')}
        Priority: {task_details.get('priority')}
        
        Steps:
        1. Update status to 'in_progress'
        2. Work on the task based on your capabilities
        3. Add comments with your progress/findings
        4. Update status to 'review' when complete
        """
        
        result = await self.runner.run(agent, input=prompt)
        
        return {
            'task_id': task_id,
            'agent': agent.name,
            'result': result.final_output
        }
    
    def _determine_task_type(self, task: Dict) -> str:
        """Determine task type based on keywords"""
        text = f"{task.get('title', '')} {task.get('description', '')}".lower()
        
        if any(word in text for word in ['code', 'implement', 'fix', 'bug', 'develop']):
            return 'development'
        elif any(word in text for word in ['document', 'readme', 'guide', 'write']):
            return 'documentation'
        elif any(word in text for word in ['test', 'qa', 'verify', 'check']):
            return 'testing'
        elif any(word in text for word in ['research', 'analyze', 'investigate', 'explore']):
            return 'research'
        else:
            return 'unknown'


# ============= COMMAND LINE INTERFACE =============

async def main():
    """Main entry point for testing the swarm"""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get organization ID from environment or use default
    org_id = os.getenv('ORGANIZATION_ID', 'default-org-id')
    
    swarm = TaskManagementSwarm(org_id)
    
    print("Task Management Agent Swarm")
    print("=" * 40)
    print("Commands:")
    print("1. Analyze tasks")
    print("2. Process email")
    print("3. Execute specific task")
    print("4. Exit")
    print()
    
    while True:
        choice = input("Enter command (1-4): ").strip()
        
        if choice == '1':
            print("\nAnalyzing tasks...")
            result = await swarm.analyze_and_assign_tasks()
            print(f"\nAnalysis: {result['analysis']}")
            
        elif choice == '2':
            print("\nPaste email content (end with '---' on a new line):")
            lines = []
            while True:
                line = input()
                if line == '---':
                    break
                lines.append(line)
            
            email_content = '\n'.join(lines)
            print("\nProcessing email...")
            result = await swarm.process_email(email_content)
            print(f"\nResult: {result['processed']}")
            
        elif choice == '3':
            task_id = input("Enter task ID: ").strip()
            # In real usage, fetch task details from the system
            task_details = {
                'title': input("Enter task title: ").strip(),
                'description': input("Enter task description: ").strip(),
                'priority': 'medium'
            }
            
            print("\nExecuting task...")
            result = await swarm.execute_task(task_id, task_details)
            print(f"\nResult: {result}")
            
        elif choice == '4':
            print("Exiting...")
            break
        
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    asyncio.run(main())