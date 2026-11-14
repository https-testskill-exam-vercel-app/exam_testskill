/**
 * js/cloud.js - Cloud Sync & LINE Notification Helper for TestSkill
 * ทำงานร่วมกับ Google Apps Script (Backend) เพื่อ:
 * 1. ซิงค์คำขอสมัครสมาชิก/ยืนยันสิทธิ์ขึ้น Cloud
 * 2. เมื่อแอดมินกดคอนเฟิร์มในระบบ ส่งสัญญาณไปสั่ง LINE Bot ให้ยิงข้อความตอบกลับเข้าแชทผู้ใช้โดยอัตโนมัติ
 * 3. มีปุ่มลัด 1-Click ตอบกลับผ่าน LINE สำหรับแอดมินในกรณีสำรอง
 */

const CloudSync = {
  getGasUrl() {
    return App?.settings?.gasUrl || DEFAULT_SETTINGS?.gasUrl || '';
  },

  getLineBotId() {
    return App?.settings?.lineBotId || DEFAULT_SETTINGS?.lineBotId || '@430lkurz';
  },

  getAdminLineId() {
    return App?.settings?.adminLineId || DEFAULT_SETTINGS?.adminLineId || 'Panuwat_99999';
  },

  /**
   * ส่งข้อมูลคำขอสมัครสมาชิกขึ้น Google Sheet กลาง
   */
  async registerRequest(user) {
    const url = this.getGasUrl();
    if (!url) return false;
    try {
      // ส่งแบบ text/plain เพื่อหลบ CORS Preflight ในเบราว์เซอร์
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'register',
          user: {
            id: user.id,
            username: user.username,
            name: user.name || user.username,
            role: user.role || 'user',
            active: !!user.active,
            pendingApproval: user.pendingApproval !== false,
            expires: user.expires || '',
            createdAt: user.createdAt || Date.now()
          }
        })
      });
      return true;
    } catch (e) {
      console.warn('CloudSync.registerRequest warning:', e);
      return false;
    }
  },

  /**
   * สั่งคอนเฟิร์มผู้ใช้งานใน Cloud และสั่งให้ LINE Bot ส่งข้อความตอบกลับเข้าแชทผู้ใช้ทันที
   */
  async confirmUser({ username, name, packageTitle, expires, adminName = 'ภาณุวัฒน์' }) {
    const url = this.getGasUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'confirm_user',
          username,
          name,
          packageTitle,
          expires,
          adminName
        })
      });
      return true;
    } catch (e) {
      console.warn('CloudSync.confirmUser warning:', e);
      return false;
    }
  },

  /**
   * ดึงรายชื่อผู้ใช้ที่รออนุมัติ / ผู้ใช้ทั้งหมดจาก Google Sheet
   */
  async fetchUsersFromCloud() {
    const url = this.getGasUrl();
    if (!url) return [];
    try {
      const res = await fetch(`${url}?action=get_users&t=${Date.now()}`);
      if (!res.ok) return [];
      const cloudUsers = await res.json();
      if (!Array.isArray(cloudUsers)) return [];
      return cloudUsers;
    } catch (e) {
      console.warn('CloudSync.fetchUsersFromCloud warning:', e);
      return [];
    }
  },

  /**
   * ซิงค์ผู้ใช้จาก Cloud เข้ามาผสานกับ IndexedDB ในเครื่อง
   */
  async syncUsers() {
    const cloudUsers = await this.fetchUsersFromCloud();
    if (!cloudUsers.length) return { added: 0, updated: 0 };
    const localUsers = await Repo.getUsers();
    let added = 0, updated = 0;

    for (const cu of cloudUsers) {
      if (!cu.username) continue;
      const idx = localUsers.findIndex((u) => u.username.toLowerCase() === cu.username.toLowerCase());
      if (idx >= 0) {
        // อัปเดตข้อมูลสถานะถ้ามี
        const local = localUsers[idx];
        if (cu.active !== undefined && cu.active !== local.active) {
          local.active = cu.active;
          local.pendingApproval = cu.pendingApproval;
          local.expires = cu.expires || local.expires;
          updated++;
        }
      } else {
        // เพิ่มผู้ใช้ใหม่ที่สมัครจากเครื่องอื่น
        localUsers.push({
          id: cu.id || uid('u_'),
          username: cu.username,
          name: cu.name || cu.username,
          passHash: '', // ผู้ใช้ล็อกอินผ่านระบบเดิม
          role: cu.role || 'user',
          active: !!cu.active,
          pendingApproval: cu.pendingApproval !== false,
          expires: cu.expires || '',
          perms: {},
          createdAt: cu.createdAt || Date.now()
        });
        added++;
      }
    }

    if (added > 0 || updated > 0) {
      await Repo.saveUsers(localUsers);
    }
    return { added, updated, total: localUsers.length };
  },

  /**
   * สร้างข้อความตอบกลับคอนเฟิร์มแพ็กเกจสำเร็จรูป
   */
  formatConfirmationMessage({ username, packageTitle, expires }) {
    const expiryText = expires
      ? new Date(expires).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'ใช้งานได้ตลอดชีพ (ไม่จำกัด)';
    const webUrl = 'https://https-testskill-exam-vercel-app.github.io/exam_testskill/';

    return `🎉 แอดมินคอนเฟิร์มสิทธิ์การใช้งานให้คุณเรียบร้อยแล้วครับ!

👤 ไอดี: @${username}
📦 แพ็กเกจ: ${packageTitle}
📅 วันหมดอายุ: ${expiryText}

🔗 เข้าสู่ระบบและทำแบบทดสอบได้ทันที:
${webUrl}

ขอให้ตั้งใจฝึกฝนและทำคะแนนสอบได้ตามเป้าหมายครับ ✌️✨`;
  },

  /**
   * สร้างข้อความขอยืนยันสิทธิ์สำหรับผู้ใช้ส่งหา LINE แอดมิน
   */
  formatUserRequestMessage({ username, name }) {
    return `ขอยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill ครับ
• ไอดี: @${username}
• ชื่อ: ${name || username}
รบกวนแอดมินช่วยคอนเฟิร์มเปิดสิทธิ์ให้ด้วยนะครับ ขอบคุณครับ 🙏`;
  },

  /**
   * สร้างลิงก์เปิด LINE แชทพร้อมพิมพ์ข้อความให้อัตโนมัติ (คลิกเดียวส่งได้ทันที)
   */
  getLineChatUrl(text, lineBotId = '') {
    const targetBot = (lineBotId || this.getLineBotId()).replace(/^@/, '');
    // ใช้ LINE URL scheme สำหรับส่งข้อความเข้าห้องแชท Official Account
    return `https://line.me/R/oaMessage/@${targetBot}/?${encodeURIComponent(text)}`;
  },

  /**
   * ลิงก์เปิดแชท LINE ส่วนตัวของผู้พัฒนา (คุณภาณุวัฒน์)
   */
  getAdminPersonalLineUrl() {
    return `https://line.me/ti/p/~${this.getAdminLineId()}`;
  }
};
