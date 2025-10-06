// Test if metadata is being fetched by the UI
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aevvuzgavyuqlafflkqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetTasks() {
  // Test what getTasks returns (simulating the simple-api.ts function)
  console.log('Testing getTasks (simple select *)...');
  const { data: simpleData, error: simpleError } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true })
    .limit(5);

  if (simpleError) {
    console.error('Error:', simpleError);
    return;
  }

  console.log('\nTasks with simple select:');
  simpleData.forEach(task => {
    console.log(`- ${task.title}`);
    console.log(`  Metadata: ${task.metadata ? JSON.stringify(task.metadata) : 'null'}`);
  });

  // Test with explicit metadata selection
  console.log('\n\nTesting with explicit metadata selection...');
  const { data: explicitData, error: explicitError } = await supabase
    .from('tasks')
    .select('id, title, status, metadata')
    .order('position', { ascending: true })
    .limit(5);

  if (explicitError) {
    console.error('Error:', explicitError);
    return;
  }

  console.log('\nTasks with explicit metadata:');
  explicitData.forEach(task => {
    console.log(`- ${task.title}`);
    console.log(`  Metadata: ${task.metadata ? JSON.stringify(task.metadata) : 'null'}`);
  });
}

testGetTasks();