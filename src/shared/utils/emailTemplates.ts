/**
 * Generates a clean, mobile-responsive semantic HTML email template for password reset OTP.
 * Fully compatible across all email clients (Gmail, Apple Mail, Outlook, mobile apps).
 */
export const getPasswordResetOtpEmailTemplate = (otp: string, recipientName?: string): string => {
  const displayName = recipientName ? recipientName : 'Valued User';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Password Reset OTP</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
    }
    table {
      border-spacing: 0;
    }
    td {
      padding: 0;
    }
    img {
      border: 0;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f7fa;
      padding-bottom: 40px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 560px;
      border-spacing: 0;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      margin-top: 40px;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 12px 0;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin: 0 0 24px 0;
    }
    .otp-box {
      background-color: #f8fafc;
      border: 2px dashed #6366f1;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4f46e5;
      margin: 0;
    }
    .expiry {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 8px;
      margin-bottom: 0;
    }
    .warning {
      font-size: 13px;
      line-height: 1.5;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0">
      <!-- Header -->
      <tr>
        <td class="header">
          <h1>Security Verification</h1>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td class="content">
          <p class="greeting">Hello ${displayName},</p>
          <p class="message">
            We received a request to reset your password. Use the verification code below to complete your password reset.
          </p>
          
          <div class="otp-box">
            <p class="otp-code">${otp}</p>
            <p class="expiry">This code is valid for <strong>5 minutes</strong></p>
          </div>

          <p class="warning">
            If you did not request a password reset, please ignore this email or reach out to our security team immediately. Do not share this OTP with anyone.
          </p>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td class="footer">
          &copy; ${new Date().getFullYear()} Chat App. All rights reserved.
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
};
