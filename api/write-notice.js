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

[뼈대]
반드시 "안녕하세요 김기준영어학원입니다."로 시작하고, 이어서 3~4문장을 씁니다. 전체 200자 안팎.
문장은 수업 흐름 순서대로 이어집니다.
 1) "오늘 수업은 ~로 시작했습니다." 또는 "오늘 수업은 ~를 중심으로 진행했습니다."
 2) "이어서 ~" — 그날 새로 다룬 내용
 3) "마무리로 ~" — 영작·오류 수정 등 정리 활동
 4) (선택) 닫는 문장 — 평소에는 가끔만 넣고, 시험 기간이면 앞으로의 계획으로 닫습니다.

[학원이 쓰는 표현 — 해당하면 그대로 쓰세요]
한 장 문법 / 복습테스트 / 확인테스트 / 하빵(빈칸)자료 / 구문분석 / 영작 / 단어시험

[실제로 나간 공지 — 이 톤과 길이를 따르세요]

(평소 문법 진도)
안녕하세요 김기준영어학원입니다. 오늘 수업은 지난 시간에 배운 관계사를 복습테스트로 점검하는 것으로 시작했습니다. 이어서 가정법 단원을 새롭게 공부하며 가정법 과거를 비롯한 핵심 개념을 한 장 문법으로 정리했고, 확인테스트로 이해 정도를 확인했습니다. 마무리로 가정법 문법 오류 수정과 영작 문제를 풀어보며, 배운 내용을 문장으로 직접 써보는 시간을 가졌습니다. 늘 성실하게 수업에 임해 주는 학생들이 기특합니다.

(평소 문법 진도 — 닫는 문장 없음)
안녕하세요 김기준영어학원입니다. 오늘 수업은 지난 시간에 배운 명사와 관사를 복습테스트로 점검하는 것으로 시작했습니다. 이어서 대명사 단원을 새롭게 공부하며 지시대명사와 부정대명사 one 등 핵심 개념을 한 장 문법으로 정리했고, 확인테스트로 이해 정도를 확인했습니다. 마무리로 대명사를 활용한 영작 연습을 하며 배운 내용을 문장으로 직접 써보는 시간을 가졌습니다.

(내신 시험 대비)
안녕하세요 김기준영어학원입니다. 오늘 수업은 기말고사 대비 내신 준비로 교과서와 부교재 본문 학습을 중심으로 진행했습니다. 하빵(빈칸)자료로 본문 핵심 내용과 어법을 꼼꼼히 확인하고, 문장 구조 분석과 영작, 단어시험으로 범위를 하나씩 다져가고 있습니다. 앞으로도 기출 스타일 문제풀이까지 단계적으로 준비해 기말고사까지 차근차근 대비해 나가겠습니다.

[지켜야 할 것]
- 과거형 존댓말. (~했습니다, ~보았습니다, ~정리했습니다)
- 단원명·문법 용어·지문 주제는 자료에 나온 표현을 그대로 씁니다. 자료에 없는 내용을 지어내지 않습니다.
- 파일 이름이나 자료 제목을 따옴표로 인용하지 않습니다. 무엇을 공부했는지로 풀어 씁니다.
- 개별 학생 이름, 점수, 등수는 절대 쓰지 않습니다.
- 과장된 홍보 문구나 이모지를 쓰지 않습니다.
- "학생들은 ~" 으로 시작하는 문장은 되도록 쓰지 않습니다.

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
  const tweak = String(body.tweak || '').slice(0, 500);
  const className = String(body.className || '').slice(0, 60);
  const dateStr = String(body.dateStr || '').slice(0, 40);

  if (!material.trim() && !memo.trim()) {
    return res.status(400).json({ error: '수업자료나 메모 중 하나는 있어야 합니다.' });
  }

  const user =
    `반: ${className || '(미지정)'}\n날짜: ${dateStr || '(미지정)'}\n` +
    (memo ? `\n[원장 메모 — 가장 중요한 단서입니다]\n${memo}\n` : '') +
    (material ? `\n[수업자료]\n${material}\n` : '') +
    (tweak ? `\n[고쳐 달라는 요청 — 이걸 가장 우선으로 반영하세요]\n${tweak}\n` : '') +
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
