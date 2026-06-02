import nodemailer from "nodemailer";

/**
 * Shared Nodemailer transport (Gmail SMTP).
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in the environment.
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "Email is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD"
    );
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Send the email-verification link to a freshly registered user.
 * @param {string} to        recipient email
 * @param {string} token     raw verification token
 */
export async function sendVerificationEmail(to, token) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(to)}`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <div style="width:40px;height:40px;background:#2E8B57;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px">🌱</div>
      <strong style="font-size:18px;color:#2E8B57">SmartAgri</strong>
    </div>
    <h2 style="font-size:20px;margin:0 0 12px">Confirm your email</h2>
    <p style="font-size:14px;line-height:1.6;color:#444">
      Thanks for registering with SmartAgri. Click the button below to verify
      your email address. After verification, an administrator will review and
      approve your account before you can sign in.
    </p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}"
         style="background:#2E8B57;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:600;font-size:14px;display:inline-block">
        Verify Email
      </a>
    </p>
    <p style="font-size:12px;color:#888;line-height:1.6">
      If the button doesn't work, paste this link into your browser:<br/>
      <a href="${verifyUrl}" style="color:#2E8B57;word-break:break-all">${verifyUrl}</a>
    </p>
    <p style="font-size:12px;color:#aaa;margin-top:20px">
      This link expires in 24 hours. If you didn't create an account, you can ignore this email.
    </p>
  </div>`;

  await getTransporter().sendMail({
    from: `"SmartAgri" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your SmartAgri account",
    html,
  });
}

/**
 * Notify a user that an admin has approved their account.
 */
export async function sendApprovalEmail(to, firstName) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  const loginUrl = `${base}/login`;
  const name = firstName ? ` ${firstName}` : "";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <div style="width:40px;height:40px;background:#2E8B57;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px">🌱</div>
      <strong style="font-size:18px;color:#2E8B57">SmartAgri</strong>
    </div>
    <h2 style="font-size:20px;margin:0 0 12px">Your account is approved 🎉</h2>
    <p style="font-size:14px;line-height:1.6;color:#444">
      Hello${name}, an administrator has approved your SmartAgri account.
      You can now sign in and start monitoring.
    </p>
    <p style="margin:24px 0">
      <a href="${loginUrl}"
         style="background:#2E8B57;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:600;font-size:14px;display:inline-block">
        Sign In
      </a>
    </p>
  </div>`;

  await getTransporter().sendMail({
    from: `"SmartAgri" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your SmartAgri account is approved",
    html,
  });
}
