// Simple email service without external dependencies
// Uses browser's mailto functionality as fallback

export interface InvitationEmailData {
  to: string;
  invitedBy: string;
  role: string;
  invitationLink: string;
  companyName?: string;
}

export const sendInvitationEmail = async (data: InvitationEmailData): Promise<{ success: boolean; error?: string }> => {
  try {
    // For development, use browser's mailto functionality
    const subject = encodeURIComponent(`You're invited to join ${data.companyName || 'JNK Nutrition'}`);
    const body = encodeURIComponent(`
Hello!

You've been invited by ${data.invitedBy} to join JNK GENERAL TRADING LLC as ${data.role}.

Please click the link below to complete your registration:
${data.invitationLink}

This link is secure and will expire in 7 days.

Best regards,
JNK Nutrition Team
    `);

    const mailtoUrl = `mailto:${data.to}?subject=${subject}&body=${body}`;
    
    // For development - open default email client
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl);
      return { success: true };
    }

    // In production, you would integrate with your email service here
    console.log('Would send email to:', data.to);
    console.log('Registration link:', data.invitationLink);
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendInvitationEmail,
};