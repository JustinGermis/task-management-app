# Complete Guide: Implementing User Invitation System with Supabase and Resend

## Overview
This guide provides step-by-step instructions for implementing a user invitation system that allows existing users to invite new users to join an organization/workspace/team via email. The system uses Supabase for authentication and database storage, and Resend for sending invitation emails.

## Human Prerequisites (Must be done manually)

### 1. Supabase Setup
- **Create a Supabase project** at https://supabase.com if not already done
- **Enable Authentication** in Supabase dashboard
- **Get your project credentials**:
  - Project URL (found in Settings > API)
  - Anon Key (found in Settings > API)
  - Service Role Key (found in Settings > API) - keep this secret!

### 2. Resend Setup
- **Sign up for Resend** at https://resend.com
- **Get your API key** from the Resend dashboard
- **Verify a domain** (optional but recommended for production):
  - Or use Resend's default `onboarding@resend.dev` for testing
- **Save your Resend API key** - you'll need it for the Edge Function

### 3. Environment Variables
The human needs to provide these to the AI agent:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `RESEND_API_KEY` - Your Resend API key
- `APP_URL` - The application's URL (e.g., https://yourapp.com or http://localhost:3000)

## AI Agent Implementation Instructions

### Phase 1: Database Schema Setup

Create the following database tables and types using Supabase migrations:

```sql
-- Create user role enum if it doesn't exist
CREATE TYPE user_role AS ENUM ('admin', 'member', 'viewer');

-- Create organizations/workspaces table (adjust based on app needs)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization memberships table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  invite_code VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired'))
);

-- Create indexes for better performance
CREATE INDEX idx_invitations_invite_code ON invitations(invite_code);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organizations: users can see organizations they're members of
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Profiles: users can view all profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organization members: viewable by org members
CREATE POLICY "Organization members can view member list" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Invitations: only viewable by org admins and invitee
CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their invitations" ON invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

### Phase 2: Create Supabase Edge Function for Sending Emails

Deploy the following Edge Function to handle email sending:

**File: `supabase/functions/send-invitation-email/index.ts`**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Parse request body
    const { 
      email, 
      inviteCode, 
      inviterName, 
      organizationName, 
      role,
      appName = 'Your App',
      fromEmail = 'onboarding@resend.dev',
      fromName = 'Your App Team'
    } = await req.json();

    // Validate required fields
    if (!email || !inviteCode) {
      return new Response(
        JSON.stringify({ error: 'Email and invite code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct invitation URL
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const inviteUrl = `${origin}/auth/invite?code=${inviteCode}`;

    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 32px;
              margin: 20px 0;
            }
            .header {
              text-align: center;
              margin-bottom: 32px;
            }
            h2 {
              color: #111;
              font-size: 24px;
              margin: 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #0070f3;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 24px 0;
            }
            .button:hover {
              background: #0051cc;
            }
            .role-badge {
              display: inline-block;
              padding: 4px 12px;
              background: #f4f4f5;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 500;
              color: #666;
            }
            .footer {
              margin-top: 32px;
              padding-top: 24px;
              border-top: 1px solid #e5e5e5;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            .link-text {
              word-break: break-all;
              color: #666;
              font-size: 12px;
              margin-top: 16px;
            }
            .info-section {
              background: #f9fafb;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>You're invited to join ${organizationName || appName}!</h2>
            </div>
            
            <p>Hi there,</p>
            
            <p>
              ${inviterName ? `${inviterName} has` : 'You have been'} invited to join 
              <strong>${organizationName || 'our workspace'}</strong> 
              as a <span class="role-badge">${role || 'member'}</span>.
            </p>
            
            <div class="info-section">
              <p><strong>What happens next?</strong></p>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Click the button below to accept your invitation</li>
                <li>Create an account or sign in with your email</li>
                <li>You'll automatically be added to the workspace</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p class="link-text">
              Or copy and paste this link into your browser:<br>
              ${inviteUrl}
            </p>
            
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days. If you need a new invitation, 
              please contact ${inviterName || 'the person who invited you'}.
            </p>
            
            <div class="footer">
              <p>
                If you didn't expect this invitation, you can safely ignore this email.
                <br>
                No account will be created without your confirmation.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const emailText = `
You're invited to join ${organizationName || appName}!

${inviterName ? `${inviterName} has` : 'You have been'} invited to join ${organizationName || 'our workspace'} as a ${role || 'member'}.

Click this link to accept your invitation:
${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim();

    // Send email using Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `You're invited to join ${organizationName || appName}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        inviteUrl,
        emailId: resendData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Phase 3: Create API Functions

Create these API helper functions in your application:

**File: `lib/api/invitations.ts`**

```typescript
import { createClient } from '@/lib/supabase/client';

export interface InvitationData {
  email: string;
  organization_id: string;
  role: 'admin' | 'member' | 'viewer';
}

// Send a new invitation
export async function sendInvitation(data: InvitationData) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify user is admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', data.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      throw new Error('Only admins can send invitations');
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', data.email)
      .eq('organization_id', data.organization_id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Get organization and inviter details
    const [{ data: organization }, { data: inviter }] = await Promise.all([
      supabase
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .single(),
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
    ]);

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: data.email,
        organization_id: data.organization_id,
        role: data.role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Send invitation email via Edge Function
    const { data: session } = await supabase.auth.getSession();
    const response = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: data.email,
        inviteCode: invitation.invite_code,
        inviterName: inviter?.full_name || 'A team member',
        organizationName: organization?.name || 'the team',
        role: data.role,
      },
    });

    if (response.error) {
      console.error('Failed to send invitation email:', response.error);
      // Don't throw - invitation was created successfully
    }

    return invitation;
  } catch (error) {
    console.error('Failed to send invitation:', error);
    throw error;
  }
}

// Resend an existing invitation
export async function resendInvitation(invitationId: string) {
  const supabase = createClient();
  
  try {
    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select(`
        *,
        organization:organizations(*),
        invited_by_profile:profiles!invited_by(*)
      `)
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      throw fetchError || new Error('Invitation not found');
    }

    // Reset expiry
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ 
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    // Resend email
    const response = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: invitation.email,
        inviteCode: invitation.invite_code,
        inviterName: invitation.invited_by_profile?.full_name || 'A team member',
        organizationName: invitation.organization?.name || 'the team',
        role: invitation.role,
      },
    });

    if (response.error) {
      console.error('Failed to resend invitation email:', response.error);
    }

    return invitation;
  } catch (error) {
    console.error('Failed to resend invitation:', error);
    throw error;
  }
}

// Cancel an invitation
export async function cancelInvitation(invitationId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) throw error;
}

// Check if an invitation is valid
export async function checkInvitation(inviteCode: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data;
}

// Accept an invitation
export async function acceptInvitation(inviteCode: string) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Verify email matches
    if (invitation.email !== user.email) {
      throw new Error('This invitation is for a different email address');
    }

    // Start a transaction
    const updates = [];

    // Update invitation status
    updates.push(
      supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id)
    );

    // Add user to organization
    updates.push(
      supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
        })
    );

    // Execute all updates
    const results = await Promise.all(updates);
    
    // Check for errors
    for (const result of results) {
      if (result.error) throw result.error;
    }

    return { success: true, organization_id: invitation.organization_id };
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    throw error;
  }
}

// Get pending invitations for an organization
export async function getOrganizationInvitations(organizationId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      invited_by_profile:profiles!invited_by(*)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### Phase 4: Create UI Components

Create the invitation acceptance page:

**File: `app/auth/invite/page.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkInvitation, acceptInvitation } from '@/lib/api/invitations';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!inviteCode) {
      setError('No invitation code provided');
      setIsLoading(false);
      return;
    }
    
    checkInvitationStatus();
  }, [inviteCode]);

  const checkInvitationStatus = async () => {
    try {
      // Check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Check invitation validity
      const inviteData = await checkInvitation(inviteCode!);
      
      if (!inviteData) {
        setError('Invalid or expired invitation');
        setIsLoading(false);
        return;
      }

      setInvitation(inviteData);
      
      // Auto-accept if user is logged in with matching email
      if (user && user.email === inviteData.email) {
        await handleAcceptInvitation();
      }
    } catch (error) {
      console.error('Failed to check invitation:', error);
      setError('Failed to verify invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!inviteCode) return;
    
    setIsAccepting(true);
    setError('');

    try {
      const result = await acceptInvitation(inviteCode);
      // Redirect to app after successful acceptance
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to accept invitation');
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return <div>Verifying invitation...</div>;
  }

  if (error && !invitation) {
    return (
      <div>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
        <a href="/auth/login">Go to Login</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Join {invitation?.organization?.name}</h1>
      
      {invitation && (
        <div>
          <p>You've been invited to join as a {invitation.role}</p>
          <p>Invitation for: {invitation.email}</p>
          
          {currentUser ? (
            currentUser.email === invitation.email ? (
              <button onClick={handleAcceptInvitation} disabled={isAccepting}>
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            ) : (
              <div>
                <p>This invitation is for {invitation.email}</p>
                <p>You're logged in as {currentUser.email}</p>
                <button onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  router.push(`/auth/login?invite=${inviteCode}`);
                }}>
                  Sign in with {invitation.email}
                </button>
              </div>
            )
          ) : (
            <div>
              <p>Please sign in or create an account to accept this invitation</p>
              <a href={`/auth/signup?invite=${inviteCode}`}>Create Account</a>
              <a href={`/auth/login?invite=${inviteCode}`}>Sign In</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Create a team management component:

**File: `components/team/invite-member-form.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { sendInvitation } from '@/lib/api/invitations';

export function InviteMemberForm({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      await sendInvitation({
        email,
        organization_id: organizationId,
        role,
      });
      setSuccess(true);
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <select value={role} onChange={(e) => setRole(e.target.value as any)}>
        <option value="viewer">Viewer</option>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Invitation'}
      </button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Invitation sent!</p>}
    </form>
  );
}
```

### Phase 5: Update Authentication Flow

Modify your signup/login pages to handle invitation codes:

**File: `app/auth/signup/page.tsx` (partial)**

```typescript
// Add to your existing signup page
const searchParams = useSearchParams();
const inviteCode = searchParams.get('invite');

// After successful signup
if (inviteCode) {
  // Redirect to invitation acceptance
  router.push(`/auth/invite?code=${inviteCode}`);
} else {
  // Normal redirect
  router.push('/dashboard');
}
```

### Phase 6: Deploy Edge Function

Deploy the Edge Function using Supabase CLI or the AI agent's deployment tools:

```bash
supabase functions deploy send-invitation-email
```

Set the environment variable for the Edge Function:
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

## Testing Checklist

1. **Database Setup**
   - [ ] All tables created successfully
   - [ ] RLS policies are working
   - [ ] Invite codes are being generated

2. **Email Sending**
   - [ ] Edge Function deployed
   - [ ] RESEND_API_KEY is set
   - [ ] Emails are being sent
   - [ ] Email links are correct

3. **Invitation Flow**
   - [ ] Admin can send invitations
   - [ ] Non-admins cannot send invitations
   - [ ] Duplicate invitations are prevented
   - [ ] Invitations expire after 7 days

4. **Acceptance Flow**
   - [ ] Valid invitations can be accepted
   - [ ] Invalid codes are rejected
   - [ ] Email matching is enforced
   - [ ] Users are added to organization after acceptance

5. **UI/UX**
   - [ ] Invitation form works
   - [ ] Invitation page displays correctly
   - [ ] Error messages are clear
   - [ ] Success states are shown

## Common Issues and Solutions

1. **Emails not sending**
   - Check RESEND_API_KEY is set correctly
   - Verify Edge Function is deployed
   - Check Edge Function logs for errors

2. **CORS errors**
   - Ensure Edge Function has CORS headers
   - Check Supabase project settings

3. **Invitation not found**
   - Check invite_code is being passed correctly
   - Verify invitation hasn't expired
   - Check RLS policies

4. **User can't accept invitation**
   - Ensure user is logged in
   - Check email matches invitation
   - Verify invitation is still pending

## Security Considerations

1. **Always validate user permissions** before sending invitations
2. **Use RLS policies** to protect data
3. **Expire invitations** after reasonable time (7 days)
4. **Rate limit** invitation sending to prevent abuse
5. **Validate email addresses** before sending
6. **Use secure random codes** for invitations
7. **Never expose service role keys** in client code

## Customization Options

- Adjust invitation expiry time
- Add custom email templates
- Support multiple organization types
- Add invitation limits per organization
- Implement invitation approval workflow
- Add email allowlist/blocklist
- Custom roles beyond admin/member/viewer
- Bulk invitation sending
- Invitation tracking and analytics