/* ===== AI (Google Gemini API) =====
 * แนะนำ: gemini-2.5-flash — เร็ว คุ้มค่า รองรับภาษาไทยดีมาก อ่านไฟล์ PDF/รูปภาพได้
 * งานแปลงไฟล์ข้อสอบจำนวนมาก/ซับซ้อน เลือก gemini-2.5-pro ได้ในหน้าตั้งค่า
 */
const AI = {
  enabled: () => !!(App.settings && App.settings.geminiKey),

  async call(parts, { json = false, temperature = 0.4, maxTokens = 8192 } = {}) {
    const s = App.settings;
    if (!s.geminiKey) throw new Error('ยังไม่ได้ตั้งค่า Gemini API Key (ผู้ดูแลระบบ > ตั้งค่า)');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(s.geminiKey)}`;
    const body = {
      contents: [{ role: 'user', parts: typeof parts === 'string' ? [{ text: parts }] : parts }],
      generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) }
    };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error?.message || `AI error ${r.status}`);
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!text) throw new Error('AI ไม่ได้ส่งคำตอบกลับมา (อาจถูกจำกัดความยาวหรือเนื้อหา)');
    return text;
  },

  parseJSON(text) {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const a = t.indexOf('['), b = t.lastIndexOf(']');
      if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
      throw e;
    }
  },

  async test() {
    return AI.call('ตอบสั้น ๆ ว่า "เชื่อมต่อสำเร็จ" เป็นภาษาไทย', { maxTokens: 50, temperature: 0 });
  },

  /** สร้างเกร็ดความรู้สำหรับข้อที่ยังไม่มีคำอธิบาย */
  async explain(q) {
    const sub = subjectById(q.subject);
    const choices = q.choices.map((c, i) => `${TH_LABELS[i]}. ${c}`).join('\n');
    const prompt = `คุณคือติวเตอร์ผู้เชี่ยวชาญการสอบใบประกอบวิชาชีพครู (คุรุสภา) หมวด "${sub?.title}"
โจทย์: ${q.question}
${choices}
คำตอบที่ถูกต้อง: ${TH_LABELS[q.answer]}. ${q.choices[q.answer]}

เขียน "เกร็ดความรู้" ภาษาไทย 2–4 ประโยค อธิบายว่าทำไมคำตอบนี้ถูก ให้หลักการ/ทฤษฎี/ชื่อนักคิดที่เกี่ยวข้อง และบอกสั้น ๆ ว่าตัวเลือกอื่นผิดเพราะอะไร ไม่ต้องขึ้นต้นด้วยคำทักทาย ไม่ใช้หัวข้อ`;
    return (await AI.call(prompt, { temperature: 0.3, maxTokens: 1024 })).trim();
  },

  /** วิเคราะห์ผลสอบ: ผ่านเกณฑ์หรือยัง + จุดแข็ง/จุดอ่อน + แผนอ่าน */
  async analyze(attempt, qmap) {
    const pass = App.settings.passPercent;
    const subj = Object.entries(attempt.bySubject || {}).map(([sid, v]) =>
      `- เรื่อง ${sid} ${subjectById(sid)?.title}: ถูก ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)`).join('\n');
    const wrong = attempt.details.filter((d) => !d.correct).slice(0, 25).map((d, i) => {
      const q = qmap[d.qid]; if (!q) return '';
      return `${i + 1}. [${q.subject}${q.topic ? ' / ' + q.topic : ''}] ${q.question.slice(0, 140)}`;
    }).filter(Boolean).join('\n');
    const prompt = `คุณคือผู้เชี่ยวชาญด้านการเตรียมสอบใบอนุญาตประกอบวิชาชีพครู ตาม Test Blueprint ของคุรุสภา
วิเคราะห์ผลสอบของผู้เรียนต่อไปนี้ เป็นภาษาไทย กระชับ อบอุ่น ให้กำลังใจ และนำไปใช้ได้จริง

แบบทดสอบ: ${attempt.title}
คะแนน: ${attempt.correct}/${attempt.total} = ${attempt.percent}% (เกณฑ์ผ่าน ${pass}%) → ${attempt.passed ? 'ผ่านเกณฑ์' : 'ยังไม่ผ่านเกณฑ์'}
ผลรายเรื่อง:
${subj || '-'}
ตัวอย่างข้อที่ตอบผิด:
${wrong || '- ไม่มี'}

ตอบในรูปแบบ Markdown ตามหัวข้อนี้:
## สรุปผล
(บอกชัดเจนว่าผ่าน ${pass}% หรือยัง ห่างจากเกณฑ์กี่ % / ต้องตอบถูกเพิ่มอีกกี่ข้อ)
## จุดแข็ง
## จุดที่ควรพัฒนา
(ระบุหัวข้อ/ทฤษฎีที่ควรทบทวนจากข้อที่ผิด)
## แผนทบทวน 7 วัน
## คำแนะนำก่อนสอบจริง`;
    return AI.call(prompt, { temperature: 0.5, maxTokens: 4096 });
  },

  /** แปลง/สกัดข้อสอบจากไฟล์ (PDF, รูปภาพ, ข้อความ, Word) */
  async extractQuestions({ text, inline }, { mode = 'extract', count = 20, subject }) {
    const sub = subjectById(subject);
    const schema = `ส่งคืนเป็น JSON array เท่านั้น แต่ละข้อมีรูปแบบ:
{"question": "โจทย์", "choices": ["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"], "answer": <index ของคำตอบที่ถูก เริ่มที่ 0>, "explain": "เกร็ดความรู้ 2-3 ประโยค อธิบายเหตุผล", "topic": "หัวข้อย่อย"}
- ตัดเลข/ตัวอักษรนำหน้าตัวเลือก (ก. ข. ค. ง. / 1) 2) ) ออก`;
    const task = mode === 'generate'
      ? `จากเอกสารสรุปเนื้อหาต่อไปนี้ (หมวด "${sub?.title || 'ทั่วไป'}") ให้ออกข้อสอบปรนัย 4 ตัวเลือกแบบสถานการณ์/ประยุกต์ใช้ ตามแนว Test Blueprint ของคุรุสภา จำนวน ${count} ข้อ ตัวลวงต้องสมเหตุสมผล คำตอบถูกมีเพียงข้อเดียว กระจายตำแหน่งคำตอบให้สมดุล`
      : `จากเอกสารข้อสอบต่อไปนี้ (หมวด "${sub?.title || 'ทั่วไป'}") ให้สกัดข้อสอบปรนัยทุกข้อออกมาให้ครบ คงข้อความโจทย์และตัวเลือกตามต้นฉบับ ห้ามแต่งข้อใหม่ ถ้าเอกสารมีเฉลยให้ใช้เฉลยนั้น ถ้าไม่มีให้วิเคราะห์คำตอบที่ถูกต้องที่สุด ถ้าเอกสารมีคำอธิบายให้ใช้เป็น explain ถ้าไม่มีให้เขียนเกร็ดความรู้เอง`;
    const parts = [{ text: `${task}\n\n${schema}` }];
    if (inline) parts.push({ inline_data: inline });
    if (text) parts.push({ text: `\n----- เอกสาร -----\n${text}` });
    const out = await AI.call(parts, { json: true, temperature: mode === 'generate' ? 0.7 : 0.1, maxTokens: 65536 });
    const arr = AI.parseJSON(out);
    return Array.isArray(arr) ? arr : (arr.questions || []);
  }
};

/* วิเคราะห์ผลแบบออฟไลน์ (ใช้เมื่อไม่มี AI) */
function localAnalysis(attempt) {
  const pass = App.settings.passPercent;
  const needCorrect = Math.max(0, Math.ceil((pass / 100) * attempt.total) - attempt.correct);
  let s = `## สรุปผล\n`;
  s += attempt.passed
    ? `**ยินดีด้วย! คุณผ่านเกณฑ์ ${pass}%** ด้วยคะแนน ${attempt.percent}% (${attempt.correct}/${attempt.total} ข้อ)\n`
    : `**ยังไม่ผ่านเกณฑ์ ${pass}%** — ได้ ${attempt.percent}% ต้องตอบถูกเพิ่มอีก **${needCorrect} ข้อ** จึงจะผ่าน\n`;
  const subs = Object.entries(attempt.bySubject || {}).map(([sid, v]) => ({ sid, pct: Math.round((v.correct / v.total) * 100), ...v }));
  const strong = subs.filter((x) => x.pct >= pass), weak = subs.filter((x) => x.pct < pass).sort((a, b) => a.pct - b.pct);
  if (strong.length) { s += `\n## จุดแข็ง\n`; strong.forEach((x) => { s += `- เรื่อง ${x.sid} ${subjectById(x.sid)?.short}: ${x.pct}%\n`; }); }
  if (weak.length) {
    s += `\n## จุดที่ควรพัฒนา\n`;
    weak.forEach((x) => { s += `- **เรื่อง ${x.sid} ${subjectById(x.sid)?.short}: ${x.pct}%** — ${subjectById(x.sid)?.tips}\n`; });
  }
  s += `\n## คำแนะนำ\n- ใช้เมนู "ทบทวนข้อที่เคยตอบผิด" ทำซ้ำจนตอบถูกทั้งหมด\n- อ่านสรุปเนื้อหาของเรื่องที่ต่ำกว่าเกณฑ์ แล้วทำชุดรายเรื่องอีกครั้ง\n- ทำชุดรวมแบบจับเวลาเพื่อฝึกบริหารเวลาให้เหมือนสอบจริง\n`;
  return s;
}
