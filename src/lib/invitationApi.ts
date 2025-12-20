import { sendInvitationEmail, type InvitationEmailData } from '../lib/emailService';

export async function sendInvitation(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Attempting to send invitation email to:', data.to);
    
    // Call the email service
    const result = await sendInvitationEmail(data);
    
    if (result.success) {
      console.log('Email sent successfully');
      return { success: true };
    } else {
      console.error('Email failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}

// Direct alternative that doesn't require API endpoint
export async function sendInvitationDirect(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  return sendInvitationEmail(data);
}