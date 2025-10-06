# Google Apps Script Integration Setup Guide

## Overview
This Google Apps Script integration automatically processes incoming emails and Google Drive files to extract actionable tasks using AI. The script monitors your Gmail and Drive, then sends content to your Supabase Edge Functions for AI processing.

## Features
- **Email Processing**: Automatically extracts tasks from incoming emails
- **Google Drive Monitoring**: Processes new documents for action items
- **AI-Powered Analysis**: Uses OpenAI GPT-4 to identify tasks, priorities, and assignments
- **Automatic Task Creation**: Creates tasks directly in your Task Management System

## Prerequisites
1. Google account with Gmail and Drive access
2. Supabase project with deployed Edge Functions
3. OpenAI API key configured in Supabase
4. AI Agent Secret Key set in Supabase secrets

## Step 1: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Replace the default code with the contents from `agent-integration/google-apps-script.js`
4. Save the project with a meaningful name (e.g., "Task Management Email Processor")

## Step 2: Configure Script Variables

### Required Configuration Changes

In the script, you need to update these values:

```javascript
// Line 31: Your Supabase project URL
'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-task-processor'

// Line 35: Your Supabase anon key
'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'

// Line 36: Your AI agent secret key (must match Supabase secret)
'x-agent-key': 'YOUR_SECRET_KEY_HERE'

// Line 63: Google Drive folder ID (optional, for document processing)
const FOLDER_ID = 'YOUR_FOLDER_ID_HERE'
```

### How to Get These Values

1. **Supabase Project URL & Anon Key**:
   - Go to your Supabase dashboard
   - Navigate to Settings → API
   - Copy the Project URL and anon/public key

2. **AI Agent Secret Key**:
   - This should match the key you set in Supabase secrets
   - Generate a secure random string (e.g., using `openssl rand -base64 32`)

3. **Google Drive Folder ID** (optional):
   - Right-click on the folder you want to monitor
   - Select "Get link"
   - Extract the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

## Step 3: Set Up Permissions

1. In Google Apps Script, click "Run" on any function to trigger permission setup
2. Grant the following permissions:
   - **Gmail**: Read and modify emails
   - **Drive**: Read files and folders
   - **External requests**: Connect to your Supabase project

## Step 4: Configure Triggers

### Option A: Automatic Setup (Recommended)
Run the `setupTrigger()` function once:
1. In the Apps Script editor, select `setupTrigger` from the function dropdown
2. Click "Run"
3. This will create a trigger that runs every 5 minutes

### Option B: Manual Trigger Setup
1. Click the clock icon (Triggers) in the left sidebar
2. Click "Add Trigger"
3. Configure:
   - Function: `processAllSources`
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5 minutes

## Step 5: Test the Integration

### Test Email Processing
1. In Apps Script, select `testEmail` function
2. Click "Run"
3. Check the execution log for any errors
4. Verify a test task was created in your Task Management System

### Test with Real Email
1. Send yourself an email with task-like content:
   ```
   Subject: Fix login bug by Friday
   Body: We need to fix the authentication issue where users can't log in with special characters in their passwords. This is blocking several customers.
   ```
2. Wait up to 5 minutes for processing
3. Check your Task Management System for the new task

## Step 6: Monitor and Troubleshoot

### View Execution Logs
1. In Apps Script, click "Executions" in the left sidebar
2. Review recent runs for errors or success messages

### Common Issues

**Permission Errors**:
- Re-run the authorization flow
- Ensure all required permissions are granted

**Network Errors**:
- Verify your Supabase URL and keys are correct
- Check that Edge Functions are deployed and accessible

**No Tasks Created**:
- Verify the AI Agent Secret Key matches between Apps Script and Supabase
- Check Supabase Edge Function logs for errors
- Ensure OpenAI API key is configured in Supabase secrets

## How to Disable the Integration

### Temporary Disable
1. Go to Google Apps Script
2. Click "Triggers" (clock icon)
3. Delete all triggers for your project

### Permanent Disable
1. Delete all triggers (as above)
2. Optionally delete the entire Apps Script project

## Advanced Configuration

### Email Filtering
Modify the Gmail search query in `processIncomingEmails()`:
```javascript
// Only process emails from specific senders
const threads = GmailApp.search('is:unread from:boss@company.com OR from:client@example.com');

// Only process emails with specific subjects
const threads = GmailApp.search('is:unread subject:(task OR action OR todo)');
```

### Document Types
Customize document type detection in `detectDocumentType()`:
```javascript
// Add custom document type detection
if (lowerName.includes('sprint') || lowerName.includes('standup')) {
  return 'sprint_notes';
}
```

### Processing Frequency
Change trigger frequency in `setupTrigger()`:
```javascript
// Run every minute (more frequent)
ScriptApp.newTrigger('processAllSources')
  .timeBased()
  .everyMinutes(1)
  .create();

// Run every hour (less frequent)
ScriptApp.newTrigger('processAllSources')
  .timeBased()
  .everyHours(1)
  .create();
```

## Security Considerations

1. **API Keys**: Never share your script or commit API keys to version control
2. **Permissions**: Only grant minimum required permissions
3. **Email Access**: The script can read all your emails - ensure you trust the processing logic
4. **Rate Limits**: Google Apps Script has execution time and trigger limits

## Troubleshooting Guide

### Script Execution Errors
1. Check the "Executions" tab for detailed error messages
2. Verify all configuration values are correct
3. Test individual functions (like `testEmail`) first

### No Tasks Being Created
1. Verify Supabase Edge Functions are deployed
2. Check Supabase function logs for errors
3. Ensure AI Agent Secret Key matches between script and Supabase
4. Test the Edge Function directly using curl or Postman

### Performance Issues
1. Reduce trigger frequency if hitting rate limits
2. Add error handling and retry logic
3. Consider processing emails in smaller batches

## Support

If you encounter issues:
1. Check the execution logs in Google Apps Script
2. Review Supabase Edge Function logs
3. Verify all configuration values
4. Test individual components separately

## File Locations
- **Google Apps Script Code**: `agent-integration/google-apps-script.js`
- **Edge Functions**: `agent-integration/edge-functions/`
- **Python Agents**: `agent-integration/python-agents/`
- **Setup Script**: `agent-integration/setup.sh`
