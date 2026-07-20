// Lead intake: emails every contact-form submission to the office inbox.
// Requires env RESEND_API_KEY (Resend). Optional env LEAD_TO overrides the recipient.
// Salesforce lead creation is added behind SF_* env vars once they are configured.

const esc = (s) => String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { name, phone, subject, details, company } = body || {};

  // honeypot: real users never fill "company"
  if (company) return res.status(200).json({ ok: true });
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'missing' });
  if (String(name).length > 200 || String(details || '').length > 4000) {
    return res.status(400).json({ ok: false, error: 'too-long' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(200).json({ ok: false, error: 'not-configured' });

  const to = process.env.LEAD_TO || 'peri@bettylaw.co.il';
  const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2dccb">
      <div style="background:#071827;color:#f5eddf;padding:18px 22px">
        <strong style="font-size:16px">פנייה חדשה מהאתר pms.co.il</strong>
        <div style="color:#c6a052;font-size:12px;margin-top:4px">${esc(when)}</div>
      </div>
      <table dir="rtl" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777;width:90px">שם</td><td style="padding:12px 22px;border-bottom:1px solid #eee"><b>${esc(name)}</b></td></tr>
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777">טלפון</td><td style="padding:12px 22px;border-bottom:1px solid #eee"><a href="tel:${esc(phone)}">${esc(phone)}</a> · <a href="https://wa.me/972${esc(String(phone).replace(/\D/g, '').replace(/^0/, ''))}">WhatsApp</a></td></tr>
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777">נושא</td><td style="padding:12px 22px;border-bottom:1px solid #eee">${esc(subject || 'לא צוין')}</td></tr>
        <tr><td style="padding:12px 22px;color:#777;vertical-align:top">תיאור</td><td style="padding:12px 22px;white-space:pre-wrap">${esc(details || 'לא צוין')}</td></tr>
      </table>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.LEAD_FROM || 'PMS Site <onboarding@resend.dev>',
        to: [to],
        subject: `פנייה חדשה מהאתר: ${name} · ${subject || 'ללא נושא'}`,
        html,
      }),
    });
    if (!r.ok) {
      console.error('resend failed', r.status, await r.text());
      return res.status(200).json({ ok: false, error: 'send-failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('lead error', e);
    return res.status(200).json({ ok: false, error: 'exception' });
  }
}
