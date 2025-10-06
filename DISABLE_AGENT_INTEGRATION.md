# How to Disable Agent Integration

## Quick Summary

The agent integration is currently **not active** in your main Task Management App. The AI processor components exist but are not linked in the navigation, so they're effectively disabled already. However, here's how to completely disable all agent-related functionality:

## 1. Disable Google Apps Script (IMMEDIATE)

### Stop the Email Processing
1. Go to [Google Apps Script](https://script.google.com/)
2. Open your "Task Management Email Processor" project (or similar name)
3. Click the **clock icon** (Triggers) in the left sidebar
4. **Delete all triggers** by clicking the trash icon next to each trigger
5. This immediately stops email processing

### Verify It's Stopped
- The script will no longer run automatically
- No new tasks will be created from emails
- Existing tasks remain unchanged

## 2. Remove AI Components from App (OPTIONAL)

The AI components are already isolated and not affecting your main app, but you can remove them completely:

### Remove AI Processor Page
```bash
rm -rf /Users/justin/Projects/Task\ Management\ App/task-management-app/app/ai-processor/
```

### Remove AI Components
```bash
rm -rf /Users/justin/Projects/Task\ Management\ App/task-management-app/components/ai/
```

### Remove Test Files
```bash
cd /Users/justin/Projects/Task\ Management\ App/task-management-app/
rm test-ai-processor.js
rm test-metadata.js
rm test-metadata-ui.js
```

## 3. Remove StrideShift Components (OPTIONAL)

If you also want to remove the StrideShift team management features:

### Remove StrideShift Page
```bash
rm -rf /Users/justin/Projects/Task\ Management\ App/task-management-app/app/strideshift/
```

### Remove StrideShift Components
```bash
rm -rf /Users/justin/Projects/Task\ Management\ App/task-management-app/components/strideshift/
rm /Users/justin/Projects/Task\ Management\ App/task-management-app/components/team/strideshift-team-*.tsx
rm /Users/justin/Projects/Task\ Management\ App/task-management-app/components/team/team-allocation-panel.tsx
```

### Remove API Files
```bash
rm /Users/justin/Projects/Task\ Management\ App/task-management-app/lib/api/team-allocation.ts
```

## 4. Clean Up Dependencies (OPTIONAL)

If you removed the components above, you can also remove unused dependencies:

```bash
cd /Users/justin/Projects/Task\ Management\ App/task-management-app/
npm uninstall @supabase/ssr  # If only used by AI components
```

## 5. Disable Supabase Edge Functions (OPTIONAL)

If you want to completely disable the AI processing on the backend:

```bash
# Delete the Edge Functions (this will break the Google Apps Script if re-enabled)
supabase functions delete ai-agent-api
supabase functions delete ai-task-processor
supabase functions delete content-processor
```

**⚠️ Warning**: Only do this if you're sure you won't need the agent integration again, as you'll need to redeploy these functions.

## Current Status

✅ **Main App**: Clean and functional - no AI components in navigation
✅ **Task Management**: Fully operational in basic mode
✅ **Team Features**: Working (except StrideShift-specific features)
⚠️ **Google Apps Script**: May still be running - follow Step 1 to disable

## What Happens After Disabling

- ✅ Your task management system works normally
- ✅ All existing tasks, projects, and data remain intact
- ✅ Manual task creation, editing, and management work as before
- ❌ No automatic task creation from emails
- ❌ No AI-powered task analysis or assignment
- ❌ No document processing from Google Drive

## Re-enabling Later

To re-enable the agent integration:

1. **Google Apps Script**: Follow the setup guide in `GOOGLE_APPS_SCRIPT_SETUP.md`
2. **Edge Functions**: Redeploy using the files in `agent-integration/edge-functions/`
3. **App Components**: The files will still exist unless you deleted them in Step 2-3

## Verification

After disabling, verify everything works:

1. ✅ Navigate to `/dashboard` - should work normally
2. ✅ Create a new task manually - should work
3. ✅ View existing tasks in Kanban or List view - should work
4. ✅ Team management features - should work (except StrideShift if removed)
5. ❌ `/ai-processor` route - should not be accessible (or removed)
6. ❌ New tasks from emails - should stop appearing

## Need Help?

If you encounter any issues after disabling:

1. Check that you didn't accidentally remove core task management files
2. Verify your Supabase connection is still working
3. Test basic CRUD operations (create, read, update, delete tasks)
4. Check the browser console for any JavaScript errors

The core task management functionality is completely independent of the AI integration, so disabling it should not affect your main workflow.
