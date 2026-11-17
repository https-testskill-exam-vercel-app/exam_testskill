/* ===== Admin views ===== */
const PERM_KEYS = [...SUBJECTS.map((s) => [s.id, `เรื่อง ${s.id}`]), ['final', 'ชุดรวม']];

const GAS_BOT_SCRIPT_TEMPLATE = `/**
 * LINE Messaging API Webhook & Cloud Backend - Google Apps Script (24/7 Serverless)
 * ระบบตอบกลับอัตโนมัติ 4 หัวข้อ + ฐานข้อมูลผู้ใช้ + ระบบคอนเฟิร์มสิทธิ์และตอบกลับอัตโนมัติ
 * Line ID: Panuwat_99999
 */
const CHANNEL_ACCESS_TOKEN = 'd1xBeCIUSf5NKf8r2ZxsQKXLmq/XWz6v6xbNezf1K1Le8hMI+kJgIrZFPGlpgrd+GyEf165uFK1p8R4x3wVHJo+cfUdvjGgNFHBGLxlZI4Mlua1cBfxC5e3dDhvak3x9pQv7bQ9PalCeE9XAC/gDCAdB04t89/1O/w1cDnyilFU=';
const SPREADSHEET_NAME = 'TestSkill_User_Database';
const WEB_APP_URL = 'https://https-testskill-exam-vercel-app.github.io/exam_testskill/';

function getDatabaseSheet(sheetName = 'Users') {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
    else ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Users') {
      sheet.appendRow(['ID', 'Username', 'Name', 'Role', 'Status', 'Package', 'Expires', 'LINE_User_ID', 'LINE_Name', 'Created_At', 'Updated_At']);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function doPost(e) {
  try {
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (err) { payload = { rawText: e.postData.contents }; }
    }
    if (payload && payload.events) {
      const events = payload.events || [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.type === 'message' && event.message.type === 'text') handleLineTextMessage(event);
        else if (event.type === 'follow') replyMainMenu(event.replyToken);
      }
      return jsonResponse({ status: 'ok', source: 'line' });
    }
    if (payload && payload.action) return handleWebApiAction(payload);
    return jsonResponse({ status: 'ok', message: 'No action' });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    if (action === 'get_users' || action === 'list') {
      const sheet = getDatabaseSheet('Users');
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse([]);
      const rows = data.slice(1);
      const users = rows.map((r) => ({
        id: String(r[0] || ''), username: String(r[1] || ''), name: String(r[2] || ''),
        role: String(r[3] || 'user'), active: r[4] === 'active', pendingApproval: r[4] === 'pending',
        package: String(r[5] || ''), expires: String(r[6] || ''), lineUserId: String(r[7] || ''),
        createdAt: r[9] || '', updatedAt: r[10] || ''
      })).filter((u) => u.username);
      return jsonResponse(users);
    }
    return jsonResponse({ status: 'ok', service: 'TestSkill Cloud & LINE Bot', time: new Date().toISOString() });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function handleWebApiAction(payload) {
  const action = payload.action;
  const sheet = getDatabaseSheet('Users');
  const data = sheet.getDataRange().getValues();
  if (action === 'register') {
    const u = payload.user || {};
    const username = (u.username || '').trim();
    if (!username) return jsonResponse({ status: 'error', message: 'Username required' });
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase()) { foundRow = i + 1; break; }
    }
    const now = new Date();
    if (foundRow > 0) {
      sheet.getRange(foundRow, 3).setValue(u.name || username);
      sheet.getRange(foundRow, 5).setValue('pending');
      sheet.getRange(foundRow, 11).setValue(now);
    } else {
      sheet.appendRow([u.id || ('u_' + Date.now()), username, u.name || username, u.role || 'user', 'pending', '', '', '', '', now, now]);
    }
    return jsonResponse({ status: 'ok', message: 'User registered to cloud' });
  }
  if (action === 'confirm_user') {
    const username = (payload.username || '').trim();
    const pkgTitle = payload.packageTitle || 'แพ็กเกจมาตรฐาน';
    const expires = payload.expires || '';
    const now = new Date();
    let foundRow = -1, lineUserId = '';
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
        foundRow = i + 1; lineUserId = String(data[i][7] || '').trim(); break;
      }
    }
    if (foundRow > 0) {
      sheet.getRange(foundRow, 5).setValue('active');
      sheet.getRange(foundRow, 6).setValue(pkgTitle);
      sheet.getRange(foundRow, 7).setValue(expires || 'ตลอดชีพ');
      sheet.getRange(foundRow, 11).setValue(now);
    }
    let lineSent = false;
    if (lineUserId) {
      const expiryDisplay = expires ? new Date(expires).toLocaleDateString('th-TH') : 'ใช้งานได้ตลอดชีพ';
      const pushText = "🎉 แอดมินคอนเฟิร์มสิทธิ์การใช้งานให้คุณเรียบร้อยแล้วครับ!\\n\\n👤 ไอดี: @" + username + "\\n📦 แพ็กเกจ: " + pkgTitle + "\\n📅 วันหมดอายุ: " + expiryDisplay + "\\n\\n🔗 เข้าสู่ระบบและทำแบบทดสอบได้ทันที:\\n" + WEB_APP_URL + "\\n\\nขอให้ทำคะแนนได้ตามเป้าหมายครับ ✌️✨";
      lineSent = pushLineMessage(lineUserId, pushText);
    }
    return jsonResponse({ status: 'ok', username, lineSent });
  }
  return jsonResponse({ status: 'error', message: 'Unknown action' });
}

function handleLineTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const lower = userText.toLowerCase();
  const lineUserId = event.source.userId || '';
  const userMatch = userText.match(/@([a-zA-Z0-9._-]+)/) || userText.match(/(?:ไอดี|username|user)\\s*[:=]?\\s*([a-zA-Z0-9._-]+)/i);
  if (userMatch && userMatch[1]) {
    const rawUsername = userMatch[1].trim();
    linkLineUserWithUsername(rawUsername, lineUserId);
    const replyText = "🔑 [ได้รับคำขอยืนยันสิทธิ์ของ @" + rawUsername + " แล้ว]\\n\\nสวัสดีครับ @" + rawUsername + " 👋\\nระบบได้เชื่อมต่อ LINE กับไอดีในระบบเรียบร้อยแล้วครับ!\\n\\n⏳ สถานะ: รอแอดมินคอนเฟิร์มแพ็กเกจ\\nเมื่อแอดมินกดคอนเฟิร์มในระบบ จะมีข้อความแจ้งเตือนมายังแชทนี้ทันทีครับ 😊";
    return sendLineReply(replyToken, [{ type: 'text', text: replyText, quickReply: getQuickReplyMenu() }]);
  }
  if (lower.startsWith('1') || lower.includes('ยืนยัน') || lower.includes('ขอสิทธิ์')) {
    const replyText = "🔑 [1. ขอยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill]\\n\\nสวัสดีครับ 👋 กรุณาพิมพ์แจ้ง \\"ไอดี\\" ของท่านในแชทนี้ได้เลยครับ เช่น:\\n👉 @ไอดีของคุณ (เช่น @KruThai2026)\\n\\nเมื่อแอดมินกดคอนเฟิร์มในระบบ จะมีข้อความแจ้งเตือนกลับมาที่นี่ทันทีครับ!";
    sendLineReply(replyToken, [{ type: 'text', text: replyText, quickReply: getQuickReplyMenu() }]);
  } else if (lower.startsWith('2') || lower.includes('ผู้พัฒนา') || lower.includes('ติดต่อ')) {
    sendLineReply(replyToken, [{ type: 'text', text: "👨‍💻 ติดต่อผู้ดูแลระบบโดยตรง:\\n• ผู้พัฒนา: คุณภาณุวัฒน์ (แอดมิน)\\n• Line ID: Panuwat_99999\\nยินดีให้บริการครับ 😊", quickReply: getQuickReplyMenu() }]);
  } else if (lower.startsWith('3') || lower.includes('ปัญหา')) {
    sendLineReply(replyToken, [{ type: 'text', text: "🛠️ แจ้งปัญหาการใช้งาน:\\nกรุณาระบุชุดข้อสอบและข้อที่พบปัญหา พร้อมภาพหน้าจอ ทีมงานจะตรวจสอบและแก้ไขให้ทันทีครับ ขอบคุณครับ!", quickReply: getQuickReplyMenu() }]);
  } else if (lower.startsWith('4') || lower.includes('สอบถาม')) {
    sendLineReply(replyToken, [{ type: 'text', text: "❓ สอบถามข้อมูล:\\n📘 ระบบสอบออนไลน์ TestSkill By กลางฟู คลังข้อสอบ 3,225 ข้อ พร้อมเกร็ดความรู้และ AI วิเคราะห์ผล\\nพิมพ์คำถามทิ้งไว้ได้เลยครับ!", quickReply: getQuickReplyMenu() }]);
  } else {
    replyMainMenu(replyToken);
  }
}

function linkLineUserWithUsername(username, lineUserId) {
  if (!username || !lineUserId) return;
  const sheet = getDatabaseSheet('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
      sheet.getRange(i + 1, 8).setValue(lineUserId);
      sheet.getRange(i + 1, 11).setValue(new Date());
      return;
    }
  }
  sheet.appendRow(['u_' + Date.now(), username, username, 'user', 'pending', '', '', lineUserId, '', new Date(), new Date()]);
}

function replyMainMenu(replyToken) {
  const msg = "สวัสดีครับ 👋 ยินดีต้อนรับสู่ LINE Official ของ TestSkill (By กลางฟู)\\n\\nเลือกหัวข้อที่ต้องการรับบริการ:\\n1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)\\n2️⃣ ติดต่อผู้พัฒนา (คุณภาณุวัฒน์)\\n3️⃣ แจ้งปัญหาการใช้งาน\\n4️⃣ สอบถาม อื่นๆ\\n\\nพิมพ์หมายเลข 1-4 หรือพิมพ์ @ไอดีของคุณ เพื่อขอยืนยันสิทธิ์ได้ทันทีครับ";
  sendLineReply(replyToken, [{ type: 'text', text: msg, quickReply: getQuickReplyMenu() }]);
}

function getQuickReplyMenu() {
  return {
    items: [
      { type: 'action', action: { type: 'message', label: '1. ยืนยันสิทธิ์', text: '1. ยืนยันสิทธิ์' } },
      { type: 'action', action: { type: 'message', label: '2. ติดต่อผู้พัฒนา', text: '2. ติดต่อผู้พัฒนา' } },
      { type: 'action', action: { type: 'message', label: '3. แจ้งปัญหา', text: '3. แจ้งปัญหาการใช้งาน' } },
      { type: 'action', action: { type: 'message', label: '4. สอบถาม อื่นๆ', text: '4. สอบถาม อื่นๆ' } }
    ]
  };
}

function sendLineReply(replyToken, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}

function pushLineMessage(toUserId, text) {
  if (!toUserId) return false;
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
      payload: JSON.stringify({ to: toUserId, messages: [{ type: 'text', text: text }] }),
      muteHttpExceptions: true
    });
    return res.getResponseCode() === 200;
  } catch (err) {
    return false;
  }
}`;

const NODE_BOT_SCRIPT_TEMPLATE = `const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
};

const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: config.channelAccessToken });
const app = express();

app.post('/webhook', line.middleware(config), async (req, res) => {
  const results = await Promise.all(req.body.events.map(async (event) => {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();
      let reply = 'สวัสดีครับ เลือกหัวข้อ:\\n1. ยืนยันสิทธิ์\\n2. ติดต่อผู้พัฒนา\\n3. แจ้งปัญหา\\n4. สอบถาม อื่นๆ';
      if (text.startsWith('1')) reply = '🔑 [ยืนยันสิทธิ์] กรุณาแจ้งไอดีผู้ใช้ และแพ็กเกจที่ต้องการ (30 วัน / 3 เดือน / ตลอดชีพ)';
      else if (text.startsWith('2')) reply = '👨‍💻 [ติดต่อผู้พัฒนา] ติดต่อคุณภาณุวัฒน์ Line ID: Panuwat_99999 พิมพ์ข้อความทิ้งไว้ได้เลยครับ';
      else if (text.startsWith('3')) reply = '🛠️ [แจ้งปัญหา] กรุณาระบุชุดข้อสอบ ข้อที่พบปัญหา และรายละเอียด';
      else if (text.startsWith('4')) reply = '❓ [สอบถาม] คลังข้อสอบ 2,295 ข้อ สอบถามรายละเอียดเพิ่มเติมได้เลยครับ';
      return client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: reply }] });
    }
  }));
  res.json(results);
});

app.listen(process.env.PORT || 3000, () => console.log('Bot running'));`;


async function renderAdmin(tab, arg) {
  const tabs = [['users', '👥 จัดการสิทธิ์ & คำขอจาก LINE'], ['overview', '📊 ภาพรวม'], ['bank', '🗂 คลังข้อสอบ'], ['summary', '📖 ไฟล์สรุป'], ['settings', '⚙️ ตั้งค่า']];
  const head = `<div class="section-title"><div><p class="eyebrow">Admin Console</p><h1>ผู้ดูแลระบบ</h1></div></div>
    <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/admin/${k}" class="${tab === k || (!tab && k === 'users') || (tab === 'questions' && k === 'bank') ? 'active' : ''}">${l}</a>`).join('')}</nav>`;
  const views = { users: adminUsers, overview: adminOverview, bank: adminBank, questions: adminQuestions, summary: adminSummary, settings: adminSettings };
  const fn = views[tab] || adminUsers;
  shell(head + '<div id="adminBody"><div class="ai-loading"><span class="spinner"></span> กำลังโหลด…</div></div>', { active: 'admin' });
  await fn($('#adminBody'), arg);
}

/* ---------- Overview ---------- */
async function adminOverview(el) {
  const users = await Repo.getUsers();
  const pass = App.settings.passPercent;
  let all = [];
  for (const u of users) (await Repo.getHistory(u.id)).forEach((a) => all.push({ ...a, user: u }));
  all.sort((a, b) => b.finishedAt - a.finishedAt);
  const counts = {};
  for (const s of SUBJECTS) counts[s.id] = (await Repo.getBank(s.id)).length;
  const totalQ = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = all.length ? Math.round(all.reduce((n, a) => n + a.percent, 0) / all.length) : 0;
  const passRate = all.length ? Math.round((all.filter((a) => a.passed).length / all.length) * 100) : 0;
  // คะแนนเฉลี่ยรายเรื่องของทุกคน
  const agg = {};
  all.forEach((a) => Object.entries(a.bySubject).forEach(([sid, v]) => { agg[sid] = agg[sid] || { t: 0, c: 0 }; agg[sid].t += v.total; agg[sid].c += v.correct; }));

  el.innerHTML = `
    <div class="stat-grid stat-grid-4">
      <div class="card stat-card"><span>ผู้ใช้งาน</span><b>${users.length}</b><small class="muted">ใช้งานได้ ${users.filter((u) => u.active).length} บัญชี</small></div>
      <div class="card stat-card"><span>ข้อสอบในคลัง</span><b>${totalQ}</b><small class="muted">5 เรื่อง</small></div>
      <div class="card stat-card"><span>การสอบทั้งหมด</span><b>${all.length}</b><small class="muted">คะแนนเฉลี่ย ${avg}%</small></div>
      <div class="card stat-card"><span>อัตราผ่านเกณฑ์ ${pass}%</span><b>${passRate}%</b><small class="muted">จากทุกการสอบ</small></div>
    </div>
    <div class="result-grid">
      <section class="card"><h3>คะแนนเฉลี่ยรายเรื่อง (ผู้ใช้ทุกคน)</h3>
        ${SUBJECTS.map((s) => { const v = agg[s.id]; const pct = v ? Math.round((v.c / v.t) * 100) : 0;
          return `<div class="bar-row"><div class="bar-label"><b>${s.id}</b> ${esc(s.short)}</div><div class="bar"><div class="bar-fill ${pct >= pass ? 'ok' : 'bad'}" style="width:${pct}%"></div><span class="bar-mark" style="left:${pass}%"></span></div><div class="bar-val">${v ? pct + '%' : '-'}</div></div>`; }).join('')}
        <p class="muted small">ใช้ดูว่าเรื่องใดผู้เรียนส่วนใหญ่อ่อน เพื่อเพิ่มข้อสอบ/สรุปเนื้อหา</p></section>
      <section class="card"><h3>จำนวนข้อสอบแต่ละเรื่อง</h3>
        ${SUBJECTS.map((s) => `<div class="kv"><span>${s.icon} ${s.id} ${esc(s.short)}</span><b>${counts[s.id]} ข้อ</b></div>`).join('')}
        <a href="#/admin/bank" class="btn btn-ghost btn-sm mt">จัดการคลังข้อสอบ →</a></section>
    </div>
    <section class="card table-card"><h3>การสอบล่าสุด</h3>
      ${all.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>ผู้ใช้</th><th>แบบทดสอบ</th><th>คะแนน</th><th>ผล</th></tr></thead>
      <tbody>${all.slice(0, 30).map((a) => `<tr><td>${fmtDate(a.finishedAt)}</td><td>${esc(a.user.name || a.user.username)}</td><td>${esc(a.title)}</td><td><b>${a.percent}%</b></td>
      <td><span class="chip ${a.passed ? 'chip-success' : 'chip-danger'}">${a.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">ยังไม่มีข้อมูล</p>'}
    </section>`;
}

/* ---------- Users ---------- */
async function adminUsers(el) {
  const users = await Repo.getUsers();
  const today = new Date().toISOString().slice(0, 10);

  // เรียงลำดับเอาคนที่รอคอนเฟิร์ม / ขอสิทธิ์จาก LINE ขึ้นมาก่อนเสมอ
  users.sort((a, b) => {
    const aPending = (!a.active && a.pendingApproval) ? 1 : 0;
    const bPending = (!b.active && b.pendingApproval) ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const pendingList = users.filter((u) => !u.active && u.pendingApproval);
  const userCount = users.filter((u) => u.role !== 'admin').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  el.innerHTML = `
    ${pendingList.length ? `
      <div class="card pending-alert-banner" style="border-left: 5px solid #2563eb; background: rgba(37, 99, 235, 0.08); padding: 14px 18px; margin-bottom: 16px; border-radius: 10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <b style="color:#1d4ed8;font-size:15px;">🔔 มีคำขอยืนยันสิทธิ์จาก LINE / เว็บ รอคอนเฟิร์ม ${pendingList.length} รายการ</b>
            <p class="muted small" style="margin:3px 0 0 0;">กดปุ่ม "✓ คอนเฟิร์มสิทธิ์" ข้างชื่อผู้ใช้เพื่อเลือกแพ็กเกจ ระบบจะยิงข้อความตอบกลับเข้าแชท LINE ผู้ใช้โดยอัตโนมัติทันที</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btnQuickSyncCloud">🔄 ซิงค์คำขอจาก Cloud</button>
        </div>
      </div>
    ` : ''}

    <!-- แถบเลือกกลุ่มผู้ใช้งานตามบทบาท -->
    <div class="user-role-filter-bar" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <button type="button" class="btn btn-sm btn-filter-tab btn-primary" data-filter="all">👥 ทั้งหมด (${users.length})</button>
      <button type="button" class="btn btn-sm btn-filter-tab btn-outline" data-filter="user">👤 ผู้ใช้งาน / User (${userCount})</button>
      <button type="button" class="btn btn-sm btn-filter-tab btn-outline" data-filter="admin">🛡️ ผู้ดูแลระบบ / แอดมิน (${adminCount})</button>
      ${pendingList.length ? `<button type="button" class="btn btn-sm btn-filter-tab btn-outline" data-filter="pending" style="color:#d97706;border-color:#f59e0b;">⏳ รออนุมัติ (${pendingList.length})</button>` : ''}
    </div>

    <div class="toolbar">
      <input class="input" id="userSearch" placeholder="ค้นหาชื่อผู้ใช้ / ชื่อ…">
      <span class="spacer"></span>
      <button class="btn btn-outline" id="syncCloudUsers" title="ดึงคำขอสมัครและยืนยันสิทธิ์จาก Google Sheet">☁️ ซิงค์จาก Cloud</button>
      <button class="btn btn-ghost" id="importUsers">นำเข้าผู้ใช้ (CSV)</button>
      <button class="btn btn-primary" id="addUser">+ เพิ่มผู้ใช้</button>
    </div>
    <section class="card table-card"><div class="table-wrap"><table class="table" id="userTable">
      <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>แพ็กเกจ & หมดอายุ</th><th>สิทธิ์การเข้าถึง</th><th>เข้าใช้ล่าสุด</th><th>การจัดการ</th></tr></thead>
      <tbody>${users.map((u) => {
        const expired = u.expires && u.expires < today;
        const isPending = !u.active && u.pendingApproval;
        const role = u.role === 'admin' ? 'admin' : 'user';
        const allowedPerms = PERM_KEYS.filter(([k]) => u.perms?.[k]);

        return `<tr data-q="${esc((u.username + ' ' + (u.name || '')).toLowerCase())}" data-role="${role}" data-pending="${isPending ? '1' : '0'}" style="${isPending ? 'background:rgba(234, 179, 8, 0.06);' : ''}">
        <td><b>${esc(u.name || '-')}</b><br><small class="muted">@${esc(u.username)}</small>
          ${isPending ? '<br><span class="chip chip-warning chip-xs">⏳ รอคอนเฟิร์มสิทธิ์</span>' : ''}</td>
        <td>${role === 'admin' ? '<span class="chip chip-primary">ผู้ดูแลระบบ</span>' : '<span class="chip">ผู้ใช้งาน</span>'}</td>
        <td>
          <div class="user-status-cell">
            <label class="switch"><input type="checkbox" data-toggle="${u.id}" ${u.active ? 'checked' : ''} ${u.id === App.user.id ? 'disabled' : ''}><span></span></label>
            ${!u.active || isPending ? `<button type="button" class="btn btn-primary btn-xs btn-approve-user" data-approve="${u.id}" title="คอนเฟิร์มและเลือกแพ็กเกจให้ผู้ใช้">✓ คอนเฟิร์มสิทธิ์</button>` : ''}
          </div>
        </td>
        <td>
          <div class="user-expiry-cell">
            ${fmtExpiryBadge(u.expires)}
            ${u.expires ? `<small class="muted">${new Date(u.expires).toLocaleDateString('th-TH')}</small>` : ''}
          </div>
        </td>
        <td>
          ${role === 'admin'
            ? '<span class="chip chip-xs chip-primary">เข้าถึงได้ทั้งหมด</span>'
            : (allowedPerms.length
                ? `<details class="user-perm-collapse" style="cursor:pointer;">
                     <summary class="small" style="color:var(--primary);font-weight:600;user-select:none;list-style:none;display:inline-flex;align-items:center;gap:4px;">
                       👁️ ดูรายละเอียด (${allowedPerms.length} คลัง) ▾
                     </summary>
                     <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;max-width:280px;background:rgba(0,0,0,0.03);padding:6px;border-radius:6px;border:1px solid rgba(0,0,0,0.06);">
                       ${allowedPerms.map(([, l]) => `<span class="chip chip-xs">${esc(l)}</span>`).join('')}
                     </div>
                   </details>`
                : '<span class="t-danger small">ไม่มีสิทธิ์</span>')}
        </td>
        <td><small>${fmtDate(u.lastLogin)}</small></td>
        <td class="nowrap">
          <button class="btn btn-ghost btn-sm" data-edit="${u.id}">แก้ไข</button>
          <button class="btn btn-outline btn-sm" data-renew="${u.id}" title="ต่ออายุหรือเปลี่ยนแพ็กเกจ">⏱️ ต่ออายุ</button>
          <button class="btn btn-ghost btn-sm" data-hist="${u.id}">ผลสอบ</button>
          ${u.id !== App.user.id ? `<button class="btn btn-ghost btn-sm t-danger" data-del="${u.id}">ลบ</button>` : ''}
        </td></tr>`;
      }).join('')}</tbody></table></div></section>`;

  // ระบบกรองข้อมูล (ตามแท็บบทบาท & ช่องค้นหา)
  let currentFilter = 'all';
  function filterRows() {
    const q = ($('#userSearch')?.value || '').toLowerCase();
    $$('#userTable tbody tr').forEach((tr) => {
      const matchSearch = tr.dataset.q.includes(q);
      let matchRole = true;
      if (currentFilter === 'user') matchRole = tr.dataset.role === 'user';
      else if (currentFilter === 'admin') matchRole = tr.dataset.role === 'admin';
      else if (currentFilter === 'pending') matchRole = tr.dataset.pending === '1';
      tr.style.display = (matchSearch && matchRole) ? '' : 'none';
    });
  }

  $$('.btn-filter-tab').forEach((btn) => {
    btn.onclick = () => {
      $$('.btn-filter-tab').forEach((b) => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      currentFilter = btn.dataset.filter;
      filterRows();
    };
  });

  $('#userSearch').oninput = filterRows;
  $('#addUser').onclick = () => userForm();
  $('#importUsers').onclick = importUsersDialog;
  $('#btnQuickSyncCloud')?.addEventListener('click', () => $('#syncCloudUsers')?.click());

  $('#syncCloudUsers').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ กำลังซิงค์…';
    try {
      if (typeof CloudSync === 'undefined') {
        throw new Error('ระบบ CloudSync กำลังโหลด กรุณารีเฟรชหน้าเว็บอีกครั้ง');
      }
      const res = await CloudSync.syncUsers();
      if (res.added > 0 || res.updated > 0) {
        toast(`ซิงค์ข้อมูลสำเร็จ! เพิ่มคำขอใหม่ ${res.added} คน, อัปเดต ${res.updated} คน`, 'success');
        await adminUsers(el);
      } else {
        toast('ข้อมูลเป็นปัจจุบันแล้ว ไม่พบคำขอใหม่', 'info');
      }
    } catch (err) {
      toast('ซิงค์ล้มเหลว: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '☁️ ซิงค์จาก Cloud';
    }
  };

  $$('[data-edit]').forEach((b) => (b.onclick = () => userForm(users.find((u) => u.id === b.dataset.edit))));
  $$('[data-toggle]').forEach((c) => (c.onchange = async () => { await Repo.updateUser(c.dataset.toggle, { active: c.checked, pendingApproval: false }); toast(c.checked ? 'เปิดใช้งานบัญชีแล้ว' : 'ระงับบัญชีแล้ว', 'success'); }));
  
  // กดอนุมัติสิทธิ์ → เปิดหน้าต่างเลือกแพ็กเกจ
  $$('[data-approve]').forEach((b) => (b.onclick = async () => {
    const targetUser = users.find((u) => u.id === b.dataset.approve);
    if (!targetUser) return;
    const ok = await packageApprovalDialog(targetUser, 'approve');
    if (ok) await adminUsers(el);
  }));

  // กดต่ออายุ → เปิดหน้าต่างต่ออายุ/ขยายวัน
  $$('[data-renew]').forEach((b) => (b.onclick = async () => {
    const targetUser = users.find((u) => u.id === b.dataset.renew);
    if (!targetUser) return;
    const ok = await packageApprovalDialog(targetUser, 'renew');
    if (ok) await adminUsers(el);
  }));

  $$('[data-del]').forEach((b) => (b.onclick = async () => {
    const u = users.find((x) => x.id === b.dataset.del);
    if (!(await confirmBox('ลบผู้ใช้?', `ลบบัญชี <b>${esc(u.username)}</b> และประวัติการสอบทั้งหมด`, 'ลบ', true))) return;
    await Repo.saveUsers(users.filter((x) => x.id !== u.id));
    for (const k of [...(await DB.keys(`progress:${u.id}:`)), 'history:' + u.id, 'seen:' + u.id, 'wrong:' + u.id, 'bookmark:' + u.id]) await DB.del(k);
    toast('ลบผู้ใช้แล้ว', 'success'); go('/admin/users');
  }));
  $$('[data-hist]').forEach((b) => (b.onclick = async () => {
    const u = users.find((x) => x.id === b.dataset.hist);
    const h = await Repo.getHistory(u.id);
    const prog = await Repo.listProgress(u.id);
    modal({ title: `ผลสอบของ ${esc(u.name || u.username)}`, wide: true, actions: [{ label: 'ปิด' }],
      body: `${prog.length ? `<p class="small"><b>กำลังทำค้าง:</b> ${prog.map((p) => esc(Exams.title(p.examId))).join(', ')}</p>` : ''}
      ${h.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>แบบทดสอบ</th><th>คะแนน</th><th>ผล</th><th>เวลา</th></tr></thead><tbody>
      ${h.map((a) => `<tr><td>${fmtDate(a.finishedAt)}</td><td>${esc(a.title)}</td><td>${a.percent}% (${a.correct}/${a.total})</td><td><span class="chip ${a.passed ? 'chip-success' : 'chip-danger'}">${a.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span></td><td>${fmtDuration(a.durationSec)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">ยังไม่มีประวัติการสอบ</p>'}` });
  }));
}

/** หน้าต่างเลือกแพ็กเกจและอนุมัติ / ต่ออายุสิทธิ์ */
async function packageApprovalDialog(user, mode = 'approve') {
  if (!user) return false;
  const isApprove = mode === 'approve';
  const currentExpiryBadge = fmtExpiryBadge(user.expires);

  // เริ่มต้น: ถ้าเป็นอนุมัติใหม่ แนะนำทดลองใช้ 30 วัน ถ้าต่ออายุ แนะนำ 3 เดือน (90 วัน)
  let selectedPkg = isApprove ? 'trial' : 'quarter';
  let targetExpires = addDaysToDate(user.expires, selectedPkg === 'trial' ? 30 : 90);

  const res = await modal({
    title: isApprove ? `✓ อนุมัติสิทธิ์ & เลือกแพ็กเกจให้ @${esc(user.username)}` : `⏱️ ต่ออายุแพ็กเกจให้ @${esc(user.username)}`,
    wide: true,
    body: `
      <div class="package-dialog-body">
        <div class="user-info-card">
          <div class="user-info-main">
            <b>${esc(user.name || user.username)} (@${esc(user.username)})</b>
            <div class="user-info-badges">
              ${user.pendingApproval ? '<span class="chip chip-warning chip-xs">⏳ รออนุมัติ</span>' : (user.active ? '<span class="chip chip-success chip-xs">ใช้งานได้</span>' : '<span class="chip chip-danger chip-xs">ระงับอยู่</span>')}
              <span class="user-current-expiry">วันหมดอายุเดิม: ${user.expires ? new Date(user.expires).toLocaleDateString('th-TH') : 'ไม่จำกัด'} ${currentExpiryBadge}</span>
            </div>
          </div>
        </div>

        <div class="package-section-title">
          <b>เลือกแพ็กเกจการใช้งาน:</b>
          <small class="muted">(ระบบจะคำนวณวันหมดอายุอัตโนมัติ และสามารถต่อวันเพิ่มได้เรื่อยๆ)</small>
        </div>

        <div class="package-cards-grid">
          <label class="package-card ${selectedPkg === 'trial' ? 'active' : ''}" data-pkg="trial">
            <input type="radio" name="pkgOption" value="trial" ${selectedPkg === 'trial' ? 'checked' : ''}>
            <div class="package-card-inner">
              <span class="package-tag tag-trial">🎁 แนะนำ</span>
              <h4>แบบทดลองใช้ (30 วัน)</h4>
              <p class="muted small">ให้สิทธิ์ใช้งานระบบ 1 เดือน (30 วัน) เหมาะสำหรับสมาชิกใหม่ที่เข้ามาทดลองทำข้อสอบ</p>
              <div class="package-days-badge">+30 วัน</div>
            </div>
          </label>

          <label class="package-card ${selectedPkg === 'quarter' ? 'active' : ''}" data-pkg="quarter">
            <input type="radio" name="pkgOption" value="quarter" ${selectedPkg === 'quarter' ? 'checked' : ''}>
            <div class="package-card-inner">
              <span class="package-tag tag-popular">🌟 ยอดนิยม</span>
              <h4>แพ็กเกจ 3 เดือน (90 วัน)</h4>
              <p class="muted small">ให้สิทธิ์ใช้งาน 3 เดือนเต็ม (90 วัน) ครอบคลุมการเตรียมสอบใบประกอบวิชาชีพครู 1 รอบสอบ</p>
              <div class="package-days-badge">+90 วัน</div>
            </div>
          </label>

          <label class="package-card ${selectedPkg === 'lifetime' ? 'active' : ''}" data-pkg="lifetime">
            <input type="radio" name="pkgOption" value="lifetime" ${selectedPkg === 'lifetime' ? 'checked' : ''}>
            <div class="package-card-inner">
              <span class="package-tag tag-lifetime">👑 ตลอดชีพ</span>
              <h4>ใช้ฟรีตลอดชีพ</h4>
              <p class="muted small">ไม่จำกัดวันหมดอายุ ใช้งานได้ตลอดไป ไม่มีวันหมดอายุในระบบ</p>
              <div class="package-days-badge">ไม่จำกัด</div>
            </div>
          </label>

          <label class="package-card ${selectedPkg === 'custom' ? 'active' : ''}" data-pkg="custom">
            <input type="radio" name="pkgOption" value="custom" ${selectedPkg === 'custom' ? 'checked' : ''}>
            <div class="package-card-inner">
              <span class="package-tag tag-custom">⏱️ กำหนดเอง</span>
              <h4>แอดมินกำหนดเอง</h4>
              <p class="muted small">เลือกจำนวนวัน หรือระบุวันหมดอายุเฉพาะเจาะจงได้ตามต้องการ</p>
              <div class="package-days-badge">กำหนดเอง</div>
            </div>
          </label>
        </div>

        <!-- Custom picker drawer -->
        <div class="package-custom-wrap ${selectedPkg === 'custom' ? '' : 'hidden'}" id="pkgCustomWrap">
          <div class="quick-days-pills">
            <span>ปุ่มลัดเพิ่มวัน:</span>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="7">+7 วัน</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="15">+15 วัน</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="30">+30 วัน</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="60">+60 วัน</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="90">+90 วัน (3 ด.)</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="180">+180 วัน (6 ด.)</button>
            <button type="button" class="btn btn-ghost btn-xs btn-day-pill" data-days="365">+365 วัน (1 ปี)</button>
          </div>
          <div class="custom-date-row">
            <label class="field">
              <span>เลือกวันหมดอายุโดยตรง</span>
              <input class="input" type="date" id="pkgTargetDate" value="${targetExpires}">
            </label>
            <label class="field">
              <span>หรือระบุจำนวนวันที่จะบวกเพิ่ม</span>
              <div class="input-group">
                <input class="input" type="number" id="pkgAddDaysNum" min="1" max="3650" placeholder="เช่น 45">
                <button type="button" class="btn btn-outline" id="btnApplyAddDays">บวกวัน</button>
              </div>
            </label>
          </div>
        </div>

        <div class="package-summary-card">
          <div class="package-summary-line">
            <span>📅 ผลการคำนวณวันหมดอายุใหม่:</span>
            <b id="pkgCalcResultDisplay" class="grad-text">-</b>
          </div>
          <small class="muted" id="pkgCalcSubDisplay"></small>
        </div>

        <div class="field mt">
          <span>สิทธิ์การเข้าถึงชุดข้อสอบ <button type="button" class="link-btn" id="pkgPermAll">เลือกทั้งหมด</button> · <button type="button" class="link-btn" id="pkgPermNone">ล้าง</button></span>
          <div class="perm-grid">
            ${PERM_KEYS.map(([k, l]) => `<label class="perm-item"><input type="checkbox" name="pkgPerm" value="${k}" ${user.perms?.[k] !== false ? 'checked' : ''}> ${l}${k !== 'final' ? `<small class="muted">${esc(subjectById(k).short)}</small>` : '<small class="muted">คละ 100 ข้อ</small>'}</label>`).join('')}
          </div>
        </div>
      </div>`,
    actions: [
      { label: 'ยกเลิก', value: null },
      {
        label: isApprove ? '✓ ยืนยันคอนเฟิร์มและเปิดสิทธิ์' : '💾 บันทึกการต่ออายุ',
        cls: 'btn-primary',
        onClick: async (b) => {
          const perms = {};
          b.querySelectorAll('[name=pkgPerm]').forEach((c) => (perms[c.value] = c.checked));
          const finalExpires = selectedPkg === 'lifetime' ? '' : targetExpires;

          await Repo.updateUser(user.id, {
            active: true,
            pendingApproval: false,
            expires: finalExpires,
            perms
          });

          const pkgName = {
            trial: 'แบบทดลองใช้ (30 วัน)',
            quarter: 'แพ็กเกจ 3 เดือน (90 วัน)',
            lifetime: 'ใช้ฟรีตลอดชีพ',
            custom: 'แอดมินกำหนดเอง'
          }[selectedPkg] || 'แพ็กเกจ';

          toast(`บันทึกสิทธิ์ @${user.username} เรียบร้อยแล้ว (${pkgName})`, 'success');

          // สั่งส่งสัญญาณคอนเฟิร์มขึ้น Cloud ให้ LINE Bot ยิงแจ้งเตือนเข้าแชทผู้ใช้โดยอัตโนมัติ
          CloudSync.confirmUser({
            username: user.username,
            name: user.name,
            packageTitle: pkgName,
            expires: finalExpires,
            adminName: App.user?.name || 'ภาณุวัฒน์'
          });

          // แสดงหน้าต่างสรุปและปุ่ม 1-Click ตอบกลับผ่าน LINE สำรอง
          setTimeout(() => {
            const confirmMsg = CloudSync.formatConfirmationMessage({
              username: user.username,
              packageTitle: pkgName,
              expires: finalExpires
            });

            modal({
              title: `🎉 คอนเฟิร์มสิทธิ์ @${esc(user.username)} เรียบร้อย!`,
              body: `
                <div class="confirm-done-box">
                  <div class="confirm-done-tags" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
                    <span class="chip chip-success">✓ บันทึกแพ็กเกจ: ${esc(pkgName)}</span>
                    <span class="chip chip-muted">หมดอายุ: ${finalExpires ? new Date(finalExpires).toLocaleDateString('th-TH') : 'ใช้งานตลอดชีพ'}</span>
                  </div>
                  <p class="muted small">ระบบได้บันทึกสิทธิ์และซิงค์ข้อมูลขึ้น Cloud เรียบร้อยแล้ว แอดมินสามารถกดส่งข้อความคอนเฟิร์มเข้าแชท LINE ของผู้ใช้ หรือคัดลอกข้อความส่งทางแชทได้ทันที</p>
                  
                  <div class="field mt">
                    <span>ข้อความตอบกลับผู้ใช้:</span>
                    <textarea class="input" rows="6" readonly id="doneMsgBox" style="font-size:13px;line-height:1.5;">${esc(confirmMsg)}</textarea>
                  </div>
                </div>
              `,
              actions: [
                {
                  label: '📱 ส่งเข้า LINE ผู้ใช้ (คลิกเดียว)',
                  cls: 'btn-primary',
                  onClick: async () => {
                    await navigator.clipboard?.writeText(confirmMsg);
                    toast('คัดลอกข้อความแล้ว กำลังเปิด LINE เพื่อเลือกแชทส่งให้ผู้ใช้...', 'success', 3500);
                    window.open(CloudSync.getLineShareUrl(confirmMsg), '_blank', 'noopener');
                    return false;
                  }
                },
                {
                  label: '📋 คัดลอกข้อความ',
                  cls: 'btn-outline',
                  onClick: async () => {
                    await navigator.clipboard?.writeText(confirmMsg);
                    toast('คัดลอกข้อความตอบกลับแล้ว วางในแชท LINE ได้ทันที', 'success');
                    return false;
                  }
                },
                { label: 'เสร็จสิ้น', value: true, cls: 'btn-ghost' }
              ]
            });
          }, 350);

          return true;
        }
      }
    ],
    onMount: (b) => {
      const customWrap = b.querySelector('#pkgCustomWrap');
      const dateInp = b.querySelector('#pkgTargetDate');
      const addDaysInp = b.querySelector('#pkgAddDaysNum');
      const resultDisplay = b.querySelector('#pkgCalcResultDisplay');
      const resultSub = b.querySelector('#pkgCalcSubDisplay');

      const updateResultDisplay = () => {
        b.querySelectorAll('.package-card').forEach((card) => {
          card.classList.toggle('active', card.dataset.pkg === selectedPkg);
        });

        if (selectedPkg === 'lifetime') {
          customWrap.classList.add('hidden');
          resultDisplay.textContent = '👑 ใช้ฟรีตลอดชีพ (ไม่มีวันหมดอายุ)';
          resultSub.textContent = 'ผู้ใช้งานสามารถเข้าถึงระบบได้ตลอดเวลาอย่างไม่จำกัด';
          return;
        }

        if (selectedPkg === 'custom') {
          customWrap.classList.remove('hidden');
        } else {
          customWrap.classList.add('hidden');
          const days = selectedPkg === 'trial' ? 30 : 90;
          targetExpires = addDaysToDate(user.expires, days);
          dateInp.value = targetExpires;
        }

        if (targetExpires) {
          const remDays = calcDaysRemaining(targetExpires);
          const thaiDate = new Date(targetExpires).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
          resultDisplay.textContent = `${thaiDate} (${remDays > 0 ? `อีก ${remDays} วัน` : 'วันนี้'})`;
          resultSub.textContent = user.expires ? `(คำนวณนับต่อจากวันหมดอายุเดิมหรือปัจจุบัน: ${user.expires})` : '(นับจากวันนี้)';
        }
      };

      b.querySelectorAll('[name=pkgOption]').forEach((r) => {
        r.onchange = () => {
          selectedPkg = r.value;
          updateResultDisplay();
        };
      });

      dateInp.oninput = () => {
        targetExpires = dateInp.value;
        updateResultDisplay();
      };

      b.querySelectorAll('.btn-day-pill').forEach((btn) => {
        btn.onclick = () => {
          const d = Number(btn.dataset.days);
          targetExpires = addDaysToDate(user.expires, d);
          dateInp.value = targetExpires;
          updateResultDisplay();
        };
      });

      b.querySelector('#btnApplyAddDays').onclick = () => {
        const d = Number(addDaysInp.value);
        if (!d || d <= 0) return toast('กรุณาระบุจำนวนวัน', 'warning');
        targetExpires = addDaysToDate(user.expires, d);
        dateInp.value = targetExpires;
        addDaysInp.value = '';
        updateResultDisplay();
      };

      b.querySelector('#pkgPermAll').onclick = () => b.querySelectorAll('[name=pkgPerm]').forEach((c) => (c.checked = true));
      b.querySelector('#pkgPermNone').onclick = () => b.querySelectorAll('[name=pkgPerm]').forEach((c) => (c.checked = false));

      updateResultDisplay();
    }
  });

  return !!res;
}

async function userForm(user) {
  const isNew = !user;
  const u = user || { username: '', name: '', role: 'user', active: true, expires: '', perms: Object.fromEntries(PERM_KEYS.map(([k]) => [k, true])) };
  const res = await modal({
    title: isNew ? 'เพิ่มผู้ใช้ใหม่' : `แก้ไขผู้ใช้ @${esc(u.username)}`,
    body: `<div class="form-grid">
      <label class="field"><span>ชื่อผู้ใช้ (สำหรับล็อกอิน)</span><input class="input" name="username" value="${esc(u.username)}" ${isNew ? '' : 'disabled'} placeholder="อย่างน้อย 8 ตัว ภาษาอังกฤษผสมตัวเลข เช่น KruThai2026"></label>
      <label class="field"><span>ชื่อ–นามสกุล หรือชื่อเรียก</span><input class="input" name="name" value="${esc(u.name)}"></label>
      <label class="field"><span>${isNew ? 'รหัสผ่าน' : 'รีเซ็ตรหัสผ่าน (เว้นว่าง = ไม่เปลี่ยน)'}</span><input class="input" name="password" type="text" placeholder="อย่างน้อย 8 ตัว ภาษาอังกฤษผสมตัวเลข เช่น Pass1234"></label>
      <label class="field"><span>บทบาท</span><select class="input" name="role" ${u.id === App.user.id ? 'disabled' : ''}><option value="user" ${u.role === 'user' ? 'selected' : ''}>ผู้ใช้งาน</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option></select></label>
      <label class="field">
        <span>วันหมดอายุบัญชี (เว้นว่าง = ไม่จำกัด)</span>
        <div class="quick-preset-bar">
          <button type="button" class="btn btn-ghost btn-xs btn-preset-pill" data-preset="trial">🎁 ทดลอง 30 วัน</button>
          <button type="button" class="btn btn-ghost btn-xs btn-preset-pill" data-preset="quarter">🌟 3 เดือน (90 วัน)</button>
          <button type="button" class="btn btn-ghost btn-xs btn-preset-pill" data-preset="lifetime">👑 ตลอดชีพ</button>
          <button type="button" class="btn btn-ghost btn-xs btn-preset-pill" data-preset="year">+1 ปี</button>
        </div>
        <input class="input" type="date" name="expires" id="userFormExpires" value="${esc(u.expires || '')}">
      </label>
      <label class="field field-inline"><input type="checkbox" name="active" ${u.active ? 'checked' : ''} ${u.id === App.user.id ? 'disabled' : ''}> <span>เปิดใช้งานบัญชี</span></label>
    </div>
    <div class="field"><span>สิทธิ์การเข้าถึงชุดข้อสอบ <button type="button" class="link-btn" id="permAll">เลือกทั้งหมด</button> · <button type="button" class="link-btn" id="permNone">ล้าง</button></span>
      <div class="perm-grid">${PERM_KEYS.map(([k, l]) => `<label class="perm-item"><input type="checkbox" name="perm" value="${k}" ${u.perms?.[k] ? 'checked' : ''}> ${l}${k !== 'final' ? `<small class="muted">${esc(subjectById(k).short)}</small>` : '<small class="muted">คละ 100 ข้อ</small>'}</label>`).join('')}</div>
      <small class="muted">ผู้ดูแลระบบเข้าถึงได้ทุกชุดโดยอัตโนมัติ</small></div>`,
    onMount: (b) => {
      b.querySelector('#permAll').onclick = () => b.querySelectorAll('[name=perm]').forEach((c) => (c.checked = true));
      b.querySelector('#permNone').onclick = () => b.querySelectorAll('[name=perm]').forEach((c) => (c.checked = false));
      const expInp = b.querySelector('#userFormExpires');
      b.querySelectorAll('.btn-preset-pill').forEach((btn) => {
        btn.onclick = () => {
          const type = btn.dataset.preset;
          if (type === 'lifetime') expInp.value = '';
          else if (type === 'trial') expInp.value = addDaysToDate(expInp.value || u.expires, 30);
          else if (type === 'quarter') expInp.value = addDaysToDate(expInp.value || u.expires, 90);
          else if (type === 'year') expInp.value = addDaysToDate(expInp.value || u.expires, 365);
        };
      });
    },
    actions: [{ label: 'ยกเลิก', value: null }, {
      label: 'บันทึก', cls: 'btn-primary', onClick: async (b) => {
        const val = (n) => b.querySelector(`[name=${n}]`);
        const username = val('username').value.trim();
        const pw = val('password').value;
        const users = await Repo.getUsers();
        if (isNew) {
          if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) { toast('ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ความยาว 3–32 ตัว', 'error'); return false; }
          if (users.some((x) => x.username.toLowerCase() === username.toLowerCase())) { toast('ชื่อผู้ใช้นี้มีอยู่แล้ว', 'error'); return false; }
          if (pw.length < 6) { toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error'); return false; }
        } else if (pw && pw.length < 6) { toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error'); return false; }
        const perms = {}; b.querySelectorAll('[name=perm]').forEach((c) => (perms[c.value] = c.checked));
        const data = { name: val('name').value.trim(), role: u.id === App.user.id ? u.role : val('role').value, expires: val('expires').value, active: u.id === App.user.id ? true : val('active').checked, perms };
        if (isNew) {
          users.push({ id: uid('u_'), username, ...data, passHash: await hashPassword(username, pw), mustChangePassword: false, createdAt: Date.now(), lastLogin: null });
          await Repo.saveUsers(users);
        } else {
          if (pw) { data.passHash = await hashPassword(u.username, pw); data.mustChangePassword = false; }
          await Repo.updateUser(u.id, data);
        }
        return true;
      }
    }]
  });
  if (res) { toast(isNew ? 'เพิ่มผู้ใช้เรียบร้อย' : 'บันทึกการแก้ไขแล้ว', 'success'); go('/admin/users'); }
}

async function importUsersDialog() {
  const res = await modal({
    title: 'นำเข้าผู้ใช้จากไฟล์ CSV',
    body: `<p class="muted small">คอลัมน์: <code>username,name,password,expires</code> (expires รูปแบบ YYYY-MM-DD หรือเว้นว่าง) — ผู้ใช้ใหม่จะได้สิทธิ์ทุกชุดและต้องเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก</p>
      <button type="button" class="btn btn-ghost btn-sm" id="dlUserTpl">ดาวน์โหลดแม่แบบ</button>
      <input type="file" class="input mt" accept=".csv" name="file">`,
    onMount: (b) => { b.querySelector('#dlUserTpl').onclick = () => download('users-template.csv', '\uFEFFusername,name,password,expires\r\nstudent01,สมชาย ใจดี,pass1234,2027-03-31\r\n'); },
    actions: [{ label: 'ยกเลิก', value: null }, {
      label: 'นำเข้า', cls: 'btn-primary', onClick: async (b) => {
        const f = b.querySelector('[name=file]').files[0];
        if (!f) { toast('กรุณาเลือกไฟล์', 'error'); return false; }
        const rows = Importer.parseCSV(await readAsText(f));
        const users = await Repo.getUsers();
        let added = 0, skipped = 0;
        for (const r of rows) {
          const username = String(r.username || '').trim();
          if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username) || String(r.password || '').length < 6 || users.some((x) => x.username.toLowerCase() === username.toLowerCase())) { skipped++; continue; }
          users.push({ id: uid('u_'), username, name: String(r.name || '').trim(), role: 'user', active: true, expires: String(r.expires || '').trim(),
            perms: Object.fromEntries(PERM_KEYS.map(([k]) => [k, true])), passHash: await hashPassword(username, r.password), mustChangePassword: true, createdAt: Date.now(), lastLogin: null });
          added++;
        }
        await Repo.saveUsers(users);
        return { added, skipped };
      }
    }]
  });
  if (res) { toast(`นำเข้า ${res.added} บัญชี${res.skipped ? ` (ข้าม ${res.skipped} แถว)` : ''}`, 'success'); go('/admin/users'); }
}

/* ---------- Question bank ---------- */
async function adminBank(el) {
  const s = App.settings;
  const rows = [];
  for (const sub of SUBJECTS) {
    const bank = await Repo.getBank(sub.id);
    rows.push({ sub, n: bank.length, noExplain: bank.filter((q) => !q.explain).length });
  }
  el.innerHTML = `
    <div class="alert alert-info small">📥 รองรับไฟล์ <b>CSV / Excel (.xlsx) / JSON</b> ตามแม่แบบ (แม่นยำ 100%) และไฟล์ <b>PDF / Word (.docx) / TXT / รูปภาพ</b> โดยให้ AI ช่วยแปลง (ต้องตั้งค่า API Key) · ข้อสอบแต่ละเรื่องจะถูกแบ่งเป็นชุดละ <b>${s.setSize}</b> ข้อโดยอัตโนมัติ</div>
    <div class="toolbar"><button class="btn btn-ghost" id="dlTpl">⬇ ดาวน์โหลดแม่แบบ CSV</button><button class="btn btn-ghost" id="exportAllQ">⬇ ส่งออกคลังทั้งหมด (JSON)</button>
      <span class="spacer"></span><button class="btn btn-primary" id="uploadAny">⬆ อัปโหลดไฟล์ข้อสอบ</button></div>
    <section class="bank-grid">${rows.map(({ sub, n, noExplain }) => `
      <article class="card bank-card"><div class="subject-head"><span class="subject-icon">${sub.icon}</span><span class="subject-code">เรื่องที่ ${sub.id}</span></div>
        <h3>${esc(sub.title)}</h3>
        <div class="bank-stats"><div><b>${n}</b><small>ข้อ</small></div><div><b>${Math.ceil(n / s.setSize)}</b><small>ชุด</small></div><div><b class="${noExplain ? 't-warning' : ''}">${noExplain}</b><small>ไม่มีเกร็ดความรู้</small></div></div>
        <div class="row-actions"><button class="btn btn-primary btn-sm" data-up="${sub.id}">⬆ อัปโหลด</button><a class="btn btn-ghost btn-sm" href="#/admin/questions/${sub.id}">ดู/แก้ไข</a>
        <button class="btn btn-ghost btn-sm" data-exp="${sub.id}">ส่งออก</button><button class="btn btn-ghost btn-sm t-danger" data-clear="${sub.id}">ล้าง</button></div>
      </article>`).join('')}</section>`;

  $('#dlTpl').onclick = () => download('klangfu-question-template.csv', Importer.templateCSV(), 'text/csv;charset=utf-8');
  $('#exportAllQ').onclick = async () => {
    const all = []; for (const sub of SUBJECTS) all.push(...(await Repo.getBank(sub.id)));
    download(`question-bank-all-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all, null, 2), 'application/json');
  };
  $('#uploadAny').onclick = () => uploadDialog('');
  $$('[data-up]').forEach((b) => (b.onclick = () => uploadDialog(b.dataset.up)));
  $$('[data-exp]').forEach((b) => (b.onclick = async () => download(`question-bank-${b.dataset.exp}.json`, JSON.stringify(await Repo.getBank(b.dataset.exp), null, 2), 'application/json')));
  $$('[data-clear]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('ล้างคลังข้อสอบ?', `ข้อสอบทั้งหมดในเรื่อง ${b.dataset.clear} จะถูกลบ (แนะนำให้ส่งออกสำรองไว้ก่อน)`, 'ล้างทั้งหมด', true))) return;
    await Repo.saveBank(b.dataset.clear, []); toast('ล้างคลังแล้ว', 'success'); go('/admin/bank');
  }));
}

async function uploadDialog(subject) {
  let parsed = null;
  const res = await modal({
    title: '⬆ อัปโหลดไฟล์ข้อสอบ', wide: true,
    body: `<div class="form-grid">
      <label class="field"><span>เรื่อง</span><select class="input" name="subject">
        <option value="">อ่านจากคอลัมน์ subject ในไฟล์</option>${SUBJECTS.map((s) => `<option value="${s.id}" ${s.id === subject ? 'selected' : ''}>${s.id} — ${esc(s.short)}</option>`).join('')}</select></label>
      <label class="field"><span>วิธีนำเข้า</span><select class="input" name="mode"><option value="append">เพิ่มต่อท้ายคลังเดิม</option><option value="replace">แทนที่คลังเดิมทั้งหมด</option></select></label>
      <label class="field"><span>เมื่อใช้ AI (PDF/Word/TXT/รูป)</span><select class="input" name="aiMode"><option value="extract">สกัดข้อสอบจากไฟล์ข้อสอบ</option><option value="generate">ให้ AI ออกข้อสอบใหม่จากไฟล์สรุป</option></select></label>
      <label class="field"><span>จำนวนข้อที่ให้ AI ออก (โหมดออกข้อสอบใหม่)</span><input class="input" type="number" name="aiCount" value="30" min="5" max="100"></label>
    </div>
    <label class="dropzone" id="dz"><input type="file" name="file" accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.txt,.md,image/*" hidden>
      <span class="dz-icon">📄</span><b>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</b><small class="muted">CSV, Excel, JSON, PDF, Word, TXT, รูปภาพ</small><span id="fileName" class="chip mt hidden"></span></label>
    <div id="parseStatus"></div><div id="preview"></div>`,
    onMount: (b) => {
      const dz = b.querySelector('#dz'), input = b.querySelector('[name=file]');
      const pick = (f) => { if (!f) return; const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; showName(); };
      const showName = () => { const f = input.files[0]; const c = b.querySelector('#fileName'); c.textContent = f ? `${f.name} (${Math.round(f.size / 1024)} KB)` : ''; c.classList.toggle('hidden', !f); parsed = null; b.querySelector('#preview').innerHTML = ''; };
      input.onchange = showName;
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); pick(e.dataTransfer.files[0]); };
    },
    actions: [{ label: 'ยกเลิก', value: null }, {
      label: 'ตรวจสอบไฟล์', cls: 'btn-outline', onClick: async (b) => { await doParse(b); return false; }
    }, {
      label: 'ยืนยันนำเข้า', cls: 'btn-primary', onClick: async (b) => {
        if (!parsed) { await doParse(b); if (!parsed) return false; }
        if (!parsed.ok.length) { toast('ไม่พบข้อสอบที่นำเข้าได้', 'error'); return false; }
        const mode = b.querySelector('[name=mode]').value;
        const bySub = {};
        parsed.ok.forEach((q) => (bySub[q.subject] = bySub[q.subject] || []).push(q));
        if (mode === 'replace' && !(await confirmBox('แทนที่คลังเดิม?', `ข้อสอบเดิมในเรื่อง ${Object.keys(bySub).join(', ')} จะถูกแทนที่ทั้งหมด`, 'แทนที่', true))) return false;
        for (const [sid, list] of Object.entries(bySub)) {
          const bank = mode === 'replace' ? [] : await Repo.getBank(sid);
          const seen = new Set(bank.map((q) => q.question.replace(/\s+/g, '')));
          const fresh = list.filter((q) => { const k = q.question.replace(/\s+/g, ''); if (seen.has(k)) return false; seen.add(k); return true; });
          await Repo.saveBank(sid, bank.concat(fresh));
        }
        return { n: parsed.ok.length, subs: Object.keys(bySub) };
      }
    }]
  });
  if (res) { toast(`นำเข้า ${res.n} ข้อ (เรื่อง ${res.subs.join(', ')}) เรียบร้อย — ข้อซ้ำถูกข้ามอัตโนมัติ`, 'success', 5000); go('/admin/bank'); }

  async function doParse(b) {
    const f = b.querySelector('[name=file]').files[0];
    const st = b.querySelector('#parseStatus'), pv = b.querySelector('#preview');
    if (!f) { toast('กรุณาเลือกไฟล์', 'error'); return; }
    const sid = b.querySelector('[name=subject]').value;
    st.innerHTML = '<div class="ai-loading"><span class="spinner"></span> กำลังอ่านไฟล์…</div>';
    pv.innerHTML = '';
    try {
      parsed = await Importer.fromFile(f, {
        subject: sid || null, aiMode: b.querySelector('[name=aiMode]').value, aiCount: +b.querySelector('[name=aiCount]').value || 30,
        onStatus: (m) => (st.innerHTML = `<div class="ai-loading"><span class="spinner"></span> ${esc(m)}</div>`)
      });
      const counts = {}; parsed.ok.forEach((q) => (counts[q.subject] = (counts[q.subject] || 0) + 1));
      st.innerHTML = `<div class="alert ${parsed.ok.length ? 'alert-success' : 'alert-danger'}">พบข้อสอบที่ใช้ได้ <b>${parsed.ok.length}</b> ข้อ ${Object.entries(counts).map(([k, v]) => `· เรื่อง ${k}: ${v}`).join(' ')}
        ${parsed.viaAI ? '<br><small>✨ แปลงโดย AI — กรุณาตรวจทานเฉลยก่อนใช้งานจริง</small>' : ''}</div>
        ${parsed.errors.length ? `<details class="alert alert-warning"><summary>ข้อผิดพลาด ${parsed.errors.length} รายการ (จะถูกข้าม)</summary><ul class="small">${parsed.errors.slice(0, 50).map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details>` : ''}`;
      pv.innerHTML = parsed.ok.slice(0, 5).map((q, i) => `<div class="preview-q"><b>${i + 1}. [${q.subject}] ${esc(q.question)}</b>
        <ol class="preview-choices">${q.choices.map((c, k) => `<li class="${k === q.answer ? 'is-answer' : ''}">${TH_LABELS[k]}. ${esc(c)}</li>`).join('')}</ol>
        ${q.explain ? `<small class="muted">💡 ${esc(q.explain)}</small>` : '<small class="t-warning">ไม่มีเกร็ดความรู้</small>'}</div>`).join('')
        + (parsed.ok.length > 5 ? `<p class="muted small center">…และอีก ${parsed.ok.length - 5} ข้อ</p>` : '');
    } catch (e) { parsed = null; st.innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`; }
  }
}

async function adminQuestions(el, sid) {
  const sub = subjectById(sid);
  if (!sub) return go('/admin/bank');
  let bank = await Repo.getBank(sid);
  const PAGE = 20; let page = 0, query = '';
  el.innerHTML = `<a href="#/admin/bank" class="back-link">← กลับคลังข้อสอบ</a>
    <div class="section-title"><h2>${sub.icon} เรื่อง ${sid}: ${esc(sub.short)}</h2></div>
    <div class="toolbar"><input class="input" id="qSearch" placeholder="ค้นหาโจทย์ / หัวข้อ…"><select class="input input-auto" id="qFilter"><option value="">ทั้งหมด</option><option value="noexp">ไม่มีเกร็ดความรู้</option></select>
      <span class="spacer"></span>${AI.enabled() ? '<button class="btn btn-ghost" id="aiFill">✨ ให้ AI เติมเกร็ดความรู้ที่ขาด</button>' : ''}<button class="btn btn-primary" id="addQ">+ เพิ่มข้อสอบ</button></div>
    <div id="qList"></div><div class="pager" id="pager"></div>`;
  const filtered = () => bank.filter((q) => (!query || (q.question + ' ' + (q.topic || '')).toLowerCase().includes(query)) && ($('#qFilter').value !== 'noexp' || !q.explain));
  const draw = () => {
    const list = filtered(), pages = Math.max(1, Math.ceil(list.length / PAGE));
    page = Math.min(page, pages - 1);
    $('#qList').innerHTML = list.slice(page * PAGE, page * PAGE + PAGE).map((q) => {
      const idx = bank.indexOf(q);
      return `<div class="card q-row"><div class="q-row-head"><span class="chip">#${idx + 1} · ชุด ${Math.floor(idx / App.settings.setSize) + 1}</span>${q.topic ? `<span class="chip chip-muted">${esc(q.topic)}</span>` : ''}<span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" data-e="${q.id}">แก้ไข</button><button class="btn btn-ghost btn-sm t-danger" data-d="${q.id}">ลบ</button></div>
        <b>${esc(q.question)}</b><ol class="preview-choices">${q.choices.map((c, k) => `<li class="${k === q.answer ? 'is-answer' : ''}">${TH_LABELS[k]}. ${esc(c)}</li>`).join('')}</ol>
        ${q.explain ? `<small class="muted">💡 ${esc(q.explain)}</small>` : '<small class="t-warning">ไม่มีเกร็ดความรู้</small>'}</div>`;
    }).join('') || '<div class="card empty"><p class="muted">ไม่พบข้อสอบ</p></div>';
    $('#pager').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) => `<button class="${i === page ? 'active' : ''}" data-p="${i}">${i + 1}</button>`).join('') : '';
    $$('#pager button').forEach((b) => (b.onclick = () => { page = +b.dataset.p; draw(); window.scrollTo(0, 0); }));
    $$('[data-e]').forEach((b) => (b.onclick = async () => { const q = bank.find((x) => x.id === b.dataset.e); if (await questionForm(sid, q)) { bank = await Repo.getBank(sid); draw(); } }));
    $$('[data-d]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox('ลบข้อสอบ?', 'ข้อนี้จะถูกลบออกจากคลังถาวร', 'ลบ', true))) return;
      bank = bank.filter((x) => x.id !== b.dataset.d); await Repo.saveBank(sid, bank); draw(); toast('ลบแล้ว', 'success');
    }));
  };
  $('#qSearch').oninput = (e) => { query = e.target.value.toLowerCase(); page = 0; draw(); };
  $('#qFilter').onchange = () => { page = 0; draw(); };
  $('#addQ').onclick = async () => { if (await questionForm(sid)) { bank = await Repo.getBank(sid); draw(); } };
  const fill = $('#aiFill');
  if (fill) fill.onclick = async () => {
    const todo = bank.filter((q) => !q.explain);
    if (!todo.length) return toast('ทุกข้อมีเกร็ดความรู้แล้ว', 'info');
    if (!(await confirmBox('ให้ AI เติมเกร็ดความรู้', `จะสร้างเกร็ดความรู้ให้ ${todo.length} ข้อ (ใช้เวลาประมาณ ${Math.ceil(todo.length * 3 / 60)} นาที)`, 'เริ่ม'))) return;
    fill.disabled = true;
    let done = 0;
    for (const q of todo) {
      fill.textContent = `✨ กำลังสร้าง ${done + 1}/${todo.length}…`;
      try { q.explain = await AI.explain(q); done++; } catch (e) { toast(e.message, 'error'); break; }
      if (done % 5 === 0) await Repo.saveBank(sid, bank);
    }
    await Repo.saveBank(sid, bank);
    fill.disabled = false; fill.textContent = '✨ ให้ AI เติมเกร็ดความรู้ที่ขาด';
    toast(`เติมเกร็ดความรู้ ${done} ข้อ`, 'success'); draw();
  };
  draw();
}

async function questionForm(sid, q) {
  const isNew = !q;
  const d = q || { question: '', choices: ['', '', '', ''], answer: 0, explain: '', topic: '' };
  const res = await modal({
    title: isNew ? 'เพิ่มข้อสอบ' : 'แก้ไขข้อสอบ', wide: true,
    body: `<label class="field"><span>โจทย์</span><textarea class="input" name="question" rows="3">${esc(d.question)}</textarea></label>
      <div class="field"><span>ตัวเลือก (เลือกวงกลมหน้าคำตอบที่ถูก)</span>
      ${[0, 1, 2, 3, 4].map((k) => `<div class="choice-edit"><input type="radio" name="answer" value="${k}" ${d.answer === k ? 'checked' : ''}><b>${TH_LABELS[k]}.</b><input class="input" name="c${k}" value="${esc(d.choices[k] || '')}" placeholder="${k === 4 ? 'ตัวเลือก จ (ไม่บังคับ)' : ''}"></div>`).join('')}</div>
      <label class="field"><span>เกร็ดความรู้ / คำอธิบาย</span><textarea class="input" name="explain" rows="3">${esc(d.explain)}</textarea></label>
      <label class="field"><span>หัวข้อย่อย</span><input class="input" name="topic" value="${esc(d.topic || '')}"></label>`,
    actions: [{ label: 'ยกเลิก', value: null }, {
      label: 'บันทึก', cls: 'btn-primary', onClick: async (b) => {
        const v = (n) => b.querySelector(`[name=${n}]`).value.trim();
        const raw = [0, 1, 2, 3, 4].map((k) => v('c' + k));
        const ans = +b.querySelector('[name=answer]:checked').value;
        if (!v('question')) { toast('กรุณากรอกโจทย์', 'error'); return false; }
        if (!raw[ans]) { toast('ตัวเลือกที่เป็นคำตอบต้องไม่ว่าง', 'error'); return false; }
        const choices = [], map = {};
        raw.forEach((c, k) => { if (c) { map[k] = choices.length; choices.push(c); } });
        if (choices.length < 2) { toast('ต้องมีอย่างน้อย 2 ตัวเลือก', 'error'); return false; }
        const item = { id: d.id || `${sid}-${uid()}`, subject: sid, question: v('question'), choices, answer: map[ans], explain: v('explain'), topic: v('topic') };
        const bank = await Repo.getBank(sid);
        const i = bank.findIndex((x) => x.id === item.id);
        if (i >= 0) bank[i] = item; else bank.push(item);
        await Repo.saveBank(sid, bank);
        return true;
      }
    }]
  });
  if (res) toast('บันทึกข้อสอบแล้ว', 'success');
  return res;
}

/* ---------- Summaries ---------- */
async function adminSummary(el) {
  const items = [];
  for (const s of SUBJECTS) items.push({ s, sm: await Repo.getSummary(s.id) });
  el.innerHTML = `<div class="alert alert-info small">อัปโหลดไฟล์สรุปเนื้อหาแต่ละเรื่อง (PDF, Word .docx, รูปภาพ, TXT/Markdown) ผู้ใช้ที่มีสิทธิ์จะเห็นปุ่ม "อ่านสรุปเนื้อหา" ในหน้าหลัก<br>💡 สามารถนำไฟล์สรุปไปให้ AI ออกข้อสอบใหม่ได้ที่ คลังข้อสอบ > อัปโหลด > "ให้ AI ออกข้อสอบใหม่จากไฟล์สรุป"</div>
    <section class="bank-grid">${items.map(({ s, sm }) => `<article class="card bank-card">
      <div class="subject-head"><span class="subject-icon">${s.icon}</span><span class="subject-code">เรื่องที่ ${s.id}</span></div>
      <h3>${esc(s.title)}</h3>
      ${sm ? `<p class="small">📄 <b>${esc(sm.name)}</b><br><span class="muted">อัปเดต ${fmtDate(sm.updatedAt)}</span></p>` : '<p class="muted small">ยังไม่มีไฟล์สรุป</p>'}
      <div class="row-actions"><label class="btn btn-primary btn-sm">⬆ ${sm ? 'เปลี่ยนไฟล์' : 'อัปโหลด'}<input type="file" hidden data-sum="${s.id}" accept=".pdf,.docx,.txt,.md,image/*"></label>
      ${sm ? `<a class="btn btn-ghost btn-sm" href="#/summary/${s.id}">ดู</a><button class="btn btn-ghost btn-sm t-danger" data-sdel="${s.id}">ลบ</button>` : ''}</div></article>`).join('')}</section>`;
  $$('[data-sum]').forEach((inp) => (inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop();
    try {
      let obj = { name: f.name, updatedAt: Date.now() };
      if (ext === 'pdf') obj = { ...obj, kind: 'pdf', blob: f };
      else if (/^image\//.test(f.type)) obj = { ...obj, kind: 'image', blob: f };
      else if (ext === 'docx') {
        if (!window.mammoth) throw new Error('ไม่สามารถโหลดตัวอ่าน Word ได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)');
        obj = { ...obj, kind: 'html', content: (await mammoth.convertToHtml({ arrayBuffer: await readAsArrayBuffer(f) })).value.replace(/<script[\s\S]*?<\/script>/gi, '') };
      } else obj = { ...obj, kind: 'text', content: await readAsText(f) };
      await Repo.saveSummary(inp.dataset.sum, obj);
      toast('อัปโหลดไฟล์สรุปแล้ว', 'success'); go('/admin/summary');
    } catch (e) { toast(e.message, 'error'); }
  }));
  $$('[data-sdel]').forEach((b) => (b.onclick = async () => {
    if (await confirmBox('ลบไฟล์สรุป?', 'ผู้ใช้จะไม่เห็นสรุปเนื้อหาของเรื่องนี้', 'ลบ', true)) { await Repo.delSummary(b.dataset.sdel); go('/admin/summary'); }
  }));
}

/* ---------- Settings ---------- */
async function adminSettings(el) {
  const s = App.settings;
  el.innerHTML = `
  <div class="result-grid">
    <section class="card"><h3>การสอบ</h3><form id="examSet" class="form-grid">
      <label class="field"><span>เกณฑ์ผ่าน (%)</span><input class="input" type="number" name="passPercent" min="1" max="100" value="${s.passPercent}"></label>
      <label class="field"><span>จำนวนข้อต่อชุด (รายเรื่อง)</span><input class="input" type="number" name="setSize" min="5" max="200" value="${s.setSize}"></label>
      <label class="field"><span>จำนวนข้อชุดรวม</span><input class="input" type="number" name="finalCount" min="10" max="300" value="${s.finalCount}"></label>
      <label class="field"><span>เวลาเริ่มต้นชุดรวมแบบจับเวลา (นาที)</span><input class="input" type="number" name="finalMinutes" min="5" max="600" value="${s.finalMinutes}"></label>
      <label class="field field-inline full"><input type="checkbox" name="shuffleChoicesFinal" ${s.shuffleChoicesFinal ? 'checked' : ''}> <span>สลับตำแหน่งตัวเลือกในชุดรวม (ป้องกันการจำตำแหน่งคำตอบ)</span></label>
      <label class="field full"><span>ประกาศหน้าหลัก (เว้นว่าง = ไม่แสดง)</span><input class="input" name="announcement" value="${esc(s.announcement)}" placeholder="เช่น สอบจริงวันที่ ... อย่าลืมทบทวนเรื่องที่ 04"></label>
      <button class="btn btn-primary">บันทึกการตั้งค่า</button></form></section>

    <section class="card"><h3>✨ AI (Google Gemini)</h3>
      <p class="muted small">ใช้สำหรับ: วิเคราะห์ผลสอบ/สรุปผ่านเกณฑ์, สร้างเกร็ดความรู้ข้อที่ไม่มีคำอธิบาย, แปลงไฟล์ PDF/Word เป็นข้อสอบ และออกข้อสอบจากไฟล์สรุป<br>
      รับ API Key ฟรีที่ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a></p>
      <form id="aiSet" class="form-grid">
        <label class="field full"><span>Gemini API Key</span><div class="input-group"><input class="input input-rounded" type="password" name="geminiKey" value="${esc(s.geminiKey)}" placeholder="AIza…"><button type="button" class="btn-pw-toggle btn-rounded" id="showKey" title="แสดง/ซ่อน API Key" aria-label="แสดง/ซ่อน API Key">${eyeIconHTML(false)}</button></div></label>
        <label class="field full"><span>โมเดล</span><input class="input" name="geminiModel" list="models" value="${esc(s.geminiModel)}">
          <datalist id="models"><option value="gemini-2.5-flash">แนะนำ — เร็ว คุ้มค่า ภาษาไทยดี</option><option value="gemini-2.5-pro">แม่นยำสูงสุด เหมาะแปลงไฟล์ซับซ้อน</option><option value="gemini-2.5-flash-lite">ประหยัดที่สุด</option></datalist></label>
        <label class="field field-inline full"><input type="checkbox" name="aiAutoAnalyze" ${s.aiAutoAnalyze ? 'checked' : ''}> <span>วิเคราะห์ผลด้วย AI อัตโนมัติเมื่อส่งแบบทดสอบ</span></label>
        <div class="row-actions full"><button class="btn btn-primary">บันทึก</button><button type="button" class="btn btn-outline" id="testAI">ทดสอบการเชื่อมต่อ</button></div>
      </form>
      <p class="alert alert-warning small mt">⚠️ เวอร์ชันนี้เก็บ API Key ไว้ในเบราว์เซอร์ของเครื่องนี้ เมื่อขึ้นระบบจริงควรเรียก AI ผ่าน Backend/Cloud Function เพื่อซ่อน Key</p>
    </section>
  </div>

  <section class="card line-bot-admin-card mt">
    <div class="line-bot-header">
      <div class="line-bot-title-wrap">
        <span class="line-badge">LINE Messaging API</span>
        <h3>🤖 ตั้งค่า LINE Chat Bot (แชทอัตโนมัติ 24 ชม.)</h3>
        <p class="muted small">ระบบแชทตอบกลับอัตโนมัติผ่าน LINE Official Account (Line ID: <b>Panuwat_99999</b>) สำหรับให้บริการผู้ใช้งาน 4 หัวข้อหลัก</p>
      </div>
    </div>

    <div class="line-bot-topics-summary">
      <b>4 หัวข้อตอบกลับอัตโนมัติในแชท LINE:</b>
      <div class="line-bot-topics-list">
        <div class="bot-topic-item"><span class="bot-topic-num">1</span> <div><b>ยืนยันสิทธิ์:</b> ผู้ใช้ส่งไอดีมาขอเปิดสิทธิ์หรือต่ออายุ (บอทแนะนำขั้นตอนและแจ้งผู้ดูแล)</div></div>
        <div class="bot-topic-item"><span class="bot-topic-num">2</span> <div><b>ติดต่อผู้พัฒนา:</b> ปรึกษาและส่งเรื่องตรงถึงคุณภาณุวัฒน์</div></div>
        <div class="bot-topic-item"><span class="bot-topic-num">3</span> <div><b>แจ้งปัญหาการใช้งาน:</b> รับเรื่องข้อสอบผิดพลาด หรือระบบขัดข้อง</div></div>
        <div class="bot-topic-item"><span class="bot-topic-num">4</span> <div><b>สอบถาม อื่นๆ:</b> ถามข้อมูลเพิ่มเติม และคำถามที่พบบ่อย (FAQ)</div></div>
      </div>
    </div>

    <form id="gasSet" class="form-grid mt">
      <label class="field full">
        <span>🔗 Google Apps Script Web App URL (Cloud Backend & ตอบกลับ LINE อัตโนมัติ)</span>
        <input class="input" name="gasUrl" value="${esc(s.gasUrl || '')}" placeholder="https://script.google.com/macros/s/.../exec">
        <small class="muted">นำ Web App URL ที่ได้จากการ Deploy Google Apps Script มาใส่ที่นี่ เพื่อให้ระบบซิงค์คำขอสมัครและส่งข้อความตอบกลับเข้า LINE อัตโนมัติ</small>
      </label>
      <div class="row-actions full">
        <button class="btn btn-primary btn-sm">บันทึก URL คลาวด์</button>
        <button type="button" class="btn btn-outline btn-sm" id="testGas">ทดสอบการเชื่อมต่อ Cloud</button>
      </div>
    </form>

    <div class="row-actions mt">
      <button type="button" class="btn btn-primary btn-sm" id="btnGasCode">
        📋 โค้ด Google Apps Script (แนะนำ ฟรี 24 ชม.)
      </button>
      <button type="button" class="btn btn-outline btn-sm" id="btnNodeCode">
        💻 โค้ด Node.js Webhook
      </button>
      <button type="button" class="btn btn-ghost btn-sm" id="btnLineGuide">
        📖 วิธีเชื่อมต่อ LINE Developers Console
      </button>
    </div>
  </section>
  <section class="card"><h3>สำรอง / กู้คืนข้อมูล</h3>
    <p class="muted small">ข้อมูลทั้งหมด (ผู้ใช้ คลังข้อสอบ ประวัติ ไฟล์สรุป) ถูกเก็บในเบราว์เซอร์นี้ ควรสำรองข้อมูลเป็นประจำ</p>
    <div class="row-actions"><button class="btn btn-outline" id="backup">⬇ สำรองข้อมูลทั้งหมด</button>
    <label class="btn btn-outline">⬆ กู้คืนจากไฟล์<input type="file" hidden id="restore" accept=".json"></label>
    <button class="btn btn-ghost t-danger" id="resetAll">รีเซ็ตระบบทั้งหมด</button></div>
  </section>`;

  const num = (f, n) => Number(f[n].value);
  $('#examSet').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    const next = { ...App.settings, passPercent: num(f, 'passPercent'), setSize: num(f, 'setSize'), finalCount: num(f, 'finalCount'), finalMinutes: num(f, 'finalMinutes'),
      shuffleChoicesFinal: f.shuffleChoicesFinal.checked, announcement: f.announcement.value.trim() };
    if (next.setSize !== App.settings.setSize) toast('หมายเหตุ: การเปลี่ยนจำนวนข้อต่อชุด มีผลกับชุดที่ทำค้างของผู้ใช้', 'warning', 5000);
    await Repo.saveSettings(next); App.settings = next; toast('บันทึกแล้ว', 'success');
  };
  $('#gasSet').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    const next = { ...App.settings, gasUrl: f.gasUrl.value.trim() };
    await Repo.saveSettings(next); App.settings = next; toast('บันทึก URL คลาวด์เรียบร้อยแล้ว', 'success');
  };
  $('#testGas').onclick = async (e) => {
    const btn = e.currentTarget;
    const url = $('#gasSet [name=gasUrl]').value.trim();
    if (!url) return toast('กรุณาระบุ URL ก่อนทดสอบ', 'warning');
    btn.disabled = true; btn.textContent = 'กำลังทดสอบ…';
    try {
      const res = await fetch(`${url}?action=ping&t=${Date.now()}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      toast('✓ เชื่อมต่อ Google Apps Script สำเร็จ! ' + (data.service || ''), 'success', 5000);
    } catch (err) {
      toast('เชื่อมต่อไม่สำเร็จ: ' + err.message + ' (อาจยังไม่ได้ Deploy เป็น Anyone)', 'error', 6000);
    } finally {
      btn.disabled = false; btn.textContent = 'ทดสอบการเชื่อมต่อ Cloud';
    }
  };
  $('#aiSet').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    const next = { ...App.settings, geminiKey: f.geminiKey.value.trim(), geminiModel: f.geminiModel.value.trim() || 'gemini-2.5-flash', aiAutoAnalyze: f.aiAutoAnalyze.checked };
    await Repo.saveSettings(next); App.settings = next; toast('บันทึกการตั้งค่า AI แล้ว', 'success');
  };
  $('#showKey').onclick = (e) => {
    e.preventDefault();
    const i = $('#aiSet [name=geminiKey]');
    const isHidden = i.type === 'password';
    i.type = isHidden ? 'text' : 'password';
    $('#showKey').innerHTML = eyeIconHTML(isHidden);
    $('#showKey').title = isHidden ? 'ซ่อน API Key' : 'แสดง API Key';
    $('#showKey').setAttribute('aria-label', isHidden ? 'ซ่อน API Key' : 'แสดง API Key');
  };
  $('#testAI').onclick = async (e) => {
    const f = $('#aiSet'); const prev = App.settings;
    App.settings = { ...prev, geminiKey: f.geminiKey.value.trim(), geminiModel: f.geminiModel.value.trim() || 'gemini-2.5-flash' };
    e.target.disabled = true; e.target.textContent = 'กำลังทดสอบ…';
    try { const r = await AI.test(); toast('✓ ' + r.trim(), 'success'); } catch (ex) { toast('เชื่อมต่อไม่สำเร็จ: ' + ex.message, 'error', 6000); }
    App.settings = prev; e.target.disabled = false; e.target.textContent = 'ทดสอบการเชื่อมต่อ';
  };
  $('#backup').onclick = async () => download(`klangfu-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await Repo.exportAll()), 'application/json');
  $('#restore').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await confirmBox('กู้คืนข้อมูล?', 'ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง', 'กู้คืน', true))) return;
    try { await Repo.importAll(JSON.parse(await readAsText(f))); toast('กู้คืนข้อมูลเรียบร้อย กรุณาเข้าสู่ระบบอีกครั้ง', 'success'); Auth.logout(); }
    catch (ex) { toast(ex.message, 'error'); }
  };
  $('#btnGasCode').onclick = () => {
    modal({
      title: '📋 โค้ด Google Apps Script (LINE Chat Bot Webhook)',
      wide: true,
      body: `
        <p class="muted small">วิธีใช้: เปิด <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a> สร้างโปรเจกต์ใหม่ วางโค้ดนี้ลงไป แล้วกด <b>Deploy > New deployment > Web App (Who has access: Anyone)</b> จากนั้นนำ Webhook URL ไปใส่ใน LINE Developers Console</p>
        <div class="code-preview-box">
          <pre><code id="gasCodeText">${esc(GAS_BOT_SCRIPT_TEMPLATE)}</code></pre>
        </div>`,
      actions: [
        {
          label: '📋 คัดลอกโค้ดทั้งหมด',
          cls: 'btn-primary',
          onClick: () => {
            navigator.clipboard?.writeText(GAS_BOT_SCRIPT_TEMPLATE);
            toast('คัดลอกโค้ด Google Apps Script แล้ว นำไปวางใน script.google.com ได้ทันที', 'success');
            return false;
          }
        },
        { label: 'ปิด', value: null }
      ]
    });
  };

  $('#btnNodeCode').onclick = () => {
    modal({
      title: '💻 โค้ด Node.js Webhook (LINE Messaging API)',
      wide: true,
      body: `
        <p class="muted small">ไฟล์นี้ถูกสร้างไว้ที่ <code>line-bot/webhook.js</code> สามารถรันด้วย <code>node line-bot/webhook.js</code> หรือนำไป Deploy บน Render, Railway หรือ VPS ได้ทันที</p>
        <div class="code-preview-box">
          <pre><code>${esc(NODE_BOT_SCRIPT_TEMPLATE)}</code></pre>
        </div>`,
      actions: [
        {
          label: '📋 คัดลอกโค้ด Node.js',
          cls: 'btn-primary',
          onClick: () => {
            navigator.clipboard?.writeText(NODE_BOT_SCRIPT_TEMPLATE);
            toast('คัดลอกโค้ด Node.js แล้ว', 'success');
            return false;
          }
        },
        { label: 'ปิด', value: null }
      ]
    });
  };

  $('#btnLineGuide').onclick = () => {
    modal({
      title: '📖 คู่มือเชื่อมต่อ LINE Official Account & Messaging API',
      wide: true,
      body: `
        <div class="line-guide-steps">
          <h4>4 ขั้นตอนสร้าง Chat Bot ให้ตอบกลับอัตโนมัติ:</h4>
          <ol class="guide-num-list">
            <li><b>สร้าง Channel ใน LINE Developers:</b>
              <p class="small muted">เข้าที่ <a href="https://developers.line.biz" target="_blank" rel="noopener">developers.line.biz</a> > สร้าง Provider และเลือก Messaging API Channel</p>
            </li>
            <li><b>ตั้งค่า Webhook URL:</b>
              <p class="small muted">นำ URL จาก Google Apps Script (หรือ Node.js Server) มาใส่ในช่อง <b>Webhook URL</b> แล้วกดปุ่ม <b>Verify</b> เพื่อตรวจสอบความถูกต้อง</p>
            </li>
            <li><b>เปิดใช้งาน Webhook:</b>
              <p class="small muted">เปิดสวิตช์ <b>Use Webhook</b> เป็น ON</p>
            </li>
            <li><b>ปิด Auto-Reply เดิมของ LINE:</b>
              <p class="small muted">ในหน้า LINE Official Account Manager > ไปที่ตั้งค่าการตอบกลับ > ปิด "ข้อความตอบกลับอัตโนมัติ" และเปิด "Webhooks" เพื่อให้บอทของเราเป็นผู้ตอบข้อความ</p>
            </li>
          </ol>
          <div class="alert alert-info small mt">
            💡 มีไฟล์คู่มือฉบับละเอียดพร้อมตัวอย่างอยู่ในโฟลเดอร์ <code>line-bot/README.md</code>
          </div>
        </div>`,
      actions: [{ label: 'เข้าใจแล้ว', value: null }]
    });
  };

  $('#resetAll').onclick = async () => {
    if (!(await confirmBox('รีเซ็ตระบบทั้งหมด?', 'ข้อมูลทั้งหมดจะถูกลบและกลับเป็นค่าเริ่มต้น (admin / admin1234) — ไม่สามารถย้อนกลับได้', 'รีเซ็ต', true))) return;
    await DB.clear(); localStorage.removeItem('kf-session'); location.hash = '/login'; location.reload();
  };
}
