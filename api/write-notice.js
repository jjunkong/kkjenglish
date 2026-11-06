// 수업자료 → 학부모 공지 초안 (Claude API)
// 키는 Vercel 환경변수에만 있고 브라우저로 내려가지 않습니다.
//
// Vercel → Settings → Environment Variables
//   ANTHROPIC_API_KEY : console.anthropic.com 에서 발급한 키 (sk-ant-...)
//   ANTHROPIC_MODEL   : (선택) 기본값 claude-haiku-5-5

const FB = 'https://kkjenglish-a831d-default-rtdb.firebaseio.com';

async function adminPw() {
  try {
    const r = await fetch(`${FB}/pw.json`);
    if (!r.ok) return null;
    const v = await r.json();
    return v == null ? null : String(v).trim();
  } catch (e) { return null; }
}

const SYS = `당신은 김기준영어학원 원장을 대신해 학부모에게 보내는 '오늘 수업 공지'를 쓰는 조수입니다.
수업에 쓰인 자료를 읽고, 그날 수업이 어떻게 진행됐는지 학부모가 읽을 문단 하나를 씁니다.

문체 규칙
- 반드시 "안녕하세요 김기준영어학원입니다."로 시작합니다.
- 과거형 존댓말로 씁니다. (~했습니다, ~보았습니다, ~정리했습니다)
- 3~5문장. 수업 흐름 순서대로 씁니다. (시작 → 전개 → 마무리)
- 단원명·문법 용어·지문 주제는 자료에 나온 표현을 그대로 씁니다. 자료에 없는 내용을 지어내지 않습니다.
- 개별 학생 이름, 점수, 등수는 절대 쓰지 않습니다.
- 과장된 홍보 문구나 이모지를 쓰지 않습니다.
- 마지막에 학생들을 격려하는 문장 한 개는 넣어도 되고 빼도 됩니다.

다음은 실제로 나간 공지입니다. 이 톤과 길이를 따르세요.

[예시 1]
안녕하세요 김기준영어학원입니다. 오늘 수업은 지난 시간에 배운 관계사를 복습테스트로 점검하는 것으로 시작했습니다. 이어서 가정법 단원을 새롭게 공부하며 가정법 과거를 비롯한 핵심 개념을 한 장 문법으로 정리했고, 확인테스트로 이해 정도를 확인했습니다. 마무리로 가정법 문법 오류 수정과 영작 문제를 풀어보며, 배운 내용을 문장으로 직접 써보는 시간을 가졌습니다. 늘 성실하게 수업에 임해 주는 학생들이 기특합니다.

[예시 2]
안녕하세요 김기준영어학원입니다. 오늘 수업시간에는 '관계사'가 포함된 문장 그 중에서도 what과 복합관계사(~ever)가 포함된 문장을 분석하고 해석해 보았습니다. 이어서 내집단, 외집단 이라는 개념에 대해 특히 집중했는데 정확하지 않더라도 집단과 동일하려는 흥미로운 성향에 대해서 보았습니다.

과제 문구는 짧은 한 줄입니다. 예: "교재문제풀이(해커스기적, 그래머인사이드3)", "관계사 영작 연습지 POINT 01-02"
자료만으로 과제를 알 수 없으면 homework 는 빈 문자열로 둡니다.

반드시 아래 JSON 하나만 출력합니다. 설명이나 코드펜스를 붙이지 않습니다.
{"notice":"...","homework":"..."}`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
  const MODEL = (process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5').trim();

  if (req.method === 'GET') {
    return res.status(200).json({ configured: !!KEY, model: KEY ? MODEL : '' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 됩니다.' });
  if (!KEY) {
    return res.status(500).json({ error: 'Vercel 환경변수에 ANTHROPIC_API_KEY 가 없습니다.' });
  }

  const given = String(req.headers['x-admin-pw'] || '').trim();
  const real = await adminPw();
  if (!real || given !== real) {
    return res.status(401).json({ error: '원장 비밀번호가 확인되지 않았습니다. 다시 로그인해 주세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const material = String(body.material || '').slice(0, 40000);
  const memo = String(body.memo || '').slice(0, 1000);
  const className = String(body.className || '').slice(0, 60);
  const dateStr = String(body.dateStr || '').slice(0, 40);

  if (!material.trim() && !memo.trim()) {
    return res.status(400).json({ error: '수업자료나 메모 중 하나는 있어야 합니다.' });
  }

  const user =
    `반: ${className || '(미지정)'}\n날짜: ${dateStr || '(미지정)'}\n` +
    (memo ? `\n[원장 메모 — 가장 중요한 단서입니다]\n${memo}\n` : '') +
    (material ? `\n[수업자료]\n${material}\n` : '') +
    `\n위 자료로 오늘 수업 공지를 써 주세요.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYS,
        messages: [{ role: 'user', content: user }],
      }),
    });

    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (out && out.error && out.error.message) || `Claude 호출 실패 (${r.status})`;
      return res.status(r.status).json({ error: msg });
    }

    let txt = '';
    if (Array.isArray(out.content)) {
      txt = out.content.filter(c => c && c.type === 'text').map(c => c.text).join('').trim();
    }
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

    let notice = '', homework = '';
    try {
      const j = JSON.parse(txt);
      notice = String(j.notice || '').trim();
      homework = String(j.homework || '').trim();
    } catch (e) {
      // JSON 이 아니면 본문을 공지로 그대로 씁니다.
      notice = txt;
    }
    if (!notice) return res.status(502).json({ error: '공지를 만들지 못했습니다. 다시 시도해 주세요.' });

    return res.status(200).json({ notice, homework, model: MODEL, usage: out.usage || null });
  } catch (e) {
    return res.status(502).json({ error: 'Claude 호출 실패: ' + e.message });
  }
};
