# Email Setup Guide

## Current Status

The invitation system is fully implemented with:
- ✅ Database tracking of invitations
- ✅ Invite code generation
- ✅ UI for sending invitations
- ✅ Edge Function for sending emails (deployed)
- ⚠️ Email provider not configured (emails are logged but not sent)

## How Invitations Work

1. Admin sends invitation through the Team page
2. System creates invitation record with unique 8-character code
3. Edge Function is called to send email (currently logs only)
4. Recipient receives email with signup link containing invite code
5. New user signs up with the invite code
6. System automatically adds them to the organization with assigned role

## Setting Up Email Sending

### Option 1: Resend (Recommended)

1. **Sign up for Resend**
   - Go to https://resend.com and create an account
   - Add and verify your domain

2. **Get your API Key**
   - Go to API Keys section
   - Create a new API key

3. **Configure Supabase Edge Function**
   ```bash
   # Set the environment variable
   supabase secrets set RESEND_API_KEY=your_api_key_here
   ```

4. **Update Edge Function**
   - The Edge Function at `send-invitation-email` is already deployed
   - Uncomment the Resend code section in the function
   - Redeploy: `supabase functions deploy send-invitation-email`

### Option 2: SendGrid

1. **Sign up for SendGrid**
   - Go to https://sendgrid.com
   - Verify your sender identity

2. **Get API Key**
   - Settings > API Keys > Create API Key

3. **Configure and update Edge Function similar to Resend**

### Option 3: Supabase SMTP (For Auth Emails)

1. **Go to Supabase Dashboard**
   - Authentication > Email Templates
   - Configure SMTP settings

Note: This only works for Supabase auth emails, not custom invitations.

## Testing Email Locally

For local development without setting up a real email provider:

1. **Use the current logging approach**
   - Invitation links are displayed in the UI
   - Edge Function logs show email content

2. **Use a service like Mailtrap**
   - Sign up at https://mailtrap.io
   - Get SMTP credentials
   - Configure in your Edge Function

## Email Template Customization

The email template is in the Edge Function (`send-invitation-email`). You can customize:
- HTML design and styling
- Email copy and messaging
- Logo and branding
- Dynamic content based on role or organization

## Troubleshooting

### Emails not sending
1. Check Edge Function logs: `supabase functions logs send-invitation-email`
2. Verify API keys are set correctly
3. Check email provider dashboard for errors

### Invitation links not working
1. Verify the base URL in the Edge Function
2. Check that invite codes are being generated
3. Ensure signup page handles invite parameter

### Rate limiting
- Most email providers have rate limits
- Consider implementing queuing for bulk invites
- Monitor your email provider dashboard

## Production Checklist

- [ ] Choose and configure email provider
- [ ] Set environment variables in production
- [ ] Update Edge Function with provider code
- [ ] Configure custom domain for emails
- [ ] Set up email authentication (SPF, DKIM, DMARC)
- [ ] Test invitation flow end-to-end
- [ ] Monitor email delivery rates
- [ ] Set up email bounce handling