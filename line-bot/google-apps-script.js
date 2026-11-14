/**
 * LINE Messaging API Webhook - Google Apps Script (Serverless & Free 24/7)
 * ระบบตอบกลับอัตโนมัติ 4 หัวข้อ:
 * 1. ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
 * 2. ติดต่อผู้พัฒนา
 * 3. แจ้งปัญหาการใช้งาน
 * 4. สอบถาม อื่นๆ
 *
 * Line ID ผู้ดูแลระบบ: Panuwat_99999
 */

// Channel Access Token จาก LINE Developers Console (Messaging API ของ @430lkurz)
const CHANNEL_ACCESS_TOKEN = 'd1xBeCIUSf5NKf8r2ZxsQKXLmq/XWz6v6xbNezf1K1Le8hMI+kJgIrZFPGlpgrd+GyEf165uFK1p8R4x3wVHJo+cfUdvjGgNFHBGLxlZI4Mlua1cBfxC5e3dDhvak3x9pQv7bQ9PalCeE9XAC/gDCAdB04t89/1O/w1cDnyilFU=';

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events || [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'message' && event.message.type === 'text') {
        handleTextMessage(event);
      } else if (event.type === 'follow') {
        // เมื่อผู้ใช้เพิ่มเพื่อนใหม่
        replyWelcome(event.replyToken);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const lower = userText.toLowerCase();

  // ตรวจจับ 4 หัวข้อหลัก
  if (lower.startsWith('1') || lower.includes('ยืนยัน') || lower.includes('ขอสิทธิ์') || lower.includes('อนุมัติ') || lower.includes('ต่ออายุ')) {
    replyVerification(replyToken, userText);
  } else if (lower.startsWith('2') || lower.includes('ผู้พัฒนา') || lower.includes('ติดต่อ')) {
    replyDeveloper(replyToken);
  } else if (lower.startsWith('3') || lower.includes('ปัญหา') || lower.includes('บั๊ก') || lower.includes('bug')) {
    replyReportIssue(replyToken);
  } else if (lower.startsWith('4') || lower.includes('สอบถาม') || lower.includes('แพ็กเกจ') || lower.includes('ราคา')) {
    replyGeneral(replyToken);
  } else {
    // ข้อความทั่วไป -> ส่งเมนูหลัก 4 หัวข้อให้เลือก
    replyMainMenu(replyToken, userText);
  }
}

// 1. หัวข้อยืนยันสิทธิ์
function replyVerification(replyToken, text) {
  const replyText = 
`🔑 [1. ยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill]

สวัสดีครับ ระบบได้รับเรื่องการขอยืนยันสิทธิ์ของท่านเรียบร้อยแล้ว!

📌 หากยังไม่ได้แจ้งไอดี กรุณาพิมพ์แจ้ง:
• ชื่อผู้ใช้ / ไอดีของคุณ (เช่น @Panuwat)
• ชื่อ-นามสกุล หรือชื่อเรียก
• แพ็กเกจที่ต้องการ:
  1) 🎁 แบบทดลองใช้ (30 วัน)
  2) 🌟 แพ็กเกจ 3 เดือน (90 วัน)
  3) 👑 ใช้ฟรีตลอดชีพ

ผู้ดูแลระบบ (คุณภาณุวัฒน์) จะดำเนินการเปิดสิทธิ์หรือต่ออายุให้ท่านโดยเร็วที่สุดครับ!`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

// 2. หัวข้อติดต่อผู้พัฒนา
function replyDeveloper(replyToken) {
  const replyText = 
`👨‍💻 [2. ติดต่อผู้พัฒนาระบบ TestSkill]

คุณกำลังติดต่อผู้สร้างและพัฒนาระบบโดยตรง:
• ผู้พัฒนา: คุณภาณุวัฒน์ (แอดมิน)
• Line ID: Panuwat_99999
• ระบบสอบออนไลน์เตรียมความพร้อมใบประกอบวิชาชีพครู By กลางฟู

ท่านสามารถพิมพ์ข้อความ ข้อเสนอแนะ หรือคำถามทิ้งไว้ในแชทนี้ได้เลยครับ แอดมินจะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ 😊`;

  sendLineReply(replyToken, [
    { type: 'text', text: replyText, quickReply: getQuickReplyMenu() }
  ]);
}

// 3. หัวข้อแจ้งปัญหาการใช้งาน
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

// 4. หัวข้อสอบถาม อื่นๆ
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

// เมนูต้อนรับ / เมนูหลัก 4 หัวข้อ
function replyMainMenu(replyToken, userText) {
  const msg = 
`สวัสดีครับ 👋 ยินดีต้อนรับสู่ LINE Official ของระบบ TestSkill (By กลางฟู)

กรุณาเลือกหัวข้อที่ต้องการรับบริการ:
1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
2️⃣ ติดต่อผู้พัฒนา (คุณภาณุวัฒน์)
3️⃣ แจ้งปัญหาการใช้งาน
4️⃣ สอบถาม อื่นๆ

👉 ท่านสามารถพิมพ์หมายเลข 1, 2, 3 หรือ 4 หรือกดปุ่มเมนูด้านล่างได้ทันทีครับ`;

  sendLineReply(replyToken, [
    { type: 'text', text: msg, quickReply: getQuickReplyMenu() }
  ]);
}

function replyWelcome(replyToken) {
  replyMainMenu(replyToken, '');
}

// แถบปุ่ม Quick Reply 4 ตัวเลือกด้านล่างแชท
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

// ฟังก์ชันส่งข้อความกลับไปยัง LINE Messaging API
function sendLineReply(replyToken, messages) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: messages
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}
