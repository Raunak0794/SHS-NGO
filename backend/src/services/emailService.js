const nodemailer = require("nodemailer");

let transporter;

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error("SMTP email delivery is not configured");
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const safeResetUrl = escapeHtml(resetUrl);
  const resetMinutes = Math.min(
    Math.max(Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30, 10),
    120
  );

  return getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your SHS AI password",
    text: [
      "We received a request to reset your SHS AI password.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      `This link expires in ${resetMinutes} minutes and can only be used once.`,
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
        <h2>Reset your SHS AI password</h2>
        <p>We received a request to reset your password.</p>
        <p style="margin:24px 0">
          <a href="${safeResetUrl}" style="background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">
            Reset password
          </a>
        </p>
        <p>This link expires in ${resetMinutes} minutes and can only be used once.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
};
