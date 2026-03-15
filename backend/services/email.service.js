// backend/services/email.service.js
const nodemailer = require('nodemailer');

/* ── Create transporter ───────────────────────────────────────────────────── */
const createTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  console.warn('[Email] No SMTP config found — using Ethereal test account.');
  return null;
};
const getFrom = () =>
  `"CollabSpace" <${process.env.EMAIL_USER || 'noreply@collabspace.io'}>`;

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:4200';

/* ── Shared send helper ───────────────────────────────────────────────────── */
const sendMail = async (options) => {
  try {
    let transporter = createTransporter();

    // If no config, generate an Ethereal test account on the fly
    if (!transporter) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransporter({
        host:   'smtp.ethereal.email',
        port:    587,
        secure:  false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    const info = await transporter.sendMail(options);
    console.log(`[Email] Sent to ${options.to} — Message ID: ${info.messageId}`);

    // Log preview URL when using Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[Email] Preview: ${previewUrl}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    return { success: false, error: error.message };
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Base HTML wrapper ───────────────────────────────────────────────────── */
const emailBase = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#07080F; color:#F0EFFF; }
    .wrapper { max-width:560px; margin:40px auto; padding:0 16px; }
    .card { background:#0F1020; border:1px solid rgba(255,255,255,.08); border-radius:20px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#1A1030,#0A1218); padding:32px 40px; text-align:center; border-bottom:1px solid rgba(255,255,255,.06); }
    .logo-mark { width:52px; height:52px; background:linear-gradient(135deg,#8B5CF6,#6D28D9); border-radius:14px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px; }
    .logo-mark svg { width:26px; height:26px; }
    .brand { font-size:1.3rem; font-weight:800; color:#F0EFFF; letter-spacing:-.02em; }
    .brand span { color:#A78BFA; }
    .body { padding:36px 40px; }
    .title { font-size:1.1rem; font-weight:700; color:#F0EFFF; margin-bottom:10px; }
    .text { font-size:.9rem; color:#9896BC; line-height:1.65; margin-bottom:20px; }
    .btn { display:inline-block; padding:13px 28px; background:linear-gradient(135deg,#8B5CF6,#6D28D9); color:#fff; text-decoration:none; border-radius:12px; font-weight:700; font-size:.9rem; margin:8px 0 20px; }
    .divider { height:1px; background:rgba(255,255,255,.06); margin:24px 0; }
    .small { font-size:.78rem; color:#4A4870; line-height:1.6; }
    .small a { color:#8B5CF6; text-decoration:none; }
    .footer { padding:20px 40px; text-align:center; }
    .footer p { font-size:.75rem; color:#4A4870; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-mark">
          <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div class="brand">Collab<span>Space</span></div>
      </div>
      <div class="body">${content}</div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CollabSpace. All rights reserved.</p>
        <p style="margin-top:6px">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

/* ════════════════════════════════════════════════════════════════════════════
   1. VERIFY EMAIL
   ════════════════════════════════════════════════════════════════════════════ */
exports.sendVerificationEmail = async (user, token) => {
  const url = `${clientUrl()}/auth/verify-email/${token}`;

  const html = emailBase('Verify Your Email — CollabSpace', `
    <div class="title">Welcome to CollabSpace, ${user.firstName}! 🎉</div>
    <p class="text">
      Thanks for signing up. Please verify your email address to activate your account
      and start connecting with ${user.role === 'brand' ? 'creators' : 'brands'}.
    </p>
    <div style="text-align:center">
      <a href="${url}" class="btn">Verify Email Address</a>
    </div>
    <div class="divider"></div>
    <p class="small">
      This link expires in 24 hours.<br/>
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${url}">${url}</a>
    </p>
  `);

  return sendMail({
    from:    getFrom(),
    to:      user.email,
    subject: 'Verify your CollabSpace account',
    html,
    text: `Welcome to CollabSpace! Verify your email: ${url}`,
  });
};

/* ════════════════════════════════════════════════════════════════════════════
   2. PASSWORD RESET
   ════════════════════════════════════════════════════════════════════════════ */
exports.sendPasswordResetEmail = async (user, token) => {
  const url     = `${clientUrl()}/auth/reset-password/${token}`;
  const expires = process.env.RESET_TOKEN_EXPIRY_MINUTES || 60;

  const html = emailBase('Reset Your Password — CollabSpace', `
    <div class="title">Password Reset Request</div>
    <p class="text">
      Hi ${user.firstName}, we received a request to reset your password.
      Click the button below to choose a new one.
    </p>
    <div style="text-align:center">
      <a href="${url}" class="btn">Reset My Password</a>
    </div>
    <div class="divider"></div>
    <p class="small">
      This link expires in ${expires} minutes. If you didn't request a password reset,
      you can safely ignore this email — your password won't be changed.<br/><br/>
      Or copy this URL: <a href="${url}">${url}</a>
    </p>
  `);

  return sendMail({
    from:    getFrom(),
    to:      user.email,
    subject: 'Reset your CollabSpace password',
    html,
    text: `Reset your password: ${url} (expires in ${expires} minutes)`,
  });
};

/* ════════════════════════════════════════════════════════════════════════════
   3. WELCOME EMAIL (after email verified)
   ════════════════════════════════════════════════════════════════════════════ */
exports.sendWelcomeEmail = async (user) => {
  const dashboardUrl = `${clientUrl()}/dashboard/${user.role}`;
  const roleDesc     = user.role === 'brand'
    ? 'creating campaigns, finding creators and managing collaborations'
    : 'discovering brand deals, managing content and growing your audience';

  const html = emailBase('Welcome to CollabSpace! 🚀', `
    <div class="title">Your account is verified!</div>
    <p class="text">
      Congrats, ${user.firstName}! Your email is verified and your CollabSpace account is ready.
      You can now start ${roleDesc}.
    </p>
    <div style="text-align:center">
      <a href="${dashboardUrl}" class="btn">Go to My Dashboard</a>
    </div>
    <div class="divider"></div>
    <p class="small">
      Questions? Reply to this email or visit our help center.
    </p>
  `);

  return sendMail({
    from:    getFrom(),
    to:      user.email,
    subject: 'Your CollabSpace account is ready! 🚀',
    html,
    text: `Your CollabSpace account is verified. Go to your dashboard: ${dashboardUrl}`,
  });
};

/* ════════════════════════════════════════════════════════════════════════════
   4. COLLABORATION INVITE (brand → creator)
   ════════════════════════════════════════════════════════════════════════════ */
exports.sendCollaborationInvite = async (creator, brand, collaboration) => {
  const url = `${clientUrl()}/dashboard/creator`;

  const html = emailBase('New Collaboration Invite — CollabSpace', `
    <div class="title">You have a new collaboration invite! 🤝</div>
    <p class="text">
      Hi ${creator.firstName}, <strong>${brand.companyName || brand.firstName}</strong>
      has sent you a collaboration invite on CollabSpace.
    </p>
    <table style="width:100%;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.15);border-radius:12px;padding:18px;margin-bottom:20px;border-collapse:separate">
      <tr><td style="color:#9896BC;font-size:.82rem;padding:4px 0">Amount</td><td style="color:#F0EFFF;font-weight:700;text-align:right">$${collaboration.amount?.toLocaleString() || '—'}</td></tr>
      <tr><td style="color:#9896BC;font-size:.82rem;padding:4px 0">Deliverables</td><td style="color:#F0EFFF;font-size:.82rem;text-align:right">${collaboration.deliverables || '—'}</td></tr>
    </table>
    <div style="text-align:center">
      <a href="${url}" class="btn">View Invite on CollabSpace</a>
    </div>
    <div class="divider"></div>
    <p class="small">Log in to accept, reject or negotiate the terms.</p>
  `);

  return sendMail({
    from:    getFrom(),
    to:      creator.email,
    subject: `New collaboration invite from ${brand.companyName || brand.firstName}`,
    html,
    text: `${brand.companyName || brand.firstName} sent you a collaboration invite. View it at ${url}`,
  });
};