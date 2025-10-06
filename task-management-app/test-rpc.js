// Test RPC function directly
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aevvuzgavyuqlafflkqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  // Get StrideShift org
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'StrideShift')
    .single();

  console.log('Organization:', org);

  if (!org) {
    console.error('StrideShift organization not found');
    return;
  }

  // Test RPC with documentation skills
  const { data, error } = await supabase.rpc('allocate_task_to_team_member', {
    task_requirements: ['documentation', 'technical-writing', 'api-documentation'],
    required_skill_level: 5,
    org_id: org.id
  });

  console.log('RPC Result:');
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
  console.log('Data type:', typeof data);
  console.log('Is null?', data === null);
  console.log('Is array?', Array.isArray(data));
}

testRPC();