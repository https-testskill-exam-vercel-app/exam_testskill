/* ===== Question importer: CSV / Excel / JSON / (AI) PDF, Word, TXT, รูปภาพ ===== */
const Importer = {
  HEADERS: {
    subject: ['subject', 'เรื่อง', 'รหัสเรื่อง', 'หมวด'],
    question: ['question', 'q', 'คำถาม', 'โจทย์', 'ข้อสอบ', 'ข้อคำถาม'],
    a: ['choice_a', 'a', 'ก', 'ตัวเลือกก', 'ตัวเลือก1', 'choice1', 'option1', 'option_a', 'ตัวเลือก_ก'],
    b: ['choice_b', 'b', 'ข', 'ตัวเลือกข', 'ตัวเลือก2', 'choice2', 'option2', 'option_b', 'ตัวเลือก_ข'],
    c: ['choice_c', 'c', 'ค', 'ตัวเลือกค', 'ตัวเลือก3', 'choice3', 'option3', 'option_c', 'ตัวเลือก_ค'],
    d: ['choice_d', 'd', 'ง', 'ตัวเลือกง', 'ตัวเลือก4', 'choice4', 'option4', 'option_d', 'ตัวเลือก_ง'],
    e: ['choice_e', 'e', 'จ', 'ตัวเลือกจ', 'ตัวเลือก5', 'choice5', 'option5', 'option_e', 'ตัวเลือก_จ'],
    answer: ['answer', 'ans', 'เฉลย', 'คำตอบ', 'คำตอบที่ถูก', 'correct'],
    explain: ['explain', 'explanation', 'เกร็ดความรู้', 'คำอธิบาย', 'อธิบาย', 'เหตุผล'],
    topic: ['topic', 'หัวข้อ', 'หัวข้อย่อย', 'เนื้อหา']
  },

  templateCSV() {
    const rows = [
      ['subject', 'question', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'answer', 'explain', 'topic'],
      ['01', 'ข้อใดคือ 2 เงื่อนไขของปรัชญาของเศรษฐกิจพอเพียง', 'ความพอประมาณและความมีเหตุผล', 'ความรู้และคุณธรรม', 'ภูมิคุ้มกันและความรู้', 'ความอดทนและความเพียร', 'ข', '2 เงื่อนไข คือ เงื่อนไขความรู้ และเงื่อนไขคุณธรรม', '3 ห่วง 2 เงื่อนไข'],
      ['02', 'ทฤษฎี ZPD เป็นของนักจิตวิทยาท่านใด', 'Vygotsky', 'Piaget', 'Bruner', 'Skinner', 'ก', 'Vygotsky เสนอ ZPD และ Scaffolding', 'Vygotsky']
    ];
    return '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  },

  parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
    if (!nonEmpty.length) return [];
    const head = nonEmpty[0];
    return nonEmpty.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  },

  normKey: (k) => String(k).toLowerCase().replace(/[\s.()]/g, ''),

  mapRow(row) {
    const out = {};
    const keys = Object.keys(row);
    for (const [field, aliases] of Object.entries(Importer.HEADERS)) {
      const k = keys.find((x) => aliases.includes(Importer.normKey(x)));
      if (k !== undefined) out[field] = row[k];
    }
    return out;
  },

  parseAnswer(v, choices) {
    if (typeof v === 'number') return v >= 1 && v <= choices.length ? v - 1 : (v === 0 ? 0 : -1);
    let s = String(v ?? '').trim();
    if (!s) return -1;
    const exact = choices.findIndex((c) => String(c).trim() === s);
    if (exact >= 0 && s.length > 2) return exact;
    s = s.replace(/^(ข้อ|ตอบ|คำตอบ)\s*/, '').replace(/[.)\s]/g, '').toLowerCase();
    const th = TH_LABELS.indexOf(s.charAt(0)); if (th >= 0 && s.length <= 2) return th;
    const en = 'abcdef'.indexOf(s.charAt(0)); if (en >= 0 && s.length <= 2) return en;
    if (/^\d+$/.test(s)) { const n = +s; return n >= 1 && n <= choices.length ? n - 1 : -1; }
    return exact;
  },

  parseSubject(v) {
    const m = String(v ?? '').match(/\d+/);
    if (!m) return null;
    const id = String(+m[0]).padStart(2, '0');
    return subjectById(id) ? id : null;
  },

  /** แปลงข้อมูลดิบ → ข้อสอบมาตรฐาน + รายการข้อผิดพลาด */
  normalize(rows, defaultSubject) {
    const ok = [], errors = [];
    rows.forEach((r, idx) => {
      let q;
      if (Array.isArray(r.choices)) {
        q = { question: r.question ?? r.q, choices: r.choices.map(String), answer: r.answer, explain: r.explain ?? r.explanation ?? '', topic: r.topic ?? '', subject: r.subject };
      } else {
        const m = Importer.mapRow(r);
        q = { question: m.question, choices: ['a', 'b', 'c', 'd', 'e'].map((k) => m[k]).filter((x) => x !== undefined && String(x).trim() !== '').map(String), answer: m.answer, explain: m.explain || '', topic: m.topic || '', subject: m.subject };
      }
      q.question = String(q.question ?? '').trim();
      q.choices = q.choices.map((c) => c.replace(/^\s*([ก-จ]|[a-eA-E]|[1-5])\s*[.)]\s*/, '').trim());
      const sid = Importer.parseSubject(q.subject) || defaultSubject;
      // รูปแบบ JSON (มี choices[]) ใช้ answer เป็น index เริ่ม 0 / รูปแบบตาราง ใช้ ก-ง, A-D, 1-4
      const ans = Array.isArray(r.choices) && typeof q.answer === 'number' ? q.answer : Importer.parseAnswer(q.answer, q.choices);
      const line = idx + 2;
      if (!q.question) return errors.push(`แถว ${line}: ไม่มีโจทย์`);
      if (q.choices.length < 2) return errors.push(`แถว ${line}: ตัวเลือกน้อยกว่า 2 ตัว`);
      if (ans < 0 || ans >= q.choices.length) return errors.push(`แถว ${line}: เฉลยไม่ถูกต้อง ("${q.answer ?? ''}")`);
      if (!sid) return errors.push(`แถว ${line}: ไม่ระบุเรื่อง (01–05)`);
      ok.push({ id: `${sid}-${uid()}`, subject: sid, question: q.question, choices: q.choices, answer: ans, explain: String(q.explain || '').trim(), topic: String(q.topic || '').trim() });
    });
    return { ok, errors };
  },

  /** อ่านไฟล์ → {ok, errors, viaAI} */
  async fromFile(file, { subject, aiMode = 'extract', aiCount = 20, onStatus = () => {} }) {
    const name = file.name.toLowerCase();
    const ext = name.split('.').pop();
    if (ext === 'csv') return Importer.normalize(Importer.parseCSV(await readAsText(file)), subject);
    if (ext === 'json') {
      const data = JSON.parse(await readAsText(file));
      return Importer.normalize(Array.isArray(data) ? data : (data.questions || []), subject);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      if (!window.XLSX) throw new Error('ไม่สามารถโหลดตัวอ่าน Excel ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต) — ลองบันทึกเป็น CSV แทน');
      const wb = XLSX.read(await readAsArrayBuffer(file), { type: 'array' });
      let rows = [];
      wb.SheetNames.forEach((n) => {
        const sheetRows = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
        const sheetSub = Importer.parseSubject(n);
        sheetRows.forEach((r) => { if (sheetSub && !Object.keys(r).some((k) => Importer.HEADERS.subject.includes(Importer.normKey(k)))) r.subject = sheetSub; });
        rows = rows.concat(sheetRows);
      });
      return Importer.normalize(rows, subject);
    }
    // ---- ไฟล์ที่ต้องใช้ AI ช่วยแปลง ----
    if (!AI.enabled()) throw new Error('ไฟล์ประเภทนี้ต้องใช้ AI ช่วยแปลง กรุณาตั้งค่า Gemini API Key ก่อน หรือใช้ไฟล์ CSV/Excel ตามแม่แบบ');
    let raw = [];
    const opts = { mode: aiMode, count: aiCount, subject };
    if (ext === 'pdf' || /^image\//.test(file.type)) {
      onStatus('AI กำลังอ่านไฟล์… (อาจใช้เวลา 30–120 วินาที)');
      raw = await AI.extractQuestions({ inline: { mime_type: file.type || 'application/pdf', data: await readAsBase64(file) } }, opts);
    } else {
      let text;
      if (ext === 'docx') {
        if (!window.mammoth) throw new Error('ไม่สามารถโหลดตัวอ่าน Word ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)');
        text = (await mammoth.extractRawText({ arrayBuffer: await readAsArrayBuffer(file) })).value;
      } else if (ext === 'txt' || ext === 'md') text = await readAsText(file);
      else throw new Error('ไม่รองรับไฟล์ประเภทนี้');
      const chunks = Importer.chunk(text, aiMode === 'generate' ? 30000 : 12000);
      for (let i = 0; i < chunks.length; i++) {
        onStatus(`AI กำลังประมวลผลส่วนที่ ${i + 1}/${chunks.length}…`);
        const perChunk = aiMode === 'generate' ? Math.ceil(aiCount / chunks.length) : aiCount;
        raw = raw.concat(await AI.extractQuestions({ text: chunks[i] }, { ...opts, count: perChunk }));
      }
    }
    const res = Importer.normalize(raw, subject);
    res.viaAI = true;
    return res;
  },

  chunk(text, size) {
    const out = [];
    let rest = text;
    while (rest.length > size) {
      let cut = rest.lastIndexOf('\n\n', size);
      if (cut < size * 0.5) cut = rest.lastIndexOf('\n', size);
      if (cut < size * 0.5) cut = size;
      out.push(rest.slice(0, cut)); rest = rest.slice(cut);
    }
    if (rest.trim()) out.push(rest);
    return out;
  }
};
