/* ===== User views: login, home, result, history, summary ===== */

function renderLogin(initialTab = 'login') {
  let activeTab = initialTab === 'register' ? 'register' : 'login';

  const renderContent = () => {
    document.getElementById('app').innerHTML = `
    <div class="login-page fade-in">
      <button class="icon-btn theme-toggle login-theme" title="สลับโหมด">${Theme.icon()}</button>
      <section class="login-hero">
        <div class="login-hero-brand-card">
          <div class="login-hero-logo-box">
            <img class="login-hero-logo" src="assets/logo-testskill.jpg" alt="TestSkill ระบบสอบออนไลน์">
          </div>
          <div class="login-hero-brand-text">
            <span class="login-hero-pill">ระบบสอบออนไลน์</span>
            <h1>เตรียมสอบ<br><span class="grad-text">ใบประกอบวิชาชีพครู</span><br>อย่างมั่นใจ</h1>
            <p class="muted">ฝึกทำข้อสอบครบ 5 เรื่องตาม Test Blueprint ของคุรุสภา พร้อมเกร็ดความรู้ทุกข้อ และ AI วิเคราะห์จุดแข็ง–จุดอ่อนของคุณ</p>
          </div>
        </div>
        <ul class="feature-list">
          <li><span>✓</span> ข้อสอบรายเรื่อง 01–05 (930 ข้อ) และชุดรวมคละ 100 ข้อ (24 ชุด 2,295 ข้อ)</li>
          <li><span>✓</span> ระบบจับเวลา เสมือนห้องสอบจริง เฉลยพร้อมเกร็ดความรู้ทันที</li>
          <li><span>✓</span> บันทึกอัตโนมัติ ทำต่อได้ทุกอุปกรณ์โดยไม่สูญหาย</li>
          <li><span>✓</span> สรุปผลผ่านเกณฑ์ด้วย AI และตรวจทานข้อผิดย้อนหลังได้ตลอดเวลา</li>
        </ul>
      </section>
      <section class="login-panel">
        <div class="login-brand-mobile">
          <img class="login-logo-img" src="assets/logo-testskill.jpg" alt="TestSkill ระบบสอบออนไลน์ By กลางฟู">
        </div>
        
        <div class="card login-card">
          <!-- Segmented Auth Tabs -->
          <div class="auth-tabs">
            <button type="button" class="auth-tab ${activeTab === 'login' ? 'active' : ''}" id="tabBtnLogin">
              <span>เข้าสู่ระบบ</span>
            </button>
            <button type="button" class="auth-tab ${activeTab === 'register' ? 'active' : ''}" id="tabBtnRegister">
              <span>สมัครสมาชิก / ขอสิทธิ์</span>
            </button>
          </div>

          <!-- LOGIN TAB -->
          <div id="loginTabPane" class="${activeTab === 'login' ? '' : 'hidden'}">
            <div class="auth-header">
              <h2>เข้าสู่ระบบ</h2>
              <p class="muted small">กรอกไอดีและรหัสผ่านเพื่อเข้าสู่ระบบทำแบบทดสอบ</p>
            </div>
            <form id="loginForm" autocomplete="on">
              <label class="field">
                <span>ชื่อผู้ใช้ / ไอดี</span>
                <input class="input input-rounded" name="username" autocomplete="username" placeholder="เช่น Panuwat" required autofocus>
              </label>
              <label class="field">
                <span>รหัสผ่าน</span>
                <div class="input-group">
                  <input class="input input-rounded" type="password" name="password" autocomplete="current-password" placeholder="กรอกรหัสผ่าน" required>
                  <button type="button" class="btn-pw-toggle btn-rounded" id="togglePw" title="แสดงรหัสผ่าน" aria-label="แสดงรหัสผ่าน">
                    ${eyeIconHTML(false)}
                  </button>
                </div>
              </label>
              <div class="alert alert-danger hidden" id="loginErr"></div>
              <div class="auth-btn-stack">
                <button class="btn btn-primary btn-block btn-rounded btn-auth" type="submit">เข้าสู่ระบบ</button>
                <button type="button" class="btn btn-outline btn-block btn-rounded btn-auth btn-line-contact" data-open-qr>
                  💬 ติดต่อผู้ดูแลระบบ (LINE)
                </button>
              </div>
              <div class="auth-footer-prompt">
                ยังไม่มีบัญชีใช้งาน? <button type="button" class="link-btn-highlight" id="switchRegisterLink">สมัครสมาชิกใหม่และขอสิทธิ์ที่นี่</button>
              </div>
            </form>
          </div>

          <!-- REGISTER TAB -->
          <div id="registerTabPane" class="${activeTab === 'register' ? '' : 'hidden'}">
            <div id="registerFormWrap">
              <div class="auth-header">
                <h2>สมัครสมาชิกใหม่</h2>
                <p class="muted small">สร้างไอดีและรหัสผ่านเพื่อขอสิทธิ์เข้าใช้งานระบบ</p>
              </div>

              <div class="register-guide-card">
                <div class="register-guide-head">📌 <b>คำแนะนำการตั้งไอดีและรหัสผ่าน</b></div>
                <ul class="register-guide-list">
                  <li>ความยาว <b>8 ตัวอักษรขึ้นไป</b> (8–32 ตัว)</li>
                  <li>ต้องเป็น <b>ตัวอักษรภาษาอังกฤษผสมตัวเลข (A-Z, a-z, 0-9)</b> ทั้งไอดีและรหัสผ่าน</li>
                  <li>เมื่อสมัครเสร็จสิ้น ให้<b>ติดต่อผู้ดูแลระบบทาง LINE</b> เพื่อขออนุมัติสิทธิ์เข้าใช้งาน</li>
                </ul>
              </div>

              <form id="registerForm" autocomplete="off">
                <label class="field">
                  <span>1. ชื่อ–นามสกุล หรือชื่อเรียก</span>
                  <input class="input input-rounded" name="regName" placeholder="เช่น อ.สมชาย ใจดี" required autofocus>
                </label>

                <label class="field">
                  <span>2. ตั้งชื่อผู้ใช้ / ไอดี (สำหรับล็อกอิน)</span>
                  <input class="input input-rounded" name="regUsername" id="regUsername" placeholder="เช่น KruThai2026 (ภาษาอังกฤษผสมตัวเลข 8 ตัวขึ้นไป)" required>
                  <div class="cred-hints" id="userHints">
                    <span class="hint-chip" data-rule="len">8 ตัวขึ้นไป</span>
                    <span class="hint-chip" data-rule="letter">ภาษาอังกฤษ (A-Z)</span>
                    <span class="hint-chip" data-rule="digit">ตัวเลข (0-9)</span>
                  </div>
                </label>

                <label class="field">
                  <span>3. ตั้งรหัสผ่าน</span>
                  <div class="input-group">
                    <input class="input input-rounded" type="password" name="regPassword" id="regPassword" placeholder="เช่น Pass1234 (ภาษาอังกฤษผสมตัวเลข 8 ตัวขึ้นไป)" required>
                    <button type="button" class="btn-pw-toggle btn-rounded" id="toggleRegPw" title="แสดงรหัสผ่าน" aria-label="แสดงรหัสผ่าน">
                      ${eyeIconHTML(false)}
                    </button>
                  </div>
                  <div class="cred-hints" id="passHints">
                    <span class="hint-chip" data-rule="len">8 ตัวขึ้นไป</span>
                    <span class="hint-chip" data-rule="letter">ภาษาอังกฤษ (A-Z)</span>
                    <span class="hint-chip" data-rule="digit">ตัวเลข (0-9)</span>
                  </div>
                </label>

                <label class="field">
                  <span>4. ยืนยันรหัสผ่านอีกครั้ง</span>
                  <div class="input-group">
                    <input class="input input-rounded" type="password" name="regConfirm" id="regConfirm" placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง" required>
                    <button type="button" class="btn-pw-toggle btn-rounded" id="toggleRegConfirm" title="แสดงรหัสผ่าน" aria-label="แสดงรหัสผ่าน">
                      ${eyeIconHTML(false)}
                    </button>
                  </div>
                </label>

                <div class="alert alert-danger hidden" id="regErr"></div>
                <div class="auth-btn-stack">
                  <button class="btn btn-primary btn-block btn-rounded btn-auth" type="submit" id="regSubmitBtn">สมัครสมาชิกและส่งคำขอสิทธิ์</button>
                </div>
                <div class="auth-footer-prompt">
                  มีบัญชีอยู่แล้ว? <button type="button" class="link-btn-highlight" id="switchLoginLink">เข้าสู่ระบบที่นี่</button>
                </div>
              </form>
            </div>

            <div id="registerSuccessWrap" class="register-success-card hidden">
              <div class="reg-success-icon-box">
                <img src="assets/register-success.png" alt="สมัครสมาชิกสำเร็จ" class="reg-success-img">
              </div>
              <h3>สมัครสมาชิกสำเร็จ!</h3>
              <p class="muted">ไอดีของคุณได้รับการบันทึกในระบบเรียบร้อยแล้ว</p>
              <div class="reg-success-box">
                <div class="reg-id-badge">ไอดีผู้ใช้: <b id="newRegUsernameDisplay">-</b></div>
                <div class="reg-status-badge"><span class="chip chip-warning">⏳ อยู่ระหว่างรอผู้ดูแลระบบเปิดสิทธิ์ใช้งาน</span></div>
              </div>
              <div class="reg-next-step">
                <p><b>⚠️ ขั้นตอนต่อไป:</b> เนื่องจากเป็นระบบข้อสอบ ผู้ขอใช้งานจะต้องติดต่อมาทางไลน์ เพื่อขอสิทธิ์การใช้งานก่อนเข้าทำข้อสอบ</p>
              </div>
              <div class="reg-action-buttons">
                <button type="button" class="btn btn-primary btn-block btn-rounded" id="regSendLineBtn">
                  💬 เปิด LINE ส่งคำขอยืนยันสิทธิ์ทันที
                </button>
                <button type="button" class="btn btn-outline btn-block btn-rounded" id="regCopyLineIdBtn">
                  📋 คัดลอกไอดีของคุณเพื่อส่งให้แอดมิน (@<span id="copyBtnUserDisplay"></span>)
                </button>
                <button type="button" class="btn btn-ghost btn-block btn-rounded" id="regBackToLoginBtn">
                  ← ไปที่หน้าเข้าสู่ระบบ
                </button>
              </div>
            </div>
          </div>

          <!-- Dev / Contact Section -->
          <div class="login-contact-box">
            <img class="login-qr-thumb" src="assets/line-qr.jpg" alt="LINE QR Code" data-open-qr title="คลิกเพื่อขยาย QR Code">
            <div class="login-contact-text">
              <small class="muted">ช่องทางการติดต่อ & ขอสิทธิ์ใช้งาน (LINE Bot 24 ชม.)</small>
              <b><span class="line-badge">LINE Bot</span> @430lkurz <span class="muted font-normal">· แอดมิน: Panuwat_99999</span></b>
              <div class="login-contact-actions">
                <button type="button" class="btn-link-xs" data-open-qr>💬 ทักแชท / ขอสิทธิ์</button>
                <span>·</span>
                <button type="button" class="btn-link-xs" data-copy-line="@430lkurz">📋 ก๊อปไอดีบอท</button>
                <span>·</span>
                <a class="btn-link-xs" href="https://page.line.me/430lkurz" target="_blank" rel="noopener">เปิด LINE ↗</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>`;

    bindShell();

    // Tab switching
    const showTab = (tab) => {
      activeTab = tab;
      const isLogin = tab === 'login';
      $('#loginTabPane').classList.toggle('hidden', !isLogin);
      $('#registerTabPane').classList.toggle('hidden', isLogin);
      $('#tabBtnLogin').classList.toggle('active', isLogin);
      $('#tabBtnRegister').classList.toggle('active', !isLogin);
      if (location.hash !== (isLogin ? '#/login' : '#/register')) {
        history.replaceState(null, '', isLogin ? '#/login' : '#/register');
      }
    };

    $('#tabBtnLogin').onclick = () => showTab('login');
    $('#tabBtnRegister').onclick = () => showTab('register');
    $('#switchRegisterLink')?.addEventListener('click', () => showTab('register'));
    $('#switchLoginLink')?.addEventListener('click', () => showTab('login'));

    // Toggle password views (ไอคอนตา ปิด ขีดทับ เมื่อซ่อนรหัส, ตาเปิด ไม่ต้องขีดทับ เมื่อเปิดดู)
    const bindEyeToggle = (btnId, inputSelector) => {
      const btn = $(btnId);
      if (!btn) return;
      btn.onclick = (e) => {
        e.preventDefault();
        const inp = $(inputSelector);
        if (!inp) return;
        const isCurrentlyHidden = inp.type === 'password';
        inp.type = isCurrentlyHidden ? 'text' : 'password';
        btn.innerHTML = eyeIconHTML(isCurrentlyHidden);
        btn.title = isCurrentlyHidden ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน';
        btn.setAttribute('aria-label', isCurrentlyHidden ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
      };
    };

    bindEyeToggle('#togglePw', '#loginForm [name=password]');
    bindEyeToggle('#toggleRegPw', '#regPassword');
    bindEyeToggle('#toggleRegConfirm', '#regConfirm');

    // Live validation update for credentials
    const updateHints = (inputEl, containerId) => {
      const checks = credentialChecks(inputEl.value);
      const container = document.getElementById(containerId);
      if (!container) return;
      const chips = container.querySelectorAll('.hint-chip');
      chips.forEach((c) => {
        const rule = c.dataset.rule;
        const pass = !!checks[rule];
        c.classList.toggle('ok', pass);
        c.classList.toggle('bad', inputEl.value.length > 0 && !pass);
      });
    };

    const regUserInp = $('#regUsername');
    const regPassInp = $('#regPassword');
    regUserInp.oninput = () => updateHints(regUserInp, 'userHints');
    regPassInp.oninput = () => updateHints(regPassInp, 'passHints');

    // Login submit
    $('#loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, err = $('#loginErr');
      err.classList.add('hidden');
      try {
        App.user = await Auth.login(f.username.value, f.password.value);
        App.justLoggedIn = false; // ป้องกันป๊อปอัปเด้งกวนใจตอนล็อกอิน
        toast(`ยินดีต้อนรับ ${App.user.name || App.user.username}`, 'success');
        go('/home');
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      }
    };

    // Register submit
    $('#registerForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, err = $('#regErr');
      err.classList.add('hidden');
      const username = f.regUsername.value.trim();
      const name = f.regName.value.trim();
      const password = f.regPassword.value;
      const confirm = f.regConfirm.value;

      if (!isValidCredential(username)) {
        err.textContent = `ชื่อผู้ใช้ไม่ถูกต้อง: ${CREDENTIAL_RULE_TEXT}`;
        err.classList.remove('hidden');
        return;
      }
      if (!isValidCredential(password)) {
        err.textContent = `รหัสผ่านไม่ถูกต้อง: ${CREDENTIAL_RULE_TEXT}`;
        err.classList.remove('hidden');
        return;
      }
      if (password !== confirm) {
        err.textContent = 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง';
        err.classList.remove('hidden');
        return;
      }

      const users = await Repo.getUsers();
      if (users.some((x) => x.username.toLowerCase() === username.toLowerCase())) {
        err.textContent = `ชื่อผู้ใช้ "@${username}" มีผู้ใช้งานแล้ว กรุณาเลือกชื่ออื่น`;
        err.classList.remove('hidden');
        return;
      }

      try {
        const passHash = await hashPassword(username, password);
        const newUser = {
          id: uid('u_'),
          username,
          name: name || username,
          passHash,
          role: 'user',
          active: false, // รอให้ผู้ดูแลระบบอนุมัติ
          expires: '',
          perms: {}, // รอผู้ดูแลระบบเปิดสิทธิ์
          mustChangePassword: false,
          createdAt: Date.now(),
          lastLogin: null,
          pendingApproval: true
        };
        users.push(newUser);
        await Repo.saveUsers(users);

        // Show registration success screen
        $('#registerFormWrap').classList.add('hidden');
        $('#registerSuccessWrap').classList.remove('hidden');
        $('#newRegUsernameDisplay').textContent = '@' + username;
        const copySpan = $('#copyBtnUserDisplay');
        if (copySpan) copySpan.textContent = username;

        $('#regSendLineBtn').onclick = () => {
          showContactModal('verify', username);
        };

        $('#regCopyLineIdBtn').onclick = () => {
          navigator.clipboard?.writeText(username);
          toast(`คัดลอกไอดี @${username} แล้ว แจ้งแอดมินทาง LINE ได้เลยครับ`, 'success');
        };

        $('#regBackToLoginBtn').onclick = () => {
          $('#registerFormWrap').classList.remove('hidden');
          $('#registerSuccessWrap').classList.add('hidden');
          f.reset();
          updateHints(regUserInp, 'userHints');
          updateHints(regPassInp, 'passHints');
          showTab('login');
          $('#loginForm [name=username]').value = username;
          $('#loginForm [name=password]').focus();
        };

        toast('สมัครสมาชิกเรียบร้อยแล้ว! กรุณาติดต่อแอดมินเพื่อขอเปิดสิทธิ์ใช้งาน', 'success', 5000);
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      }
    };
  };

  renderContent();
}

async function renderHome() {
  const u = App.user, s = App.settings;
  const [catalog, history, progressList, wrong, bookmarks] = await Promise.all([
    Exams.catalog(s), Repo.getHistory(u.id), Repo.listProgress(u.id), Repo.getWrong(u.id), Repo.getBookmarks(u.id)
  ]);
  const summaries = {};
  for (const sub of SUBJECTS) summaries[sub.id] = !!(await Repo.getSummary(sub.id));
  const best = {};
  history.forEach((a) => { if (!best[a.examId] || a.percent > best[a.examId].percent) best[a.examId] = a; });
  const progMap = Object.fromEntries(progressList.map((p) => [p.examId, p]));
  const avg = history.length ? Math.round(history.reduce((n, a) => n + a.percent, 0) / history.length) : 0;
  const passedSets = Object.values(best).filter((a) => a.passed).length;
  const wrongCount = Object.keys(wrong).length;
  const finalBest = best.FINAL;

  const setChip = (set) => {
    const b = best[set.id], p = progMap[set.id];
    const status = p ? `<span class="chip chip-warning">ทำค้าง ${Object.keys(p.answers).length}/${p.qids.length}</span>`
      : b ? `<span class="chip ${b.passed ? 'chip-success' : 'chip-danger'}">${b.passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${b.percent}%</span>`
        : '<span class="chip">ยังไม่ได้ทำ</span>';
    const shortTitle = set.shortName || set.title || `ชุดที่ ${set.set}`;
    return `<button class="set-row" data-exam="${set.id}">
      <div class="set-row-info">
        <div class="set-row-head">
          <span class="set-badge">ชุดที่ ${set.set}</span>
          <b class="set-title-text">${esc(shortTitle)}</b>
        </div>
        <small class="muted">${set.count} ข้อ · เกณฑ์ผ่าน ${s.passPercent}%</small>
      </div>
      <div class="set-row-actions">${status}<span class="arrow">→</span></div>
    </button>`;
  };

  const subjectCard = ({ subject: sub, total, sets }) => {
    const allowed = Auth.can(u, sub.id);
    return `<article class="card subject-card ${allowed ? '' : 'locked'}">
      <div class="subject-head"><span class="subject-icon">${sub.icon}</span><span class="subject-code">เรื่องที่ ${sub.id}</span>
        ${allowed ? '' : '<span class="chip chip-muted">🔒 ไม่มีสิทธิ์</span>'}</div>
      <h3>${esc(sub.title)}</h3>
      <p class="muted small">คลังข้อสอบ ${total} ข้อ · ${sets.length} ชุด</p>
      <div class="set-list">${allowed ? (sets.length ? sets.map(setChip).join('') : '<p class="muted small">ยังไม่มีข้อสอบในเรื่องนี้</p>') : '<p class="muted small">ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์</p>'}</div>
      ${allowed && summaries[sub.id] ? `<a class="btn btn-ghost btn-sm mt" href="#/summary/${sub.id}">📖 อ่านสรุปเนื้อหา</a>` : ''}
    </article>`;
  };

  const finalAllowed = Auth.can(u, 'final');
  const finalProg = progMap.FINAL;

  // คำนวณวันหมดอายุและแจ้งเตือนเมื่อใกล้หมดอายุ
  const daysRemaining = calcDaysRemaining(u.expires);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  let expiryBannerHTML = '';
  if (isExpiringSoon) {
    const dayText = daysRemaining === 0 ? 'วันนี้' : `อีก ${daysRemaining} วัน`;
    expiryBannerHTML = `
      <div class="expiry-banner expiry-warning">
        <div class="expiry-banner-icon">⚠️</div>
        <div class="expiry-banner-body">
          <div class="expiry-banner-title">แจ้งเตือน: สิทธิ์การใช้งานของคุณจะหมดอายุใน<b>${dayText}</b> (${new Date(u.expires).toLocaleDateString('th-TH')})</div>
          <p class="small muted">หากต้องการใช้งานอย่างต่อเนื่อง กรุณาติดต่อผู้ดูแลระบบทาง LINE เพื่อเลือกแพ็กเกจหรือต่ออายุล่วงหน้า</p>
        </div>
        <button type="button" class="btn btn-warning btn-sm btn-renew-banner" id="homeRenewBtn">
          💬 ต่ออายุทาง LINE
        </button>
      </div>`;
  } else if (isExpired) {
    expiryBannerHTML = `
      <div class="expiry-banner expiry-danger">
        <div class="expiry-banner-icon">🔴</div>
        <div class="expiry-banner-body">
          <div class="expiry-banner-title">บัญชีของคุณหมดอายุการใช้งานแล้ว (${new Date(u.expires).toLocaleDateString('th-TH')})</div>
          <p class="small muted">คุณจะไม่สามารถทำแบบทดสอบได้จนกว่าจะต่ออายุ กรุณาติดต่อผู้ดูแลระบบทาง LINE เพื่อเปิดสิทธิ์การใช้งานต่อ</p>
        </div>
        <button type="button" class="btn btn-danger btn-sm btn-renew-banner" id="homeRenewBtn">
          💬 ต่ออายุทาง LINE
        </button>
      </div>`;
  }

  shell(`
    ${expiryBannerHTML}
    ${s.announcement ? `<div class="alert alert-info announce">📢 ${esc(s.announcement)}</div>` : ''}
    <section class="hero-home">
      <div class="hero-home-brand">
        <img class="hero-home-logo" src="assets/logo-testskill.jpg" alt="TestSkill ระบบสอบออนไลน์ By กลางฟู">
        <div class="hero-text-wrap">
          <p class="eyebrow">สวัสดี, ${esc(u.name || u.username)} 👋 <span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}</span></p>
          <h1 class="hero-title">ระบบสอบ <span class="hero-en-highlight">Test Skill</span> เตรียมความพร้อมก่อนสอบจริง</h1>
          <p class="muted">ใบประกอบวิชาชีพครู By กลางฟู · เกณฑ์ผ่าน <b>${s.passPercent}%</b> · ทำครบทุกเรื่อง แล้วปิดท้ายด้วยชุดรวมเสมือนจริง</p>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat"><b>${history.length}</b><span>ครั้งที่ทำ</span></div>
        <div class="stat"><b>${avg}%</b><span>คะแนนเฉลี่ย</span></div>
        <div class="stat"><b>${passedSets}</b><span>ชุดที่ผ่าน</span></div>
        <div class="stat"><b>${finalBest ? finalBest.percent + '%' : '-'}</b><span>ชุดรวมสูงสุด</span></div>
      </div>
    </section>

    ${progressList.length ? `<section class="card resume-card"><div class="section-title"><h2>⏸ ทำค้างไว้</h2></div>
      ${progressList.map((p) => `<div class="resume-row"><div><b>${esc(Exams.title(p.examId))}</b>
        <small class="muted">ตอบแล้ว ${Object.keys(p.answers).length}/${p.qids.length} ข้อ ${p.timed ? '· เหลือเวลา ' + fmtTime(p.remaining) : ''} · ล่าสุด ${fmtDate(p.updatedAt)}</small></div>
        <div class="row-actions">
          <button class="btn btn-primary btn-sm" data-resume="${p.examId}">ทำต่อ</button>
          <button class="btn btn-ghost btn-sm" data-restart="${p.examId}">เริ่มใหม่</button>
          <button class="btn btn-ghost btn-sm btn-delete-prog" data-delete-progress="${p.examId}">ลบออก</button>
        </div></div>`).join('')}
    </section>` : ''}

    <section class="final-card ${finalAllowed ? '' : 'locked'}">
      <div class="final-card-head">
        <div class="final-card-head-left">
          <span class="chip chip-glass">ชุดสอบเสมือนจริง · คลังข้อสอบคละ 2,295 ข้อ</span>
          <h2>ชุดรวมเทียบเคียงข้อสอบจริง คุรุสภา</h2>
          <p class="final-desc">คลังข้อสอบคละ 5 หมวดสมรรถนะ รวม 2,295 ข้อ (ปี 2566, 2567 และแบบจำลองวัดความรู้เกณฑ์คุรุสภา 4 ระดับความยาก 22 ชุด) ตามเกณฑ์มาตรฐานความรู้และประสบการณ์วิชาชีพครู (B-License / A-License)</p>
        </div>
        <div class="final-card-head-right">
          ${finalBest ? `<div class="final-best-badge">คะแนนสูงสุด: <b>${finalBest.percent}%</b> ${finalBest.passed ? '✅ ผ่าน' : ''}</div>` : ''}
          ${finalAllowed ? `
            <button class="btn btn-final-top" data-exam="FINAL">
              <span class="btn-final-icon-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </span>
              <div class="btn-final-text-col">
                <b class="btn-final-title">ทำชุดรวม 100 ข้อเต็ม</b>
                <small class="btn-final-sub">สุ่มคละจากคลัง 2,295 ข้อ เสมือนสอบจริง</small>
              </div>
              <span class="btn-final-arrow">→</span>
            </button>` : '<span class="chip chip-glass">🔒 ไม่มีสิทธิ์เข้าถึง</span>'}
        </div>
      </div>

      <div class="final-sets-grid">
          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 1 (ปี 2566)</span>
              <h4>เทียบเคียงข้อสอบจริง คุรุสภา ปี 2566</h4>
              <p class="muted-light">50 ข้อ · คละ 5 หมวดวิชา · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-1'] ? `<span class="chip ${best['FINAL-1'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-1'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-1'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-1">${progMap['FINAL-1'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 1'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 2 (ปี 2567)</span>
              <h4>เทียบเคียงข้อสอบจริง คุรุสภา ปี 2567</h4>
              <p class="muted-light">50 ข้อ · Scenario, AI, PDPA & จริยธรรม · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-2'] ? `<span class="chip ${best['FINAL-2'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-2'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-2'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-2">${progMap['FINAL-2'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 2'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 3 (เสมือนจริง 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง (ชุดที่ 1)</h4>
              <p class="muted-light">100 ข้อ · ระดับความยาก 4 ระดับ คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-3'] ? `<span class="chip ${best['FINAL-3'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-3'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-3'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-3">${progMap['FINAL-3'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 3'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 4 (เสมือนจริง 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง (ชุดที่ 2)</h4>
              <p class="muted-light">100 ข้อ · Big Data, Burnout, PLC & SAMR · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-4'] ? `<span class="chip ${best['FINAL-4'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-4'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-4'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-4">${progMap['FINAL-4'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 4'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 5 (เกณฑ์คุรุสภา 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-5'] ? `<span class="chip ${best['FINAL-5'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-5'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-5'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-5">${progMap['FINAL-5'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 5'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 6 (เกณฑ์คุรุสภา ชุดที่ 2 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 2)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-6'] ? `<span class="chip ${best['FINAL-6'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-6'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-6'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-6">${progMap['FINAL-6'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 6'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 7 (เกณฑ์คุรุสภา ชุดที่ 3 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 3)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-7'] ? `<span class="chip ${best['FINAL-7'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-7'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-7'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-7">${progMap['FINAL-7'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 7'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 8 (เกณฑ์คุรุสภา ชุดที่ 4 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 4)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-8'] ? `<span class="chip ${best['FINAL-8'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-8'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-8'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-8">${progMap['FINAL-8'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 8'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 9 (เกณฑ์คุรุสภา ชุดที่ 6 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 6)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-9'] ? `<span class="chip ${best['FINAL-9'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-9'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-9'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-9">${progMap['FINAL-9'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 9'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 10 (เกณฑ์คุรุสภา ชุดที่ 7 100 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 7)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-10'] ? `<span class="chip ${best['FINAL-10'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-10'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-10'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-10">${progMap['FINAL-10'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 10'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 11 (เกณฑ์คุรุสภา ชุดที่ 8 95 ข้อ)</span>
              <h4>แบบทดสอบจำลองวัดความรู้ประเมินสมรรถนะวิชาชีพครู (ชุดที่ 8)</h4>
              <p class="muted-light">95 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-11'] ? `<span class="chip ${best['FINAL-11'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-11'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-11'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-11">${progMap['FINAL-11'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 11'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 12 (เสมือนจริงตามเกณฑ์ 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-12'] ? `<span class="chip ${best['FINAL-12'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-12'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-12'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-12">${progMap['FINAL-12'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 12'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 13 (เสมือนจริงตามเกณฑ์ ชุด 2 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 2)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-13'] ? `<span class="chip ${best['FINAL-13'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-13'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-13'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-13">${progMap['FINAL-13'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 13'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 14 (เสมือนจริงตามเกณฑ์ ชุด 3 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 3)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-14'] ? `<span class="chip ${best['FINAL-14'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-14'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-14'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-14">${progMap['FINAL-14'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 14'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 15 (เสมือนจริงตามเกณฑ์ ชุด 4 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 4)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-15'] ? `<span class="chip ${best['FINAL-15'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-15'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-15'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-15">${progMap['FINAL-15'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 15'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 16 (เสมือนจริงตามเกณฑ์ ชุด 5 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 5)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-16'] ? `<span class="chip ${best['FINAL-16'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-16'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-16'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-16">${progMap['FINAL-16'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 16'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 17 (เสมือนจริงตามเกณฑ์ ชุด 6 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 6)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-17'] ? `<span class="chip ${best['FINAL-17'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-17'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-17'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-17">${progMap['FINAL-17'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 17'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 18 (เสมือนจริงตามเกณฑ์ ชุด 7 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 7)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-18'] ? `<span class="chip ${best['FINAL-18'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-18'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-18'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-18">${progMap['FINAL-18'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 18'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 19 (เสมือนจริงตามเกณฑ์ ชุด 8 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 8)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-19'] ? `<span class="chip ${best['FINAL-19'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-19'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-19'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-19">${progMap['FINAL-19'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 19'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 20 (เสมือนจริงตามเกณฑ์ ชุด 9 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 9)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-20'] ? `<span class="chip ${best['FINAL-20'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-20'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-20'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-20">${progMap['FINAL-20'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 20'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 21 (เสมือนจริงตามเกณฑ์ ชุด 10 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 10)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-21'] ? `<span class="chip ${best['FINAL-21'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-21'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-21'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-21">${progMap['FINAL-21'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 21'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 22 (เสมือนจริงตามเกณฑ์ ชุด 11 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 11)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-22'] ? `<span class="chip ${best['FINAL-22'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-22'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-22'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-22">${progMap['FINAL-22'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 22'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 23 (เสมือนจริงตามเกณฑ์ ชุด 12 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 12)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-23'] ? `<span class="chip ${best['FINAL-23'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-23'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-23'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-23">${progMap['FINAL-23'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 23'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>

          <div class="final-set-card">
            <div class="final-set-info">
              <span class="chip chip-glass">ชุดที่ 24 (เสมือนจริงตามเกณฑ์ ชุด 13 100 ข้อ)</span>
              <h4>แบบจำลองข้อสอบเสมือนจริง การประเมินสมรรถนะครู (ชุดที่ 13)</h4>
              <p class="muted-light">100 ข้อ · ความยาก 4 เลเวล คละ 5 หมวด · เกณฑ์ผ่าน ${s.passPercent}%</p>
              ${best['FINAL-24'] ? `<span class="chip ${best['FINAL-24'].passed ? 'chip-success' : 'chip-danger'} small mt-xs">${best['FINAL-24'].passed ? 'ผ่าน' : 'ยังไม่ผ่าน'} · ${best['FINAL-24'].percent}%</span>` : ''}
            </div>
            ${finalAllowed ? `<button class="btn btn-light btn-sm" data-exam="FINAL-24">${progMap['FINAL-24'] ? 'ทำต่อ / เริ่มใหม่' : 'เริ่มทำชุดที่ 24'} →</button>` : '<span class="chip chip-glass">🔒</span>'}
          </div>
        </div>
      </div>
    </section>

    <div class="section-title"><h2>ข้อสอบรายเรื่อง</h2><p class="muted">ตามโครงสร้าง Test Blueprint ของคุรุสภา 5 เรื่อง</p></div>
    <section class="subject-grid">${catalog.map(subjectCard).join('')}</section>

    <section class="tool-grid">
      <button class="card tool-card" data-exam="REVIEW" ${wrongCount ? '' : 'disabled'}>
        <span class="tool-icon">🔁</span><div><b>ทบทวนข้อที่เคยตอบผิด</b><small class="muted">${wrongCount ? `มี ${wrongCount} ข้อรอทบทวน (ตอบถูกแล้วจะหายไป)` : 'ยังไม่มีข้อที่ตอบผิด'}</small></div></button>
      <button class="card tool-card" data-exam="BOOKMARK" ${bookmarks.length ? '' : 'disabled'}>
        <span class="tool-icon">🔖</span><div><b>ข้อที่บันทึกไว้</b><small class="muted">${bookmarks.length ? `${bookmarks.length} ข้อ` : 'กดไอคอน 🔖 ระหว่างทำข้อสอบเพื่อบันทึก'}</small></div></button>
      <a class="card tool-card" href="#/history"><span class="tool-icon">📈</span><div><b>ประวัติ & พัฒนาการ</b><small class="muted">ดูผลสอบย้อนหลังทั้งหมด</small></div></a>
    </section>

    <section class="card dev-contact-card">
      <div class="dev-contact-left">
        <div class="dev-qr-wrap" data-open-qr title="คลิกเพื่อขยาย QR Code">
          <img src="assets/line-qr.jpg" alt="LINE QR Code">
          <span class="dev-qr-zoom">🔍 คลิกเพื่อขยาย</span>
        </div>
        <div class="dev-contact-body">
          <span class="chip chip-line"><span class="line-badge">LINE Bot</span> แชทอัตโนมัติ 24 ชม.</span>
          <h3>ช่องทางการติดต่อ & ขอสิทธิ์ใช้งานระบบ</h3>
          <p class="dev-line-id">Line Bot : <b>@430lkurz</b> <span class="muted small">(แอดมิน: Panuwat_99999)</span></p>
          <p class="muted small">แอดไลน์เพื่อขอยืนยันสิทธิ์ ต่ออายุการใช้งาน แจ้งปัญหา หรือสอบถามข้อมูลเพิ่มเติมได้ตลอด 24 ชั่วโมง</p>
        </div>
      </div>
      <div class="dev-contact-actions">
        <button type="button" class="btn btn-primary" data-open-qr>💬 ทักแชท LINE Bot</button>
        <button type="button" class="btn btn-outline" data-copy-line="@430lkurz">📋 คัดลอกไอดีบอท</button>
      </div>
    </section>
  `, { active: 'home' });

  $$('[data-exam]').forEach((b) => (b.onclick = () => startExam(b.dataset.exam)));
  $$('[data-resume]').forEach((b) => (b.onclick = () => go('/exam/' + b.dataset.resume)));
  $$('[data-restart]').forEach((b) => (b.onclick = async () => {
    if (await confirmBox('เริ่มทำใหม่?', 'คำตอบที่ทำค้างไว้ในชุดนี้จะถูกลบ', 'เริ่มใหม่', true)) newAttempt(b.dataset.restart);
  }));
  $$('[data-delete-progress]').forEach((b) => (b.onclick = async () => {
    const examId = b.dataset.deleteProgress;
    const label = Exams.setLabel(examId);
    const confirmed = await confirmBox(
      'ยืนยันการลบรายการที่ทำค้างไว้',
      `คุณต้องการลบ (${label}) ออกจากรายการที่ทำค้างไว้ ใช่หรือไม่?`,
      'ลบออก',
      true
    );
    if (!confirmed) return;

    // ซ่อนและลบแถวออกจากหน้าจอทันทีเพื่อการตอบสนองที่รวดเร็ว
    const row = b.closest('.resume-row');
    if (row) {
      row.style.transition = 'opacity 0.2s ease, transform 0.2s ease, max-height 0.25s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(-15px)';
      row.style.maxHeight = '0';
      row.style.padding = '0';
      row.style.margin = '0';
      row.style.overflow = 'hidden';
    }

    await Repo.clearProgress(App.user.id, examId);
    toast(`ลบ ${label} ออกจากรายการที่ทำค้างไว้เรียบร้อยแล้ว`, 'success');
    await renderHome();
  }));

  const homeRenewBtn = $('#homeRenewBtn');
  if (homeRenewBtn) {
    homeRenewBtn.onclick = () => showContactModal('verify', App.user.username);
  }

  // ไม่เด้งป๊อปอัปขึ้นมารบกวนตอนเข้าสู่ระบบ (เข้าถึงหน้าหลักได้ทันทีอย่างราบรื่น)
  App.justLoggedIn = false;
}

/** กดเลือกชุด → แสดงกล่องข้อความอ่านรายละเอียดชื่อชุดก่อนเข้าทำ (หรือถามทำต่อ/เริ่มใหม่/ลบออก ถ้ามีงานค้าง) */
async function startExam(examId) {
  // ตรวจสอบวันหมดอายุของผู้ใช้งาน
  const daysRemaining = calcDaysRemaining(App.user.expires);
  if (daysRemaining !== null && daysRemaining < 0) {
    showContactModal('verify', App.user.username);
    return toast('บัญชีของคุณหมดอายุการใช้งานแล้ว กรุณาติดต่อแอดมินทาง LINE เพื่อต่ออายุ', 'error', 5000);
  }

  const meta = Exams.parse(examId);
  if (!meta) return;
  if (meta.perm && !Auth.can(App.user, meta.perm)) return toast('คุณไม่มีสิทธิ์ทำชุดนี้ กรุณาติดต่อผู้ดูแลระบบ', 'warning');

  const p = await Repo.getProgress(App.user.id, examId);
  const info = Exams.setInfo(examId);
  const sub = meta.subject ? subjectById(meta.subject) : null;

  if (p) {
    const label = Exams.setLabel(examId);
    const r = await modal({
      title: 'พบการทำค้างไว้',
      body: `
        <div class="exam-intro-box">
          <div class="exam-intro-tags">
            ${sub ? `<span class="chip chip-primary">เรื่องที่ ${sub.id} · ${esc(sub.short || sub.title)}</span>` : ''}
            <span class="chip chip-glass">${esc(info.subtitle || '')}</span>
          </div>
          <h3 class="exam-intro-title">${esc(info.title)}</h3>
          ${info.docHeader ? `<p class="exam-intro-doc"><small class="muted">📄 ${esc(info.docHeader)}</small></p>` : ''}
          <div class="mini-progress mt"><div style="width:${(Object.keys(p.answers).length / p.qids.length) * 100}%"></div></div>
          <p class="muted small mt">ตอบแล้ว <b>${Object.keys(p.answers).length}/${p.qids.length}</b> ข้อ ${p.timed ? '· เหลือเวลา ' + fmtTime(p.remaining) : ''} · บันทึกล่าสุด ${fmtDate(p.updatedAt)}</p>
        </div>`,
      actions: [
        { label: 'ลบออก', value: 'delete', cls: 'btn-ghost btn-delete-prog' },
        { label: 'เริ่มทำใหม่', value: 'restart', cls: 'btn-outline' },
        { label: 'ทำต่อ →', value: 'resume', cls: 'btn-primary' }
      ]
    });
    if (r === 'resume') return go('/exam/' + examId);
    if (r === 'delete') {
      const confirmed = await confirmBox(
        'ยืนยันการลบรายการที่ทำค้างไว้',
        `คุณต้องการลบ (${label}) ออกจากรายการที่ทำค้างไว้ ใช่หรือไม่?`,
        'ลบออก',
        true
      );
      if (!confirmed) return;
      await Repo.clearProgress(App.user.id, examId);
      toast(`ลบ ${label} ออกจากรายการที่ทำค้างไว้เรียบร้อยแล้ว`, 'success');
      return await renderHome();
    }
    if (r !== 'restart') return;
  }

  // หากไม่มีงานค้าง หรือเลือกเริ่มทำใหม่: เด้งกล่องข้อความให้อ่านรายละเอียดชื่อชุดก่อนเข้าไปทำ
  const tagSubtitle = info.subtitle || (meta.set ? 'ชุดที่ ' + meta.set : 'ชุดรวม 100 ข้อ');
  const defaultMin = info.timeMinutes || (info.questionCount === 100 ? 120 : 60);

  const proceed = await modal({
    title: 'รายละเอียดชุดข้อสอบก่อนเริ่มทำ',
    wide: true,
    body: `
      <div class="exam-intro-box">
        <div class="exam-intro-tags">
          ${sub ? `<span class="chip chip-primary">เรื่องที่ ${sub.id} · ${esc(sub.short || sub.title)}</span>` : '<span class="chip chip-primary">คลังข้อสอบคละ · ชุดรวมเสมือนจริง</span>'}
          <span class="chip chip-glass">${esc(tagSubtitle)}</span>
        </div>
        <h3 class="exam-intro-title">${esc(info.title)}</h3>
        ${info.docHeader ? `<p class="exam-intro-doc"><small class="muted">📄 ${esc(info.docHeader)}</small></p>` : ''}

        <div class="exam-intro-grid">
          <div class="intro-stat"><b>${info.questionCount || 50}</b><small>จำนวนข้อ</small></div>
          <div class="intro-stat"><b>${App.settings.passPercent}%</b><small>เกณฑ์ผ่าน</small></div>
          <div class="intro-stat"><b>${defaultMin}</b><small>เวลามาตรฐาน (นาที)</small></div>
        </div>

        <div class="exam-mode-choice-section mt">
          <div class="exam-mode-choice-label"><b>⏱️ รูปแบบการทำแบบทดสอบ (ผู้ใช้เลือกได้เอง):</b></div>
          <div class="mode-grid">
            <label class="mode-option active" id="modeOptionFree">
              <input type="radio" name="examMode" value="free" checked>
              <span>
                <b>🧘 ไม่จับเวลา (แนะนำ)</b>
                <small>ทำแบบสบาย ๆ ไม่จำกัดเวลา เน้นอ่านเกร็ดความรู้และทบทวนเนื้อหาทุกข้อ</small>
              </span>
            </label>
            <label class="mode-option" id="modeOptionTimed">
              <input type="radio" name="examMode" value="timed">
              <span>
                <b>⏱️ จับเวลาเสมือนสอบจริง</b>
                <small>จำลองห้องสอบจริง เมื่อหมดเวลาระบบจะส่งข้อสอบและสรุปผลอัตโนมัติ</small>
                <span class="minutes-picker hidden" id="timeMinutesWrap">
                  กำหนดเวลา: <input class="input input-xs" type="number" id="customMinutesInp" min="5" max="600" value="${defaultMin}"> นาที
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="exam-intro-desc mt">
          <p class="muted small">${esc(info.desc || '')}</p>
          <div class="alert alert-info small mt-xs">
            💡 <b>คำแนะนำ:</b> ระบบมีเฉลยละเอียดพร้อมเกร็ดความรู้ทุกข้อ และบันทึกคำตอบอัตโนมัติ สามารถกลับมาทำต่อได้ตลอดเวลา
          </div>
        </div>
      </div>`,
    actions: [
      { label: 'ยกเลิก', value: null, cls: 'btn-ghost' },
      {
        label: 'เริ่มทำข้อสอบ →',
        cls: 'btn-primary',
        onClick: (b) => {
          const mode = b.querySelector('[name=examMode]:checked')?.value || 'free';
          const min = Number(b.querySelector('#customMinutesInp')?.value) || defaultMin;
          return { timed: mode === 'timed', minutes: min };
        }
      }
    ],
    onMount: (b) => {
      const freeOpt = b.querySelector('#modeOptionFree');
      const timedOpt = b.querySelector('#modeOptionTimed');
      const timeWrap = b.querySelector('#timeMinutesWrap');

      const updateModeView = () => {
        const isTimed = b.querySelector('[name=examMode]:checked')?.value === 'timed';
        freeOpt.classList.toggle('active', !isTimed);
        timedOpt.classList.toggle('active', isTimed);
        timeWrap.classList.toggle('hidden', !isTimed);
      };

      b.querySelectorAll('[name=examMode]').forEach((r) => {
        r.onchange = updateModeView;
      });
    }
  });

  if (!proceed) return;
  newAttempt(examId, proceed);
}

async function newAttempt(examId, options = {}) {
  const s = App.settings;
  const timed = !!options.timed;
  const minutes = Math.min(600, Math.max(5, options.minutes || s.finalMinutes || 60));

  const p = await Exams.build(App.user, examId, s);
  if (!p.qids.length) return toast('ชุดนี้ยังไม่มีข้อสอบ', 'warning');
  p.timed = timed;
  p.remaining = timed ? minutes * 60 : 0;
  p.totalTime = p.remaining;
  await Repo.saveProgress(App.user.id, examId, p);
  go('/exam/' + examId);
}

/* ===== Result ===== */
async function renderResult(attemptId) {
  const history = await Repo.getHistory(App.user.id);
  const a = history.find((x) => x.id === attemptId);
  if (!a) return go('/history');
  const qmap = await Repo.getQuestionMap();
  const pass = App.settings.passPercent;
  const wrongN = a.details.filter((d) => d.choice != null && !d.correct).length;
  const skipped = a.details.filter((d) => d.choice == null).length;
  const need = Math.max(0, Math.ceil((pass / 100) * a.total) - a.correct);

  const subjRows = Object.entries(a.bySubject).map(([sid, v]) => {
    const pct = Math.round((v.correct / v.total) * 100);
    return `<div class="bar-row"><div class="bar-label"><b>${sid}</b> ${esc(subjectById(sid)?.short || '')}</div>
      <div class="bar"><div class="bar-fill ${pct >= pass ? 'ok' : 'bad'}" style="width:${pct}%"></div><span class="bar-mark" style="left:${pass}%"></span></div>
      <div class="bar-val">${v.correct}/${v.total} · ${pct}%</div></div>`;
  }).join('');

  shell(`
    <section class="card result-hero ${a.passed ? 'is-pass' : 'is-fail'}">
      <div class="ring" style="--p:${a.percent};"><div><b>${a.percent}%</b><small>${a.correct}/${a.total}</small></div></div>
      <div class="result-info">
        <span class="chip ${a.passed ? 'chip-success' : 'chip-danger'}">${a.passed ? '✅ ผ่านเกณฑ์' : '⏳ ยังไม่ผ่านเกณฑ์'} ${pass}%</span>
        <h1>${a.passed ? 'ยอดเยี่ยม! คุณผ่านเกณฑ์แล้ว 🎉' : `อีก ${need} ข้อจะผ่านเกณฑ์ สู้ ๆ! 💪`}</h1>
        <p class="muted">${esc(a.title)} · ${fmtDate(a.finishedAt)}</p>
        <div class="stat-inline">
          <span><b class="t-success">${a.correct}</b> ถูก</span><span><b class="t-danger">${wrongN}</b> ผิด</span>
          <span><b>${skipped}</b> ไม่ได้ตอบ</span><span><b>${fmtDuration(a.durationSec)}</b> ใช้เวลา</span>
          ${a.timed ? `<span>⏱ แบบจับเวลา${a.timeout ? ' (หมดเวลา)' : ''}</span>` : ''}
        </div>
        <div class="row-actions mt">
          <button class="btn btn-primary" id="againBtn">ทำชุดนี้อีกครั้ง</button>
          ${wrongN ? '<button class="btn btn-outline" id="reviewBtn">ทบทวนข้อที่ผิด</button>' : ''}
          <a class="btn btn-ghost" href="#/home">กลับหน้าหลัก</a>
        </div>
      </div>
    </section>

    <div class="result-grid">
      <section class="card"><div class="section-title"><h3>ผลรายเรื่อง</h3><span class="muted small">เส้นประ = เกณฑ์ ${pass}%</span></div>${subjRows}</section>
      <section class="card ai-card"><div class="section-title"><h3>✨ AI วิเคราะห์ผลการสอบ</h3>
        <button class="btn btn-ghost btn-sm" id="aiBtn">${AI.enabled() ? (a.ai ? 'วิเคราะห์ใหม่' : 'วิเคราะห์') : ''}</button></div>
        <div id="aiBox" class="prose">${a.ai ? md(a.ai) : md(localAnalysis(a))}</div>
        ${!AI.enabled() ? '<p class="muted small mt">* ผลวิเคราะห์อัตโนมัติแบบออฟไลน์ (ผู้ดูแลระบบสามารถเปิดใช้ AI ได้ในหน้าตั้งค่า)</p>' : ''}
      </section>
    </div>

    <section class="card">
      <div class="section-title"><h3>ทบทวนคำตอบ</h3>
        <div class="seg" id="filterSeg"><button class="active" data-f="all">ทั้งหมด</button><button data-f="wrong">ผิด/ไม่ได้ตอบ</button><button data-f="right">ถูก</button></div></div>
      <div id="reviewList"></div>
    </section>
  `, { active: 'history' });

  const renderList = (f) => {
    $('#reviewList').innerHTML = a.details.map((d, i) => ({ d, i })).filter(({ d }) => f === 'all' || (f === 'wrong' ? !d.correct : d.correct)).map(({ d, i }) => {
      const q = qmap[d.qid];
      if (!q) return `<div class="review-item"><p class="muted">ข้อ ${i + 1}: ข้อสอบนี้ถูกลบออกจากคลังแล้ว</p></div>`;
      const order = d.order || q.choices.map((_, k) => k);
      return `<details class="review-item ${d.correct ? 'ok' : 'bad'}"><summary><span class="ri-num">${i + 1}</span><span class="ri-q">${esc(q.question)}</span><span class="ri-badge">${d.correct ? '✓' : d.choice == null ? '–' : '✗'}</span></summary>
        <ul class="ri-choices">${order.map((k, pos) => `<li class="${k === q.answer ? 'is-answer' : ''} ${k === d.choice && !d.correct ? 'is-wrong' : ''}"><b>${TH_LABELS[pos]}.</b> ${esc(q.choices[k])}</li>`).join('')}</ul>
        ${q.explain ? `<div class="tip"><b>💡 เกร็ดความรู้</b><p>${esc(q.explain)}</p></div>` : ''}</details>`;
    }).join('') || '<p class="muted center">ไม่มีรายการ</p>';
  };
  renderList('all');
  $$('#filterSeg button').forEach((b) => (b.onclick = () => { $$('#filterSeg button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); renderList(b.dataset.f); }));
  $('#againBtn').onclick = () => startExam(a.examId);
  const rb = $('#reviewBtn'); if (rb) rb.onclick = () => startExam('REVIEW');

  const runAI = async () => {
    const box = $('#aiBox');
    box.innerHTML = '<div class="ai-loading"><span class="spinner"></span> AI กำลังวิเคราะห์ผลการสอบของคุณ…</div>';
    try {
      a.ai = await AI.analyze(a, qmap);
      await Repo.updateAttempt(App.user.id, a);
      box.innerHTML = md(a.ai);
    } catch (e) {
      box.innerHTML = md(localAnalysis(a)) + `<p class="alert alert-warning small">AI ไม่พร้อมใช้งาน: ${esc(e.message)}</p>`;
    }
  };
  const aiBtn = $('#aiBtn');
  if (AI.enabled()) { aiBtn.onclick = runAI; if (!a.ai && App.settings.aiAutoAnalyze) runAI(); }
  else aiBtn.remove();
}

/* ===== History ===== */
async function renderHistory() {
  const h = await Repo.getHistory(App.user.id);
  const pass = App.settings.passPercent;
  const recent = h.slice(0, 15).reverse();
  const chart = recent.length > 1 ? `<div class="spark">${recent.map((a) => `<div class="spark-col" title="${esc(a.title)} ${a.percent}%"><div class="spark-bar ${a.passed ? 'ok' : 'bad'}" style="height:${Math.max(4, a.percent)}%"></div></div>`).join('')}<span class="spark-line" style="bottom:${pass}%"></span></div>` : '';
  shell(`
    <div class="section-title"><h1>ประวัติการสอบ</h1><p class="muted">ทั้งหมด ${h.length} ครั้ง</p></div>
    ${chart ? `<section class="card"><h3>พัฒนาการ 15 ครั้งล่าสุด</h3>${chart}</section>` : ''}
    <section class="card table-card">${h.length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>วันที่</th><th>แบบทดสอบ</th><th>คะแนน</th><th>ผล</th><th>เวลา</th><th></th></tr></thead>
      <tbody>${h.map((a) => `<tr><td>${fmtDate(a.finishedAt)}</td><td>${esc(a.title)}</td><td><b>${a.percent}%</b> <small class="muted">(${a.correct}/${a.total})</small></td>
        <td><span class="chip ${a.passed ? 'chip-success' : 'chip-danger'}">${a.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span></td><td>${fmtDuration(a.durationSec)}</td>
        <td><a class="btn btn-ghost btn-sm" href="#/result/${a.id}">ดูผล</a></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty"><p class="muted">ยังไม่มีประวัติการสอบ</p><a href="#/home" class="btn btn-primary">เริ่มทำข้อสอบ</a></div>'}
    </section>`, { active: 'history' });
}

/* ===== Summary viewer ===== */
async function renderSummary(sid) {
  const sub = subjectById(sid);
  if (!sub || !Auth.can(App.user, sid)) return go('/home');
  const sm = await Repo.getSummary(sid);
  let body = '<div class="empty"><p class="muted">ยังไม่มีไฟล์สรุปสำหรับเรื่องนี้</p></div>';
  if (sm) {
    if (sm.kind === 'pdf' || sm.kind === 'image') {
      const url = URL.createObjectURL(sm.blob);
      onCleanup(() => URL.revokeObjectURL(url));
      body = sm.kind === 'pdf' ? `<iframe class="pdf-frame" src="${url}" title="สรุปเนื้อหา"></iframe><a class="btn btn-ghost btn-sm mt" href="${url}" target="_blank">เปิดในแท็บใหม่</a>`
        : `<img class="summary-img" src="${url}" alt="สรุปเนื้อหา">`;
    } else if (sm.kind === 'html') body = `<div class="prose">${sm.content}</div>`;
    else body = `<div class="prose">${md(sm.content)}</div>`;
  }
  shell(`
    <a href="#/home" class="back-link">← กลับหน้าหลัก</a>
    <div class="section-title"><div><p class="eyebrow">${sub.icon} เรื่องที่ ${sid} · สรุปเนื้อหา</p><h1>${esc(sub.title)}</h1>
    ${sm ? `<p class="muted small">${esc(sm.name)} · อัปเดต ${fmtDate(sm.updatedAt)}</p>` : ''}</div></div>
    <section class="card">${body}</section>`, { active: 'home' });
}

window.renderUserHome = renderHome;

