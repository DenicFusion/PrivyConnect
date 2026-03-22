
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { templates } from './emailTemplates.ts';

/**
 * Email Service for PrivyConnect
 * Supports Resend SDK (preferred) or SMTP fallback.
 */

// Initialize Resend if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Configure SMTP transporter as fallback
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export type EmailType = keyof typeof templates;

interface EmailOptions {
  to: string;
  subject: string;
  type: EmailType;
  data?: any;
}

/**
 * Central function to send emails
 */
export async function sendEmail({ to, subject, type, data }: EmailOptions) {
  try {
    const templateFn = templates[type];
    if (!templateFn) {
      throw new Error(`Email template type "${type}" not found.`);
    }

    // Generate HTML content from template
    const html = (templateFn as any)(data);
    const from = process.env.SMTP_FROM || 'noreply@privyconnect.app';

    let messageId = '';

    if (resend) {
      // Use Resend SDK
      const { data: resendData, error } = await resend.emails.send({
        from: `PrivyConnect <${from}>`,
        to: [to],
        subject,
        html,
      });

      if (error) throw error;
      messageId = resendData?.id || '';
    } else {
      // Fallback to SMTP
      const info = await transporter.sendMail({
        from: `"PrivyConnect" <${from}>`,
        to,
        subject,
        html,
      });
      messageId = info.messageId;
    }

    console.log(`Email sent: ${messageId} (Type: ${type}, Provider: ${resend ? 'Resend' : 'SMTP'})`);
    return { success: true, messageId };
  } catch (error) {
    console.error(`Failed to send email (Type: ${type}):`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Helper for OTP emails
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
