// AI analysis of an uploaded driving-points printout (תדפיס ניקוד).
//
// Reads the official printout with Claude (vision/PDF), extracts the violations,
// dates and valid points, and returns a structured, GENERAL-INFORMATION reading
// framed by the Israeli points system — never legal advice.
//
// Requires env ANTHROPIC_API_KEY. Without it the endpoint degrades gracefully to
// { ok:true, mode:"unavailable" } — it NEVER fabricates an analysis, so it is safe
// to deploy before the key is configured (the client then routes the user to the
// office instead of showing a fake result).
//
// Optional env:
//   ANALYZE_MODEL  – model id (default "claude-opus-5"; Opus is used for documents)
//
// Privacy: the uploaded file is held in memory for the single request, sent to the
// model, and never logged or persisted here.

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANALYZE_MODEL || 'claude-opus-5';
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 3_000_000; // decoded file cap; base64 (~+33%) stays under Vercel's ~4.5MB request-body limit

const SYSTEM = `אתה מנתח תדפיס ניקוד רשמי של רשות הרישוי (משרד התחבורה) בישראל, עבור כלי מקוון של משרד עורך דין תעבורה.
המשימה: לקרוא את המסמך, לזהות את העבירות שנרשם להן ניקוד, את מספר הנקודות ואת המועדים, ולהעריך את מצב הניקוד לפי שיטת הניקוד בתקנות התעבורה.

כללי שיטת הניקוד (לצורך ההערכה):
- נקודות תקפות = נקודות שטרם התיישנו. ככלל נקודה מתיישנת שנתיים ממועד ביצוע העבירה; אם נצברו 22 נקודות ומעלה, תקופת ההתיישנות מתארכת ל־4 שנים.
- מדרגות אמצעי התיקון לפי סך הנקודות התקפות: 12–22 קורס בסיסי; 24–34 קורס מתקדם; 36–71 פסילה ל־3 חודשים + תאוריה; 72+ (או הגעה שנייה ל־36 בתוך 6 שנים) פסילה ל־9 חודשים + מרב״ד + תאוריה + טסט.

הנחיות קריטיות:
- דווח אך ורק על מה שמופיע במסמך. אל תמציא עבירות, מועדים או נקודות. אם פרט אינו ברור, סמן זאת בהערכה שמרנית.
- אם המסמך אינו קריא, אינו תדפיס ניקוד, או שלא ניתן לחלץ ממנו נתונים — החזר readable=false ושדות ריקים.
- כל הטקסט בעברית. ה־insight הוא תובנה כללית מותאמת לנתוני התדפיס, לא ייעוץ משפטי.
- זו הערכה כללית בלבד. אל תיתן ייעוץ משפטי, חוות דעת או ודאות לגבי תוצאה; היכן שרלוונטי, המלץ לאמת מול תדפיס עדכני ולפנות לעורך דין לבדיקה פרטנית.
- tierTone: "calm" עד 10 נק'; "warning" בקורסים (12–34); "danger" במדרגות הפסילה (36+).`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readable: { type: 'boolean', description: 'האם ניתן היה לקרוא ולחלץ נתונים מהתדפיס' },
    points: { type: 'integer', description: 'סך הנקודות התקפות שזוהו' },
    tier: { type: 'string', description: 'שם המדרגה הנוכחית' },
    tierTone: { type: 'string', enum: ['calm', 'warning', 'danger'] },
    headline: { type: 'string', description: 'כותרת קצרה למצב' },
    summary: { type: 'string', description: 'משפט או שניים המסכמים את המצב' },
    violations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          points: { type: 'integer' },
          recorded: { type: 'string', description: 'מועד רישום/עבירה כפי שמופיע (למשל 03/2025)' },
          expiry: { type: 'string', description: 'מועד התיישנות משוער או הערה' },
          status: { type: 'string', enum: ['active', 'expiring', 'expired'] }
        },
        required: ['name', 'points', 'recorded', 'expiry', 'status']
      }
    },
    insight: { type: 'string', description: 'תובנה מותאמת אישית לפי נתוני התדפיס (עברית)' },
    dos: { type: 'array', items: { type: 'string' } },
    donts: { type: 'array', items: { type: 'string' } },
    nextThreshold: { type: ['integer', 'null'], description: 'מדרגת הנקודות הבאה, או null אם במדרגה העליונה' },
    gap: { type: ['integer', 'null'], description: 'כמה נקודות עד המדרגה הבאה, או null' }
  },
  required: ['readable', 'points', 'tier', 'tierTone', 'headline', 'summary', 'violations', 'insight', 'dos', 'donts', 'nextThreshold', 'gap']
};

async function analyzeWithClaude({ fileBase64, mediaType }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { mode: 'unavailable' };

  const fileBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } };

  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: 'נתח את תדפיס הניקוד המצורף והחזר את הניתוח המובנה בלבד, לפי הסכימה.' },
        ],
      }],
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error('anthropic ' + r.status + ' ' + detail.slice(0, 300));
  }
  const out = await r.json();
  if (out.stop_reason === 'refusal') return { mode: 'error' };

  const textBlock = (out.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('no text block in response');
  let analysis;
  try { analysis = JSON.parse(textBlock.text); }
  catch { throw new Error('model did not return valid JSON'); }

  return { mode: 'ai', analysis };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { fileBase64, mediaType, consent, company } = body || {};

  // honeypot: real users never fill "company"
  if (company) return res.status(200).json({ ok: true, mode: 'unavailable' });

  // consent is required before any document is processed
  if (consent !== true) return res.status(400).json({ ok: false, error: 'consent' });
  if (!fileBase64 || typeof fileBase64 !== 'string') return res.status(400).json({ ok: false, error: 'missing' });
  if (!ALLOWED.includes(mediaType)) return res.status(400).json({ ok: false, error: 'type' });
  // rough decoded-size check without allocating the buffer
  if (Math.floor(fileBase64.length * 0.75) > MAX_BYTES) return res.status(400).json({ ok: false, error: 'too-large' });

  try {
    const result = await analyzeWithClaude({ fileBase64, mediaType });
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('analyze-points failed:', e.message); // never logs the document itself
    // temporary: surface the error detail only when ?debug=1 is passed (removed after diagnosis)
    if (req.query && req.query.debug === '1') {
      return res.status(200).json({ ok: true, mode: 'error', detail: String(e.message).slice(0, 500) });
    }
    return res.status(200).json({ ok: true, mode: 'error' });
  }
}
