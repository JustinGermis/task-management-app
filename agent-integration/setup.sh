#!/bin/bash

echo "Task Management Agent Integration Setup"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "task-management-system-spec.md" ]; then
    echo "Error: Please run this script from the Task Management App root directory"
    exit 1
fi

# Step 1: Deploy Edge Functions
echo "Step 1: Deploying Edge Functions to Supabase"
echo "---------------------------------------------"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first:"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

# Create supabase functions directory if it doesn't exist
mkdir -p supabase/functions

# Copy edge functions
cp agent-integration/edge-functions/ai-agent-api.ts supabase/functions/ai-agent-api/index.ts
cp agent-integration/edge-functions/content-processor.ts supabase/functions/content-processor/index.ts

echo "Edge functions copied to supabase/functions/"
echo ""
echo "To deploy, run:"
echo "  supabase functions deploy ai-agent-api"
echo "  supabase functions deploy content-processor"
echo ""
echo "Don't forget to set the AI_AGENT_SECRET_KEY secret:"
echo "  supabase secrets set AI_AGENT_SECRET_KEY=your-secret-key"
echo ""

# Step 2: Set up Python environment
echo "Step 2: Setting up Python Agent Environment"
echo "-------------------------------------------"

cd agent-integration/python-agents

# Create virtual environment
echo "Creating Python virtual environment..."
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Copy .env.example to .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "Created .env file. Please edit it with your configuration:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - AI_AGENT_SECRET_KEY (must match the Edge Function secret)"
    echo "  - OPENAI_API_KEY"
    echo "  - ORGANIZATION_ID"
fi

echo ""
echo "Setup Complete!"
echo "=============="
echo ""
echo "Next Steps:"
echo "1. Deploy the Edge Functions using Supabase CLI"
echo "2. Configure the .env file in agent-integration/python-agents/"
echo "3. Test the integration:"
echo "   cd agent-integration/python-agents"
echo "   source venv/bin/activate"
echo "   python agent_swarm.py"
echo ""
echo "Documentation: agent-integration/docs/ARCHITECTURE.md"