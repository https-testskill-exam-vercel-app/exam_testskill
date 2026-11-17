# คู่มือการติดตั้งและเชื่อมต่อ LINE Chat Bot (Messaging API)
### ระบบสอบออนไลน์ TestSkill By กลางฟู (Line ID: Panuwat_99999)

บอทนี้ถูกออกแบบมาเพื่อให้บริการตอบกลับอัตโนมัติ 4 หัวข้อสำคัญ:
1. **1. ยืนยันสิทธิ์:** รับคำขอเปิดสิทธิ์และต่ออายุแพ็กเกจจากผู้ใช้งาน
2. **2. ติดต่อผู้พัฒนา:** ส่งข้อความถึงคุณภานุวัฒน์โดยตรง
3. **3. แจ้งปัญหาการใช้งาน:** รับแจ้งข้อผิดพลาด รายงานข้อสอบ หรือบั๊กในระบบ
4. **4. สอบถาม อื่นๆ:** ถามข้อมูลคอร์สเรียน ระบบสอบ และคำถามที่พบบ่อย (FAQ)

---

## วิธีที่ 1: ติดตั้งผ่าน Google Apps Script (แนะนำ — ฟรี 100% ทำงาน 24 ชม. ไม่ต้องมีเซิร์ฟเวอร์)

1. เข้าไปที่เว็บ [https://script.google.com](https://script.google.com)
2. คลิก **"New project" (โครงการใหม่)**
3. คัดลอกโค้ดทั้งหมดจากไฟล์ `line-bot/google-apps-script.js` ไปวางแทนที่โค้ดเดิมใน `Code.gs`
4. เข้าไปที่ [LINE Developers Console](https://developers.line.biz) > เข้า Channel ของคุณ > แท็บ **Messaging API**
5. เลื่อนลงมาที่หัวข้อ **Channel access token (long-lived)** แล้วกดปุ่ม **Issue**
6. นำ Token ที่ได้มาแทนที่ในบรรทัด:
   ```javascript
   const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
   ```
7. ในหน้า Google Apps Script:
   - กดปุ่ม **Deploy (ทำให้ใช้งานได้จริง)** > เลือก **New deployment (การทำให้ใช้งานได้จริงรายการใหม่)**
   - เลือกประเภทเป็น **Web app (เว็บแอป)**
   - ตั้งค่า:
     - **Execute as:** `Me (ฉัน)`
     - **Who has access:** `Anyone (ทุกคน)`
   - กด **Deploy** และกดยอมรับสิทธิ์ (Authorize access)
   - คัดลอก **Web app URL** ที่ได้ (ลงท้ายด้วย `/exec`)
8. นำ URL ที่ได้ไปใส่ใน LINE Developers Console:
   - ไปที่แท็บ **Messaging API** > หัวข้อ **Webhook settings**
   - วาง URL ลงในช่อง **Webhook URL**
   - กดปุ่ม **Update** และกดปุ่ม **Verify** (ต้องขึ้นสถานะ Success)
   - เลื่อนสวิตช์ **Use Webhook** เป็น **ON (สีเขียว)**
9. ตั้งค่าการตอบกลับใน [LINE Official Account Manager](https://manager.line.biz):
   - ไปที่ **การตั้งค่า (Settings)** > **การตั้งค่าการตอบกลับ (Response settings)**
   - โหมดการตอบกลับ: เลือก **บอท (Bot)**
   - ข้อความตอบกลับอัตโนมัติ (Auto-response): เลือก **ปิด (Off)**
   - Webhook: เลือก **เปิด (On)**
10. ทดสอบส่งข้อความในไลน์ หรือพิมพ์เลข `1`, `2`, `3`, `4` บอทจะตอบกลับอัตโนมัติพร้อมปุ่ม Quick Reply ทันที!

---

## วิธีที่ 2: ติดตั้งผ่าน Node.js Server (Express)

หากคุณมี Server / VPS หรือต้องการ Deploy บน Cloud เช่น Render, Railway, Fly.io, Heroku:

1. ติดตั้ง dependencies:
   ```bash
   npm install express @line/bot-sdk dotenv
   ```
2. ตั้งค่า Environment Variables ใน `.env` หรือบน Cloud:
   ```env
   CHANNEL_ACCESS_TOKEN=your_channel_access_token
   CHANNEL_SECRET=your_channel_secret
   PORT=3000
   ```
3. สั่งรันบอท:
   ```bash
   node line-bot/webhook.js
   ```
4. นำ URL เซิร์ฟเวอร์ของคุณพร้อม path `/webhook` เช่น `https://your-domain.com/webhook` ไปใส่ใน Webhook URL ของ LINE Developers Console

---

## แผนภาพการทำงาน (Flow Architecture)

```
[ผู้ใช้งานในเว็บ TestSkill]
       │
       ▼ (คลิก "ติดต่อ LINE")
[เปิด LINE พร้อมข้อความที่จัดรูปแบบ เช่น "1. ยืนยันสิทธิ์ - @username"]
       │
       ▼ (ส่งข้อความ)
[LINE Messaging API Server]
       │
       ▼ (Webhook POST event)
[Google Apps Script / Node.js Webhook]
       │
       ├── วิเคราะห์ข้อความ (1 ยืนยันสิทธิ์ / 2 ติดต่อ / 3 ปัญหา / 4 สอบถาม)
       │
       ▼ (Reply Token API)
[ผู้ใช้ได้รับคำตอบอัตโนมัติ + ปุ่ม Quick Reply 4 ตัวเลือกทันที]
```
