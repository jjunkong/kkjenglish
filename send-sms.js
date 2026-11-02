// 솔라피 문자 발송 — 서버에서 처리합니다.
// API Key / Secret 은 Vercel 환경변수에만 있고 브라우저로 내려가지 않습니다.
//
// Vercel → Settings → Environment Variables 에 세 개를 등록하세요.
//   SOLAPI_KEY     : NCS... 로 시작하는 API Key
//   SOLAPI_SECRET  : API Secret
//   SOLAPI_SENDER  : 사전등록된 발신번호 (숫자만, 예 01012345678)

const crypto = require('crypto');

const FB = 'https://kkjenglish-a831d-default-rtdb.firebaseio.com';

async function adminPw() {
  try {
    const r = await fetch(`${FB}/pw.json`);
    if (!r.ok) return null;
    const v = await r.json();
    return v == null ? null : String(v).trim();
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const KEY = (process.env.SOLAPI_KEY || '').trim();
  const SECRET = (process.env.SOLAPI_SECRET || '').trim();
  const SENDER = (process.env.SOLAPI_SENDER || '').replace(/[^\d]/g, '');

  // 설정 상태 조회 (키 값은 돌려주지 않음)
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: !!(KEY && SECRET && SENDER),
      sender: SENDER ? SENDER.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2') : '',
      missing: [!KEY && 'SOLAPI_KEY', !SECRET && 'SOLAPI_SECRET', !SENDER && 'SOLAPI_SENDER'].filter(Boolean),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 됩니다.' });

  if (!KEY || !SECRET || !SENDER) {
    return res.status(500).json({ error: 'Vercel 환경변수에 솔라피 설정이 없습니다.' });
  }

  // 원장 비밀번호를 아는 요청만 통과
  const given = String(req.headers['x-admin-pw'] || '').trim();
  const real = await adminPw();
  if (!real || given !== real) {
    return res.status(401).json({ error: '원장 비밀번호가 확인되지 않았습니다. 다시 로그인해 주세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const list = (body && Array.isArray(body.messages)) ? body.messages : [];
  if (!list.length) return res.status(400).json({ error: '보낼 내용이 없습니다.' });
  if (list.length > 200) return res.status(400).json({ error: '한 번에 200건까지만 보낼 수 있습니다.' });

  const messages = list.map(m => ({
    to: String((m && m.to) || '').replace(/[^\d]/g, ''),
    from: SENDER,
    text: String((m && m.text) || ''),
    type: 'LMS',
    subject: String((m && m.subject) || 'DAILY REPORT').slice(0, 40),
  })).filter(m => m.to && m.text);

  if (!messages.length) return res.status(400).json({ error: '보낼 수 있는 번호가 없습니다.' });

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHmac('sha256', SECRET).update(date + salt).digest('hex');

  try {
    const r = await fetch('https://api.solapi.com/messages/v4/send-many', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${KEY}, date=${date}, salt=${salt}, signature=${sig}`,
      },
      body: JSON.stringify({ messages }),
    });
    const out = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json(out);
  } catch (e) {
    return res.status(502).json({ error: '솔라피 호출 실패: ' + e.message });
  }
};
