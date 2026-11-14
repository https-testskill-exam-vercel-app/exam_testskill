/**
 * LINE Messaging API Webhook & Cloud Backend - Google Apps Script (24/7 Serverless)
 * ระบบตอบกลับอัตโนมัติ 4 หัวข้อ + ฐานข้อมูลผู้ใช้ + ระบบคอนเฟิร์มสิทธิ์และตอบกลับอัตโนมัติ
 *
 * เจ้าของระบบ: คุณภาณุวัฒน์ (Line ID: Panuwat_99999)
 * LINE Bot ID: @430lkurz
 * Web Application: https://https-testskill-exam-vercel-app.github.io/exam_testskill/
 */

// 1. การตั้งค่าระบบ
const CHANNEL_ACCESS_TOKEN = 'd1xBeCIUSf5NKf8r2ZxsQKXLmq/XWz6v6xbNezf1K1Le8hMI+kJgIrZFPGlpgrd+GyEf165uFK1p8R4x3wVHJo+cfUdvjGgNFHBGLxlZI4Mlua1cBfxC5e3dDhvak3x9pQv7bQ9PalCeE9XAC/gDCAdB04t89/1O/w1cDnyilFU=';
const SPREADSHEET_NAME = 'TestSkill_User_Database';
const WEB_APP_URL = 'https://https-testskill-exam-vercel-app.github.io/exam_testskill/';

// ----------------------------------------------------
// ระบบฐานข้อมูล Google Sheet
// ----------------------------------------------------
function getDatabaseSheet(sheetName = 'Users') {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    }
  }
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Users') {
      sheet.appendRow([
        'ID', 'Username', 'Name', 'Role', 'Status', 'Package', 'Expires', 'LINE_User_ID', 'LINE_Name', 'Created_At', 'Updated_At'
      ]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ----------------------------------------------------
// Web Request Handlers (doPost & doGet)
// ----------------------------------------------------
function doPost(e) {
  try {
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = { rawText: e.postData.contents };
      }
    }

    // A. ถ้าเป็น Webhook Events จาก LINE Messaging API
    if (payload && payload.events) {
      const events = payload.events || [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.type === 'message' && event.message.type === 'text') {
          handleLineTextMessage(event);
        } else if (event.type === 'follow') {
          replyWelcome(event.replyToken);
        }
      }
      return jsonResponse({ status: 'ok', source: 'line' });
    }

    // B. ถ้าเป็นคำสั่ง API จากหน้าเว็บ TestSkill
    if (payload && payload.action) {
      return handleWebApiAction(payload);
    }

    return jsonResponse({ status: 'ok', message: 'No action' });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';

    // ดึงรายชื่อผู้ใช้ทั้งหมดจาก Google Sheet ส่งกลับหน้าเว็บ
    if (action === 'get_users' || action === 'list') {
      const sheet = getDatabaseSheet('Users');
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse([]);

      const rows = data.slice(1);
      const users = rows.map((r) => ({
        id: String(r[0] || ''),
        username: String(r[1] || ''),
        name: String(r[2] || ''),
        role: String(r[3] || 'user'),
        active: r[4] === 'active',
        pendingApproval: r[4] === 'pending',
        package: String(r[5] || ''),
        expires: String(r[6] || ''),
        lineUserId: String(r[7] || ''),
        lineName: String(r[8] || ''),
        createdAt: r[9] || '',
        updatedAt: r[10] || ''
      })).filter((u) => u.username);

      return jsonResponse(users);
    }

    // Health check
    return jsonResponse({
      status: 'ok',
      service: 'TestSkill Cloud & LINE Bot',
      time: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------
// ประมวลผลคำสั่งจากหน้าเว็บ (Web API)
// ----------------------------------------------------
function handleWebApiAction(payload) {
  const action = payload.action;
  const sheet = getDatabaseSheet('Users');
  const data = sheet.getDataRange().getValues();

  // 1. สมัครสมาชิก / ขอยืนยันสิทธิ์ใหม่
  if (action === 'register') {
    const u = payload.user || {};
    const username = (u.username || '').trim();
    if (!username) return jsonResponse({ status: 'error', message: 'Username is required' });

    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
        foundRow = i + 1;
        break;
      }
    }

    const now = new Date();
    if (foundRow > 0) {
      sheet.getRange(foundRow, 3).setValue(u.name || username);
      sheet.getRange(foundRow, 5).setValue('pending');
      sheet.getRange(foundRow, 11).setValue(now);
    } else {
      sheet.appendRow([
        u.id || ('u_' + Date.now()),
        username,
        u.name || username,
        u.role || 'user',
        'pending',
        '', // package
        '', // expires
        '', // LINE User ID (จะผูกเมื่อผู้ใช้ทัก LINE)
        '', // LINE Name
        now,
        now
      ]);
    }
    return jsonResponse({ status: 'ok', message: 'User registered to cloud' });
  }

  // 2. แอดมินกด "คอนเฟิร์ม" สิทธิ์และเลือกแพ็กเกจ
  if (action === 'confirm_user') {
    const username = (payload.username || '').trim();
    const pkgTitle = payload.packageTitle || 'แพ็กเกจมาตรฐาน';
    const expires = payload.expires || '';
    const now = new Date();

    let foundRow = -1;
    let lineUserId = '';

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
        foundRow = i + 1;
        lineUserId = String(data[i][7] || '').trim();
        break;
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 5).setValue('active');
      sheet.getRange(foundRow, 6).setValue(pkgTitle);
      sheet.getRange(foundRow, 7).setValue(expires || 'ตลอดชีพ');
      sheet.getRange(foundRow, 11).setValue(now);
    }

    // ถ้าระบบมี LINE User ID ของผู้ใช้คนนี้แล้ว -> ยิงข้อความแจ้งเตือนอัตโนมัติเข้า LINE ทันที!
    let lineSent = false;
    if (lineUserId) {
      const expiryDisplay = expires
        ? new Date(expires).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)';

      const pushText =
`🎉 แอดมินคอนเฟิร์มสิทธิ์การใช้งานให้คุณเรียบร้อยแล้วครับ!

👤 บัญชีผู้ใช้: @${username}
📦 แพ็กเกจ: ${pkgTitle}
📅 วันหมดอายุ: ${expiryDisplay}

🔗 เข้าสู่ระบบและเริ่มทำแบบทดสอบได้ทันที:
${WEB_APP_URL}

ขอให้ตั้งใจฝึกฝนและทำคะแนนได้ตามเป้าหมายครับ ✌️✨`;

      lineSent = pushLineMessage(lineUserId, pushText);
    }

    return jsonResponse({
      status: 'ok',
      username,
      lineSent,
      hasLineId: !!lineUserId
    });
  }

  return jsonResponse({ status: 'error', message: 'Unknown action' });
}

// ----------------------------------------------------
// ประมวลผลข้อความจาก LINE Chat (Messaging API)
// ----------------------------------------------------
function handleLineTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const lower = userText.toLowerCase();
  const lineUserId = event.source.userId || '';

  // 1. ตรวจสอบว่าในข้อความมีการระบุไอดีหรือไม่ (เช่น @KruThai2026 หรือ ไอดี KruThai2026)
  const userMatch = userText.match(/@([a-zA-Z0-9._-]+)/) || userText.match(/(?:ไอดี|username|user)\s*[:=]?\s*([a-zA-Z0-9._-]+)/i);

  if (userMatch && userMatch[1]) {
    const rawUsername = userMatch[1].trim();
    // นำ lineUserId บันทึกผูกกับ username ใน Google Sheet ทันที
    linkLineUserWithUsername(rawUsername, lineUserId);

    const replyText =
`🔑 [ได้รับคำขอยืนยันสิทธิ์ของ @${rawUsername} แล้ว]

สวัสดีครับ @${rawUsername} 👋
ระบบได้เชื่อมต่อบัญชี LINE ของท่านกับไอดีในระบบเรียบร้อยแล้วครับ!

⏳ สถานะ: รอแอดมิน (คุณภาณุวัฒน์) คอนเฟิร์มแพ็กเกจ
เมื่อแอดมินกดคอนเฟิร์มในระบบ ระบบจะส่งข้อความแจ้งเตือนมายังแชทนี้ทันทีครับ ไม่ต้องคอยเปิดดูหน้าเว็บครับ 😊`;

    return sendLineReply(replyToken, [
      { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
    ]);
  }

  // 2. ตรวจจับ 4 หัวข้อหลัก
  if (lower.startsWith('1') || lower.includes('ยืนยัน') || lower.includes('ขอสิทธิ์') || lower.includes('อนุมัติ') || lower.includes('ต่ออายุ')) {
    replyVerification(replyToken, userText);
  } else if (lower.startsWith('2') || lower.includes('ผู้พัฒนา') || lower.includes('ติดต่อ')) {
    replyDeveloper(replyToken);
  } else if (lower.startsWith('3') || lower.includes('ปัญหา') || lower.includes('บั๊ก') || lower.includes('bug')) {
    replyReportIssue(replyToken);
  } else if (lower.startsWith('4') || lower.includes('สอบถาม') || lower.includes('แพ็กเกจ') || lower.includes('ราคา')) {
    replyGeneral(replyToken);
  } else {
    replyMainMenu(replyToken, userText);
  }
}

// ผูก LINE User ID กับ Username ใน Google Sheet
function linkLineUserWithUsername(username, lineUserId) {
  if (!username || !lineUserId) return;
  const sheet = getDatabaseSheet('Users');
  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
      sheet.getRange(i + 1, 8).setValue(lineUserId);
      sheet.getRange(i + 1, 11).setValue(new Date());
      found = true;
      break;
    }
  }

  // ถ้ายังไม่มี username นี้ในระบบ (มาแจ้งในไลน์ก่อนสมัคร)
  if (!found) {
    sheet.appendRow([
      'u_' + Date.now(),
      username,
      username,
      'user',
      'pending',
      '',
      '',
      lineUserId,
      '',
      new Date(),
      new Date()
    ]);
  }
}

// ----------------------------------------------------
// เมนูตอบกลับอัตโนมัติ
// ----------------------------------------------------
function replyVerification(replyToken, text) {
  const replyText =
`🔑 [1. ขอยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill]

สวัสดีครับ 👋 เพื่อให้ระบบส่งแจ้งเตือนกลับหาท่านได้อัตโนมัติ:
กรุณาพิมพ์แจ้ง "ไอดี" ของท่านในแชทนี้ได้เลยครับ เช่น:
👉 @ไอดีของคุณ (เช่น @KruThai2026)

(หากยังไม่ได้สมัครสมาชิก สามารถกดสมัครได้ที่เว็บ: ${WEB_APP_URL}#/register)

เมื่อแอดมิน (คุณภาณุวัฒน์) กดคอนเฟิร์มในระบบ จะมีข้อความแจ้งเตือนอัตโนมัติส่งกลับมาที่นี่ทันทีครับ!`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyDeveloper(replyToken) {
  const replyText =
`👨‍💻 [2. ติดต่อผู้พัฒนาระบบ TestSkill]

คุณกำลังติดต่อผู้สร้างและพัฒนาระบบโดยตรง:
• ผู้พัฒนา: คุณภาณุวัฒน์ (แอดมิน)
• Line ID ส่วนตัว: Panuwat_99999
• ระบบสอบออนไลน์เตรียมความพร้อมใบประกอบวิชาชีพครู By กลางฟู

ท่านสามารถพิมพ์ข้อความ ข้อเสนอแนะ หรือคำถามทิ้งไว้ในแชทนี้ได้เลยครับ แอดมินจะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ 😊`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyReportIssue(replyToken) {
  const replyText =
`🛠️ [3. แจ้งปัญหาการใช้งาน / พบข้อผิดพลาด]

ขออภัยในความไม่สะดวกครับ เพื่อความรวดเร็วในการแก้ไข กรุณาระบุข้อมูลดังนี้:
1. ชุดข้อสอบและข้อที่พบปัญหา (เช่น ชุดที่ 5 ข้อที่ 12)
2. อาการของปัญหา (เช่น เฉลยผิด, หน้าจอค้าง, บันทึกคะแนนไม่ได้)
3. รูปภาพหน้าจอ (Screenshot) หากสะดวกแนบมา

ทีมงานจะตรวจสอบและปรับปรุงแก้ไขระบบให้ทันทีครับ ขอบคุณครับ!`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyGeneral(replyToken) {
  const replyText =
`❓ [4. สอบถามข้อมูลเพิ่มเติม TestSkill]

📘 ระบบสอบออนไลน์ TestSkill เตรียมสอบใบประกอบวิชาชีพครู By กลางฟู
• คลังข้อสอบตาม Test Blueprint 5 เรื่อง (930 ข้อ)
• ชุดรวมเทียบเคียงข้อสอบจริง 24 ชุด (2,295 ข้อ)
• ระบบจับเวลา บันทึกผลสอบ เฉลยละเอียดพร้อมเกร็ดความรู้ทุกข้อ และ AI วิเคราะห์ผลสอบ

ท่านสามารถพิมพ์คำถามหรือข้อสงสัยเพิ่มเติมส่งมาในแชทนี้ได้ตลอดเวลาครับ!`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyMainMenu(replyToken, userText) {
  const msg =
`สวัสดีครับ 👋 ยินดีต้อนรับสู่ LINE Official ของระบบ TestSkill (By กลางฟู)

กรุณาเลือกหัวข้อที่ต้องการรับบริการ:
1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
2️⃣ ติดต่อผู้พัฒนา (คุณภาณุวัฒน์)
3️⃣ แจ้งปัญหาการใช้งาน
4️⃣ สอบถาม อื่นๆ

👉 พิมพ์หมายเลข 1, 2, 3 หรือ 4 หรือพิมพ์ @ไอดีของคุณ เพื่อขอยืนยันสิทธิ์ได้ทันทีครับ`;

  sendLineReply(replyToken, [
    { type: 'text', text: msg, quickReply: getQuickReplyMenu() }
  ]);
}

function replyWelcome(replyToken) {
  replyMainMenu(replyToken, '');
}

function getQuickReplyMenu() {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '1. ยืนยันสิทธิ์',
          text: '1. ยืนยันสิทธิ์ ขอเปิดสิทธิ์เข้าใช้งานระบบ'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '2. ติดต่อผู้พัฒนา',
          text: '2. ติดต่อผู้พัฒนา'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '3. แจ้งปัญหา',
          text: '3. แจ้งปัญหาการใช้งานระบบ'
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '4. สอบถาม อื่นๆ',
          text: '4. สอบถาม อื่นๆ'
        }
      }
    ]
  };
}

// ----------------------------------------------------
// LINE Messaging API Callers (Reply & Push)
// ----------------------------------------------------
function sendLineReply(replyToken, messages) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = { replyToken: replyToken, messages: messages };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  return UrlFetchApp.fetch(url, options);
}

function pushLineMessage(toUserId, text) {
  if (!toUserId) return false;
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: toUserId,
    messages: [{ type: 'text', text: text }]
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (err) {
    console.error('Push LINE message error:', err);
    return false;
  }
}
