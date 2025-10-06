// Test fetching the AI-assigned tasks specifically
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aevvuzgavyuqlafflkqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssignedTasks() {
  // Get the specific tasks we know have metadata
  const taskIds = [
    'aa1327fe-50f8-4a3a-a8f9-0c855df686b7', // Rachel Green - Documentation
    '0d64e0f7-c69e-4715-a2d5-b85e57611051', // Sarah Mitchell - API Endpoints  
    '3ead5344-38fa-4dba-bdeb-e55e1dfeca47', // Carlos Mendez - PostgreSQL
    'f02979d2-6169-43cb-9bed-4095dc3b73b8'  // Fanyana Nkosi - React Component
  ];

  console.log('Fetching AI-assigned tasks with select("*")...\n');
  
  for (const taskId of taskIds) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error(`Error fetching ${taskId}:`, error);
      continue;
    }

    console.log(`Task: ${data.title}`);
    console.log(`  ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Project ID: ${data.project_id}`);
    console.log(`  Metadata exists: ${data.metadata !== null}`);
    if (data.metadata) {
      console.log(`  Assigned To: ${data.metadata.assignedTo || 'Not set'}`);
      console.log(`  Assigned Email: ${data.metadata.assignedEmail || 'Not set'}`);
      console.log(`  Auto-assigned: ${data.metadata.autoAssigned || false}`);
      console.log(`  Full metadata: ${JSON.stringify(data.metadata, null, 2)}`);
    }
    console.log('---');
  }
}

testAssignedTasks();