// Lead intake: emails every contact-form submission AND creates a Salesforce Lead.
// Email requires env RESEND_API_KEY (optional LEAD_TO / LEAD_FROM).
// Salesforce requires env SALESFORCE_USERNAME / SALESFORCE_PASSWORD / SALESFORCE_SECURITY_TOKEN
// (same values as the dinai Vercel project — SOAP login, no connected app needed).
// Each channel degrades independently: a failure in one never blocks the other.

const SF_API_VERSION = 'v59.0';
const ASSISTANT_INQUIRY_URL = 'https://dinai-assistant.vercel.app/api/lead/inquiry';

// Primary channel: the firm's AI assistant. Its public inquiry endpoint stores the lead in the
// assistant's quarantined leads store and emails the lawyer through the assistant's own mail setup.
async function forwardToAssistant({ name, phone, subject, details }) {
  const r = await fetch(ASSISTANT_INQUIRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, subject, details, source: 'pms.co.il' }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.ok) throw new Error('assistant forward failed: ' + r.status + ' ' + JSON.stringify(out));
  return { forwarded: true };
}

const esc = (s) => String(s || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// session cache survives warm invocations of the same lambda
let sfSession = null; // { sessionId, instanceUrl, at }

async function sfLogin() {
  const username = process.env.SALESFORCE_USERNAME;
  const password = process.env.SALESFORCE_PASSWORD;
  const token = process.env.SALESFORCE_SECURITY_TOKEN;
  if (!username || !password || !token) return null;

  if (sfSession && Date.now() - sfSession.at < 30 * 60 * 1000) return sfSession;

  const soapBody = `<?xml version="1.0" encoding="utf-8" ?>
<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
  <env:Body>
    <n1:login xmlns:n1="urn:partner.soap.sforce.com">
      <n1:username>${esc(username)}</n1:username>
      <n1:password>${esc(password + token)}</n1:password>
    </n1:login>
  </env:Body>
</env:Envelope>`;

  const res = await fetch(`https://login.salesforce.com/services/Soap/u/${SF_API_VERSION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', SOAPAction: 'login' },
    body: soapBody,
  });
  const text = await res.text();
  const sessionId = text.match(/<sessionId>([^<]+)<\/sessionId>/)?.[1];
  const serverUrl = text.match(/<serverUrl>([^<]+)<\/serverUrl>/)?.[1];
  if (!sessionId || !serverUrl) {
    const fault = text.match(/<faultstring>([^<]+)<\/faultstring>/)?.[1];
    throw new Error('SF login failed: ' + (fault || res.status));
  }
  sfSession = { sessionId, instanceUrl: serverUrl.replace(/\/services\/Soap\/u\/.*/, ''), at: Date.now() };
  return sfSession;
}

async function createSfLead({ name, phone, subject, details }) {
  const session = await sfLogin();
  if (!session) return { skipped: true };

  const full = String(name).trim();
  const space = full.indexOf(' ');
  const lead = {
    FirstName: space > 0 ? full.slice(0, space) : undefined,
    LastName: space > 0 ? full.slice(space + 1) : full,
    Phone: String(phone).trim(),
    Company: 'פנייה מהאתר pms.co.il',
    LeadSource: 'Web',
    Description: `נושא: ${subject || 'לא צוין'}\n\n${details || ''}`.trim(),
  };

  const doCreate = (sess) => fetch(`${sess.instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Lead`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sess.sessionId}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });

  let r = await doCreate(session);
  if (r.status === 401) { // stale cached session — login again once
    sfSession = null;
    const fresh = await sfLogin();
    if (!fresh) return { skipped: true };
    r = await doCreate(fresh);
  }
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('SF lead create failed: ' + r.status + ' ' + JSON.stringify(out));
  return { id: out.id };
}

async function sendEmail({ name, phone, subject, details }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };

  const to = process.env.LEAD_TO || 'peri@bettylaw.co.il';
  const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const waDigits = String(phone).replace(/\D/g, '').replace(/^0/, '');
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2dccb">
      <div style="background:#071827;color:#f5eddf;padding:18px 22px">
        <strong style="font-size:16px">פנייה חדשה מהאתר pms.co.il</strong>
        <div style="color:#c6a052;font-size:12px;margin-top:4px">${esc(when)}</div>
      </div>
      <table dir="rtl" style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777;width:90px">שם</td><td style="padding:12px 22px;border-bottom:1px solid #eee"><b>${esc(name)}</b></td></tr>
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777">טלפון</td><td style="padding:12px 22px;border-bottom:1px solid #eee"><a href="tel:${esc(phone)}">${esc(phone)}</a> · <a href="https://wa.me/972${esc(waDigits)}">WhatsApp</a></td></tr>
        <tr><td style="padding:12px 22px;border-bottom:1px solid #eee;color:#777">נושא</td><td style="padding:12px 22px;border-bottom:1px solid #eee">${esc(subject || 'לא צוין')}</td></tr>
        <tr><td style="padding:12px 22px;color:#777;vertical-align:top">תיאור</td><td style="padding:12px 22px;white-space:pre-wrap">${esc(details || 'לא צוין')}</td></tr>
      </table>
    </div>`;

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
  if (!r.ok) throw new Error('resend failed: ' + r.status + ' ' + (await r.text()));
  return { sent: true };
}

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

  const payload = { name, phone, subject, details };

  // Assistant first; the direct Resend/Salesforce channels only run as fallback if it fails
  // (and stay inert anyway until their env vars are configured).
  try {
    const assistant = await forwardToAssistant(payload);
    return res.status(200).json({ ok: true, assistant });
  } catch (e) {
    console.error('assistant:', e);
  }

  const [email, sf] = await Promise.allSettled([sendEmail(payload), createSfLead(payload)]);
  if (email.status === 'rejected') console.error('email:', email.reason);
  if (sf.status === 'rejected') console.error('salesforce:', sf.reason);

  return res.status(200).json({
    ok: email.status === 'fulfilled' || sf.status === 'fulfilled',
    assistant: { error: true },
    email: email.status === 'fulfilled' ? email.value : { error: true },
    salesforce: sf.status === 'fulfilled' ? sf.value : { error: true },
  });
}
