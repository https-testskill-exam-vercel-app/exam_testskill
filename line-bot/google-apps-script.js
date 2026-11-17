/**
 * LINE Messaging API Webhook & Cloud Backend - Google Apps Script (24/7 Serverless)
 * ระบบตอบกลับอัตโนมัติ 4 หัวข้อ + ฐานข้อมูลผู้ใช้ + ระบบคอนเฟิร์มสิทธิ์และตอบกลับอัตโนมัติ
 *
 * เจ้าของระบบ: คุณภาณุวัฒน์ (Line ID: Panuwat_99999)
 * LINE Bot ID: @430lkurz
 * Web Application: https://https-testskill-exam-vercel-app.github.io/exam_testskill/
 */

// 1. การตั้งค่าระบบ
const CHANNEL_ACCESS_TOKEN = 'd1xBeCIUSf5NKf8r2ZxsQKXLmq/XWz6v6xbNezf1K1Le8hMI+kJgIrZFPGlpgrd+GyEf165uFK1p8R4x3wVHJo+cfUdvjGgNFHBGLxlZI4Mlua1cBfxC5e3dDHvaK3x9pQv7bQ9PalCeE9XAC/gDCAdB04t89/1O/w1cDnyilFU=';
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
        'ID', 'Username', 'Name', 'Role', 'Status', 'Package', 'Expires', 'LINE_User_ID', 'LINE_Name', 'Created_At', 'Updated_At', 'Pass_Hash'
      ]);
      sheet.setFrozenRows(1);
    }
  } else if (sheetName === 'Users' && sheet.getLastColumn() < 12) {
    sheet.getRange(1, 12).setValue('Pass_Hash');
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
          replyMainMenu(event.replyToken);
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

    // สมัครสมาชิก / ขอยืนยันสิทธิ์ผ่าน GET (Fallback สำหรับเบราว์เซอร์)
    if (action === 'register') {
      return handleWebApiAction({
        action: 'register',
        user: {
          id: (e.parameter.id || '').trim(),
          username: (e.parameter.username || '').trim(),
          name: (e.parameter.name || '').trim(),
          passHash: (e.parameter.passHash || '').trim(),
          role: 'user',
          active: false,
          pendingApproval: true
        }
      });
    }

    // ยืนยันสิทธิ์ผ่าน GET (Fallback สำหรับเบราว์เซอร์)
    if (action === 'confirm_user') {
      const payload = {
        action: 'confirm_user',
        username: (e.parameter.username || '').trim(),
        name: (e.parameter.name || '').trim(),
        packageTitle: (e.parameter.package || e.parameter.packageTitle || 'แพ็กเกจมาตรฐาน').trim(),
        expires: (e.parameter.expires || '').trim(),
        adminName: (e.parameter.adminName || 'ภาณุวัฒน์').trim()
      };
      return handleWebApiAction(payload);
    }

    // ลบผู้ใช้ผ่าน GET (Fallback สำหรับเบราว์เซอร์)
    if (action === 'delete_user') {
      const payload = {
        action: 'delete_user',
        username: (e.parameter.username || '').trim()
      };
      return handleWebApiAction(payload);
    }

    // อัปเดตรหัสผ่านผ่าน GET (Fallback สำหรับเบราว์เซอร์)
    if (action === 'update_pass_hash') {
      return handleWebApiAction({
        action: 'update_pass_hash',
        username: (e.parameter.username || '').trim(),
        passHash: (e.parameter.passHash || '').trim()
      });
    }

    // อัปเดตข้อมูลหรือสถานะผู้ใช้ผ่าน GET (Fallback สำหรับเบราว์เซอร์)
    if (action === 'update_user' || action === 'update_status') {
      const payload = {
        action: 'update_user',
        username: (e.parameter.username || '').trim(),
        name: e.parameter.name,
        role: e.parameter.role,
        active: e.parameter.active !== undefined ? (e.parameter.active === 'true' || e.parameter.active === true) : undefined,
        pendingApproval: e.parameter.pendingApproval !== undefined ? (e.parameter.pendingApproval === 'true' || e.parameter.pendingApproval === true) : undefined,
        package: e.parameter.package,
        expires: e.parameter.expires,
        passHash: e.parameter.passHash
      };
      return handleWebApiAction(payload);
    }

    // ดึงข้อมูลผู้ใช้เฉพาะราย (ใช้ตอน Login ข้ามเครื่อง ตรวจสอบสิทธิ์และรหัสผ่านล่าสุด)
    if (action === 'get_user') {
      const reqUser = (e && e.parameter && e.parameter.username ? String(e.parameter.username).replace(/^@+/, '').trim().toLowerCase() : '');
      if (!reqUser) return jsonResponse({ status: 'error', message: 'username required' });
      const sheet = getDatabaseSheet('Users');
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
        if (sheetUser === reqUser) {
          return jsonResponse({
            status: 'ok',
            found: true,
            user: {
              id: String(data[i][0] || ''),
              username: String(data[i][1] || '').replace(/^@+/, '').trim(),
              name: String(data[i][2] || ''),
              role: String(data[i][3] || 'user'),
              active: data[i][4] === 'active',
              pendingApproval: data[i][4] === 'pending',
              package: String(data[i][5] || ''),
              expires: String(data[i][6] || ''),
              lineUserId: String(data[i][7] || ''),
              lineName: String(data[i][8] || ''),
              createdAt: data[i][9] || '',
              updatedAt: data[i][10] || '',
              passHash: String(data[i][11] || '')
            }
          });
        }
      }
      return jsonResponse({ status: 'ok', found: false });
    }

    // ดึงรายชื่อผู้ใช้ทั้งหมดจาก Google Sheet ส่งกลับหน้าเว็บ
    if (action === 'get_users' || action === 'list') {
      const sheet = getDatabaseSheet('Users');
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse([]);

      const rows = data.slice(1);
      const users = rows.map((r) => ({
        id: String(r[0] || ''),
        username: String(r[1] || '').replace(/^@+/, '').trim(),
        name: String(r[2] || ''),
        role: String(r[3] || 'user'),
        active: r[4] === 'active',
        pendingApproval: r[4] === 'pending',
        package: String(r[5] || ''),
        expires: String(r[6] || ''),
        lineUserId: String(r[7] || ''),
        lineName: String(r[8] || ''),
        createdAt: r[9] || '',
        updatedAt: r[10] || '',
        passHash: String(r[11] || '')
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
    const rawUsername = (u.username || '').trim();
    const cleanUser = rawUsername.replace(/^@+/, '').trim();
    if (!cleanUser) return jsonResponse({ status: 'error', message: 'Username is required' });

    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (sheetUser === cleanUser.toLowerCase()) {
        foundRow = i + 1;
        break;
      }
    }

    const now = new Date();
    if (foundRow > 0) {
      sheet.getRange(foundRow, 2).setValue(cleanUser);
      sheet.getRange(foundRow, 3).setValue(u.name || cleanUser);
      sheet.getRange(foundRow, 5).setValue('pending');
      sheet.getRange(foundRow, 11).setValue(now);
      if (u.passHash) sheet.getRange(foundRow, 12).setValue(u.passHash);
    } else {
      sheet.appendRow([
        u.id || ('u_' + Date.now()),
        cleanUser,
        u.name || cleanUser,
        u.role || 'user',
        'pending',
        '', // package
        '', // expires
        '', // LINE User ID (จะผูกเมื่อผู้ใช้ทัก LINE)
        '', // LINE Name
        now,
        now,
        u.passHash || '' // Pass_Hash Col 12
      ]);

      // ส่งแจ้งเตือนแอดมินเข้า LINE หลักทันที
      notifyAdmin(
`🔔 [แจ้งเตือน: สมาชิกใหม่สมัครในเว็บ]
👤 ไอดี: @${cleanUser}
📝 ชื่อ: ${u.name || cleanUser}
⏰ เวลา: ${Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}

👉 ตรวจสอบและอนุมัติสิทธิ์ได้ที่:
${WEB_APP_URL}#/admin/users`);
    }
    return jsonResponse({ status: 'ok', message: 'User registered to cloud' });
  }

  // 2. อัปเดตรหัสผ่าน (PassHash) ข้ามเครื่อง
  if (action === 'update_pass_hash') {
    const rawUsername = (payload.username || '').trim();
    const cleanUser = rawUsername.replace(/^@+/, '').trim().toLowerCase();
    const passHash = (payload.passHash || '').trim();
    if (!cleanUser || !passHash) return jsonResponse({ status: 'error', message: 'Missing fields' });
    for (let i = 1; i < data.length; i++) {
      const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (sheetUser === cleanUser) {
        sheet.getRange(i + 1, 12).setValue(passHash);
        sheet.getRange(i + 1, 11).setValue(new Date());
        return jsonResponse({ status: 'ok', message: 'PassHash updated' });
      }
    }
    return jsonResponse({ status: 'error', message: 'User not found' });
  }

  // 3. แอดมินกด "คอนเฟิร์ม" สิทธิ์และเลือกแพ็กเกจ
  if (action === 'confirm_user') {
    const rawUsername = (payload.username || '').trim();
    const cleanUser = rawUsername.replace(/^@+/, '').trim();
    const cleanUserLower = cleanUser.toLowerCase();
    let name = (payload.name || '').trim();
    const pkgTitle = payload.packageTitle || 'แพ็กเกจมาตรฐาน';
    const expires = payload.expires || '';
    const now = new Date();

    let foundRow = -1;
    let lineUserId = '';

    for (let i = 1; i < data.length; i++) {
      const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (sheetUser === cleanUserLower) {
        foundRow = i + 1;
        lineUserId = String(data[i][7] || '').trim();
        if (!name && data[i][2]) name = String(data[i][2]).trim();
        break;
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 2).setValue(cleanUser); // เอา @ ออกถ้ามี
      sheet.getRange(foundRow, 5).setValue('active');
      sheet.getRange(foundRow, 6).setValue(pkgTitle);
      sheet.getRange(foundRow, 7).setValue(expires || 'ตลอดชีพ');
      sheet.getRange(foundRow, 11).setValue(now);
      if (name) sheet.getRange(foundRow, 3).setValue(name);
    }

    // ถ้าระบบมี LINE User ID ของผู้ใช้คนนี้แล้ว -> ยิงข้อความแจ้งเตือนอัตโนมัติเข้า LINE ทันที!
    let lineSent = false;
    if (lineUserId) {
      const expiryDisplay = expires
        ? (String(expires).includes('ตลอดชีพ') ? 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)' : new Date(expires).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }))
        : 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)';

      const displayName = (name || cleanUser || '').trim();
      const pushText =
`สวัสดี ${displayName} 👋
🎉 แอดมินคอนเฟิร์มสิทธิ์การใช้งานให้เรียบร้อยแล้ว

👤 ID: ${cleanUser}
📦 แพ็กเกจ: ${pkgTitle}
📅 วันหมดอายุ: ${expiryDisplay}

🔗 เข้าสู่ระบบและเริ่มทำแบบทดสอบได้ทันที:
${WEB_APP_URL}

ขอให้ตั้งใจฝึกฝนและทำคะแนนได้ตามเป้าหมาย ✌️✨`;

      lineSent = pushLineMessage(lineUserId, pushText);
    }

    return jsonResponse({
      status: 'ok',
      username: cleanUser,
      lineSent: lineSent,
      hasLineId: !!lineUserId
    });
  }

  // 4. อัปเดตข้อมูลหรือสถานะผู้ใช้ทั่วไป (เปิด/ระงับ/แก้ไขสิทธิ์/แพ็กเกจ)
  if (action === 'update_user' || action === 'update_status') {
    const rawUsername = (payload.username || '').trim();
    const cleanUser = rawUsername.replace(/^@+/, '').trim();
    const cleanUserLower = cleanUser.toLowerCase();
    if (!cleanUser) return jsonResponse({ status: 'error', message: 'Missing username' });
    for (let i = 1; i < data.length; i++) {
      const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (sheetUser === cleanUserLower) {
        const foundRow = i + 1;
        if (payload.name !== undefined && payload.name !== '') sheet.getRange(foundRow, 3).setValue(payload.name);
        if (payload.role !== undefined && payload.role !== '') sheet.getRange(foundRow, 4).setValue(payload.role);
        if (payload.active !== undefined) {
          const status = payload.active ? 'active' : (payload.pendingApproval ? 'pending' : 'inactive');
          sheet.getRange(foundRow, 5).setValue(status);
        }
        if (payload.package !== undefined) sheet.getRange(foundRow, 6).setValue(payload.package);
        if (payload.expires !== undefined) sheet.getRange(foundRow, 7).setValue(payload.expires);
        if (payload.passHash) sheet.getRange(foundRow, 12).setValue(payload.passHash);
        sheet.getRange(foundRow, 11).setValue(new Date());
        return jsonResponse({ status: 'ok', updated: true, username: cleanUser });
      }
    }
    return jsonResponse({ status: 'ok', found: false });
  }

  // 5. สั่งลบผู้ใช้ออกจาก Google Sheet
  if (action === 'delete_user') {
    const rawUsername = (payload.username || '').trim();
    const cleanUser = rawUsername.replace(/^@+/, '').trim().toLowerCase();
    if (!cleanUser) return jsonResponse({ status: 'error', message: 'Missing username' });
    for (let i = 1; i < data.length; i++) {
      const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (sheetUser === cleanUser) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ status: 'ok', message: 'User deleted from cloud' });
      }
    }
    return jsonResponse({ status: 'ok', message: 'User not found in cloud' });
  }

  return jsonResponse({ status: 'error', message: 'Unknown action' });
}

// ----------------------------------------------------
// ประมวลผลข้อความจาก LINE Chat (Messaging API)
// ----------------------------------------------------
function getLineUserProfile(userId) {
  if (!userId) return null;
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + encodeURIComponent(userId), {
      method: 'get',
      headers: { Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      return JSON.parse(res.getContentText());
    }
  } catch (err) {}
  return null;
}

function handleLineTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const lower = userText.toLowerCase();
  const lineUserId = (event.source && event.source.userId) || '';

  // 0. คำสั่งเชื่อมต่อบัญชี LINE ของแอดมินหลัก (คุณภาณุวัฒน์)
  if (lower === 'แอดมิน' || lower === 'admin' || lower === 'ลงทะเบียนแอดมิน' || lower === 'iamadmin' || lower === 'myid') {
    setAdminLineUserId(lineUserId);
    const replyText =
`🛡️ [เชื่อมต่อ LINE แอดมินหลักสำเร็จ!]

สวัสดีคุณภาณุวัฒน์ 👋
ระบบได้ผูกบัญชี LINE นี้เป็น [ผู้ดูแลระบบหลัก] เรียบร้อยแล้ว!
(LINE User ID: ${lineUserId})

🔔 ต่อจากนี้เมื่อมี:
• สมาชิกสมัครใหม่ผ่านหน้าเว็บ
• ผู้ใช้ส่งคำขอเปิดสิทธิ์ / ต่ออายุ
• ผู้ใช้แจ้งปัญหาการใช้งาน
• ข้อความสอบถามอื่นๆ

ระบบจะส่งข้อความแจ้งเตือนเด้งเข้าแชทนี้ทันทีตลอด 24 ชั่วโมงครับ ✨`;
    return sendLineReply(replyToken, [{ type: 'text', text: replyText }]);
  }

  // ดึงชื่อโปรไฟล์จริงจาก LINE Profile API
  const lineProfile = getLineUserProfile(lineUserId);
  const realLineName = lineProfile && lineProfile.displayName ? lineProfile.displayName.trim() : '';

  // 1. ตรวจสอบชื่อในข้อความ (เช่น • ชื่อ: สมชาย หรือ ชื่อ สมชาย)
  let extractedName = '';
  const nameMatch = userText.match(/(?:ชื่อ|name)\s*[:=•]?\s*([^\n\r•]+)/i);
  if (nameMatch && nameMatch[1]) {
    extractedName = nameMatch[1].trim();
  }
  const finalName = extractedName || realLineName;

  // 2. ตรวจสอบว่าในข้อความมีการระบุไอดีหรือไม่
  // รองรับทั้ง: ID: Banana009, • ID: Banana009, ไอดี Banana009, @Banana009, username: Banana009, หรือพิมพ์ Banana009 ตรงๆ
  let extractedUser = '';
  const userMatch = userText.match(/(?:ไอดี|id|username|user)\s*[:=•]?\s*@?([a-zA-Z0-9._-]+)/i)
    || userText.match(/@([a-zA-Z0-9._-]+)/);

  if (userMatch && userMatch[1]) {
    extractedUser = userMatch[1].replace(/^@+/, '').trim();
  } else if (/^[a-zA-Z0-9._-]{4,30}$/.test(userText) && !/^(1|2|3|4|menu|help)$/i.test(userText)) {
    // ถ้าพิมพ์ไอดีเดี่ยวๆ เช่น Banana009
    extractedUser = userText.replace(/^@+/, '').trim();
  }

  // หากพบไอดี -> บันทึกผูก LINE User ID และชื่อ เข้า Google Sheet ทันที!
  if (extractedUser) {
    const resolvedName = linkLineUserWithUsername(extractedUser, lineUserId, finalName);
    const displayName = resolvedName || finalName || extractedUser;

    const replyText =
`🔑 [ได้รับคำขอยืนยันสิทธิ์ของ ${displayName} แล้ว]

สวัสดีคุณ ${displayName} 👋
ระบบได้บันทึกคำขอและเชื่อมต่อบัญชี LINE กับไอดี ${extractedUser} เข้าหน้าจัดการของแอดมินเรียบร้อยแล้ว!

⏳ สถานะ: รอแอดมิน (คุณภาณุวัฒน์) ยืนยันสิทธิ์
เมื่อแอดมินกดยืนยันในระบบ ระบบจะส่งข้อความแจ้งเตือนมายังแชทนี้ทันที ไม่ต้องคอยเปิดดูหน้าเว็บ 😊`;

    // ส่งแจ้งเตือนแอดมินเข้า LINE หลักทันที
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`🔑 [แจ้งเตือน: มีคำขอเปิดสิทธิ์ใช้งาน]
👤 ไอดี: @${extractedUser}
📱 ชื่อ LINE: ${displayName}
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}

👉 จัดการสิทธิ์ได้ที่:
${WEB_APP_URL}#/admin/users`);
    }

    return sendLineReply(replyToken, [
      { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
    ]);
  }

  // 3. ตรวจจับ 4 หัวข้อหลัก
  // หากผู้ใช้กด 1 หรือพิมพ์ ยืนยันสิทธิ์ / ขอสิทธิ์ / สมัคร แม้ไม่ได้พิมพ์ ID มาด้วย
  // ให้บันทึกเป็นผู้ใช้รออนุมัติ (Pending) ลง Google Sheet ให้แอดมินเห็นในระบบทันที!
  if (lower.startsWith('1') || lower.includes('ยืนยัน') || lower.includes('ขอสิทธิ์') || lower.includes('อนุมัติ') || lower.includes('ต่ออายุ') || lower.includes('สมัคร')) {
    const autoUsername = 'line_' + (lineUserId ? lineUserId.slice(-6) : Date.now().toString().slice(-6));
    const resolvedName = linkLineUserWithUsername(autoUsername, lineUserId, finalName);
    const displayName = resolvedName || finalName || autoUsername;

    const replyText =
`🔑 [ได้รับคำขอยืนยันสิทธิ์ของ ${displayName} แล้ว]

สวัสดีคุณ ${displayName} 👋
ระบบได้รับคำขอยืนยันสิทธิ์ของคุณ และส่งตรงเข้าหน้าจัดการของแอดมิน (คุณภาณุวัฒน์) เรียบร้อยแล้ว!

📝 ไอดีของคุณในระบบคือ: ${autoUsername}
(หรือหากท่านสมัครไอดีไว้ในเว็บแล้ว สามารถพิมพ์แจ้งไอดี เช่น "ID: Banana009" ในแชทนี้เพื่อเชื่อมต่อไอดีได้เลยครับ)

⏳ สถานะ: รอแอดมินตรวจสอบและยืนยันสิทธิ์
เมื่อแอดมินกดยืนยันในระบบ ระบบจะส่งข้อความแจ้งเตือนอัตโนมัติกลับมายังแชทนี้ทันที 😊`;

    // ส่งแจ้งเตือนแอดมินเข้า LINE หลักทันที
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`🔑 [แจ้งเตือน: มีคำขอยืนยันสิทธิ์ใหม่]
👤 ไอดีชั่วคราว: @${autoUsername}
📱 ชื่อ LINE: ${displayName}
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}

👉 ตรวจสอบในหน้าจัดการ:
${WEB_APP_URL}#/admin/users`);
    }

    return sendLineReply(replyToken, [
      { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
    ]);
  } else if (lower.startsWith('2') || lower.includes('ผู้พัฒนา') || lower.includes('ติดต่อ')) {
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`👨‍💻 [แจ้งเตือน: มีผู้ใช้ติดต่อผู้พัฒนา]
📱 จาก: ${displayName || lineUserId}
💬 ข้อความ:
"${userText}"
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}`);
    }
    replyDeveloper(replyToken);
  } else if (lower.startsWith('3') || lower.includes('ปัญหา') || lower.includes('บั๊ก') || lower.includes('bug')) {
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`🛠️ [แจ้งเตือน: มีผู้ใช้แจ้งปัญหาการใช้งาน]
📱 จาก: ${displayName || lineUserId}
💬 ข้อความ:
"${userText}"
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}`);
    }
    replyReportIssue(replyToken);
  } else if (lower.startsWith('4') || lower.includes('สอบถาม') || lower.includes('แพ็กเกจ') || lower.includes('ราคา')) {
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`❓ [แจ้งเตือน: มีผู้ใช้สอบถามข้อมูล]
📱 จาก: ${displayName || lineUserId}
💬 ข้อความ:
"${userText}"
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}`);
    }
    replyGeneral(replyToken);
  } else {
    if (lineUserId !== getAdminLineUserId()) {
      notifyAdmin(
`💬 [แจ้งเตือน: มีข้อความใหม่จากผู้ใช้]
📱 จาก: ${displayName || lineUserId}
💬 ข้อความ:
"${userText}"
⏰ เวลา: ${Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}`);
    }
    replyMainMenu(replyToken, userText);
  }
}

// ผูก LINE User ID และชื่อ กับ Username ใน Google Sheet
function linkLineUserWithUsername(username, lineUserId, name = '') {
  if (!username) return name || username;
  const cleanUser = String(username).replace(/^@+/, '').trim();
  const cleanUserLower = cleanUser.toLowerCase();
  const sheet = getDatabaseSheet('Users');
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  let resolvedName = name || cleanUser;

  for (let i = 1; i < data.length; i++) {
    const sheetUser = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
    if (sheetUser === cleanUserLower) {
      foundRow = i + 1;
      if (!name && data[i][2]) {
        resolvedName = String(data[i][2]).trim();
      }
      break;
    }
  }

  const now = new Date();
  if (foundRow > 0) {
    sheet.getRange(foundRow, 2).setValue(cleanUser); // เอา @ ออกถ้ามี
    if (lineUserId) {
      sheet.getRange(foundRow, 8).setValue(lineUserId);
    }
    sheet.getRange(foundRow, 11).setValue(now);
    if (name) {
      sheet.getRange(foundRow, 3).setValue(name);
      sheet.getRange(foundRow, 9).setValue(name);
    }
  } else {
    // ถ้ายังไม่มี username นี้ในระบบ (ทัก LINE ก่อนสมัคร) ให้เพิ่มไว้ในสถานะ pending
    sheet.appendRow([
      'u_' + Date.now(),
      cleanUser,
      resolvedName,
      'user',
      'pending',
      '',
      '',
      lineUserId || '',
      name || '',
      now,
      now,
      ''
    ]);
  }
  return resolvedName || cleanUser;
}

// ----------------------------------------------------
// เมนูตอบกลับอัตโนมัติ
// ----------------------------------------------------
function replyVerification(replyToken, text) {
  const replyText =
`🔑 [1. ขอยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill]

สวัสดี 👋 เพื่อให้ระบบส่งแจ้งเตือนกลับหาท่านได้อัตโนมัติ:
กรุณาพิมพ์แจ้ง "ID" ของท่านในแชทนี้ได้เลย เช่น:
👉 ID: KruThai2026

(หากยังไม่ได้สมัครสมาชิก สามารถกดสมัครได้ที่เว็บ: ${WEB_APP_URL}#/register)

เมื่อแอดมิน (คุณภาณุวัฒน์) กดยืนยันในระบบ จะมีข้อความแจ้งเตือนอัตโนมัติส่งกลับมาที่นี่ทันที!`;

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

ท่านสามารถพิมพ์ข้อความ ข้อเสนอแนะ หรือคำถามทิ้งไว้ในแชทนี้ได้เลย แอดมินจะรีบเข้ามาตอบกลับโดยเร็วที่สุด 😊`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyReportIssue(replyToken) {
  const replyText =
`🛠️ [3. แจ้งปัญหาการใช้งาน / พบข้อผิดพลาด]

ขออภัยในความไม่สะดวก เพื่อความรวดเร็วในการแก้ไข กรุณาระบุข้อมูลดังนี้:
1. ชุดข้อสอบและข้อที่พบปัญหา (เช่น ชุดที่ 5 ข้อที่ 12)
2. อาการของปัญหา (เช่น เฉลยผิด, หน้าจอค้าง, บันทึกคะแนนไม่ได้)
3. รูปภาพหน้าจอ (Screenshot) หากสะดวกแนบมา

ทีมงานจะตรวจสอบและปรับปรุงแก้ไขระบบให้ทันที ขอบคุณ!`;

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

ท่านสามารถพิมพ์คำถามหรือข้อสงสัยเพิ่มเติมส่งมาในแชทนี้ได้ตลอดเวลา!`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

function replyMainMenu(replyToken, userText) {
  const msg =
`สวัสดี 👋 ยินดีต้อนรับสู่ LINE Official ของระบบ TestSkill (By กลางฟู)

กรุณาเลือกหัวข้อที่ต้องการรับบริการ:
1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
2️⃣ ติดต่อผู้พัฒนา (คุณภาณุวัฒน์)
3️⃣ แจ้งปัญหาการใช้งาน
4️⃣ สอบถาม อื่นๆ

👉 พิมพ์หมายเลข 1, 2, 3 หรือ 4 หรือพิมพ์ ID ของคุณ เพื่อขอยืนยันสิทธิ์ได้ทันที`;

  sendLineReply(replyToken, [
    { type: 'text', text: msg, quickReply: getQuickReplyMenu() }
  ]);
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

// ----------------------------------------------------
// ระบบแจ้งเตือนตรงเข้า LINE แอดมินหลัก (คุณภาณุวัฒน์)
// ----------------------------------------------------
function getAdminLineUserId() {
  // 1. ดึงจาก Script Properties
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('ADMIN_LINE_USER_ID');
    if (prop) return prop.trim();
  } catch (e) {}

  // 2. ดึงจาก Sheet Users แถวที่ Role เป็น admin
  try {
    const sheet = getDatabaseSheet('Users');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][3]).toLowerCase() === 'admin' && data[i][7]) {
        return String(data[i][7]).trim();
      }
    }
  } catch (e) {}

  return '';
}

function setAdminLineUserId(userId) {
  if (!userId) return;
  const cleanId = String(userId).trim();
  try {
    PropertiesService.getScriptProperties().setProperty('ADMIN_LINE_USER_ID', cleanId);
  } catch (e) {}
  try {
    const sheet = getDatabaseSheet('Users');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][3]).toLowerCase() === 'admin') {
        sheet.getRange(i + 1, 8).setValue(cleanId);
        break;
      }
    }
  } catch (e) {}
}

function notifyAdmin(text) {
  if (!text) return false;
  try {
    const adminId = getAdminLineUserId();
    if (adminId) {
      return pushLineMessage(adminId, text);
    }
  } catch (err) {
    console.error('notifyAdmin error:', err);
  }
  return false;
}

// ฟังก์ชันสำหรับกด "เรียกใช้" ใน Google Apps Script Editor เพื่อขอสิทธิ์ Authorization ครั้งแรก
function testSystem() {
  const sheet = getDatabaseSheet('Users');
  const count = sheet.getLastRow();
  Logger.log('✅ เชื่อมต่อ Google Sheets สำเร็จ! จำนวนแถวทั้งหมด: ' + count);
  return 'OK - พร้อมใช้งาน สิทธิ์ Google Sheets ครบถ้วน';
}
