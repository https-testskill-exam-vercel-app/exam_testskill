/* ===== App core: auth, theme, router, layout ===== */
const App = { user: null, settings: null, cleanups: [], justLoggedIn: false };
const APP_NAME = 'ติวสอบใบประกอบวิชาชีพครู';
const APP_BY = 'By กลางฟู Test';

const Theme = {
  init() {
    const saved = localStorage.getItem('kf-theme');
    const t = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
  },
  toggle() {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('kf-theme', t);
    $$('.theme-toggle').forEach((b) => (b.innerHTML = Theme.icon()));
  },
  icon: () => document.documentElement.dataset.theme === 'dark'
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};

const Auth = {
  async login(username, password) {
    const users = await Repo.getUsers();
    const u = users.find((x) => x.username.toLowerCase() === String(username).trim().toLowerCase());
    if (!u || u.passHash !== (await hashPassword(u.username, password))) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    Auth.checkAllowed(u);
    await Repo.updateUser(u.id, { lastLogin: Date.now() });
    localStorage.setItem('kf-session', JSON.stringify({ uid: u.id, at: Date.now() }));
    return u;
  },
  checkAllowed(u) {
    if (!u.active) {
      if (u.pendingApproval) {
        throw new Error('บัญชีนี้อยู่ระหว่างรออนุมัติสิทธิ์ กรุณาติดต่อผู้ดูแลระบบผ่าน LINE: Panuwat_99999 เพื่อขอเปิดสิทธิ์ใช้งาน');
      }
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบผ่าน LINE: Panuwat_99999');
    }
    if (u.expires && new Date(u.expires + 'T23:59:59') < new Date()) {
      throw new Error('บัญชีนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบผ่าน LINE: Panuwat_99999 เพื่อต่ออายุแพ็กเกจ');
    }
  },
  async restore() {
    try {
      const s = JSON.parse(localStorage.getItem('kf-session') || 'null');
      if (!s) return null;
      const u = await Repo.getUser(s.uid);
      if (!u) return null;
      Auth.checkAllowed(u);
      return u;
    } catch { localStorage.removeItem('kf-session'); return null; }
  },
  logout() {
    localStorage.removeItem('kf-session');
    App.user = null;
    go('/login');
  },
  can(user, perm) {
    if (!user) return false;
    if (user.role === 'admin' || !perm) return true;
    return !!(user.perms && user.perms[perm]);
  }
};

function go(path) {
  if (location.hash === '#' + path) route(); else location.hash = path;
}

function onCleanup(fn) { App.cleanups.push(fn); }

async function route() {
  while (App.cleanups.length) { try { await App.cleanups.pop()(); } catch (e) { console.error(e); } }
  const parts = (location.hash.slice(1) || '/home').split('/').filter(Boolean);
  App.settings = await Repo.getSettings();
  if (App.user) {
    // refresh user (สิทธิ์อาจถูกแก้โดยแอดมิน)
    const fresh = await Repo.getUser(App.user.id);
    try { if (!fresh) throw new Error('ไม่พบบัญชีผู้ใช้'); Auth.checkAllowed(fresh); App.user = fresh; }
    catch (e) { toast(e.message, 'error'); return Auth.logout(); }
  }
  if (!App.user && parts[0] !== 'login' && parts[0] !== 'register') return go('/login');
  if (App.user && (parts[0] === 'login' || parts[0] === 'register')) return go('/home');
  window.scrollTo(0, 0);
  try {
    switch (parts[0]) {
      case 'login': return renderLogin('login');
      case 'register': return renderLogin('register');
      case 'home': return renderHome();
      case 'exam': return renderQuiz(parts[1]);
      case 'result': return renderResult(parts[1]);
      case 'history': return renderHistory();
      case 'summary': return renderSummary(parts[1]);
      case 'admin':
        if (App.user.role !== 'admin') return go('/home');
        return renderAdmin(parts[1] || 'overview', parts[2]);
      default: return go('/home');
    }
  } catch (e) {
    console.error(e);
    shell(`<div class="card empty"><h3>เกิดข้อผิดพลาด</h3><p class="muted">${esc(e.message)}</p><a class="btn btn-primary" href="#/home">กลับหน้าหลัก</a></div>`);
  }
}

function brandHTML(small = false) {
  return `<a class="brand ${small ? 'brand-sm' : ''}" href="#/home">
    <img class="brand-logo-img" src="assets/logo-testskill.jpg" alt="${APP_NAME} ${APP_BY}">
    <span class="brand-text"><b>${APP_NAME}</b><small>${APP_BY}</small></span></a>`;
}

function shell(content, { active = '' } = {}) {
  const u = App.user;
  const nav = [
    ['home', 'หน้าหลัก', '#/home'],
    ['history', 'ประวัติการสอบ', '#/history'],
    ...(u.role === 'admin' ? [['admin', 'ผู้ดูแลระบบ', '#/admin']] : [])
  ];
  const initials = (u.name || u.username).trim().charAt(0).toUpperCase();
  document.getElementById('app').innerHTML = `
  <header class="topbar"><div class="topbar-inner">
    ${brandHTML()}
    <nav class="nav">${nav.map(([k, l, h]) => `<a href="${h}" class="${active === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
    <div class="top-actions">
      <button class="icon-btn theme-toggle" title="สลับโหมดกลางวัน/กลางคืน" aria-label="สลับธีม">${Theme.icon()}</button>
      <div class="user-menu">
        <button class="avatar-btn" id="userMenuBtn"><span class="avatar">${esc(initials)}</span><span class="user-name">${esc(u.name || u.username)}</span></button>
        <div class="dropdown" id="userMenu">
          <div class="dropdown-head">
            <div class="dropdown-user-name"><b>${esc(u.name || u.username)}</b></div>
            <div class="dropdown-user-sub">
              <span>@${esc(u.username)}</span>
              ${u.role === 'admin' ? '<span class="chip chip-primary chip-xs">👑 ผู้ดูแลระบบ</span>' : '<span class="chip chip-xs">👤 ผู้ใช้งาน</span>'}
            </div>
          </div>
          <button type="button" data-act="pw">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="menu-svg-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>เปลี่ยนรหัสผ่าน</span>
          </button>
          <button type="button" data-open-qr>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="menu-svg-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span>ติดต่อผู้ดูแลระบบ (LINE)</span>
          </button>
          <button type="button" data-act="logout" class="danger-text">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="menu-svg-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  <nav class="nav-mobile">${nav.map(([k, l, h]) => `<a href="${h}" class="${active === k ? 'active' : ''}">${l}</a>`).join('')}</nav>
  </header>
  <main class="container fade-in">${content}</main>
  <footer class="footer">
    <div class="footer-contact">
      <button type="button" class="footer-qr-btn" data-open-qr title="คลิกเพื่อดู QR Code ขนาดใหญ่">
        <img src="assets/line-qr.jpg" alt="LINE QR Code">
      </button>
      <div class="footer-contact-info">
        <span class="footer-contact-label">ช่องทางการติดต่อ ผู้สร้างและพัฒนาระบบ</span>
        <div class="footer-line-row">
          <span class="line-badge">LINE</span>
          <b>Line ID : <span class="line-id-text">Panuwat_99999</span></b>
          <button type="button" class="btn-copy-line" data-copy-line="Panuwat_99999">คัดลอก ID</button>
          <button type="button" class="btn-copy-line" data-open-qr>สแกน QR</button>
        </div>
      </div>
    </div>
    <div class="footer-copy">© ${new Date().getFullYear() + 543} ${APP_NAME} ${APP_BY} · อ้างอิงกรอบ Test Blueprint ของคุรุสภา</div>
  </footer>`;
  bindShell();
}

function showContactModal(initialTopic = 'verify', customUsername = '') {
  const currentUsername = customUsername || App.user?.username || '';
  const currentName = App.user?.name || '';
  
  const topics = [
    {
      id: 'verify',
      num: '1',
      title: '1. ยืนยันสิทธิ์',
      desc: 'ขออนุมัติใช้งาน / ต่ออายุแพ็กเกจ',
      badge: '🔑 ขอสิทธิ์',
      template: (u) => `1. ยืนยันสิทธิ์ - ขอเปิดสิทธิ์เข้าใช้งานระบบ TestSkill
ชื่อผู้ใช้: @${u || '(กรอกไอดีของคุณที่นี่)'}${currentName ? `\nชื่อ: ${currentName}` : ''}
ขอความกรุณาแอดมินตรวจสอบและเปิดสิทธิ์การใช้งานครับ/ค่ะ`
    },
    {
      id: 'dev',
      num: '2',
      title: '2. ติดต่อผู้พัฒนา',
      desc: 'ปรึกษาและพูดคุยกับผู้พัฒนาโดยตรง',
      badge: '👨‍💻 ผู้พัฒนา',
      template: (u) => `2. ติดต่อผู้พัฒนา - ติดต่อคุณภาณุวัฒน์ (ผู้สร้างระบบ TestSkill)
ชื่อผู้ใช้: @${u || '-'}
เรื่องที่ต้องการติดต่อ: `
    },
    {
      id: 'issue',
      num: '3',
      title: '3. แจ้งปัญหาการใช้งาน',
      desc: 'พบข้อผิดพลาดในระบบหรือข้อสอบ',
      badge: '🛠️ แจ้งปัญหา',
      template: (u) => `3. แจ้งปัญหาการใช้งาน - ระบบ TestSkill
ชื่อผู้ใช้: @${u || '-'}
รายละเอียดปัญหาที่พบ: 
(เช่น ข้อสอบข้อที่... หรือระบบแสดงผลผิดปกติ)`
    },
    {
      id: 'other',
      num: '4',
      title: '4. สอบถาม อื่นๆ',
      desc: 'คำถามทั่วไป ข้อมูลหลักสูตร หรือแพ็กเกจ',
      badge: '❓ สอบถาม',
      template: (u) => `4. สอบถาม อื่นๆ - สอบถามข้อมูลเกี่ยวกับระบบ TestSkill
คำถาม / ข้อสงสัย: `
    }
  ];

  let selectedTopicId = initialTopic;
  if (!topics.some((t) => t.id === selectedTopicId)) selectedTopicId = 'verify';

  modal({
    title: '💬 ติดต่อแอดมิน & แชทอัตโนมัติ LINE',
    wide: true,
    body: `
      <div class="line-contact-modal-body">
        <div class="line-bot-hero-bar">
          <div class="line-bot-hero-info">
            <div class="line-bot-hero-tags">
              <span class="line-badge">LINE Official Bot</span>
              <span class="chip chip-success chip-xs">⚡ แชทอัตโนมัติ 24 ชม.</span>
            </div>
            <b>Line Bot : <span class="grad-text">@430lkurz</span> <small class="muted">(หรือไอดีแอดมิน: Panuwat_99999)</small></b>
            <small class="muted">เลือกหัวข้อด้านล่าง ระบบจะจัดเตรียมข้อความส่งให้บอทในแชททันที</small>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" id="btnToggleQrView">🔍 ดู QR Code</button>
        </div>

        <div class="line-qr-expandable hidden" id="lineQrExpandable">
          <div class="qr-frame">
            <img src="assets/line-qr.jpg" alt="LINE QR Code">
          </div>
          <small class="muted">แอดไลน์ไอดี: <b>@430lkurz</b> (LINE Bot) หรือ <b>Panuwat_99999</b> (แอดมิน)</small>
        </div>

        <div class="line-topics-label">
          <b>เลือกหัวข้อที่ต้องการติดต่อ (LINE Chat Bot):</b>
        </div>
        <div class="line-topics-grid">
          ${topics.map((t) => `
            <button type="button" class="line-topic-btn ${t.id === selectedTopicId ? 'active' : ''}" data-topic="${t.id}">
              <div class="line-topic-head">
                <span class="line-topic-num">${t.num}</span>
                <b>${t.title}</b>
              </div>
              <small class="muted">${t.desc}</small>
            </button>
          `).join('')}
        </div>

        <div class="line-msg-preview-wrap">
          <div class="line-msg-preview-head">
            <span>📝 ข้อความที่จะส่งไปยัง LINE Bot:</span>
            <small class="muted">(สามารถแก้ไขหรือพิมพ์เพิ่มเติมได้)</small>
          </div>
          <textarea class="input line-msg-textarea" id="lineMsgText" rows="4"></textarea>
        </div>

        <div class="line-modal-actions-bar">
          <button type="button" class="btn btn-primary" id="btnCopyAndOpenLine">
            📋 คัดลอกข้อความ & เปิด LINE Bot (@430lkurz)
          </button>
          <button type="button" class="btn btn-outline" id="btnCopyLineIdOnly">
            📋 คัดลอกไอดีบอท (@430lkurz)
          </button>
          <a class="btn btn-ghost" href="https://line.me/ti/p/~Panuwat_99999" target="_blank" rel="noopener" title="แอดไลน์แอดมินคุณภาณุวัฒน์โดยตรง">
            คุยกับแอดมินโดยตรง (Panuwat_99999) ↗
          </a>
        </div>
      </div>`,
    actions: [{ label: 'ปิดหน้าต่าง', value: null }],
    onMount: (bodyEl) => {
      const msgArea = bodyEl.querySelector('#lineMsgText');
      const qrBox = bodyEl.querySelector('#lineQrExpandable');
      const toggleQrBtn = bodyEl.querySelector('#btnToggleQrView');

      const updateTopicView = (topicId) => {
        selectedTopicId = topicId;
        bodyEl.querySelectorAll('.line-topic-btn').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.topic === topicId);
        });
        const matched = topics.find((t) => t.id === topicId) || topics[0];
        msgArea.value = matched.template(currentUsername);
      };

      updateTopicView(selectedTopicId);

      bodyEl.querySelectorAll('.line-topic-btn').forEach((btn) => {
        btn.onclick = () => updateTopicView(btn.dataset.topic);
      });

      toggleQrBtn.onclick = () => {
        const isHidden = qrBox.classList.toggle('hidden');
        toggleQrBtn.textContent = isHidden ? '🔍 ดู QR Code' : '▲ ซ่อน QR Code';
      };

      bodyEl.querySelector('#btnCopyAndOpenLine').onclick = async () => {
        const text = msgArea.value.trim();
        try {
          await navigator.clipboard?.writeText(text);
          toast('คัดลอกข้อความแล้ว! กำลังเปิดแชท LINE Bot (@430lkurz)…', 'success');
        } catch {
          toast('กำลังเปิดแอป LINE…', 'info');
        }
        setTimeout(() => {
          window.open('https://page.line.me/430lkurz', '_blank', 'noopener');
        }, 300);
      };

      bodyEl.querySelector('#btnCopyLineIdOnly').onclick = async () => {
        try {
          await navigator.clipboard?.writeText('@430lkurz');
          toast('คัดลอก LINE Bot ID: @430lkurz เรียบร้อยแล้ว', 'success');
        } catch {
          toast('LINE Bot ID: @430lkurz', 'info');
        }
      };
    }
  });
}

function bindShell() {
  $$('.theme-toggle').forEach((b) => (b.onclick = Theme.toggle));
  $$('[data-open-qr]').forEach((b) => (b.onclick = () => showContactModal(b.dataset.contactTopic || 'verify')));
  $$('[data-copy-line]').forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.copyLine || 'Panuwat_99999';
    navigator.clipboard?.writeText(id);
    toast(`คัดลอก Line ID: ${id} เรียบร้อยแล้ว`, 'success');
  }));
  const btn = $('#userMenuBtn'), menu = $('#userMenu');
  if (!btn) return;
  btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
  document.onclick = () => menu.classList.remove('open');
  menu.querySelector('[data-act=logout]').onclick = () => Auth.logout();
  menu.querySelector('[data-act=pw]').onclick = () => changePasswordDialog();
}

async function changePasswordDialog(force = false) {
  const res = await modal({
    title: force ? 'กรุณาตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน',
    dismissible: !force,
    body: `${force ? '<p class="alert alert-warning">คุณกำลังใช้รหัสผ่านเริ่มต้น เพื่อความปลอดภัยกรุณาเปลี่ยนรหัสผ่าน</p>' : ''}
      <label class="field"><span>รหัสผ่านเดิม</span><input class="input" type="password" name="old"></label>
      <label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</span><input class="input" type="password" name="n1"></label>
      <label class="field"><span>ยืนยันรหัสผ่านใหม่</span><input class="input" type="password" name="n2"></label>`,
    actions: [...(force ? [] : [{ label: 'ยกเลิก', value: null }]), {
      label: 'บันทึก', cls: 'btn-primary', onClick: async (b) => {
        const old = b.querySelector('[name=old]').value, n1 = b.querySelector('[name=n1]').value, n2 = b.querySelector('[name=n2]').value;
        const u = await Repo.getUser(App.user.id);
        if (u.passHash !== (await hashPassword(u.username, old))) { toast('รหัสผ่านเดิมไม่ถูกต้อง', 'error'); return false; }
        if (n1.length < 6) { toast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'error'); return false; }
        if (n1 !== n2) { toast('ยืนยันรหัสผ่านไม่ตรงกัน', 'error'); return false; }
        await Repo.updateUser(u.id, { passHash: await hashPassword(u.username, n1), mustChangePassword: false });
        return true;
      }
    }]
  });
  if (res) toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'success');
}

/* ===== Boot ===== */
(async function boot() {
  Theme.init();
  try {
    await Repo.init();
    // นำเข้าสรุปเนื้อหาเรื่อง 01 เริ่มต้น (หากยังไม่มี)
    if (!(await Repo.getSummary('01'))) {
      const summaryText = `# สรุปเนื้อหา เรื่องที่ 01: การเปลี่ยนแปลงบริบทโลก และแนวคิดปรัชญาของเศรษฐกิจพอเพียง
(ตาม Test Blueprint คุรุสภา)

## 1. การเปลี่ยนแปลงของบริบทโลก
* **VUCA สู่ BANI World:**
  - VUCA: Volatility (ผันผวน), Uncertainty (ไม่แน่นอน), Complexity (ซับซ้อน), Ambiguity (คลุมเครือ)
  - BANI: Brittle (เปราะบาง), Anxious (วิตกกังวล), Nonlinear (ไม่เป็นเส้นตรง), Incomprehensible (เข้าใจยาก)
* **Digital Disruption & อุตสาหกรรม 4.0:** การเปลี่ยนแปลงฉับพลันด้วยเทคโนโลยี เช่น AI, Big Data, IoT
* **โครงสร้างประชากร (Aging Society):** ประเทศไทยเข้าสู่ "สังคมสูงวัยอย่างสมบูรณ์" (Aged Society) ในปี 2564 (ผู้สูงอายุเกิน 20%)
* **SDGs 2030 (17 เป้าหมาย):** 5 มิติ (People, Prosperity, Planet, Peace, Partnership) โดยเป้าหมาย SDG 4 คือ Quality Education
* **ทักษะศตวรรษที่ 21:** 3Rs (Reading, Writing, Arithmetic) และ 8Cs

## 2. ปรัชญาของเศรษฐกิจพอเพียง
* **3 ห่วง:**
  1. **ความพอประมาณ:** พอดี ไม่น้อยเกินไป ไม่มากเกินไป ไม่เบียดเบียนตนเองและผู้อื่น
  2. **ความมีเหตุผล:** ตัดสินใจโดยคำนึงถึงเหตุและผลกระทบอย่างรอบคอบ
  3. **การมีภูมิคุ้มกันที่ดีในตัว:** เตรียมพร้อมรับความเสี่ยงและการเปลี่ยนแปลง
* **2 เงื่อนไข:**
  1. **เงื่อนไขความรู้:** รอบรู้ รอบคอบ ระมัดระวัง
  2. **เงื่อนไขคุณธรรม:** ซื่อสัตย์สุจริต ขยัน อดทน มีสติปัญญา
* **เกษตรทฤษฎีใหม่ (30:30:30:10):** แหล่งน้ำ 30% : นาข้าว 30% : พืชไร่พืชสวน 30% : ที่อยู่อาศัยและเลี้ยงสัตว์ 10%`;
      await Repo.saveSummary('01', { name: 'สรุปบริบทโลกและเศรษฐกิจพอเพียง (Test Blueprint).md', kind: 'text', content: summaryText, updatedAt: Date.now() });
    }
    // นำเข้าสรุปเนื้อหาเรื่อง 02 เริ่มต้น (หากยังไม่มี)
    if (!(await Repo.getSummary('02'))) {
      const summary02 = `# สรุปเนื้อหา เรื่องที่ 02: จิตวิทยาพัฒนาการ จิตวิทยาการศึกษา และจิตวิทยาให้คำปรึกษาในการวิเคราะห์และพัฒนาผู้เรียนตามศักยภาพ
(ตาม Test Blueprint คุรุสภา — 25 ข้อ)

## 1. โครงสร้างข้อสอบตามผัง Test Blueprint (25 ข้อ)
* **เข้าใจธรรมชาติของผู้เรียน (9 ข้อ):** วิเคราะห์บริบท พฤติกรรม ความแตกต่างระหว่างบุคคล และประยุกต์หลักจิตวิทยาพัฒนาการ
* **ช่วยเหลือและสนับสนุนการเรียนรู้ของผู้เรียนให้เต็มตามศักยภาพ (8 ข้อ):** การใช้คำถามเพื่อให้เด็กรู้จักตนเอง การเรียนรู้ด้วยตนเอง (Self-directed learning) และการประยุกต์จิตวิทยาการศึกษา
* **ให้คำแนะนำช่วยเหลือผู้เรียนให้มีคุณภาพชีวิตที่ดีขึ้น (8 ข้อ):** ระบบดูแลช่วยเหลือนักเรียน การร่วมมือกับผู้ปกครอง (Collaboration) การแก้ปัญหา Bullying และจิตวิทยาการให้คำปรึกษา (Deep Listening, Inquiry)

## 2. จิตวิทยาเบื้องต้น พฤติกรรม และแรงจูงใจ
* **จุดมุ่งหมายของจิตวิทยา (4 ขั้น):** เข้าใจ -> อธิบาย -> ทำนาย -> ควบคุม (เปลี่ยนแปลงพฤติกรรม)
* **ประเภทของพฤติกรรม:**
  - **พฤติกรรมภายนอก (Overt):** โมลาร์ (เห็นด้วยตาเปล่า เช่น เดิน พูด) และ โมเลกุล (ต้องใช้เครื่องมือวัด เช่น คลื่นสมอง ชีพจร)
  - **พฤติกรรมภายใน (Covert):** ความคิด ความจำ ความรู้สึก การรับรู้
  - **พฤติกรรมที่ไม่จัดเป็นการเรียนรู้:** ปฏิกิริยาสะท้อน (Reflex เช่น เหยียบของร้อนแล้วชักเท้าหนี กะพริบตา), วุฒิภาวะ, สัญชาตญาณ, ฤทธิ์ยา/ความเหนื่อยล้า
* **กระบวนการจูงใจ:** ความต้องการ (Needs) -> แรงขับ (Drive) -> สิ่งล่อใจ (Incentive)
* **การใช้คำถามปลายเปิดเพื่อช่วยให้เด็กเข้าใจตนเอง:**
  1. ถามถึงเหตุผล (Reasons): "ที่หนูตัดสินใจแบบนี้เพราะอะไร"
  2. ถามถึงหลักการ (Evidence): "ทำไมวิธีนี้จึงเป็นวิธีที่ดีที่สุด"
  3. ถามถึงขั้วตรงข้าม (Argument): "ฝ่ายที่ไม่เห็นด้วย เขาคิดอย่างไร"
  4. ถามถึงผลกระทบต่อผู้อื่น (Impact): "การกระทำนี้ส่งผลต่อคนอื่นอย่างไร"
  5. ถามถึงผลลัพธ์ (Consequences): "เมื่อทำสิ่งนี้แล้ว อะไรจะเกิดขึ้นตามมา"
  6. ถามถึงบทเรียนที่ได้รับ (Reflection): "อะไรคือสิ่งดีๆ ที่ได้เรียนรู้ และครั้งต่อไปจะทำอย่างไร"

## 3. ทฤษฎีการเรียนรู้ที่ออกสอบบ่อยที่สุด
* **ธอร์นไดก์ (Thorndike — สัมพันธ์เชื่อมโยง / ลองผิดลองถูก):**
  1. **กฎแห่งความพร้อม (Law of Readiness):** ร่างกายและจิตใจพร้อมจึงเรียนรู้ได้ดี (เช่น เด็กง่วงนอน = ไม่พร้อม)
  2. **กฎแห่งการฝึกหัด (Law of Exercise):** ยิ่งทำซ้ำบ่อยยิ่งชำนาญ
  3. **กฎแห่งผล/ความพึงพอใจ (Law of Effect):** ทำแล้วได้ผลที่พึงพอใจจะอยากทำซ้ำอีก
* **สกินเนอร์ (Skinner — การวางเงื่อนไขแบบการกระทำ Operant Conditioning):**
  - **การเสริมแรงทางบวก (+):** เพิ่มพฤติกรรมดี โดย *ให้สิ่งที่ชอบ* (เช่น ส่งงานแล้วบวกคะแนน / ให้ดาว / ชมเชย)
  - **การเสริมแรงทางลบ (-):** เพิ่มพฤติกรรมดี โดย *ลดหรือถอนสิ่งที่ไม่ชอบออก* (เช่น ถ้าตั้งใจเรียนไม่คุยกัน จะลดการบ้านจาก 50 ข้อเหลือ 10 ข้อ)
  - **การลงโทษทางบวก (+):** ลดพฤติกรรมไม่ดี โดย *เพิ่มสิ่งที่ไม่ชอบเข้าไป* (เช่น ไม่ทำการบ้าน จึงสั่งให้คัดคำศัพท์ 20 คำ)
  - **การลงโทษทางลบ (-):** ลดพฤติกรรมไม่ดี โดย *ยึดหรือถอนสิ่งที่ชอบออกไป* (เช่น เล่นเกมในเวลาเรียนจึงยึดโทรศัพท์ / แย่งกันตอบเสียงดังจึงหักคะแนนกลุ่ม)
* **พาฟลอฟ (Pavlov):** การวางเงื่อนไขแบบคลาสสิก (เสียงกระดิ่งคู่กับผงเนื้อจนสุนัขน้ำลายไหล)
* **โคห์เลอร์ (Kohler — เกสตัลท์):** การเรียนรู้แบบหยั่งเห็น (Insight Learning — ลิงชิมแปนซีต่อไม้ไผ่สอยกล้วย) และการรับรู้ภาพรวมก่อนส่วนย่อย
* **แบนดูรา (Bandura):** การเรียนรู้ทางสังคมและการสังเกตเลียนแบบตัวแบบ (Modeling) 4 ขั้น: ใส่ใจ -> จดจำ -> ลงมือทำตามแบบ -> จูงใจ
* **จอห์น ดิวอี้ (John Dewey):** การเรียนรู้จากการลงมือปฏิบัติจริง (Learning by Doing)

## 4. จิตวิทยาพัฒนาการ (Developmental Psychology)
* **ช่วงวัย:** วัยทารก (0-2 ปี), วัยเด็กตอนต้น/ปฐมวัย (2-6 ปี), วัยเด็กตอนกลาง/ประถม (6-12 ปี), วัยรุ่น (12-18 ปี)
* **พัฒนาการทางสติปัญญา 4 ขั้นของเพียเจต์ (Piaget):**
  1. **Sensorimotor (0-2 ปี):** ประสาทสัมผัสและการเคลื่อนไหว เข้าใจความคงอยู่ของวัตถุ
  2. **Pre-operational (2-7 ปี):** เริ่มใช้ภาษา ชอบเล่นบทบาทสมมติ ยึดตนเองเป็นศูนย์กลาง (Egocentrism)
  3. **Concrete Operational (7-11 ปี):** คิดเชิงรูปธรรม คิดย้อนกลับได้ (Reversibility) เข้าใจหลักการอนุรักษ์ (Conservation)
  4. **Formal Operational (11-12 ปีขึ้นไป):** คิดเชิงนามธรรม (Abstract Thinking) ตั้งสมมติฐานได้
* **พัฒนาการทางจิตสังคม 8 ขั้นของอีริคสัน (Erikson):**
  - อนุบาล (3-6 ปี): ความคิดริเริ่ม vs ความรู้สึกผิด (Initiative vs Guilt — ช่างซักถาม เล่นสมมติ)
  - ประถม (6-12 ปี): ความขยันหมั่นเพียร vs ความรู้สึกด้อย (Industry vs Inferiority)
  - วัยรุ่น (12-18 ปี): การมีอัตลักษณ์แห่งตน vs ความสับสนในบทบาท (Identity vs Role Confusion — ค้นหาตัวตน เลือกสายเรียน เลียนแบบไอดอล)
* **พัฒนาการทางจริยธรรมของโคลเบิร์ก (Kohlberg):**
  - ระดับก่อนกฎเกณฑ์: ขั้นที่ 1 กลัวถูกลงโทษ / ขั้นที่ 2 แสวงหารางวัลแลกเปลี่ยน
  - ระดับตามกฎเกณฑ์: ขั้นที่ 3 เด็กดีทำตามที่เพื่อนและสังคมยอมรับ / ขั้นที่ 4 ทำตามกฎหมายและระเบียบ
  - ระดับเหนือกฎเกณฑ์: ขั้นที่ 5 สัญญาสังคม / ขั้นที่ 6 หลักคุณธรรมสากล
* **พัฒนาการทางเพศ 5 ขั้นของฟรอยด์ (Freud):** ขั้นปาก (0-1.5 ปี ชะงักงันจะชอบสูบบุหรี่/กัดเล็บ/พูดถากถาง) -> ขั้นทวารหนัก -> ขั้นอวัยวะเพศ (ปม Oedipus/Electra) -> ขั้นแฝง (ประถม คบเพื่อนเพศเดียวกัน) -> ขั้นสนใจเพศตรงข้าม (วัยรุ่น)
* **ลำดับขั้นความต้องการ 5 ขั้นของมาสโลว์ (Maslow):** ร่างกาย -> ความปลอดภัย -> ความรักและเป็นส่วนหนึ่งของกลุ่ม -> การยกย่องนับถือและเห็นคุณค่าในตนเอง (รางวัลเรียนดี/เกียรติยศ) -> การเข้าใจและพัฒนาศักยภาพสูงสุดของตน (Self-Actualization)

## 5. การแนะแนว การให้คำปรึกษา และระบบดูแลช่วยเหลือนักเรียน
* **3 ขอบข่ายงานแนะแนว:** 1) การศึกษา 2) อาชีพ 3) ส่วนตัวและสังคม (อารมณ์ การปรับตัว ความสัมพันธ์)
* **5 บริการแนะแนว:** 1) รวบรวมข้อมูลรายบุคคล (ระเบียนสะสม, สังคมมิติ, Case Study) 2) สารสนเทศ 3) ให้คำปรึกษา (หัวใจของงานแนะแนว) 4) จัดวางตัวบุคคล 5) ติดตามประเมินผล
* **ระบบการดูแลช่วยเหลือนักเรียน 5 ขั้นตอน:**
  1. การรู้จักนักเรียนเป็นรายบุคคล
  2. การคัดกรองนักเรียน (ปกติ / เสี่ยง / มีปัญหา)
  3. การส่งเสริมและพัฒนานักเรียน
  4. การป้องกันและแก้ไขปัญหา
  5. การส่งต่อ (ภายใน และ ภายนอก เช่น ส่งจิตแพทย์เมื่อมีภาวะซึมเศร้า/ทำร้ายตนเอง)
* **เครื่องมือวัดทางจิตวิทยา:** IQ (สติปัญญา), EQ (อารมณ์), AQ (การเผชิญและฟันฝ่าอุปสรรค), MQ (ศีลธรรม), CQ (ความคิดสร้างสรรค์), สังคมมิติ (ความสัมพันธ์ในกลุ่มเพื่อน), การศึกษารายกรณี (Case Study — ศึกษาเชิงลึกสำหรับเด็กที่มีปัญหาซับซ้อน)`;
      await Repo.saveSummary('02', { name: 'สรุปจิตวิทยาพัฒนาการ การศึกษา และให้คำปรึกษา (Test Blueprint).md', kind: 'text', content: summary02, updatedAt: Date.now() });
    }
    // นำเข้าสรุปเนื้อหาเรื่อง 03 เริ่มต้น (หากยังไม่มี)
    if (!(await Repo.getSummary('03'))) {
      const summary03 = `# สรุปเนื้อหา เรื่องที่ 03: หลักสูตร ศาสตร์การสอน และเทคโนโลยีดิจิทัลในการจัดการเรียนรู้
(ตาม Test Blueprint คุรุสภา — 30 ข้อ)

## 1. โครงสร้างข้อสอบตามผัง Test Blueprint (รวม 30 ข้อ)
1. **วิเคราะห์ จัดทำ ใช้ ประเมิน และพัฒนาหลักสูตรของสถานศึกษาได้ (5 ข้อ)**
2. **จัดทำแผนการจัดการเรียนรู้และนำไปสู่การปฏิบัติให้เกิดผลจริงได้อย่างเหมาะสมกับผู้เรียน (10 ข้อ)**
3. **การบริหารจัดการชั้นเรียนให้ผู้เรียนเกิดการเรียนรู้ได้ (7 ข้อ)**
4. **ใช้เทคโนโลยีสารสนเทศเพื่อการสื่อสารได้ (3 ข้อ)**
5. **แสวงหาแหล่งเรียนรู้ที่หลากหลายให้แก่ผู้เรียนได้ (2 ข้อ)**
6. **ประยุกต์ใช้หรือพัฒนาสื่อและนวัตกรรมเพื่อการเรียนรู้ของผู้เรียนได้ (3 ข้อ)**

## 2. หลักสูตรและการพัฒนาหลักสูตร
* **ความหมายหลักสูตร:** มวลประสบการณ์ทั้งหมดที่สถานศึกษาจัดให้ผู้เรียนทั้งในและนอกห้องเรียน (**โบชอง: SOPEA** = Subject, Object, Plan, Experiences, Activities)
* **องค์ประกอบของหลักสูตร (4 ส่วน):** 1) จุดมุ่งหมาย 2) เนื้อหาสาระและประสบการณ์ 3) การนำหลักสูตรไปใช้ (*สำคัญที่สุด! การสอนเป็นหัวใจของการนำหลักสูตรไปใช้*) 4) การประเมินผลหลักสูตร (*ประเมินครบ 4 มิติ: เอกสาร + การใช้ + สัมฤทธิผล + ระบบ*)
* **ลักษณะของหลักสูตรที่ดี (F-SMART):** Flexible (ยืดหยุ่น), Specific (ชัดเจน), Measurable (วัดผลได้), Reasonable (สมเหตุสมผล), Timeline (กำหนดเวลาชัดเจน)
* **ขั้นตอนการพัฒนาหลักสูตร (5 ขั้นตอน):**
  1. **วิเคราะห์ข้อมูลพื้นฐาน (สำคัญเป็นอันดับแรก!):** ศึกษาความต้องการของผู้เรียน ชุมชน สังคม ยุทธศาสตร์ชาติ และหลักสูตรแกนกลาง
  2. กำหนดจุดมุ่งหมายของหลักสูตร
  3. คัดเลือกและจัดเนื้อหาสาระและมวลประสบการณ์
  4. นำหลักสูตรไปใช้
  5. ประเมินผลและวิจัยติดตามผลการใช้หลักสูตร
* **ปรัชญาการศึกษา 5 ปรัชญา:**
  - **สารัตถนิยม (Bagley) & นิรันตรนิยม (Hutchins):** เน้นเนื้อหาวิชาและครูเป็นศูนย์กลาง (*เน้นผู้เรียนเป็นสำคัญน้อยที่สุด*)
  - **พิพัฒนาการนิยม (John Dewey):** เรียนรู้จากการลงมือทำ (*Learning by Doing*) และการแก้ปัญหา เน้นผู้เรียนเป็นศูนย์กลาง
  - **ปฏิรูปนิยม (Brameld):** เน้นแก้ปัญหาสังคมและสร้างสังคมประชาธิปไตยใหม่
  - **อัตถิภาวนิยม:** ผู้เรียนมีอิสระและเสรีภาพในการเลือกเรียนตามความต้องการมากที่สุด
* **Backward Design (การออกแบบย้อนกลับ 3 ขั้น):** 1) กำหนดเป้าหมายการเรียนรู้ (จากมาตรฐาน/ตัวชี้วัด) -> 2) กำหนดหลักฐานร่องรอยการเรียนรู้และการวัดผล -> 3) ออกแบบกิจกรรมการเรียนรู้

## 3. หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง พ.ศ. 2560)
* **ผู้ลงนามประกาศใช้:** รัฐมนตรีว่าการกระทรวงศึกษาธิการ / **ผู้มีอำนาจยกเลิก เพิ่มเติม เปลี่ยนแปลง:** เลขาธิการ กพฐ. โดยความเห็นชอบของ กพฐ.
* **ฉบับปรับปรุง 2560:** ปรับปรุงกลุ่มสาระ **คณิตศาสตร์, วิทยาศาสตร์และเทคโนโลยี (รวมวิทยาการคำนวณ Coding), และสาระภูมิศาสตร์** และเปลี่ยนชื่อเป็นกลุ่มสาระ **การงานอาชีพ**
* **สมรรถนะสำคัญของผู้เรียน 5 ประการ:** 1) การสื่อสาร 2) การคิด 3) การแก้ปัญหา 4) การใช้ทักษะชีวิต 5) การใช้เทคโนโลยี
* **คุณลักษณะอันพึงประสงค์ 8 ประการ:** 1) รักชาติ ศาสน์ กษัตริย์ 2) ซื่อสัตย์สุจริต 3) มีวินัย 4) ใฝ่เรียนรู้ 5) อยู่อย่างพอเพียง 6) มุ่งมั่นในการทำงาน 7) รักความเป็นไทย 8) มีจิตสาธารณะ
* **ตัวชี้วัด:**
  - **ตัวชี้วัดชั้นปี:** ใช้กับการศึกษาภาคบังคับ (**ป.1 – ม.3**) / **ตัวชี้วัดช่วงชั้น:** ใช้กับ ม.ปลาย (**ม.4 – ม.6**)
  - **ตัวชี้วัดระหว่างทาง (1,285 ตัวชี้วัด):** ประเมินเพื่อพัฒนาผู้เรียน (Formative) แบบไม่เป็นทางการ / **ตัวชี้วัดปลายทาง (771 ตัวชี้วัด):** ประเมินเพื่อตัดสินผล (Summative) แบบเป็นทางการ
* **การจัดเวลาเรียนและเกณฑ์การจบ:**
  - **ประถมศึกษา:** จัดเป็น **รายปี** (วันละไม่เกิน 5 ชม.) ให้เกรดได้ทั้งตัวเลข ตัวอักษร ร้อยละ หรือคำสะท้อนมาตรฐาน
  - **มัธยมศึกษา:** จัดเป็น **รายภาค** ตัดสินผลด้วย **ระบบตัวเลข 8 ระดับเท่านั้น** (0, 1, 1.5, 2, 2.5, 3, 3.5, 4) เกณฑ์จบ ม.ต้น รวมไม่น้อยกว่า 77 หน่วยกิต (พื้นฐาน 66 + เพิ่มเติม 11) และ ม.ปลาย รวมไม่น้อยกว่า 77 หน่วยกิต (พื้นฐาน 41 + เพิ่มเติม 36)
* **เอกสาร ปพ.1 – ปพ.9:** กระทรวงศึกษาธิการกำหนด 3 แบบ คือ **ปพ.1 (ระเบียนแสดงผลการเรียน), ปพ.2 (ประกาศนียบัตร), ปพ.3 (แบบรายงานผู้สำเร็จการศึกษา)** ส่วน ปพ.4 – ปพ.9 สถานศึกษากำหนด

## 4. แผนการจัดการเรียนรู้และศาสตร์การสอนเชิงรุก (Active Learning)
* **องค์ประกอบหลักของแผนการสอน (OLE):** จุดประสงค์การเรียนรู้ **O (KPA)** <-> กิจกรรมการเรียนรู้ **L (ขั้นนำ ขั้นสอน ขั้นสรุป)** <-> การวัดและประเมินผล **E/A** ต้องสอดคล้องกันทุกด้าน
* **CIPPA Model (ทิศนา แขมมณี):** Construct (สร้างความรู้เอง), Interaction (ปฏิสัมพันธ์), Physical Participation (มีส่วนร่วมทางกาย), Process Learning (เรียนรู้กระบวนการ), Application (ประยุกต์ใช้)
* **4MAT (McCarthy):** พัฒนาสมอง 2 ซีกตามผู้เรียน 4 แบบ (Why ทำไม, What อะไร, How อย่างไร, If ถ้า...)
* **สืบเสาะหาความรู้ 5E:** Engagement (สร้างความสนใจ) -> Exploration (สำรวจค้นหา) -> Explanation (อธิบายและสรุป) -> Elaboration (ขยายความรู้) -> Evaluation (ประเมินผล)
* **การเรียนรู้แบบร่วมมือ:** **Jigsaw** (กลุ่มบ้าน Home Group แยกไปศึกษากับกลุ่มผู้เชี่ยวชาญ Expert Group), **STAD** (ติวช่วยกันแล้วสอบเดี่ยว), **TGT** (แข่งขันตามโต๊ะความสามารถ), **TAI** (จับคู่ตรวจสอบช่วยกัน)
* **การบูรณาการ 4 รูปแบบ:** 1) **สอดแทรก (Infusion):** ครูคนเดียวแทรกวิชาอื่น 2) **คู่ขนาน (Parallel):** ครู 2+ คนวางแผนสอนเรื่องเดียวกันแยกวิชา 3) **สหวิทยาการ (Multidisciplinary):** ครูหลายวิชาวางแผนสอนและมอบหมายชิ้นงาน/โครงงานร่วมกัน 4) **พหุวิทยาการ/ข้ามวิชา (Transdisciplinary):** ร่วมสอนเป็นทีม (Team Teaching)
* **หมวกความคิด 6 ใบ (De Bono):** ขาว (ข้อเท็จจริง), แดง (อารมณ์), ดำ (ระมัดระวัง/จุดอ่อน), เหลือง (มองแง่ดี/จุดเด่น), เขียว (ความคิดสร้างสรรค์นอกกรอบ), น้ำเงิน (ควบคุมและสรุปความคิด)
* **หลักการสอน 9 ขั้นของกาเย่ (Gagne):** ขั้นที่ 1 เร่งเร้าความสนใจ -> 2. บอกวัตถุประสงค์ -> 3. ทบทวนความรู้เดิม -> 4. นำเสนอเนื้อหาใหม่ -> 5. ชี้แนะแนวทาง -> 6. กระตุ้นการตอบสนอง -> 7. ให้ข้อมูลย้อนกลับ -> 8. ทดสอบความรู้ใหม่ -> ขั้นที่ 9 สรุปและนำไปใช้

## 5. การบริหารจัดการชั้นเรียน & เทคโนโลยีดิจิทัล
* **บรรยากาศในชั้นเรียน:** ชั้นเรียนแบบนวัตกรรม (จัดโต๊ะตัวยู/วงกลม/กลุ่มย่อย ยืดหยุ่นตามกิจกรรม) โต๊ะแถวหน้าห่างกระดานดำ **ไม่น้อยกว่า 3 เมตร** ป้ายนิเทศติดที่ **ฝาผนังห้องเรียน** และลดการเปรียบเทียบ/จัดอันดับระหว่างผู้เรียน
* **กรวยประสบการณ์ของเอ็ดการ์ เดล (Edgar Dale):** รูปธรรมมากที่สุด (ได้ประสบการณ์มากที่สุด) คือ **การลงมือปฏิบัติจริงและสถานการณ์จำลอง** ส่วนนามธรรมมากที่สุด (ได้ประสบการณ์น้อยที่สุด) คือ **วจนสัญลักษณ์ (การอ่านตัวอักษร/ฟังบรรยาย)**
* **การเลือกใช้สื่อและเทคโนโลยีดิจิทัล:**
  - **หลักการเลือกสื่ออันดับ 1:** ต้องสอดคล้องกับจุดประสงค์การเรียนรู้ และเหมาะสมกับวัยของผู้เรียน
  - **CAI & บทเรียนสำเร็จรูป:** หัวใจสำคัญคือแก้ปัญหาความแตกต่างระหว่างบุคคล ให้เรียนรู้ด้วยตนเองตามศักยภาพ
  - **DLTV:** การศึกษาทางไกลผ่านดาวเทียมสำหรับโรงเรียนขนาดเล็ก (ครูไม่ครบชั้น) / **DLIT:** เทคโนโลยีสารสนเทศสำหรับโรงเรียนขนาดกลางและใหญ่
  - **แอปพลิเคชันดิจิทัล:** Google Docs/Slides (ทำงานกลุ่มร่วมกัน), Padlet/Mentimeter (ระดมความคิดเห็นกลุ่ม), Kahoot/Quizizz/Wordwall/Liveworksheets (เกมและใบงานวัดผลออนไลน์), Google Classroom (LMS ทบทวนบทเรียน), Google Sites (รวบรวมผลงาน), Google Meet/Zoom (ประชุมและ PLC ออนไลน์), AR/VR (การทดลองเสมือนจริง)
  - **พลเมืองดิจิทัล & ลิขสิทธิ์:** ตรวจสอบความน่าเชื่อถือของข้อมูลก่อนแชร์ (ใช้ Fact-checker AI ช่วยตรวจสอบได้) เคารพความเป็นส่วนตัว และการนำภาพหรือเปิดเพลง YouTube ในร้านกาแฟเพื่อการค้าโดยไม่ได้รับอนุญาตถือว่า **ละเมิดลิขสิทธิ์**`;
      await Repo.saveSummary('03', { name: 'สรุปหลักสูตร ศาสตร์การสอน และเทคโนโลยีดิจิทัล (Test Blueprint).md', kind: 'text', content: summary03, updatedAt: Date.now() });
    }
    // นำเข้าสรุปเนื้อหาเรื่อง 04 เริ่มต้น (หากยังไม่มี)
    if (!(await Repo.getSummary('04'))) {
      const summary04 = `# สรุปเนื้อหา เรื่องที่ 04: การวัดผล และประเมินผลการเรียนรู้ และการวิจัยเพื่อแก้ปัญหาและพัฒนาผู้เรียน
(ตาม Test Blueprint คุรุสภา — 25 ข้อ)

## 1. โครงสร้างข้อสอบตามผัง Test Blueprint (รวม 25 ข้อ)
1. **การวัดผลการเรียนรู้ (5 ข้อ):** วิเคราะห์ เชื่อมโยง แยกองค์ประกอบตัวชี้วัดการวัดผล การประเมินผล เกณฑ์ของผลสัมฤทธิ์การเรียนรู้ (2 ข้อ) / พัฒนาแบบวัดผลการจัดการเรียนรู้ครอบคลุมสมรรถนะตามผลลัพธ์การเรียนรู้ที่คาดหวัง (LO) การตรวจสอบคุณภาพเครื่องมือ และควบคุมความตรงของการวัด (3 ข้อ)
2. **การประเมินผลการเรียนรู้ (5 ข้อ):** วิเคราะห์และนำวิธีประเมินผล อิงกลุ่ม อิงเกณฑ์ และการประเมินพัฒนาการไปใช้ ซ่อม/เสริม (แก้ปัญหา) พัฒนาสู่ความเป็นเลิศ (3 ข้อ) / ประเมินด้วยข้อมูลจากหลายแหล่ง (Multisource assessment) และประเมินตามสภาพจริง (Authentic assessment) (2 ข้อ)
3. **การประยุกต์ผลการประเมินไปใช้ในการพัฒนาการเรียนการสอน (5 ข้อ):** นำผลการประเมินไปใช้พัฒนาการจัดการเรียนรู้ได้เหมาะสมตามบริบท (2 ข้อ) / สรุปผลการประเมินไปพัฒนาวิธีสอนแก้ปัญหา ซ่อม/เสริม และพัฒนาผู้เรียนสู่ความเป็นเลิศ (3 ข้อ)
4. **วิเคราะห์ปัญหาและออกแบบวิจัย (5 ข้อ):** วิเคราะห์ปัญหาการเรียนรู้ ปัญหาการจัดการเรียนรู้ และปัญหาวิจัย (2 ข้อ) / ออกแบบวิจัยพัฒนาวิธีสอน แก้ปัญหาการเรียนรู้ (ซ่อม/เสริม) และวิจัยพัฒนาผู้เรียนสู่ความเป็นเลิศ (3 ข้อ)
5. **นำผลวิจัยไปใช้ (5 ข้อ):** วิเคราะห์ผลการวิจัยนำไปประยุกต์ใช้ได้ตรงตามผลวิจัย (1 ข้อ) / ใช้ผลวิจัยพัฒนาวิธีสอนของตนเองและพัฒนาผู้เรียน (2 ข้อ) / สร้างสรรค์วิธีจัดการเรียนรู้ที่เป็นพลวัตเหมาะสมกับบริบททันยุคสมัย (2 ข้อ)

## 2. การวิจัยเพื่อแก้ปัญหาและพัฒนาผู้เรียน (Educational & Classroom Action Research)
* **ประเภทของการวิจัย:**
  - **แบ่งตามจุดมุ่งหมาย:** 1) *วิจัยเชิงพยากรณ์ (Predictive)* ทำนายแนวโน้มในอนาคต 2) *วิจัยเชิงวินิจฉัย (Diagnostic)* ศึกษา **สาเหตุของปัญหา** เพื่อหาทางช่วยเหลือแก้ไข 3) *วิจัยเชิงอรรถาธิบาย (Explanatory)* อธิบายความสัมพันธ์ระหว่างตัวแปรว่าอะไรเป็นเหตุและอะไรเป็นผล
  - **แบ่งตามลักษณะข้อมูล:** 1) *วิจัยเชิงปริมาณ (Quantitative)* เก็บตัวเลข วิเคราะห์ด้วยสถิติ ใช้แบบทดสอบ/แบบสอบถาม สรุปอ้างอิงทั่วไป 2) *วิจัยเชิงคุณภาพ (Qualitative)* เก็บข้อมูลเชิงลึก ตีความ/วิเคราะห์เนื้อหา ใช้การสัมภาษณ์ กลุ่มสนทนา การสังเกต
  - **แบ่งตามระเบียบวิธีวิจัย:** 1) *วิจัยเชิงประวัติศาสตร์ (Historical)* 2) *วิจัยเชิงทดลอง (Experimental)* ควบคุมตัวแปรและจัดกระทำ 3) *วิจัยเชิงบรรยาย/พรรณนา (Descriptive)* แบ่งเป็น เชิงสำรวจ (Survey), เชิงสหสัมพันธ์/ความสัมพันธ์ (Correlational), และเชิงพัฒนาการ (Developmental)
* **การวิจัยในชั้นเรียน (Classroom Action Research — CAR):**
  - ครูทำเพื่อแก้ปัญหาหรือพัฒนาผู้เรียนในชั้นเรียนของตนเอง **จุดเด่นสำคัญที่สุดคือ นำผลการวิจัยลงสู่การปฏิบัติจริงได้ทันที**
  - วงจร **PAOR**: **P**lan (วางแผน) -> **A**ct (ปฏิบัติตามแผน) -> **O**bserve (สังเกตผล) -> **R**eflect (สะท้อนผลความคิดเพื่อปรับปรุง)
* **ปัญหาวิจัย ชื่อเรื่อง วัตถุประสงค์ คำถามวิจัย สมมติฐาน และตัวแปร:**
  - **ปัญหาวิจัย:** ความแตกต่างระหว่างสภาพที่คาดหวังกับสภาพจริง ต้องวิเคราะห์หา **ต้นเหตุรากเหง้า** (เช่น เด็กคุยเสียงดังและเบื่อเรียน *เพราะไม่เข้าใจบทเรียน* -> ปัญหาวิจัยคือ **"ไม่เข้าใจบทเรียน"**)
  - **ชื่อเรื่องวิจัย:** \`วิธีการ/นวัตกรรม (ตัวแปรต้น) + ประเด็นที่พัฒนา (ตัวแปรตาม) + กลุ่มเป้าหมาย + พื้นที่\` (ต้องแสดงความสัมพันธ์ของตัวแปรที่ศึกษาชัดเจน)
  - **วัตถุประสงค์การวิจัย:** ขึ้นต้นด้วยคำว่า **"เพื่อ..."** (เช่น เพื่อศึกษา... เพื่อเปรียบเทียบ... เพื่อพัฒนา...)
  - **คำถามวิจัย:** ลงท้ายด้วย **"...หรือไม่ / อย่างไร / ระดับใด ?"**
  - **สมมติฐานการวิจัย:** ประโยคบอกเล่าที่คาดคะเนคำตอบล่วงหน้า แบ่งเป็น *สมมติฐานแบบมีทิศทาง* (สูงกว่า/มากกว่า — ทดสอบทางเดียว One-tailed) และ *สมมติฐานแบบไม่มีทิศทาง* (แตกต่างกัน/มีผลต่อ — ทดสอบสองทาง Two-tailed)
  - **สมมติฐานทางสถิติ:** ใช้พารามิเตอร์ประชากร ($\\mu$) ได้แก่ $H_0: \\mu_1 = \\mu_2$ (สมมติฐานกลาง/ไร้ความแตกต่าง) และ $H_1: \\mu_1 \\neq \\mu_2$ (สมมติฐานทางเลือก)
  - **ตัวแปร:** ตัวแปรต้น/อิสระ (สิ่งที่เป็นเหตุ เช่น วิธีสอน/สื่อ/ชุดฝึก) -> ตัวแปรตาม (ผลที่เกิดขึ้น เช่น ผลสัมฤทธิ์ทางการเรียน/สมาธิ) และตัวแปรแทรกซ้อน (เช่น แสง เสียง หรือผู้เรียนรู้ตัวแล้วแกล้งทำดีเอาใจครู = Hawthorne Effect ซึ่งแก้โดยไม่นำผลของนักเรียนคนนั้นมาวิเคราะห์)

## 3. แบบแผนการวิจัย การสุ่มตัวอย่าง มาตรวัด 4 ระดับ และสถิติวิจัย
* **แบบแผนการวิจัยเชิงทดลอง (สัญลักษณ์: E = กลุ่มทดลอง, C = กลุ่มควบคุม, R = สุ่ม, O = ทดสอบก่อน/หลัง, X = การจัดกระทำ/สอน):**
  1. **การทดลองขั้นต้น (Pre-experimental — ไม่สุ่ม, ไม่มีกลุ่มควบคุมเต็มรูปแบบ):** *One-Shot Case Study* (\`X O\`), *One-Group Pretest-Posttest Design* (\`O1 X O2\`), *Static Group Comparison Design* (2 กลุ่ม ไม่สุ่ม วัดหลัง)
  2. **กึ่งทดลอง (Quasi-experimental — ไม่สุ่ม R แต่มีกลุ่มควบคุมเปรียบเทียบ หรือวัดหลายครั้ง):** *Quasi-Equivalent Control Group Design* (2 กลุ่ม ไม่สุ่ม วัดก่อน-หลัง), *Time Series Design* (วัดอนุกรมเวลาหลายครั้ง)
  3. **การทดลองที่แท้จริง (True Experimental — มีการสุ่ม R และมีกลุ่มควบคุม C):** *Randomized Posttest-Only Control Group Design* และ *Randomized Pretest-Posttest Control Group Design* (\`R O1 X O2\` เทียบกับ \`R O1 O2\`)
* **ประชากรและกลุ่มตัวอย่าง:**
  - สูตร **Taro Yamane:** $n = \\frac{N}{1 + Ne^2}$ (เช่น $N = 400, e = 0.05 \\rightarrow n = \\frac{400}{1 + 400(0.0025)} = \\frac{400}{2} = 200$ คน)
  - **การสุ่มโดยใช้ความน่าจะเป็น (Probability):** 1) สุ่มอย่างง่าย (จับสลาก/ตารางเลขสุ่ม) 2) สุ่มแบบมีระบบ 3) สุ่มแบบแบ่งชั้น (Stratified — แบ่งตามระดับชั้นที่ต่างกันแล้วสุ่มมาทุกชั้น) 4) สุ่มแบบแบ่งกลุ่ม (Cluster — แบ่งกลุ่มที่ภายในคละครบถ้วนแล้วสุ่มมาทั้งกลุ่ม) 5) สุ่มแบบหลายขั้นตอน (Multi-stage)
  - **การเลือกโดยไม่ใช้ความน่าจะเป็น (Non-probability):** 1) แบบบังเอิญ (Accidental) 2) แบบโควตา (Quota) 3) แบบเจาะจง (Purposive) 4) แบบสโนว์บอล (Snowball)
* **มาตรวัดข้อมูล 4 ระดับ:**
  1. **นามบัญญัติ (Nominal):** จำแนกกลุ่ม เรียงลำดับไม่ได้ เช่น เพศ (ชาย=1, หญิง=2) ศาสนา อาชีพ (ใช้ความถี่ ร้อยละ ฐานนิยม Chi-square)
  2. **เรียงอันดับ (Ordinal):** เรียงลำดับมาก-น้อยได้ แต่ระยะห่างไม่เท่ากัน เช่น อันดับการแข่งขัน ระดับความพึงพอใจ (ใช้มัธยฐาน)
  3. **อันตรภาค (Interval):** ช่วงห่างเท่ากัน แต่ **ไม่มีศูนย์แท้ (ศูนย์สมมติ)** เช่น **คะแนนสอบ (สอบได้ 0 ไม่ได้แปลว่าไม่มีความรู้เลย)**, อุณหภูมิ °C (ใช้ค่าเฉลี่ย, S.D., t-test, ANOVA)
  4. **อัตราส่วน (Ratio):** ละเอียดที่สุด **มีศูนย์แท้** เช่น น้ำหนัก ส่วนสูง เวลา ระยะทาง รายได้
* **สถิติวิจัย & รายงานวิจัย 5 บท:**
  - **สถิติพรรณนา (Descriptive):** ความถี่, ร้อยละ, ค่าเฉลี่ย ($\\bar{x}$), มัธยฐาน (ตำแหน่ง $\\frac{N+1}{2}$), ฐานนิยม (ซ้ำมากที่สุด), พิสัย, ส่วนเบี่ยงเบนมาตรฐาน ($S.D.$)
  - **สถิติอ้างอิง (Inferential):** \`Dependent t-test\` (1 กลุ่มสอบ 2 ครั้ง ก่อน-หลังเรียน), \`Independent t-test\` (2 กลุ่มอิสระกัน เช่น กลุ่มทดลอง vs กลุ่มควบคุม), \`One-Way ANOVA / F-test\` (เปรียบเทียบมากกว่า 2 กลุ่มขึ้นไป), \`Z-test\` ($n > 30$), \`Chi-square\`
  - **ระดับนัยสำคัญ ($\\alpha$):** $.05$ = เชื่อมั่นร้อยละ 95 / $.01$ = เชื่อมั่นร้อยละ 99
  - **ประสิทธิภาพนวัตกรรม ($E_1/E_2$):** **$E_1$** = คะแนนเฉลี่ยร้อยละจากกิจกรรม/แบบฝึกหัด **ระหว่างเรียน** / **$E_2$** = คะแนนเฉลี่ยร้อยละจากแบบทดสอบวัดผลสัมฤทธิ์ **หลังเรียน**
  - **รายงานวิจัย 5 บท:** บทที่ 1 บทนำ (*ความเป็นมา, วัตถุประสงค์, สมมติฐาน, ขอบเขต, นิยามศัพท์, ประโยชน์ที่คาดว่าจะได้รับ*) -> บทที่ 2 เอกสารและงานวิจัยที่เกี่ยวข้อง -> บทที่ 3 วิธีดำเนินการวิจัย (*รูปแบบวิจัย, ประชากร/กลุ่มตัวอย่าง, เครื่องมือวิจัย, การเก็บข้อมูล, การวิเคราะห์ข้อมูลและสถิติ*) -> บทที่ 4 ผลการวิเคราะห์ข้อมูล -> บทที่ 5 สรุป อภิปรายผล และข้อเสนอแนะ (*การอภิปรายผลสำคัญที่สุดในบทที่ 5*)

## 4. การวัดและประเมินผลการเรียนรู้ (Measurement & Evaluation)
* **การวัดผล (Measurement):** การกำหนดตัวเลขให้สิ่งต่างๆ ตามกฎเกณฑ์ (ทางการศึกษาเป็นการวัดทางอ้อม Indirect Measurement) / **การประเมินผล (Evaluation):** การนำตัวเลขจากการวัดมาเปรียบเทียบกับเกณฑ์เพื่อตัดสินคุณค่า
* **การประเมิน 3 ระยะ:** 1) ก่อนเรียน (Diagnostic/Placement) 2) ระหว่างเรียน (**Formative Assessment / Assessment for Learning & as Learning** เพื่อพัฒนาและซ่อมเสริม) 3) หลังเรียน (**Summative Assessment / Assessment of Learning** เพื่อตัดสินผลการเรียน)
* **อิงกลุ่ม vs อิงเกณฑ์ vs อิงตน:** อิงกลุ่ม (เปรียบเทียบกับเพื่อนในกลุ่ม เช่น สอบคัดเลือก, $Z$-score, $T$-score) / อิงเกณฑ์ (เปรียบเทียบกับเกณฑ์มาตรฐาน/ตัวชี้วัด) / อิงตน (เปรียบเทียบพัฒนาการกับตนเองในอดีต)
* **พุทธิพิสัย Bloom's Revised Taxonomy (6 ขั้นจากต่ำไปสูง):** จำ -> เข้าใจ -> ประยุกต์ใช้ -> วิเคราะห์ -> ประเมินค่า -> **สร้างสรรค์ (สูงสุด)** / **จิตพิสัย Krathwohl (5 ขั้น):** รับรู้ -> ตอบสนอง -> เห็นคุณค่า -> จัดระบบคุณค่า -> **สร้างลักษณะนิสัยจากค่านิยม (สูงสุด)**
* **การตรวจสอบคุณภาพเครื่องมือวัด:**
  1. **ความตรง (Validity):** ความตรงเชิงเนื้อหา ตรวจโดยผู้เชี่ยวชาญ หาค่า **IOC $\\ge 0.50$**
  2. **ความเชื่อมั่น (Reliability):** แบบทดสอบปรนัย (0, 1) ใช้สูตร **KR-20 / KR-21** ส่วนแบบสอบถามมาตรประมาณค่า (Rating Scale) หรืออัตนัย ใช้ **สัมประสิทธิ์แอลฟาของครอนบาค (Cronbach's Alpha)**
  3. **ความยากง่าย ($p$):** เกณฑ์เหมาะสม **$0.20 - 0.80$** ($p$ สูง = ง่ายมาก, $p$ ต่ำ = ยากมาก)
  4. **อำนาจจำแนก ($r$):** เกณฑ์เหมาะสม **$r \\ge 0.20$** (เข้าใกล้ $+1.00$ จำแนกคนเก่งกับคนอ่อนได้ดีมาก หากติดลบต้องตัดทิ้ง/แก้ไข)
  5. **ความเป็นปรนัย (Objectivity):** คำถามชัดเจน ตรวจให้คะแนนตรงกัน แปลความหมายตรงกัน
* **การประเมินตามสภาพจริง & การให้ข้อมูลย้อนกลับ:** ใช้เกณฑ์รูบริกส์แบบแยกองค์ประกอบ (**Analytic Rubric**) ร่วมกับข้อมูลหลายแหล่ง (**Multisource Assessment**) และให้ผลสะท้อนกลับที่ชี้จุดเด่นและจุดที่ควรปรับปรุงอย่างเฉพาะเจาะจงเป็นรูปธรรม (เช่น *"เรียงความที่เขียนยังขาดการเชื่อมโยงเนื้อหา"*)`;
      await Repo.saveSummary('04', { name: 'สรุปการวัดและประเมินผลการเรียนรู้ และการวิจัย (Test Blueprint).md', kind: 'text', content: summary04, updatedAt: Date.now() });
    }
    // นำเข้าสรุปเนื้อหาเรื่อง 05 เริ่มต้น (หากยังไม่มี)
    if (!(await Repo.getSummary('05'))) {
      const summary05 = `# สรุปเนื้อหา เรื่องที่ 05: การออกแบบ และการดำเนินการเกี่ยวกับงานประกันคุณภาพการศึกษา
(ตาม Test Blueprint คุรุสภา)

## 1. โครงสร้างข้อสอบตามผัง Test Blueprint (สมรรถนะ 5.1)
1. **5.1.1 วิเคราะห์ เปรียบเทียบ ความแตกต่างของการประกันคุณภาพการศึกษาภายใน และภายนอก (1 ข้อ)**
2. **5.1.2 วิเคราะห์ เชื่อมโยง ระบบการประกันคุณภาพการศึกษาภายใน กับภายนอก (1 ข้อ)**
3. **5.1.3 วิเคราะห์จุดเด่น จุดด้อย โอกาส และอุปสรรค (SWOT) เพื่อยกระดับการประกันคุณภาพสถานศึกษา (2 ข้อ)**
4. **5.1.4 ประยุกต์ใช้ผลการประกันคุณภาพไปใช้ในการพัฒนาการจัดการเรียนการสอน (2 ข้อ)**
5. **5.1.5 ประยุกต์ใช้ผลการพัฒนาคุณภาพไปใช้ในการวางแผนพัฒนาและแก้ปัญหาระบบดูแลช่วยเหลือผู้เรียน (2 ข้อ)**

## 2. พ.ร.บ. การศึกษาแห่งชาติ พ.ศ. 2542 หมวด 6 (มาตรา 47 – 51) และหลักการสำคัญ
* **มาตรา 47:** ให้มีระบบการประกันคุณภาพการศึกษาเพื่อพัฒนาคุณภาพและมาตรฐานการศึกษาทุกระดับ ประกอบด้วย **ระบบการประกันคุณภาพภายใน** และ **ระบบการประกันคุณภาพภายนอก**
* **มาตรา 48 (การประกันคุณภาพภายใน — IQA):** ให้หน่วยงานต้นสังกัดและสถานศึกษาจัดให้มีระบบประกันคุณภาพภายใน และถือเป็น **ส่วนหนึ่งของกระบวนการบริหารการศึกษาที่ต้องดำเนินการอย่างต่อเนื่อง** โดยจัดทำ **รายงานประจำปี (SAR)** เสนอต่อต้นสังกัด หน่วยงานที่เกี่ยวข้อง และเปิดเผยต่อสาธารณชน
* **มาตรา 49 (การประกันคุณภาพภายนอก — EQA):** ให้มี **สมศ. (มีฐานะเป็นองค์การมหาชน)** ทำหน้าที่พัฒนาเกณฑ์และประเมินคุณภาพภายนอกของสถานศึกษาทุกแห่ง **อย่างน้อย 1 ครั้งในทุก 5 ปี**
* **มาตรา 50:** ให้สถานศึกษา บุคลากร คณะกรรมการสถานศึกษา และผู้ปกครองให้ความร่วมมือและเตรียมเอกสารหลักฐานตามคำร้องขอของ สมศ.
* **มาตรา 51 (กรณีผลประเมินภายนอกไม่ผ่านมาตรฐาน):** ขั้นแรกให้ **สมศ. จัดทำข้อเสนอแนะการปรับปรุงแก้ไขต่อหน่วยงานต้นสังกัด** เพื่อให้สถานศึกษาปรับปรุงภายในเวลาที่กำหนด หากไม่ดำเนินการ ให้ **สมศ. รายงานต่อ กพฐ. / กอศ. / กกอ.** เพื่อดำเนินการแก้ไข
* **ความหมาย QA:** **Q (Quality)** = คุณภาพผู้เรียน/ผู้สำเร็จการศึกษา, **A (Assurance)** = การให้ความมั่นใจแก่ผู้รับบริการ (*ผู้รับบริการโดยตรง: ผู้เรียนและผู้ปกครอง / ผู้รับบริการทางอ้อม: สถานประกอบการ ประชาชน สังคม*)
* **หลักการ 5 ประการ:** 1) การมีส่วนร่วม (Participation) 2) การเสริมสร้างพลัง (Empowerment) 3) การกระจายอำนาจ (Decentralization) 4) ความรับผิดชอบที่ตรวจสอบได้ (Accountability) 5) การปรับปรุงคุณภาพอย่างต่อเนื่อง (Continuous Quality Improvement) *(โดย **ครูผู้สอน** มีความสำคัญที่สุดในการพัฒนาคุณภาพผู้เรียน และอุปสรรคสำคัญที่สุดคือ **ไม่สามารถสร้างวัฒนธรรมคุณภาพให้เกิดขึ้นในสถานศึกษา**)*

## 3. มาตรฐานการศึกษาของชาติ พ.ศ. 2561 และมาตรฐานการศึกษา 3 มาตรฐาน
* **มาตรฐานการศึกษาของชาติ พ.ศ. 2561 (ผลลัพธ์ที่พึงประสงค์ 3 ด้าน):** 1) **ผู้เรียนรู้** เพื่อสร้างงานและคุณภาพชีวิตที่ดี 2) **ผู้ร่วมสร้างสรรค์นวัตกรรม** เพื่อสังคมที่มั่นคง มั่งคั่ง ยั่งยืน 3) **พลเมืองที่เข้มแข็ง** เพื่อสันติสุข
* **มาตรฐานการศึกษาระดับการศึกษาขั้นพื้นฐาน (3 มาตรฐาน):**
  - **มาตรฐานที่ 1 คุณภาพของผู้เรียน:** *1.1 ผลสัมฤทธิ์ทางวิชาการ* (อ่าน เขียน สื่อสาร คิดคำนวณ คิดวิเคราะห์ สร้างนวัตกรรม ใช้ IT ผลสัมฤทธิ์ตามหลักสูตร เตรียมสู่อาชีพ) และ *1.2 คุณลักษณะที่พึงประสงค์* (คุณธรรมจริยธรรม ภูมิใจในท้องถิ่น/ความเป็นไทย ยอมรับความแตกต่าง สุขภาวะกายและจิต)
  - **มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ:** เป้าหมายวิสัยทัศน์ชัดเจน ระบบบริหารจัดการคุณภาพ พัฒนาวิชาชีพครู จัดสภาพแวดล้อมที่ปลอดภัยเอื้อต่อการเรียนรู้ และ **จัดระบบเทคโนโลยีสารสนเทศเพื่อสนับสนุนการบริหารจัดการและการจัดการเรียนรู้**
  - **มาตรฐานที่ 3 กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ:** จัดการเรียนรู้ผ่านกระบวนการคิดและปฏิบัติจริง, **ใช้สื่อ เทคโนโลยีสารสนเทศ และแหล่งเรียนรู้ที่เอื้อต่อการเรียนรู้**, บริหารจัดการชั้นเรียนเชิงบวก, ตรวจสอบและประเมินผู้เรียนอย่างเป็นระบบและนำผลมาพัฒนาผู้เรียน, แลกเปลี่ยนเรียนรู้และให้ข้อมูลสะท้อนกลับ (PLC)

## 4. เปรียบเทียบและเชื่อมโยง: ประกันคุณภาพภายใน (IQA) vs ภายนอก (EQA)
* **ผู้ประเมินและความถี่:**
  - **ภายใน (IQA):** บุคลากรในสถานศึกษาประเมินตนเองและจัดทำ **SAR ทุกปี (ปีละ 1 ครั้ง)** และ **หน่วยงานต้นสังกัดติดตามตรวจสอบอย่างน้อย 1 ครั้งในทุก 3 ปี** (เน้นประเมิน **Input และ Process**)
  - **ภายนอก (EQA):** **สมศ.** (ผู้ประเมินภายนอกต้องได้รับการรับรองและขึ้นทะเบียนจาก สมศ.) ประเมิน **อย่างน้อย 1 ครั้งในทุก 5 ปี** (เน้นประเมิน **Output และ Outcome**)
* **ความเชื่อมโยงตามกฎกระทรวงฯ พ.ศ. 2561:** เชื่อมโยงกันด้วย **"การกำหนดมาตรฐานการศึกษา"** และใช้ **รายงาน SAR** ที่สถานศึกษาส่งผ่านต้นสังกัดในระบบ **E-SAR** เป็นฐานในการประเมินภายนอก
* **เปรียบเทียบชื่อระดับคุณภาพ 5 ระดับ (จากต่ำไปสูง):**
  - **เกณฑ์ภายใน:** \`กำลังพัฒนา\` ➔ \`ปานกลาง\` ➔ \`ดี\` ➔ \`ดีเลิศ\` ➔ \`ยอดเยี่ยม\`
  - **เกณฑ์ภายนอก (สมศ.):** \`ปรับปรุง\` ➔ \`พอใช้\` ➔ \`ดี\` ➔ \`ดีมาก\` ➔ \`ดีเยี่ยม\`
  *(การยกระดับจาก **ดี/ดีเลิศ** สู่ **ยอดเยี่ยม/ดีเยี่ยม** ต้องมีผลพัฒนาการต่อเนื่อง 3 ปี และมี **นวัตกรรม Innovation หรือแบบอย่างที่ดี Best Practice** ที่นำไปเผยแพร่ให้สถานศึกษาอื่นปรับใช้ได้)*

## 5. ระบบประกันคุณภาพภายใน 7 ขั้นตอน, PDCA, การจัดทำ SAR และการประเมินของ สมศ.
* **3 แนวคิดประกันคุณภาพภายใน:** 1) การควบคุมคุณภาพ (Quality Control — *ทำอันดับแรกคือ กำหนดมาตรฐานการศึกษา*) ➔ 2) การตรวจสอบคุณภาพ (Quality Audit) ➔ 3) การประเมินคุณภาพ (Quality Assessment)
* **วงจร PDCA:** **P (Plan):** เตรียมการ แต่งตั้งกรรมการ **กำหนดมาตรฐานการศึกษา** จัดทำแผนพัฒนาและกำหนดค่าเป้าหมาย ➔ **D (Do):** ดำเนินการตามแผนและจัดระบบสารสนเทศ ➔ **C (Check):** **ติดตามตรวจสอบ** และประเมินคุณภาพภายใน ➔ **A (Act):** จัดทำรายงาน SAR เผยแพร่ และ **ปรับปรุงพัฒนาคุณภาพอย่างต่อเนื่อง**
* **ลำดับการจัดทำรายงานประเมินตนเอง (SAR) 5 ขั้นตอน:**
  \`1. แต่งตั้งคณะทำงาน\` ➔ \`2. รวบรวมข้อมูลสารสนเทศ\` ➔ \`3. เขียนรายงานผลการประเมินตนเอง (SAR)\` ➔ \`4. นำเสนอคณะกรรมการสถานศึกษาขั้นพื้นฐานให้ความเห็นชอบ\` ➔ \`5. รายงานและเปิดเผยต่อผู้เกี่ยวข้อง / จัดส่งต้นสังกัด\`
* **การประเมินภายนอก 2 ระยะของ สมศ.:**
  - **ระยะที่ 1 วิเคราะห์ SAR (บังคับทุกแห่ง):** ประเมินจาก SAR ตามตัวชี้วัด **PDCA + Accountability (5 ตัว)** สรุปผลเป็น **3 ระดับ** (\`ดี\`, \`พอใช้\`, \`ปรับปรุง\`)
  - **ระยะที่ 2 ตรวจเยี่ยม Site Visit / Online (ตามความสมัครใจ — ยื่นคำร้อง CO-05):** ตรวจหลักฐานเชิงประจักษ์ 6 หมวด (*โดยไม่มีการสรุปผลด้วยวาจาที่สถานศึกษา*) สรุปผลเป็น **5 ระดับ** (\`ดีเยี่ยม\`, \`ดีมาก\`, \`ดี\`, \`พอใช้\`, \`ปรับปรุง\`)

## 6. การวิเคราะห์ SWOT Analysis และการเลือกใช้กลยุทธ์ 4 รูปแบบ
* **ปัจจัยภายในโรงเรียน (ควบคุมได้):** **S (จุดแข็ง)** เช่น ครูเชี่ยวชาญ ร่วมมือกันดี ผู้บริหารเก่ง ผลสัมฤทธิ์สูง / **W (จุดอ่อน)** เช่น ขาดครูบางวิชา ภาระงานมาก ระบบงานไม่คล่องตัว ขาดแคลนสื่อภายใน ผล O-NET ต่ำ
* **ปัจจัยภายนอกโรงเรียน (สภาพแวดล้อม):** **O (โอกาส)** เช่น **ชุมชนและผู้ปกครองให้ความร่วมมือสนับสนุนดี** ได้รับทุนจากภายนอก มีแหล่งเรียนรู้ในชุมชน เทคโนโลยีก้าวหน้า / **T (อุปสรรค)** เช่น **การแข่งขันรุนแรงจากโรงเรียนเอกชน** แหล่งอบายมุข/ยาเสพติดรอบโรงเรียน ผู้ปกครองยากจนไม่มีเวลาดูแลลูกและเด็กต้องช่วยทำงานหลังเลิกเรียน
* **กลยุทธ์ 4 รูปแบบ (TOWS Matrix & กราฟสถานภาพ):**
  1. **SO (กลยุทธ์เชิงรุก — ลุย/บุก — พื้นที่ดาวรุ่ง Star):** มีทั้งจุดแข็ง (S) และโอกาส (O) ➔ ใช้จุดแข็งเสริมโอกาสเพื่อพัฒนาสูงสุด
  2. **WO (กลยุทธ์เชิงแก้ไข — พึ่งคนอื่น/สร้างเครือข่าย — พื้นที่คำถาม Question Mark):** มีจุดอ่อนภายใน (W > S) แต่มีโอกาสภายนอกดี (O > T) ➔ ขอความร่วมมือจากหน่วยงานใกล้เคียงและใช้แหล่งเรียนรู้ในชุมชนมาช่วยแก้จุดอ่อน
  3. **ST (กลยุทธ์เชิงป้องกัน — พึ่งตัวเอง/พัฒนาภายใน — พื้นที่วัวแม่ลูกอ่อน Cash Cow):** มีจุดแข็งภายใน (S > W) แต่มีอุปสรรคภายนอก (T > O) ➔ ใช้ครูผู้เชี่ยวชาญจัดทบทวนบทเรียนในคาบโฮมรูม/ชุมนุม หรือพัฒนาคุณภาพครูเพื่อรับมือการแข่งขันจากโรงเรียนเอกชน
  4. **WT (กลยุทธ์เชิงรับ — รอ/รับ — พื้นที่สุนัขจนตรอก Dog):** มีทั้งจุดอ่อน (W) และอุปสรรค (T) ➔ ประคับประคอง ลดค่าใช้จ่าย เสริมจุดอ่อน และหลีกเลี่ยงอุปสรรค`;
      await Repo.saveSummary('05', { name: 'สรุปการประกันคุณภาพการศึกษา (Test Blueprint).md', kind: 'text', content: summary05, updatedAt: Date.now() });
    }
    App.settings = await Repo.getSettings();
    App.user = await Auth.restore();
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="container"><div class="card empty"><h3>ไม่สามารถเริ่มระบบได้</h3><p class="muted">${esc(e.message)}<br>เบราว์เซอร์ต้องรองรับ IndexedDB (แนะนำ Chrome / Edge / Safari รุ่นล่าสุด)</p></div></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  route();
})();
