export const EMAIL_TEMPLATES = {
  OTP_CODE: (code: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <img src="https://ais-pre-v6xjyrn6vf53rkaaw6virw-74458108997.europe-west2.run.app/privylogo.png" alt="PrivyConnect" style="width: 80px; height: 80px; margin-bottom: 40px;" />
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Verify Your Account</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">A 6-digit code has been sent to your email</p>
          <div style="background-color: #ffffff05; border: 1px solid #ffffff10; border-radius: 20px; padding: 30px; margin-bottom: 40px;">
            <span style="font-size: 48px; font-weight: 900; letter-spacing: 10px; color: #00d1ff;">${code}</span>
          </div>
          <p style="color: #ffffff40; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px;">Code expires in 5 minutes</p>
          <div style="border-top: 1px solid #ffffff10; padding-top: 40px;">
            <p style="color: #ffffff20; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">If you didn’t request this, ignore this email</p>
          </div>
        </div>
      </body>
    </html>
  `,
  ACCOUNT_VERIFICATION: (username: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Account Verified</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Welcome to the elite, ${username}</p>
          <p style="color: #ffffff40; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px;">Your account is now active and ready for premium connections.</p>
        </div>
      </body>
    </html>
  `,
  SUBSCRIPTION_CONFIRMATION: (plan: string, expiry: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Subscription Active</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Plan: ${plan}</p>
          <p style="color: #ffffff40; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px;">Expires on: ${expiry}</p>
        </div>
      </body>
    </html>
  `,
  PAYMENT_SUCCESSFUL: (amount: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Payment Successful</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
        </div>
      </body>
    </html>
  `,
  WALLET_FUNDED: (amount: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Wallet Funded</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
        </div>
      </body>
    </html>
  `,
  WITHDRAWAL_REQUEST: (amount: string) => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Withdrawal Requested</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Amount: ₦${amount}</p>
        </div>
      </body>
    </html>
  `,
  PASSWORD_RESET: () => `
    <html>
      <body style="background-color: #050505; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #ffffff10; border-radius: 40px; padding: 60px;">
          <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px; font-style: italic;">Password Reset</h1>
          <p style="color: #ffffff60; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px;">Click the button below to reset your password.</p>
          <a href="#" style="display: inline-block; background-color: #00d1ff; color: #050505; padding: 20px 40px; border-radius: 20px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Reset Password</a>
        </div>
      </body>
    </html>
  `
};
