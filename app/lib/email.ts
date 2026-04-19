const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const FROM_EMAIL = 'support@signmypdf.io';
const FROM_NAME = 'SignMyPDF';

export async function sendProActivationEmail(email: string, name?: string, plan?: string) {
  const greeting = name ? `Hi ${name}` : 'Hi there';
  const planLabel = plan === 'annual' ? 'Annual' : 'Monthly';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:36px 40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">✍️</div>
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.3px;">SignMyPDF</h1>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <p style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">${greeting}! 🎉</p>
      <p style="font-size:15px;color:#475569;margin:0 0 28px;line-height:1.6;">
        Your <strong>${planLabel} Pro plan</strong> is now active. Here's what you've unlocked:
      </p>
      <!-- Features -->
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <span style="font-size:20px;">📄</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b;">Unlimited PDFs</div>
            <div style="font-size:13px;color:#64748b;">Sign as many documents as you need</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <span style="font-size:20px;">🚫</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b;">No watermark</div>
            <div style="font-size:13px;color:#64748b;">Clean, professional documents every time</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:20px;">✏️</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b;">Save & fill forms</div>
            <div style="font-size:13px;color:#64748b;">Reuse signatures, access download history</div>
          </div>
        </div>
      </div>
      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="https://signmypdf.io" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.1px;">
          Start Signing Now →
        </a>
      </div>
      <!-- Manage -->
      <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;line-height:1.6;">
        To manage your subscription, visit your <a href="https://signmypdf.io/dashboard" style="color:#2563eb;text-decoration:none;">dashboard</a>.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="font-size:12px;color:#cbd5e1;margin:0;">
        SignMyPDF Team · <a href="https://signmypdf.io" style="color:#cbd5e1;">signmypdf.io</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email }],
      subject: 'Your SignMyPDF Pro is now active 🎉',
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Brevo error:', err);
    throw new Error(`Brevo send failed: ${res.status}`);
  }
  return res.json();
}

export async function sendMagicLinkEmail(email: string, magicUrl: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:36px 40px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">✍️</div>
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">SignMyPDF</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Your dashboard link</p>
      <p style="font-size:15px;color:#475569;margin:0 0 28px;line-height:1.6;">
        Click the button below to access your SignMyPDF dashboard. The link expires in 1 hour.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${magicUrl}" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">
          Open My Dashboard →
        </a>
      </div>
      <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="font-size:12px;color:#cbd5e1;margin:0;">SignMyPDF Team · signmypdf.io</p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email }],
      subject: 'Your SignMyPDF dashboard link',
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Brevo error:', err);
    throw new Error(`Brevo send failed: ${res.status}`);
  }
  return res.json();
}
