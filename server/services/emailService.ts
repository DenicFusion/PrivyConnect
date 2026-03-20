
import nodemailer from 'nodemailer';
import { templates } from './emailTemplates.ts';

/**
 * Email Service for PrivyConnect
 * Handles sending transactional emails via SMTP.
 */

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
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

    const info = await transporter.sendMail({
      from: `"PrivyConnect" <${process.env.SMTP_FROM || 'noreply@privyconnect.app'}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent: ${info.messageId} (Type: ${type})`);
    return { success: true, messageId: info.messageId };
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
