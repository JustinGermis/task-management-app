// Test metadata display
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aevvuzgavyuqlafflkqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTask() {
  // Get a task with metadata
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', 'aa1327fe-50f8-4a3a-a8f9-0c855df686b7')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Task loaded from API:');
  console.log('Title:', data.title);
  console.log('Metadata:', JSON.stringify(data.metadata, null, 2));
  
  if (data.metadata) {
    console.log('\nMetadata details:');
    console.log('- Assigned To:', data.metadata.assignedTo);
    console.log('- Email:', data.metadata.assignedEmail);
    console.log('- Auto Assigned:', data.metadata.autoAssigned);
    console.log('- Required Skills:', data.metadata.requiredSkills);
  }
}

checkTask();