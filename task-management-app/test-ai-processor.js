// Test script for AI task processor
async function testAITaskProcessor() {
  const testEmail = {
    action: 'process_email',
    data: {
      from: 'client@example.com',
      subject: 'Urgent: New Features Needed for Dashboard',
      body: `Hi Team,

We need to implement the following features urgently:

1. Build a new React component for real-time analytics dashboard
   - Must use TypeScript and integrate with our existing data pipeline
   - Should have responsive design
   - Due by Friday

2. Set up PostgreSQL database schema for metrics storage
   - Need proper indexing for performance
   - Should handle time-series data efficiently
   - Johannes should handle this as he knows our database architecture

3. Create API endpoints for data fetching
   - RESTful design
   - Authentication required
   - Need comprehensive error handling

4. Write documentation for the new features
   - API documentation
   - User guide
   - Rachel would be perfect for this

Please prioritize these tasks as they're blocking our release.

Thanks,
The Client`
    }
  };

  try {
    const response = await fetch('https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/ai-task-processor', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEmail)
    });

    const result = await response.json();
    console.log('AI Task Processor Result:', JSON.stringify(result, null, 2));
    
    if (result.tasks && result.tasks.length > 0) {
      console.log('\n✅ Tasks created successfully!');
      result.tasks.forEach(task => {
        console.log(`\n📋 Task: ${task.title}`);
        console.log(`   Assigned to: ${task.assignedTo || 'Unassigned'}`);
        console.log(`   Email: ${task.assignedEmail || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error testing AI processor:', error);
  }
}

// Run the test
testAITaskProcessor();