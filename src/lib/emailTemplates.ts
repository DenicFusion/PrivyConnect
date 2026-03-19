/**
 * Premium Email Templates for PrivyConnect
 * These are designed to be used with a mail service like Resend, SendGrid, or Supabase Edge Functions.
 * They feature a dark, high-end aesthetic matching the platform's UI.
 */

const BRAND_COLOR = '#00D1FF';
const BG_COLOR = '#050505';
const CARD_BG = '#101010';
const TEXT_COLOR = '#FFFFFF';
const MUTED_TEXT = '#888888';

const baseStyles = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BG_COLOR}; color: ${TEXT_COLOR}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: ${CARD_BG}; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; text-align: center; }
  .logo { margin-bottom: 30px; }
  .logo img { width: 50px; height: 50px; }
  h1 { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 16px; font-style: italic; }
  p { font-size: 16px; line-height: 1.6; color: ${MUTED_TEXT}; margin-bottom: 24px; }
  .button { display: inline-block; background-color: ${BRAND_COLOR}; color: #000000; padding: 16px 32px; border-radius: 12px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; transition: transform 0.2s; }
  .footer { margin-top: 40px; font-size: 10px; color: rgba(255, 255, 255, 0.2); text-transform: uppercase; letter-spacing: 0.2em; line-height: 2; }
  .divider { height: 1px; background: rgba(255, 255, 255, 0.05); margin: 30px 0; }
  .highlight { color: ${BRAND_COLOR}; font-weight: bold; }
`;

const wrapTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <img src="https://ais-dev-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/privylogo.png" alt="PrivyConnect">
      </div>
      ${content}
      <div class="divider"></div>
      <div class="footer">
        &copy; 2026 PrivyConnect Infrastructure<br>
        Secure • Verified • Private
      </div>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  confirmation: (link: string) => wrapTemplate(`
    <h1>Verify Your Identity</h1>
    <p>Welcome to the elite network. To complete your initialization and access the portal, please verify your email address.</p>
    <a href="${link}" class="button">Verify Connection</a>
    <p style="margin-top: 24px; font-size: 12px;">If you did not request this, please ignore this email.</p>
  `),

  welcome: (username: string) => wrapTemplate(`
    <h1>Initialization Complete</h1>
    <p>Welcome, <span class="highlight">${username}</span>. Your node is now active on the PrivyConnect infrastructure.</p>
    <p>You can now discover verified profiles, engage in secure communications, and manage your digital assets.</p>
    <a href="https://ais-dev-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/discovery" class="button">Access Portal</a>
  `),

  subscriptionSuccess: (plan: string) => wrapTemplate(`
    <h1>Tier Upgrade Confirmed</h1>
    <p>Your account has been successfully upgraded to <span class="highlight">${plan}</span> status.</p>
    <p>You now have full access to premium features, including advanced discovery filters and unlimited secure messaging.</p>
    <a href="https://ais-dev-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/wallet" class="button">View Subscription</a>
  `),

  accountFunded: (amount: string) => wrapTemplate(`
    <h1>Assets Deposited</h1>
    <p>A deposit of <span class="highlight">${amount}</span> has been credited to your secure wallet.</p>
    <p>Your updated balance is now available for platform transactions and premium engagements.</p>
    <a href="https://ais-dev-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/wallet" class="button">Manage Wallet</a>
  `),

  withdrawal: (amount: string) => wrapTemplate(`
    <h1>Withdrawal Initialized</h1>
    <p>A withdrawal request for <span class="highlight">${amount}</span> has been processed from your wallet.</p>
    <p>The assets are being transferred to your designated external node. This process typically takes 5-10 minutes.</p>
    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin: 20px 0; font-family: monospace; font-size: 12px; color: ${BRAND_COLOR};">
      TXID: ${Math.random().toString(36).substring(2, 15).toUpperCase()}
    </div>
  `),

  passwordReset: (link: string) => wrapTemplate(`
    <h1>Security Override</h1>
    <p>A password reset has been requested for your PrivyConnect account. Click the button below to establish new credentials.</p>
    <a href="${link}" class="button">Reset Access Key</a>
    <p style="margin-top: 24px; font-size: 12px; color: #ff4444;">If you did not request this, please secure your account immediately.</p>
  `),

  securityAlert: (location: string, device: string) => wrapTemplate(`
    <h1 style="color: #ff4444;">Security Alert</h1>
    <p>A new login was detected on your account from an unrecognized node.</p>
    <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; margin: 20px 0;">
      <p style="margin: 5px 0; font-size: 13px;"><span style="color: white;">Location:</span> ${location}</p>
      <p style="margin: 5px 0; font-size: 13px;"><span style="color: white;">Device:</span> ${device}</p>
      <p style="margin: 5px 0; font-size: 13px;"><span style="color: white;">Time:</span> ${new Date().toUTCString()}</p>
    </div>
    <p>If this was not you, please reset your password immediately to prevent unauthorized access.</p>
    <a href="https://ais-dev-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/wallet" class="button">Secure Account</a>
  `)
};
