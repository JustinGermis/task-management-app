// Email configuration for the application
// To set up email sending, you need to configure one of the following:

// Option 1: Use Supabase's built-in email (limited to auth emails)
// - This is already configured by default for auth emails

// Option 2: Use Resend (recommended for production)
// 1. Sign up at https://resend.com
// 2. Get your API key
// 3. Add RESEND_API_KEY to your Edge Function environment variables
// 4. Update the Edge Function to use Resend

// Option 3: Use SendGrid
// 1. Sign up at https://sendgrid.com
// 2. Get your API key
// 3. Add SENDGRID_API_KEY to your Edge Function environment variables
// 4. Update the Edge Function to use SendGrid

// Option 4: Use custom SMTP
// 1. Configure your SMTP settings in Supabase dashboard
// 2. Under Authentication > Email Template
// 3. Enable custom SMTP

export const EMAIL_CONFIG = {
  // Set to true when you have configured an email provider
  enabled: true,
  
  // Your app's email settings
  from: {
    email: 'onboarding@resend.dev',
    name: 'Task Management App'
  },
  
  // Email provider (for reference)
  provider: 'resend' as 'supabase' | 'resend' | 'sendgrid' | 'smtp',
  
  // URLs for email links (will use current origin by default)
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// Email templates configuration
export const EMAIL_TEMPLATES = {
  invitation: {
    subject: (orgName: string) => `You're invited to join ${orgName}!`,
    previewText: (orgName: string) => `Join ${orgName} and start collaborating with your team`,
  }
}