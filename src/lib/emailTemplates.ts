export const EMAIL_TEMPLATES = {
  OTP_CODE: (code: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media only screen and (max-width: 600px) {
            .container { padding: 30px !important; border-radius: 20px !important; }
            .content { padding: 40px 20px !important; }
            .code { font-size: 36px !important; letter-spacing: 5px !important; }
          }
        </style>
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div class="container" style="max-width: 700px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; overflow: hidden;">
                <div class="content" style="padding: 60px 60px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="padding-bottom: 40px;">
                        <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 50px; height: 50px;" />
                      </td>
                    </tr>
                    <tr>
                      <td align="left">
                        <h1 style="font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; margin: 0 0 10px 0; font-style: italic; color: #ffffff;">Verify Account</h1>
                        <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 40px 0; font-weight: 600;">Secure access to your premium dashboard</p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style="background-color: #ffffff05; border: 1px solid #ffffff10; border-radius: 24px; padding: 50px 20px; text-align: center; margin-bottom: 40px;">
                          <span class="code" style="font-size: 64px; font-weight: 900; letter-spacing: 15px; color: #00d1ff; display: block;">${code}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left">
                        <p style="color: #ffffff40; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 40px 0;">This code will expire in 5 minutes. Do not share it with anyone.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #ffffff10; padding-top: 40px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="left">
                              <p style="color: #ffffff20; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">© 2024 PrivyConnect. All rights reserved.</p>
                            </td>
                            <td align="right">
                              <p style="color: #ffffff20; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Security Alert</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  ACCOUNT_VERIFICATION: (username: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Account Verified</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Welcome to the elite, ${username}</p>
                <p style="color: #ffffff40; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px;">Your account is now active and ready for premium connections.</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  SUBSCRIPTION_CONFIRMATION: (plan: string, expiry: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Subscription Active</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Plan: ${plan}</p>
                <p style="color: #ffffff40; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px;">Expires on: ${expiry}</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  PAYMENT_SUCCESSFUL: (amount: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Payment Successful</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  WALLET_FUNDED: (amount: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Wallet Funded</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  WITHDRAWAL_REQUEST: (amount: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Withdrawal Requested</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  PASSWORD_RESET: () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; margin: 0; padding: 0; text-align: center;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <div style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px 40px; text-align: left;">
                <img src="https://i.ibb.co/NdWvcPcm/IMG-20260323-WA0000.jpg" alt="PrivyConnect" style="width: 40px; height: 40px; margin-bottom: 30px;" />
                <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Password Reset</h1>
                <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Click the button below to reset your password.</p>
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #00d1ff; color: #050505; padding: 20px 40px; border-radius: 20px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Reset Password</a>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
};
