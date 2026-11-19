/* ===== Quiz engine ===== */
async function renderQuiz(examId) {
  const u = App.user, s = App.settings;
  const meta = Exams.parse(examId);
  if (!meta || (meta.perm && !Auth.can(u, meta.perm))) { toast('ไม่มีสิทธิ์เข้าถึงชุดนี้', 'warning'); return go('/home'); }
  let p = await Repo.getProgress(u.id, examId);
  if (!p) return go('/home');
  const qmap = await Repo.getQuestionMap();
  p.qids = p.qids.filter((id) => qmap[id]); // ข้อที่ถูกลบออกจากคลัง
  if (!p.qids.length) { await Repo.clearProgress(u.id, examId); toast('ข้อสอบชุดนี้ไม่มีแล้ว', 'warning'); return go('/home'); }
  p.current = Math.min(p.current || 0, p.qids.length - 1);
  let bookmarks = new Set(await Repo.getBookmarks(u.id));
  let selected = null, finished = false, dirty = false;
  const title = Exams.title(examId);

  if (typeof hideSystemLoader === 'function') hideSystemLoader();
  document.getElementById('app').innerHTML = `
  <div class="quiz-page fade-in">
    <header class="quiz-top"><div class="quiz-top-inner">
      <button class="btn-exit-modern" id="exitBtn" title="บันทึกความคืบหน้าแล้วออกจากหน้าสอบ">
        <span class="exit-icon-wrap">
          <svg class="exit-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </span>
        <span class="exit-label">บันทึกแล้วออก</span>
        <span class="exit-dot" title="บันทึกอัตโนมัติ"></span>
      </button>
      <div class="quiz-title"><b>${esc(title)}</b><div class="quiz-progress"><div id="progBar"></div></div><small class="muted" id="progText"></small></div>
      <div class="quiz-top-right">
        ${p.timed ? '<div class="timer" id="timer">⏱ --:--</div>' : '<div class="timer timer-free" id="timer">🧘 --:--</div>'}
        <button class="icon-btn sound-toggle" title="${Sound.isEnabled() ? 'เปิดเสียงเอฟเฟกต์อยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงเอฟเฟกต์อยู่ (คลิกเพื่อเปิด)'}" aria-label="เปิด/ปิดเสียง">${Sound.icon()}</button>
        <button class="icon-btn theme-toggle" title="สลับโหมด">${Theme.icon()}</button>
        <button class="icon-btn only-mobile" id="navToggle" title="รายการข้อ">☰</button>
      </div>
    </div></header>
    <div class="quiz-layout">
      <main><article class="card q-card" id="qcard"></article></main>
      <aside class="card quiz-side" id="quizSide">
        <div class="side-head"><b>รายการข้อ</b><span class="muted small" id="scoreNow"></span></div>
        <div class="nav-grid" id="navGrid"></div>
        <div class="legend"><span><i class="lg lg-ok"></i>ถูก</span><span><i class="lg lg-bad"></i>ผิด</span><span><i class="lg lg-flag"></i>ทำเครื่องหมาย</span><span><i class="lg"></i>ยังไม่ตอบ</span></div>
        <button class="btn btn-primary btn-block" id="finishBtn">ส่งแบบทดสอบ & ดูผล</button>
        <p class="muted small center">ระบบบันทึกอัตโนมัติ ออกแล้วกลับมาทำต่อได้</p>
      </aside>
    </div>
    <div id="hlToolbar" class="hl-toolbar" style="display:none;" role="toolbar" aria-label="เครื่องมือไฮไลท์">
      <button type="button" class="hl-dot hl-dot-yellow" data-color="yellow" title="ไฮไลท์สีเหลือง"></button>
      <button type="button" class="hl-dot hl-dot-green" data-color="green" title="ไฮไลท์สีเขียว"></button>
      <button type="button" class="hl-dot hl-dot-pink" data-color="pink" title="ไฮไลท์สีชมพู"></button>
      <button type="button" class="hl-dot hl-dot-orange" data-color="orange" title="ไฮไลท์สีส้ม"></button>
      <button type="button" class="hl-dot hl-dot-blue" data-color="blue" title="ไฮไลท์สีฟ้า"></button>
      <button type="button" class="hl-btn-clear" id="hlBtnClear" title="ลบไฮไลท์">🧹</button>
    </div>
  </div>`;
  bindShell();

  const save = async () => { dirty = false; await Repo.saveProgress(u.id, examId, p); };
  const answeredCount = () => Object.keys(p.answers).length;
  const correctCount = () => Object.values(p.answers).filter((a) => a.correct).length;

  p.highlights = p.highlights || {};
  let pendingHlText = '';

  function highlightText(rawText, items) {
    let s = esc(rawText);
    if (!items || !items.length) return s;
    const valid = items.filter((x) => x && x.text && x.text.trim().length > 0);
    if (!valid.length) return s;

    const sorted = [...valid].sort((a, b) => b.text.trim().length - a.text.trim().length);
    const tokens = [];

    sorted.forEach((item, idx) => {
      const rawPhrase = item.text.trim();
      const escPhrase = esc(rawPhrase);
      const escapedRegex = escPhrase.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const re = new RegExp(escapedRegex, 'gi');
      s = s.replace(re, (match) => {
        const token = `@@@HL_${tokens.length}_${idx}@@@`;
        tokens.push({
          token,
          html: `<mark class="hl hl-${item.color || 'yellow'}" data-hl="${esc(rawPhrase)}" title="คลิกเพื่อเปลี่ยนสีหรือลบไฮไลท์">${match}</mark>`
        });
        return token;
      });
    });

    tokens.forEach((t) => {
      s = s.replace(t.token, t.html);
    });

    return s;
  }

  function showToolbarAtRect(rect) {
    const toolbar = document.getElementById('hlToolbar');
    if (!toolbar) return;
    toolbar.style.display = 'flex';
    const width = toolbar.offsetWidth || 230;
    let top = rect.top + window.scrollY - 48;
    if (top < window.scrollY + 10) {
      top = rect.bottom + window.scrollY + 8;
    }
    let left = rect.left + window.scrollX + (rect.width / 2);
    const maxLeft = window.innerWidth - (width / 2) - 12;
    const minLeft = (width / 2) + 12;
    left = Math.max(minLeft, Math.min(maxLeft, left));
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
  }

  function handleSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      const toolbar = document.getElementById('hlToolbar');
      if (toolbar && !toolbar.dataset.sticky) {
        toolbar.style.display = 'none';
      }
      return;
    }
    const text = sel.toString().trim();
    if (!text) return;

    const qcard = document.getElementById('qcard');
    if (!qcard) return;
    const range = sel.getRangeAt(0);
    const common = range.commonAncestorContainer;
    if (!qcard.contains(common)) return;

    pendingHlText = text;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    showToolbarAtRect(rect);
  }

  function applyHighlightColor(color) {
    const text = (pendingHlText || '').trim();
    if (!text) return;
    const qid = p.qids[p.current];
    p.highlights = p.highlights || {};
    p.highlights[qid] = p.highlights[qid] || [];

    const idx = p.highlights[qid].findIndex((h) => h.text.toLowerCase() === text.toLowerCase());
    if (idx >= 0) {
      p.highlights[qid][idx].color = color;
    } else {
      p.highlights[qid].push({ text, color });
    }

    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    pendingHlText = '';

    const toolbar = document.getElementById('hlToolbar');
    if (toolbar) {
      toolbar.style.display = 'none';
      delete toolbar.dataset.sticky;
    }

    Sound.click();
    renderQuestion();
    save();
  }

  function clearHighlightText() {
    const text = (pendingHlText || '').trim();
    const qid = p.qids[p.current];
    if (p.highlights && p.highlights[qid]) {
      if (text) {
        p.highlights[qid] = p.highlights[qid].filter((h) => h.text.toLowerCase() !== text.toLowerCase());
        if (p.highlights[qid].length === 0) delete p.highlights[qid];
      } else {
        delete p.highlights[qid];
      }
    }

    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    pendingHlText = '';

    const toolbar = document.getElementById('hlToolbar');
    if (toolbar) {
      toolbar.style.display = 'none';
      delete toolbar.dataset.sticky;
    }

    Sound.click();
    renderQuestion();
    save();
  }

  function renderNav() {
    $('#navGrid').innerHTML = p.qids.map((id, i) => {
      const a = p.answers[id];
      const cls = [a ? (a.correct ? 'ok' : 'bad') : '', p.flags.includes(id) ? 'flag' : '', i === p.current ? 'current' : ''].join(' ');
      return `<button class="nav-cell ${cls}" data-i="${i}">${i + 1}</button>`;
    }).join('');
    $$('#navGrid .nav-cell').forEach((b) => (b.onclick = () => { Sound.click(); p.current = +b.dataset.i; selected = null; renderQuestion(); renderNav(); save(); $('#quizSide').classList.remove('open'); }));
    const n = answeredCount();
    $('#progBar').style.width = `${(n / p.qids.length) * 100}%`;
    $('#progText').textContent = `ตอบแล้ว ${n}/${p.qids.length} ข้อ`;
    $('#scoreNow').textContent = n ? `ถูก ${correctCount()}/${n}` : '';
  }

  function renderQuestion() {
    const qid = p.qids[p.current], q = qmap[qid], ans = p.answers[qid];
    const order = (p.choiceOrder && p.choiceOrder[qid]) || q.choices.map((_, i) => i);
    const sub = subjectById(q.subject);
    const qHighlights = (p.highlights && p.highlights[qid]) || [];
    const hasHighlights = qHighlights.length > 0;

    const choiceHTML = order.map((k, pos) => {
      let cls = '';
      if (ans) cls = k === q.answer ? 'correct' : (k === ans.choice ? 'wrong' : 'dim');
      else if (selected === k) cls = 'selected';
      return `<button class="choice ${cls}" data-k="${k}" ${ans ? 'disabled' : ''}><span class="choice-label">${TH_LABELS[pos]}</span><span class="choice-text">${highlightText(q.choices[k], qHighlights)}</span>
        ${ans && k === q.answer ? '<span class="choice-icon">✓</span>' : ''}${ans && k === ans.choice && !ans.correct ? '<span class="choice-icon">✗</span>' : ''}</button>`;
    }).join('');
    const correctLabel = TH_LABELS[order.indexOf(q.answer)];

    $('#qcard').innerHTML = `
      <div class="q-meta"><span class="chip">ข้อ ${p.current + 1} / ${p.qids.length}</span>
        <span class="chip chip-muted">${sub.icon} ${sub.id.startsWith('M') ? esc(sub.short) : 'เรื่อง ' + sub.id}${q.topic ? ' · ' + esc(q.topic) : ''}</span>
        <span class="spacer"></span>
        ${hasHighlights ? `<button class="icon-btn on" id="clearHlBtn" title="ล้างไฮไลท์ทั้งหมดในข้อนี้ (${qHighlights.length})">🖍️<span class="hl-badge">${qHighlights.length}</span></button>` : ''}
        <button class="icon-btn ${p.flags.includes(qid) ? 'on' : ''}" id="flagBtn" title="ทำเครื่องหมายไว้กลับมาดู">🚩</button>
        <button class="icon-btn ${bookmarks.has(qid) ? 'on' : ''}" id="bmBtn" title="บันทึกข้อนี้ไว้ทบทวน">🔖</button></div>
      <h2 class="q-text">${highlightText(q.question, qHighlights)}</h2>
      <div class="choices">${choiceHTML}</div>
      ${ans ? `<div class="feedback ${ans.correct ? 'fb-ok' : 'fb-bad'}">
          <div class="fb-head">${ans.correct ? '🎉 ถูกต้อง! เยี่ยมมาก' : `❌ ยังไม่ถูก — คำตอบที่ถูกคือ <b>${correctLabel}. ${highlightText(q.choices[q.answer], qHighlights)}</b>`}</div>
          <div class="tip"><b>💡 เกร็ดความรู้</b><div id="explainBox">${q.explain ? `<p>${highlightText(q.explain, qHighlights)}</p>` : (AI.enabled() ? '<button class="btn btn-ghost btn-sm" id="aiExplainBtn">✨ ให้ AI อธิบายข้อนี้</button>' : '<p class="muted">ยังไม่มีคำอธิบายสำหรับข้อนี้</p>')}</div></div>
        </div>` : ''}
      <div class="q-actions">
        <button class="btn btn-ghost" id="prevBtn" ${p.current === 0 ? 'disabled' : ''}>← ก่อนหน้า</button>
        <span class="spacer"></span>
        ${ans ? (p.current < p.qids.length - 1 ? '<button class="btn btn-primary" id="nextBtn">ข้อถัดไป →</button>' : '<button class="btn btn-primary" id="endBtn">ส่งแบบทดสอบ & ดูผล</button>')
        : `<button class="btn btn-ghost" id="skipBtn">ข้าม</button><button class="btn btn-primary" id="submitBtn" ${selected == null ? 'disabled' : ''}>ส่งคำตอบ</button>`}
      </div>
      <p class="kbd-hint muted small">คีย์ลัด: 1–4 เลือกตัวเลือก · Enter ส่งคำตอบ/ข้อถัดไป · ← → เปลี่ยนข้อ · ลากเมาส์เพื่อไฮไลท์</p>`;

    $$('#qcard .choice').forEach((b) => (b.onclick = () => {
      if (ans) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;
      Sound.click();
      selected = +b.dataset.k;
      renderQuestion();
    }));

    $$('#qcard mark.hl').forEach((m) => {
      m.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const hlText = m.dataset.hl || m.textContent;
        pendingHlText = (hlText || '').trim();
        const rect = m.getBoundingClientRect();
        const toolbar = document.getElementById('hlToolbar');
        if (toolbar) {
          toolbar.dataset.sticky = '1';
          showToolbarAtRect(rect);
        }
      };
    });
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    on('submitBtn', submit);
    on('nextBtn', () => { Sound.click(); move(1); });
    on('skipBtn', () => { Sound.click(); move(1); });
    on('prevBtn', () => { Sound.click(); move(-1); });
    on('endBtn', () => finish());
    on('flagBtn', () => { const i = p.flags.indexOf(qid); i >= 0 ? p.flags.splice(i, 1) : p.flags.push(qid); renderQuestion(); renderNav(); save(); });
    on('bmBtn', async () => {
      bookmarks.has(qid) ? bookmarks.delete(qid) : bookmarks.add(qid);
      await Repo.saveBookmarks(u.id, [...bookmarks]);
      toast(bookmarks.has(qid) ? 'บันทึกข้อนี้แล้ว' : 'นำออกจากรายการบันทึกแล้ว', 'success', 1600);
      renderQuestion();
    });
    on('clearHlBtn', () => {
      if (p.highlights && p.highlights[qid]) {
        delete p.highlights[qid];
        toast('ล้างไฮไลท์ในข้อนี้แล้ว', 'info', 1400);
        renderQuestion();
        save();
      }
    });
    on('aiExplainBtn', async () => {
      const box = $('#explainBox');
      box.innerHTML = '<div class="ai-loading"><span class="spinner"></span> AI กำลังเขียนเกร็ดความรู้…</div>';
      try {
        q.explain = await AI.explain(q);
        await Repo.updateQuestion(q); // เก็บไว้ใช้ครั้งต่อไป
        box.innerHTML = `<p>${esc(q.explain)}</p><small class="muted">✨ สร้างโดย AI</small>`;
      } catch (e) { box.innerHTML = `<p class="t-danger small">${esc(e.message)}</p>`; }
    });
  }

  async function submit() {
    if (selected == null) return;
    const qid = p.qids[p.current], q = qmap[qid];
    const correct = selected === q.answer;
    if (correct) {
      Sound.correct();
    } else {
      Sound.wrong();
    }
    p.answers[qid] = { choice: selected, correct, at: Date.now() };
    selected = null;
    // คลังข้อผิด
    const wrong = await Repo.getWrong(u.id);
    if (!correct) wrong[qid] = (wrong[qid] || 0) + 1;
    else if (examId === 'REVIEW' && wrong[qid]) delete wrong[qid];
    await Repo.saveWrong(u.id, wrong);
    await save();
    renderQuestion(); renderNav();
    $('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function move(d) {
    const n = p.current + d;
    if (n < 0 || n >= p.qids.length) return;
    p.current = n; selected = null;
    renderQuestion(); renderNav(); save();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function finish(timeout = false) {
    if (finished) return;
    const left = p.qids.length - answeredCount();
    if (!timeout && left > 0) {
      const ok = await confirmBox('ส่งแบบทดสอบ?', `ยังมีอีก <b>${left}</b> ข้อที่ยังไม่ได้ตอบ ข้อที่ไม่ได้ตอบจะนับว่าผิด`, 'ส่งเลย');
      if (!ok) return;
    }
    finished = true;
    clearInterval(timerId);
    const details = p.qids.map((id) => ({ qid: id, choice: p.answers[id]?.choice ?? null, correct: !!p.answers[id]?.correct, order: p.choiceOrder?.[id] }));
    const bySubject = {};
    details.forEach((d) => {
      const sid = qmap[d.qid].subject;
      bySubject[sid] = bySubject[sid] || { total: 0, correct: 0 };
      bySubject[sid].total++; if (d.correct) bySubject[sid].correct++;
    });
    const correct = details.filter((d) => d.correct).length;
    const percent = Math.round((correct / details.length) * 1000) / 10;
    const attempt = {
      id: uid('a_'), examId, title, total: details.length, correct, percent,
      passed: percent >= s.passPercent, passPercent: s.passPercent, bySubject, details,
      timed: p.timed, timeout, durationSec: p.elapsed || 0, startedAt: p.startedAt, finishedAt: Date.now()
    };
    await Repo.addHistory(u.id, attempt);
    await Repo.clearProgress(u.id, examId);
    if (timeout) await modal({ title: '⏰ หมดเวลา', body: '<p>ระบบส่งคำตอบให้อัตโนมัติแล้ว</p>', actions: [{ label: 'ดูผลสอบ', value: true, cls: 'btn-primary' }], dismissible: false });
    go('/result/' + attempt.id);
  }

  // timer (จับเวลา = นับถอยหลัง, ไม่จับเวลา = นับเวลาที่ใช้)
  const timerEl = $('#timer');
  const tick = () => {
    if (finished) return;
    p.elapsed = (p.elapsed || 0) + 1;
    if (p.timed) {
      p.remaining = Math.max(0, (p.remaining || 0) - 1);
      timerEl.textContent = '⏱ ' + fmtTime(p.remaining);
      timerEl.classList.toggle('warn', p.remaining <= 300);
      if (p.remaining <= 0) return finish(true);
    } else timerEl.textContent = '🧘 ' + fmtTime(p.elapsed);
    dirty = true;
    if (p.elapsed % 10 === 0) save();
  };
  timerEl.textContent = p.timed ? '⏱ ' + fmtTime(p.remaining) : '🧘 ' + fmtTime(p.elapsed);
  const timerId = setInterval(tick, 1000);

  const onKey = (e) => {
    if (e.target.matches('input, textarea') || document.querySelector('.modal-backdrop')) return;
    const qid = p.qids[p.current], ans = p.answers[qid];
    if (/^[1-6]$/.test(e.key) && !ans) {
      const order = (p.choiceOrder && p.choiceOrder[qid]) || qmap[qid].choices.map((_, i) => i);
      const k = order[+e.key - 1]; if (k !== undefined) { Sound.click(); selected = k; renderQuestion(); }
    } else if (e.key === 'Enter') { e.preventDefault(); if (!ans) submit(); else if (p.current < p.qids.length - 1) { Sound.click(); move(1); } }
    else if (e.key === 'ArrowRight') { Sound.click(); move(1); }
    else if (e.key === 'ArrowLeft') { Sound.click(); move(-1); }
  };
  document.addEventListener('keydown', onKey);
  const onUnload = () => { if (!finished) Repo.saveProgress(u.id, examId, p); };
  window.addEventListener('beforeunload', onUnload);
  const onVis = () => { if (document.hidden && !finished) save(); };
  document.addEventListener('visibilitychange', onVis);

  const onDocMouseDown = (e) => {
    const toolbar = document.getElementById('hlToolbar');
    if (!toolbar || toolbar.style.display === 'none') return;
    if (!toolbar.contains(e.target) && !e.target.closest('mark.hl')) {
      toolbar.style.display = 'none';
      delete toolbar.dataset.sticky;
    }
  };
  const onTouchEnd = () => setTimeout(handleSelection, 200);

  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('mousedown', onDocMouseDown);

  $$('#hlToolbar .hl-dot').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyHighlightColor(btn.dataset.color);
    };
  });
  const hlClearBtn = document.getElementById('hlBtnClear');
  if (hlClearBtn) {
    hlClearBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearHighlightText();
    };
  }

  onCleanup(async () => {
    clearInterval(timerId);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('beforeunload', onUnload);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('mouseup', handleSelection);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('mousedown', onDocMouseDown);
    const tb = document.getElementById('hlToolbar');
    if (tb) tb.remove();
    if (!finished) await save();
  });

  $('#exitBtn').onclick = async () => { await save(); toast('บันทึกความคืบหน้าแล้ว กลับมาทำต่อได้ทุกเมื่อ', 'success'); go('/home'); };
  $('#finishBtn').onclick = () => finish();
  $('#navToggle').onclick = () => $('#quizSide').classList.toggle('open');

  renderQuestion(); renderNav();
}
