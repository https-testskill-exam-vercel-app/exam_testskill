/**
 * LINE Messaging API Webhook - Node.js Express Server
 * รองรับการ Deploy บน Render, Railway, Fly.io, Heroku, หรือ VPS
 *
 * ติดตั้ง dependency:
 * npm install express @line/bot-sdk dotenv
 *
 * รัน:
 * node line-bot/webhook.js
 */

const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN_HERE',
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET_HERE'
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

// Webhook endpoint
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const results = await Promise.all(req.body.events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('LINE Bot Webhook is running 🚀 (Line ID: Panuwat_99999)');
});

async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return handleTextMessage(event);
  } else if (event.type === 'follow') {
    return replyMainMenu(event.replyToken);
  }
  return Promise.resolve(null);
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

async function handleTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const lower = userText.toLowerCase();

  let text = '';
  if (lower.startsWith('1') || lower.includes('ยืนยัน') || lower.includes('ขอสิทธิ์') || lower.includes('อนุมัติ') || lower.includes('ต่ออายุ')) {
    text = 
`🔑 [1. ยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill]

สวัสดีครับ ระบบได้รับเรื่องการขอยืนยันสิทธิ์ของท่านเรียบร้อยแล้ว!

📌 หากยังไม่ได้แจ้งไอดี กรุณาพิมพ์แจ้ง:
• ชื่อผู้ใช้ / ไอดีของคุณ (เช่น @Panuwat)
• ชื่อ-นามสกุล หรือชื่อเรียก
• แพ็กเกจที่ต้องการ:
  1) 🎁 แบบทดลองใช้ (30 วัน)
  2) 🌟 แพ็กเกจ 3 เดือน (90 วัน)
  3) 👑 ใช้ฟรีตลอดชีพ

ผู้ดูแลระบบ (คุณภานุวัฒน์) จะดำเนินการเปิดสิทธิ์หรือต่ออายุให้ท่านโดยเร็วที่สุดครับ!`;
  } else if (lower.startsWith('2') || lower.includes('ผู้พัฒนา') || lower.includes('ติดต่อ')) {
    text = 
`👨‍💻 [2. ติดต่อผู้พัฒนาระบบ TestSkill]

คุณกำลังติดต่อผู้สร้างและพัฒนาระบบโดยตรง:
• ผู้พัฒนา: คุณภานุวัฒน์ (แอดมิน)
• Line ID: Panuwat_99999
• ระบบสอบออนไลน์เตรียมความพร้อมใบประกอบวิชาชีพครู By กลางฟู

ท่านสามารถพิมพ์ข้อความ ข้อเสนอแนะ หรือคำถามทิ้งไว้ในแชทนี้ได้เลยครับ แอดมินจะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ 😊`;
  } else if (lower.startsWith('3') || lower.includes('ปัญหา') || lower.includes('บั๊ก') || lower.includes('bug')) {
    text = 
`🛠️ [3. แจ้งปัญหาการใช้งาน / พบข้อผิดพลาด]

ขออภัยในความไม่สะดวกครับ เพื่อความรวดเร็วในการแก้ไข กรุณาระบุข้อมูลดังนี้:
1. ชุดข้อสอบและข้อที่พบปัญหา (เช่น ชุดที่ 5 ข้อที่ 12)
2. อาการของปัญหา (เช่น เฉลยผิด, หน้าจอค้าง, บันทึกคะแนนไม่ได้)
3. รูปภาพหน้าจอ (Screenshot) หากสะดวกแนบมา

ทีมงานจะตรวจสอบและปรับปรุงแก้ไขระบบให้ทันทีครับ ขอบคุณครับ!`;
  } else if (lower.startsWith('4') || lower.includes('สอบถาม') || lower.includes('แพ็กเกจ') || lower.includes('ราคา')) {
    text = 
`❓ [4. สอบถามข้อมูลเพิ่มเติม TestSkill]

📘 ระบบสอบออนไลน์ TestSkill เตรียมสอบใบประกอบวิชาชีพครู By กลางฟู
• คลังข้อสอบตาม Test Blueprint 5 เรื่อง (930 ข้อ)
• ชุดรวมเทียบเคียงข้อสอบจริง 24 ชุด (2,295 ข้อ)
• ระบบจับเวลา บันทึกผลสอบ เฉลยละเอียดพร้อมเกร็ดความรู้ทุกข้อ และ AI วิเคราะห์ผลสอบ

ท่านสามารถพิมพ์คำถามหรือข้อสงสัยเพิ่มเติมส่งมาในแชทนี้ได้ตลอดเวลาครับ!`;
  } else {
    text = 
`สวัสดีครับ 👋 ยินดีต้อนรับสู่ LINE Official ของระบบ TestSkill (By กลางฟู)

กรุณาเลือกหัวข้อที่ต้องการรับบริการ:
1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
2️⃣ ติดต่อผู้พัฒนา (คุณภานุวัฒน์)
3️⃣ แจ้งปัญหาการใช้งาน
4️⃣ สอบถาม อื่นๆ

👉 ท่านสามารถพิมพ์หมายเลข 1, 2, 3 หรือ 4 หรือกดปุ่มเมนูด้านล่างได้ทันทีครับ`;
  }

  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text,
        quickReply: getQuickReplyMenu()
      }
    ]
  });
}

async function replyMainMenu(replyToken) {
  const text = 
`สวัสดีครับ 👋 ยินดีต้อนรับสู่ LINE Official ของระบบ TestSkill (By กลางฟู)

กรุณาเลือกหัวข้อที่ต้องการรับบริการ:
1️⃣ ยืนยันสิทธิ์ (ขอเปิดสิทธิ์ / ต่ออายุ)
2️⃣ ติดต่อผู้พัฒนา (คุณภานุวัฒน์)
3️⃣ แจ้งปัญหาการใช้งาน
4️⃣ สอบถาม อื่นๆ`;

  return client.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text,
        quickReply: getQuickReplyMenu()
      }
    ]
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LINE Webhook Server running on port ${PORT}`);
});
