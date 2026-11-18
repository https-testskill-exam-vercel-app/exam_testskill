/* ===== Utilities ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const TH_LABELS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function fmtDuration(sec) {
  sec = Math.floor(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h) return `${h} ชม. ${m} นาที`;
  if (m) return `${m} นาที`;
  return `${sec} วินาที`;
}

/* ไอคอนแสดง/ซ่อนรหัสผ่าน: ตาเปิด (ไม่ต้องขีดทับ) เมื่อเปิดดู, ตาปิด (มีเส้นขีดทับ) เมื่อซ่อน */
function eyeIconHTML(isOpen) {
  if (isOpen) {
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

/* ===== ระบบคำนวณวันหมดอายุ & แพ็กเกจการใช้งาน ===== */
function calcDaysRemaining(expiresStr) {
  if (!expiresStr) return null; // ตลอดชีพ (ไม่มีวันหมดอายุ)
  const parts = String(expiresStr).split('-').map(Number);
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function addDaysToDate(baseStr, days) {
  let d = new Date();
  if (baseStr) {
    const parts = String(baseStr).split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
      if (parsed > d) d = parsed; // นับต่อจากวันหมดอายุเดิมถ้ายังไม่หมดอายุ
    }
  }
  d.setDate(d.getDate() + Number(days || 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtExpiryBadge(expiresStr) {
  if (!expiresStr || String(expiresStr).includes('ตลอดชีพ') || expiresStr === 'lifetime') return '<span class="chip chip-primary chip-xs">👑 ตลอดชีพ</span>';
  const rem = calcDaysRemaining(expiresStr);
  if (rem === null) return '<span class="chip chip-primary chip-xs">👑 ตลอดชีพ</span>';
  if (rem < 0) return `<span class="chip chip-danger chip-xs">🔴 หมดอายุแล้ว (${Math.abs(rem)} วันก่อน)</span>`;
  if (rem === 0) return '<span class="chip chip-warning chip-xs">⚠️ หมดอายุวันนี้</span>';
  if (rem <= 7) return `<span class="chip chip-warning chip-xs">⚠️ เหลือ ${rem} วัน</span>`;
  return `<span class="chip chip-success chip-xs">🟢 เหลือ ${rem} วัน</span>`;
}

function toast(msg, type = 'info', ms = 3200) {
  const box = document.getElementById('toast-root');
  const el = document.createElement('div');
  const icon = { success: '✓', error: '!', info: 'i', warning: '!' }[type] || 'i';
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${esc(msg)}</span>`;
  box.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}

/**
 * modal({title, body, actions:[{label, cls, value, onClick(bodyEl)}], dismissible, wide, onMount})
 * onClick: return false = keep open, return non-undefined = resolve with that value
 */
function modal({ title = '', body = '', actions = [{ label: 'ตกลง', value: true, cls: 'btn-primary' }], dismissible = true, wide = false, onMount } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title}</h3>${dismissible ? '<button class="icon-btn" data-x aria-label="ปิด">✕</button>' : ''}</div>
      <div class="modal-body"></div>
      <div class="modal-actions"></div></div>`;
    const bodyEl = wrap.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.append(body);
    let done = false;
    const close = (v) => {
      if (done) return; done = true;
      wrap.classList.add('closing');
      setTimeout(() => wrap.remove(), 160);
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) close(null); };
    document.addEventListener('keydown', onKey);
    const actEl = wrap.querySelector('.modal-actions');
    if (!actions.length) actEl.remove();
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || 'btn-ghost');
      b.innerHTML = a.label;
      b.onclick = async () => {
        if (a.onClick) {
          b.disabled = true;
          let r;
          try { r = await a.onClick(bodyEl); } finally { b.disabled = false; }
          if (r === false) return;
          if (r !== undefined) return close(r);
        }
        close(a.value);
      };
      actEl.append(b);
    });
    if (dismissible) {
      wrap.querySelector('[data-x]').onclick = () => close(null);
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(null); });
    }
    root.append(wrap);
    onMount && onMount(bodyEl, close);
  });
}

const confirmBox = (title, text, okLabel = 'ยืนยัน', danger = false) =>
  modal({
    title, body: `<p class="muted">${text}</p>`,
    actions: [{ label: 'ยกเลิก', value: false }, { label: okLabel, value: true, cls: danger ? 'btn-danger' : 'btn-primary' }]
  });

async function sha256(str) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // fallback (non-secure context)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return 'f' + ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16));
}
const hashPassword = (username, pw) => sha256(`klangfu::${String(username).toLowerCase()}::${pw}`);

/* ===== กติกาไอดี/รหัสผ่าน: 8–32 ตัว ใช้ A-Z a-z 0-9 และต้องมีทั้งตัวอักษรอังกฤษและตัวเลข ===== */
const CREDENTIAL_RULE_TEXT = 'อย่างน้อย 8 ตัว เป็นตัวอักษรภาษาอังกฤษผสมตัวเลข (A-Z, a-z, 0-9)';
function credentialChecks(v) {
  v = String(v || '');
  return {
    len: v.length >= 8 && v.length <= 32,
    letter: /[A-Za-z]/.test(v),
    digit: /\d/.test(v),
    charset: v.length > 0 && /^[A-Za-z0-9]+$/.test(v)
  };
}
const isValidCredential = (v) => Object.values(credentialChecks(v)).every(Boolean);

/* Minimal, safe markdown renderer (for AI output & text summaries) */
function md(text) {
  const lines = esc(text || '').split(/\r?\n/);
  let html = '', inList = null;
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  const closeList = () => { if (inList) { html += `</${inList}>`; inList = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) { closeList(); const lv = Math.min(m[1].length + 2, 6); html += `<h${lv}>${inline(m[2])}</h${lv}>`; }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else if (!line.trim()) { closeList(); }
    else { closeList(); html += `<p>${inline(line)}</p>`; }
  }
  closeList();
  return html;
}

function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const readAsText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file, 'utf-8'); });
const readAsArrayBuffer = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
const readAsDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const readAsBase64 = async (blob) => (await readAsDataURL(blob)).split(',')[1];

/**
 * แสดงหน้าโหลดแบบเต็มจอ พร้อมเส้นแสงวิ่งวนรอบสัญลักษณ์โลโก้ของระบบ
 * @param {string} title ข้อความหลัก
 * @param {string} subtitle ข้อความรายละเอียด
 */
function showSystemLoader(title = 'กำลังเตรียมข้อมูลระบบ…', subtitle = 'กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูล') {
  let el = document.getElementById('system-loader-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'system-loader-root';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="system-loader-overlay fade-in">
      <div class="system-loader-card">
        <div class="logo-orbit-wrap">
          <div class="logo-orbit-pulse"></div>
          <div class="logo-orbit-ring-glow"></div>
          <div class="logo-orbit-ring"></div>
          <div class="logo-orbit-orb"></div>
          <img src="assets/logo-testskill.jpg" alt="TestSkill" class="logo-orbit-img">
        </div>
        <h3 class="system-loader-title">${esc(title)}</h3>
        <p class="system-loader-sub">${esc(subtitle)}</p>
        <div class="system-loader-bar"><div class="system-loader-bar-fill"></div></div>
      </div>
    </div>
  `;
}

/**
 * ซ่อนหน้าโหลดเต็มจอ
 */
function hideSystemLoader() {
  const el = document.getElementById('system-loader-root');
  if (el) {
    const overlay = el.querySelector('.system-loader-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.25s forwards';
      setTimeout(() => el.remove(), 250);
    } else {
      el.remove();
    }
  }
}

/**
 * คืนค่า HTML สัญลักษณ์โลโก้พร้อมเส้นแสงวิ่งวนรอบ สำหรับนำไปแสดงในจุดที่กำลังโหลดข้อมูล
 */
function logoLoaderHTML(title = 'กำลังเตรียมข้อมูล…', subtitle = 'กรุณารอสักครู่') {
  return `
    <div class="logo-loader-container fade-in">
      <div class="logo-orbit-wrap">
        <div class="logo-orbit-pulse"></div>
        <div class="logo-orbit-ring-glow"></div>
        <div class="logo-orbit-ring"></div>
        <div class="logo-orbit-orb"></div>
        <img src="assets/logo-testskill.jpg" alt="TestSkill" class="logo-orbit-img">
      </div>
      <div class="system-loader-title">${esc(title)}</div>
      <div class="system-loader-sub">${esc(subtitle)}</div>
    </div>
  `;
}

/* ===== Audio Effects Engine (Web Audio API Synthesizer) ===== */
const Sound = {
  ctx: null,
  enabled: true,

  init() {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('kf-sound') : null;
      this.enabled = saved !== '0';
    } catch {
      this.enabled = true;
    }
  },

  isEnabled() {
    return this.enabled;
  },

  toggle() {
    this.enabled = !this.enabled;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('kf-sound', this.enabled ? '1' : '0');
    } catch {}
    if (typeof $$ === 'function') {
      $$('.sound-toggle').forEach((b) => {
        b.innerHTML = Sound.icon();
        b.setAttribute('title', this.enabled ? 'เปิดเสียงเอฟเฟกต์อยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงเอฟเฟกต์อยู่ (คลิกเพื่อเปิด)');
        b.setAttribute('aria-label', this.enabled ? 'ปิดเสียง' : 'เปิดเสียง');
      });
    }
    if (this.enabled) {
      this.click();
      if (typeof toast === 'function') toast('🔊 เปิดเสียงเอฟเฟกต์แล้ว', 'info', 1500);
    } else {
      if (typeof toast === 'function') toast('🔇 ปิดเสียงเอฟเฟกต์แล้ว', 'info', 1500);
    }
    return this.enabled;
  },

  icon() {
    return this.enabled
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  },

  getCtx() {
    try {
      if (!this.ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  },

  // 1. เสียงตอนคลิก (Gentle UI click tap)
  click() {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.04);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.045);
    } catch {}
  },

  // 2. เสียงตอนตอบถูก (Cheerful pleasant chime / arpeggio)
  correct() {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0, dur: 0.12 },
        { freq: 659.25, time: 0.09, dur: 0.14 },
        { freq: 783.99, time: 0.18, dur: 0.28 }
      ];
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.12, t + time);
        gain.gain.exponentialRampToValueAtTime(0.001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur + 0.02);
      });
    } catch {}
  },

  // 3. เสียงตอนตอบผิด (Soft boing / low sine)
  wrong() {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [
        { freq: 310, time: 0, dur: 0.13 },
        { freq: 220, time: 0.11, dur: 0.22 }
      ];
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.14, t + time);
        gain.gain.exponentialRampToValueAtTime(0.001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur + 0.02);
      });
    } catch {}
  }
};

Sound.init();
