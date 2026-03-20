
/**
 * Email Templates for PrivyConnect
 * Dark theme, premium feel, branded layout.
 */

const BRAND_COLOR = "#E4E3E0"; // Off-white/Silver
const ACCENT_COLOR = "#F27D26"; // Warm orange from Recipe 2
const BG_COLOR = "#050505"; // Deep black
const CARD_BG = "#151619"; // Dark matte widget from Recipe 3
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#8E9299";

const layout = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${BG_COLOR};
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: ${TEXT_PRIMARY};
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      color: ${ACCENT_COLOR};
      text-transform: uppercase;
    }
    .card {
      background-color: ${CARD_BG};
      border-radius: 12px;
      padding: 40px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      color: ${TEXT_PRIMARY};
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      color: ${TEXT_SECONDARY};
      margin-bottom: 30px;
    }
    .otp-code {
      font-size: 48px;
      font-weight: bold;
      color: ${ACCENT_COLOR};
      text-align: center;
      letter-spacing: 8px;
      margin: 30px 0;
      padding: 20px;
      background: rgba(242, 125, 38, 0.1);
      border-radius: 8px;
      border: 1px dashed ${ACCENT_COLOR};
    }
    .button {
      display: inline-block;
      padding: 14px 30px;
      background-color: ${ACCENT_COLOR};
      color: #000000;
      text-decoration: none;
      border-radius: 100px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #4a4a4a;
    }
    .footer p {
      margin: 5px 0;
    }
    .divider {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.1);
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PrivyConnect</div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PrivyConnect. All rights reserved.</p>
      <p>This is a transactional email. If you did not expect this, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

export const templates = {
  otp: (code: string) => layout(`
    <div class="title">Verify Your Identity</div>
    <div class="content">
      Use the code below to complete your login or registration. This code expires in 5 minutes.
    </div>
    <div class="otp-code">${code}</div>
    <div class="content" style="font-size: 14px; text-align: center;">
      If you didn't request this, your account is still safe.
    </div>
  `, "Your Verification Code"),

  password_reset: (resetUrl: string) => layout(`
    <div class="title">Reset Your Password</div>
    <div class="content">
      We received a request to reset your password. Click the button below to choose a new one.
    </div>
    <div style="text-align: center; margin: 40px 0;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    <div class="content" style="font-size: 14px;">
      This link will expire in 1 hour. If you didn't request this, please ignore this email.
    </div>
  `, "Reset Your Password"),

  subscription_success: (data: { plan: string, expiryDate: string }) => layout(`
    <div class="title">Subscription Confirmed! 💎</div>
    <div class="content">
      Welcome to the premium experience. Your subscription to <strong>${data.plan}</strong> is now active.
    </div>
    <div class="divider"></div>
    <div class="content">
      <strong>Plan:</strong> ${data.plan}<br>
      <strong>Expires on:</strong> ${data.expiryDate}
    </div>
    <div class="content">
      You now have full access to all premium features, including exclusive chats and media.
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://privyconnect.app/dashboard" class="button">Go to Dashboard</a>
    </div>
  `, "Subscription Confirmed"),

  payment_success: (data: { amount: string, reference: string, date: string }) => layout(`
    <div class="title">Payment Successful ✅</div>
    <div class="content">
      Your payment has been processed successfully.
    </div>
    <div class="divider"></div>
    <div class="content">
      <strong>Amount:</strong> ${data.amount}<br>
      <strong>Reference:</strong> ${data.reference}<br>
      <strong>Date:</strong> ${data.date}
    </div>
  `, "Payment Successful"),

  subscription_expiry_warning: (data: { expiryDate: string }) => layout(`
    <div class="title">Subscription Expiring Soon ⚠️</div>
    <div class="content">
      Your premium access will expire on <strong>${data.expiryDate}</strong>. Renew now to avoid any interruption in service.
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://privyconnect.app/subscribe" class="button">Renew Now</a>
    </div>
  `, "Subscription Expiring Soon"),

  subscription_expired: () => layout(`
    <div class="title">Subscription Expired 🔒</div>
    <div class="content">
      Your premium access has ended. Your exclusive content and chats are now locked.
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://privyconnect.app/subscribe" class="button">Re-subscribe Now</a>
    </div>
  `, "Subscription Expired"),

  wallet_funded: (data: { amount: string, balance: string }) => layout(`
    <div class="title">Wallet Funded 💰</div>
    <div class="content">
      Your wallet has been successfully funded with <strong>${data.amount}</strong>.
    </div>
    <div class="divider"></div>
    <div class="content">
      <strong>New Balance:</strong> ${data.balance}
    </div>
  `, "Wallet Funded"),

  withdrawal_request: (data: { amount: string }) => layout(`
    <div class="title">Withdrawal Requested 💸</div>
    <div class="content">
      We've received your request to withdraw <strong>${data.amount}</strong>. Our team is processing it.
    </div>
    <div class="content" style="font-size: 14px;">
      You'll receive another email once the transfer is complete.
    </div>
  `, "Withdrawal Requested"),

  withdrawal_completed: (data: { amount: string }) => layout(`
    <div class="title">Withdrawal Completed ✅</div>
    <div class="content">
      Your withdrawal of <strong>${data.amount}</strong> has been processed and sent to your account.
    </div>
  `, "Withdrawal Completed"),

  tip_received: (data: { amount: string, net: string, commission: string }) => layout(`
    <div class="title">You Received a Tip! 🎁</div>
    <div class="content">
      Someone just sent you a tip of <strong>${data.amount}</strong>.
    </div>
    <div class="divider"></div>
    <div class="content">
      <strong>Gross Amount:</strong> ${data.amount}<br>
      <strong>Platform Commission (25%):</strong> ${data.commission}<br>
      <strong>Net Earnings:</strong> ${data.net}
    </div>
    <div class="content">
      The funds have been added to your wallet.
    </div>
  `, "You Received a Tip"),

  new_message_alert: (data: { senderName: string }) => layout(`
    <div class="title">New Message 💬</div>
    <div class="content">
      You have a new message from <strong>${data.senderName}</strong>.
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://privyconnect.app/chats" class="button">Read Message</a>
    </div>
  `, "New Message Alert"),

  profile_verified: () => layout(`
    <div class="title">Profile Verified! 🛡️</div>
    <div class="content">
      Congratulations! Your profile has been verified by our team. You now have the verified badge on your profile.
    </div>
  `, "Profile Verified"),

  login_alert: (data: { device: string, location: string, time: string }) => layout(`
    <div class="title">New Login Detected 🛡️</div>
    <div class="content">
      A new login was detected for your account.
    </div>
    <div class="divider"></div>
    <div class="content">
      <strong>Device:</strong> ${data.device}<br>
      <strong>Location:</strong> ${data.location}<br>
      <strong>Time:</strong> ${data.time}
    </div>
    <div class="content" style="font-size: 14px;">
      If this was you, you can ignore this email. If not, please change your password immediately.
    </div>
  `, "Security Alert: New Login"),

  email_change_confirmation: () => layout(`
    <div class="title">Email Updated ✅</div>
    <div class="content">
      Your account email has been successfully updated.
    </div>
  `, "Email Updated"),
};
