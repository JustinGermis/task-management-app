function processIncomingEmails() {
  // Check all unprocessed emails (both TO and CC)
  const threads = GmailApp.search('is:unread');
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    
    messages.forEach(message => {
      if (message.isUnread()) {
        // Extract email data
        const emailData = {
          action: 'process_email',
          data: {
            from: message.getFrom(),
            to: message.getTo(),
            cc: message.getCc(),
            subject: message.getSubject(),
            body: message.getPlainBody(),
            html: message.getBody(),
            date: message.getDate().toISOString(),
            threadId: thread.getId(),
            messageId: message.getId(),
            isReply: thread.getMessageCount() > 1,
            attachments: message.getAttachments().map(a => a.getName())
          }
        };
        
        // Send to your Supabase Edge Function
        try {
          const response = UrlFetchApp.fetch(
            'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/ai-task-processor',
            {
              method: 'post',
              headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g',
                'x-agent-key': 'YOUR_SECRET_KEY_HERE', // REPLACE THIS!
                'Content-Type': 'application/json'
              },
              payload: JSON.stringify(emailData)
            }
          );
          
          // Mark as read if successfully processed
          if (response.getResponseCode() === 200) {
            message.markRead();
            
            // Optional: Add label to track processed emails
            const label = GmailApp.getUserLabelByName('Processed') || 
                         GmailApp.createLabel('Processed');
            thread.addLabel(label);
          }
        } catch (error) {
          console.error('Failed to process email:', error);
          // Leave unread to retry next time
        }
      }
    });
  });
}

function processNewDriveFiles() {
  // Monitor specific folder - REPLACE WITH YOUR FOLDER ID
  const FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // Right-click folder → Get link → extract ID
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Get files modified in last 10 minutes (to avoid reprocessing)
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // Search for new/modified files
    const files = folder.searchFiles(
      `modifiedDate > "${tenMinutesAgo.toISOString()}" and trashed = false`
    );
    
    while (files.hasNext()) {
      const file = files.next();
      
      // Check if already processed (using Properties Service as simple DB)
      const processedFiles = PropertiesService.getScriptProperties();
      const fileKey = `processed_${file.getId()}`;
      
      if (!processedFiles.getProperty(fileKey)) {
        try {
          let content = '';
          let metadata = {
            fileName: file.getName(),
            fileType: file.getMimeType(),
            createdDate: file.getDateCreated(),
            lastUpdated: file.getLastUpdated(),
            url: file.getUrl(),
            size: file.getSize()
          };
          
          // Extract content based on file type
          if (file.getMimeType().includes('text') || 
              file.getMimeType().includes('document')) {
            // Google Docs or text files
            content = DocumentApp.openById(file.getId()).getBody().getText();
          } 
          else if (file.getMimeType().includes('spreadsheet')) {
            // Google Sheets
            const sheet = SpreadsheetApp.openById(file.getId());
            content = sheet.getSheets().map(s => 
              s.getDataRange().getValues().join('\n')
            ).join('\n\n');
          }
          else if (file.getMimeType() === 'application/pdf') {
            // PDF - extract text (limited in Apps Script)
            content = file.getBlob().getDataAsString();
          }
          else {
            // For other files, just process metadata
            content = `File: ${file.getName()} uploaded`;
          }
          
          // Detect document type from filename/content
          const docType = detectDocumentType(file.getName(), content);
          
          // Send to Supabase Edge Function
          const response = UrlFetchApp.fetch(
            'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/ai-task-processor',
            {
              method: 'post',
              headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g',
                'x-agent-key': 'YOUR_SECRET_KEY_HERE', // REPLACE THIS!
                'Content-Type': 'application/json'
              },
              payload: JSON.stringify({
                action: 'process_document',
                data: {
                  content: content,
                  metadata: metadata,
                  documentType: docType,
                  source: 'google_drive'
                }
              })
            }
          );
          
          // Mark as processed
          if (response.getResponseCode() === 200) {
            processedFiles.setProperty(fileKey, new Date().toISOString());
            
            // Optional: Move to "Processed" subfolder
            const processedFolder = folder.getFoldersByName('Processed').hasNext() 
              ? folder.getFoldersByName('Processed').next()
              : folder.createFolder('Processed');
            file.moveTo(processedFolder);
          }
        } catch (error) {
          console.error('Error processing file:', file.getName(), error);
        }
      }
    }
  } catch (error) {
    console.error('Folder not found or error:', error);
  }
}

function detectDocumentType(fileName, content) {
  const lowerName = fileName.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerName.includes('meeting') || lowerName.includes('transcript') ||
      lowerContent.includes('action items') || lowerContent.includes('minutes')) {
    return 'meeting_notes';
  }
  if (lowerName.includes('requirement') || lowerName.includes('spec')) {
    return 'requirements';
  }
  if (lowerName.includes('report') || lowerName.includes('status')) {
    return 'status_report';
  }
  return 'general';
}

function processAllSources() {
  processIncomingEmails();
  // Uncomment next line if you want to also monitor Google Drive
  // processNewDriveFiles();
}

// Run this function ONCE to set up the trigger
function setupTrigger() {
  // Clear any existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new trigger to run every 5 minutes
  ScriptApp.newTrigger('processAllSources')
    .timeBased()
    .everyMinutes(5)
    .create();
}

// Manual test function
function testEmail() {
  // Send a test request to see if connection works
  const testData = {
    action: 'process_email',
    data: {
      from: 'test@example.com',
      subject: 'Test: Create task to fix login bug',
      body: 'This is a test. Please create a task to fix the login bug by Friday.',
      date: new Date().toISOString()
    }
  };
  
  try {
    const response = UrlFetchApp.fetch(
      'https://aevvuzgavyuqlafflkqz.supabase.co/functions/v1/ai-task-processor',
      {
        method: 'post',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldnZ1emdhdnl1cWxhZmZsa3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODgyMjQsImV4cCI6MjA3MTM2NDIyNH0.00cmEmoh558bNZxxi_Ex2oQ7ZcuFbJiZEUhVuwsR80g',
          'x-agent-key': 'YOUR_SECRET_KEY_HERE', // REPLACE THIS!
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(testData)
      }
    );
    
    console.log('Response:', response.getContentText());
  } catch (error) {
    console.error('Test failed:', error);
  }
}