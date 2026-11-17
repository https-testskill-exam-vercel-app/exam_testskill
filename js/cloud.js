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
    if (!url || !user || !user.username) return false;
    try {
      // 1. ส่งแบบ POST (text/plain หลบ CORS)
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'register',
          user: {
            id: user.id || ('u_' + Date.now()),
            username: user.username,
            name: user.name || user.username,
            passHash: user.passHash || '',
            role: user.role || 'user',
            active: !!user.active,
            pendingApproval: user.pendingApproval !== false,
            expires: user.expires || '',
            createdAt: user.createdAt || Date.now()
          }
        })
      }).catch(() => {});

      // 2. ส่งแบบ GET Fallback ทันที ป้องกัน CORS preflight บล็อกบนเบราว์เซอร์บางรุ่น
      const cleanUser = encodeURIComponent(String(user.username).replace(/^@+/, '').trim());
      const cleanName = encodeURIComponent(String(user.name || user.username).trim());
      const passHash = encodeURIComponent(String(user.passHash || '').trim());
      const getUrl = `${url}?action=register&username=${cleanUser}&name=${cleanName}&passHash=${passHash}&id=${encodeURIComponent(user.id || '')}`;
      await fetch(getUrl, { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch (e) {
      console.warn('CloudSync.registerRequest warning:', e);
      return false;
    }
  },

  /**
   * อัปเดต passHash ข้ามเครื่องขึ้น Cloud
   */
  async updatePassHash(username, passHash) {
    const url = this.getGasUrl();
    if (!url || !username || !passHash) return false;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_pass_hash',
          username,
          passHash
        })
      });
      return true;
    } catch (e) {
      console.warn('CloudSync.updatePassHash warning:', e);
      return false;
    }
  },

  /**
   * ดึงข้อมูลผู้ใช้เฉพาะรายจาก Google Sheet (มี fallback ดึงจาก get_users เพื่อรองรับทุกเวอร์ชัน)
   */
  async fetchUser(username) {
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser) return null;
    const url = this.getGasUrl();
    if (!url) return null;

    // 1. ลองเรียก endpoint เฉพาะบุคคล (get_user)
    try {
      const res = await fetch(`${url}?action=get_user&username=${encodeURIComponent(cleanUser)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'ok' && data.found && data.user) {
          return data.user;
        }
      }
    } catch (e) {
      console.warn('fetchUser get_user warning:', e);
    }

    // 2. Fallback ทันที: ค้นหาจาก get_users (รองรับ Google Apps Script ทุกเวอร์ชัน)
    try {
      const allUsers = await this.fetchUsersFromCloud();
      if (Array.isArray(allUsers) && allUsers.length > 0) {
        const found = allUsers.find((u) => (u.username || '').toLowerCase() === cleanUser);
        if (found) return found;
      }
    } catch (e) {
      console.warn('fetchUser get_users fallback warning:', e);
    }

    return null;
  },

  /**
   * ซิงค์ผู้ใช้ตอน Login เพื่อให้ได้สถานะคอนเฟิร์มและรหัสผ่านล่าสุดเสมอ (แก้ปัญหาข้ามเครื่อง)
   */
  async syncUserOnLogin(username, inputHash) {
    const cleanUser = String(username).trim();
    if (!cleanUser) return null;

    // ดึงผู้ใช้ล่าสุดจาก Cloud
    const cu = await this.fetchUser(cleanUser);
    const localUsers = await Repo.getUsers();
    const idx = localUsers.findIndex((u) => u.username.toLowerCase() === cleanUser.toLowerCase());

    if (cu) {
      const isActive = !!cu.active;
      const isPending = !isActive && cu.pendingApproval !== false;

      if (idx >= 0) {
        // อัปเดตสถานะที่แอดมินเพิ่งอนุมัติจากเครื่องอื่น
        const local = localUsers[idx];
        local.active = isActive;
        local.pendingApproval = isPending;
        local.role = cu.role || local.role;
        local.package = cu.package || local.package;
        local.expires = cu.expires || local.expires;
        local.lineUserId = cu.lineUserId || local.lineUserId;
        if (cu.passHash) {
          local.passHash = cu.passHash;
        } else if (local.passHash) {
          // ท้องถิ่นมี hash แต่ cloud ยังไม่มี -> ซิงค์ขึ้น cloud
          this.updatePassHash(cleanUser, local.passHash).catch(() => {});
        } else if (inputHash) {
          local.passHash = inputHash;
          this.updatePassHash(cleanUser, inputHash).catch(() => {});
        }
        await Repo.saveUsers(localUsers);
        return local;
      } else {
        // ผู้ใช้ล็อกอินจากเครื่องใหม่ที่ยังไม่มีข้อมูลใน IndexedDB
        const newUser = {
          id: cu.id || uid('u_'),
          username: cu.username,
          name: cu.name || cu.username,
          passHash: cu.passHash || inputHash || '',
          role: cu.role || 'user',
          active: isActive,
          pendingApproval: isPending,
          package: cu.package || '',
          expires: cu.expires || '',
          lineUserId: cu.lineUserId || '',
          perms: {},
          createdAt: cu.createdAt || Date.now()
        };
        localUsers.push(newUser);
        await Repo.saveUsers(localUsers);
        if (!cu.passHash && inputHash) {
          this.updatePassHash(cleanUser, inputHash).catch(() => {});
        }
        return newUser;
      }
    }

    // หาก Cloud ไม่พบหรือออฟไลน์ ให้ใช้ข้อมูลที่มีในเครื่อง
    if (idx >= 0) return localUsers[idx];
    return null;
  },

  /**
   * สั่งคอนเฟิร์มผู้ใช้งานใน Cloud และสั่งให้ LINE Bot ส่งข้อความตอบกลับเข้าแชทผู้ใช้ทันที
   */
  async confirmUser({ username, name, packageTitle, expires, adminName = 'ภาณุวัฒน์' }) {
    const url = this.getGasUrl();
    if (!url) return { ok: false, lineSent: false, hasLineId: false };
    const cleanUser = String(username || '').replace(/^@+/, '').trim();
    try {
      // 1. ส่งคำขอแบบ POST ขึ้น Google Apps Script
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'confirm_user',
          username: cleanUser,
          name: name || cleanUser,
          packageTitle,
          expires,
          adminName
        })
      });

      // 2. เรียก GET ซ้ำเพื่อความชัวร์และดึงสถานะ lineSent กลับมา
      try {
        const getUrl = `${url}?action=confirm_user&username=${encodeURIComponent(cleanUser)}&name=${encodeURIComponent(name || cleanUser)}&package=${encodeURIComponent(packageTitle || '')}&expires=${encodeURIComponent(expires || '')}&t=${Date.now()}`;
        const res = await fetch(getUrl);
        if (res.ok) {
          const data = await res.json();
          return { ok: true, lineSent: !!data.lineSent, hasLineId: !!data.hasLineId };
        }
      } catch (e2) {}

      return { ok: true, lineSent: false, hasLineId: false };
    } catch (e) {
      console.warn('CloudSync.confirmUser warning:', e);
      return { ok: false, lineSent: false, hasLineId: false };
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
   * สั่งลบผู้ใช้ออกจาก Cloud (Google Sheet)
   */
  async deleteUser(username) {
    const url = this.getGasUrl();
    if (!url || !username) return false;
    const cleanUser = String(username).replace(/^@+/, '').trim();
    try {
      // 1. ส่ง POST ลบผู้ใช้ใน Google Apps Script
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_user',
          username: cleanUser
        })
      });
      // 2. เรียก GET ซ้ำเพื่อความชัวร์ 100% ว่าแถวใน Google Sheet ถูกลบออกจริง
      try {
        await fetch(`${url}?action=delete_user&username=${encodeURIComponent(cleanUser)}&t=${Date.now()}`);
      } catch (e2) {}
      return true;
    } catch (e) {
      console.warn('CloudSync.deleteUser warning:', e);
      return false;
    }
  },

  /**
   * ซิงค์ผู้ใช้จาก Cloud เข้ามาผสานกับ IndexedDB ในเครื่อง
   */
  async syncUsers() {
    // ล้าง deleted_users เก่าทิ้ง เพื่อไม่ให้มีบัญชีไหนถูกบล็อกถาวร
    try { await DB.del('deleted_users'); } catch (e) {}

    const cloudUsers = await this.fetchUsersFromCloud();
    if (!cloudUsers || !cloudUsers.length) return { added: 0, updated: 0 };
    const localUsers = await Repo.getUsers();
    let added = 0, updated = 0;

    for (const cu of cloudUsers) {
      if (!cu.username) continue;
      const cleanUser = String(cu.username).replace(/^@+/, '').trim().toLowerCase();

      const idx = localUsers.findIndex((u) => String(u.username || '').replace(/^@+/, '').trim().toLowerCase() === cleanUser);
      if (idx >= 0) {
        // อัปเดตข้อมูลสถานะถ้ามี
        const local = localUsers[idx];
        let changed = false;
        if (cu.name && cu.name !== local.name) {
          local.name = cu.name;
          changed = true;
        }
        if (cu.active !== undefined && cu.active !== local.active) {
          local.active = cu.active;
          changed = true;
        }
        if (cu.pendingApproval !== undefined && cu.pendingApproval !== local.pendingApproval) {
          local.pendingApproval = cu.pendingApproval;
          changed = true;
        }
        if (cu.package && cu.package !== local.package) {
          local.package = cu.package;
          changed = true;
        }
        if (cu.expires && cu.expires !== local.expires) {
          local.expires = cu.expires;
          changed = true;
        }
        if (cu.lineUserId && cu.lineUserId !== local.lineUserId) {
          local.lineUserId = cu.lineUserId;
          changed = true;
        }
        if (cu.passHash && !local.passHash) {
          local.passHash = cu.passHash;
          changed = true;
        }
        if (changed) updated++;
      } else {
        // เพิ่มผู้ใช้ใหม่ที่สมัครจากเครื่องอื่นหรือทัก LINE เข้ามา
        localUsers.push({
          id: cu.id || uid('u_'),
          username: String(cu.username).replace(/^@+/, '').trim(),
          name: cu.name || cu.username,
          passHash: cu.passHash || '',
          role: cu.role || 'user',
          active: !!cu.active,
          pendingApproval: cu.pendingApproval !== false,
          package: cu.package || '',
          expires: cu.expires || '',
          lineUserId: cu.lineUserId || '',
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
   * สร้างข้อความตอบกลับคอนเฟิร์มแพ็กเกจสำเร็จรูป (สวัสดี [ชื่อผู้ใช้] และ ID ไม่มี @)
   */
  formatConfirmationMessage({ username, name, packageTitle, expires }) {
    const expiryText = expires
      ? (String(expires).includes('ตลอดชีพ') ? 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)' : new Date(expires).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }))
      : 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)';
    const webUrl = 'https://https-testskill-exam-vercel-app.github.io/exam_testskill/';
    const displayName = (name || username || '').trim();

    return `สวัสดี ${displayName} 👋
🎉 แอดมินคอนเฟิร์มสิทธิ์การใช้งานให้เรียบร้อยแล้ว

👤 ID: ${username}
📦 แพ็กเกจ: ${packageTitle}
📅 วันหมดอายุ: ${expiryText}

🔗 เข้าสู่ระบบและเริ่มทำแบบทดสอบได้ทันที:
${webUrl}

ขอให้ตั้งใจฝึกฝนและทำคะแนนได้ตามเป้าหมาย ✌️✨`;
  },

  /**
   * สร้างข้อความขอยืนยันสิทธิ์สำหรับผู้ใช้ส่งหา LINE แอดมิน (ID ไม่มี @)
   */
  formatUserRequestMessage({ username, name }) {
    const displayName = (name || username || '').trim();
    return `ขอยืนยันสิทธิ์เข้าใช้งานระบบ TestSkill
• ชื่อ: ${displayName}
• ID: ${username}
รบกวนแอดมินช่วยคอนเฟิร์มเปิดสิทธิ์ให้ด้วย ขอบคุณ🙏`;
  },

  /**
   * สร้างลิงก์เปิด LINE แชทส่งข้อความหา LINE Bot
   */
  getLineChatUrl(text, lineBotId = '') {
    const targetBot = (lineBotId || this.getLineBotId()).replace(/^@/, '');
    return `https://line.me/R/oaMessage/@${targetBot}/?${encodeURIComponent(text)}`;
  },

  /**
   * สร้างลิงก์แชร์ข้อความเข้า LINE เพื่อส่งต่อให้ผู้ใช้ในแชท (ใช้สำหรับแอดมินตอบกลับผู้ใช้)
   */
  getLineShareUrl(text) {
    return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
  },

  /**
   * ลิงก์เปิดแชท LINE ส่วนตัวของผู้พัฒนา (คุณภาณุวัฒน์)
   */
  getAdminPersonalLineUrl() {
    return `https://line.me/ti/p/~${this.getAdminLineId()}`;
  }
};
