import { APP_CONFIG } from '../config';

/**
 * Frontend Email Service for PrivyConnect
 * Calls the backend API to send transactional emails.
 */

export type EmailType = 
  | 'otp'
  | 'password_reset'
  | 'subscription_success'
  | 'payment_success'
  | 'subscription_expiry_warning'
  | 'subscription_expired'
  | 'wallet_funded'
  | 'withdrawal_request'
  | 'withdrawal_completed'
  | 'tip_received'
  | 'new_message_alert'
  | 'profile_verified'
  | 'login_alert'
  | 'email_change_confirmation';

interface SendEmailOptions {
  to: string;
  subject: string;
  type: EmailType;
  data?: any;
}

/**
 * Sends a transactional email via the backend
 */
export async function sendEmail({ to, subject, type, data }: SendEmailOptions) {
  const backendUrl = APP_CONFIG.BACKEND_URL || '';
  try {
    const response = await fetch(`${backendUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, type, data }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error sending email (${type}):`, error);
    throw error;
  }
}

/**
 * Helper for OTP emails (if sent from frontend logic)
 */
export async function sendOTPEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: `Your Verification Code: ${code}`,
    type: 'otp',
    data: code,
  });
}

/**
 * Helper for Subscription Success
 */
export async function sendSubscriptionSuccessEmail(to: string, plan: string, expiryDate: string) {
  return sendEmail({
    to,
    subject: 'Subscription Confirmed! 💎',
    type: 'subscription_success',
    data: { plan, expiryDate },
  });
}

/**
 * Helper for Tip Received
 */
export async function sendTipReceivedEmail(to: string, amount: string, net: string, commission: string) {
  return sendEmail({
    to,
    subject: 'You Received a Tip! 🎁',
    type: 'tip_received',
    data: { amount, net, commission },
  });
}
