const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config.json');

// ฟังก์ชันโหลดโปรไฟล์ก่อนหน้า
function loadPreviousProfile(accountName) {
  const filename = `lastProfile_${accountName}.json`;
  if (!fs.existsSync(filename)) return {};
  const raw = fs.readFileSync(filename);
  return JSON.parse(raw);
}

// ฟังก์ชันบันทึกโปรไฟล์ปัจจุบัน
function saveProfile(accountName, profile) {
  const filename = `lastProfile_${accountName}.json`;
  fs.writeFileSync(filename, JSON.stringify(profile, null, 2));
}

// ฟังก์ชันดึงข้อมูลบัญชี LINE OA
async function getLineProfile(channelAccessToken) {
  const res = await axios.get('https://api.line.me/v2/bot/info', {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`
    }
  });
  return {
    displayName: res.data.displayName,
    pictureUrl: res.data.pictureUrl
  };
}

// ฟังก์ชันแจ้งเตือนผ่าน LINE Notify
async function sendLineNotify(token, message) {
  await axios.post('https://notify-api.line.me/api/notify',
    new URLSearchParams({ message }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
}

// ฟังก์ชันหลัก: ตรวจสอบแต่ละบัญชี
async function checkAllAccounts() {
  for (const account of config.accounts) {
    try {
      const current = await getLineProfile(account.channelAccessToken);
      const previous = loadPreviousProfile(account.name);
      let changes = [];

      if (current.displayName !== previous.displayName) {
        changes.push(`🔤 ชื่อเปลี่ยนจาก "${previous.displayName || 'ไม่พบ'}" → "${current.displayName}"`);
      }

      if (current.pictureUrl !== previous.pictureUrl) {
        changes.push(`🖼️ รูปโปรไฟล์มีการเปลี่ยนแปลง`);
      }

      if (changes.length > 0) {
        const msg = `📢 [แจ้งเตือน: ${account.name}]\n${changes.join('\n')}`;
        await sendLineNotify(account.notifyToken, msg);
        saveProfile(account.name, current);
        console.log(`✅ พบการเปลี่ยนแปลง: ${account.name}`);
      } else {
        console.log(`✅ ไม่มีการเปลี่ยนแปลง: ${account.name}`);
      }
    } catch (err) {
      console.error(`❌ [${account.name}] เกิดข้อผิดพลาด:`, err.message);
    }
  }
}

// 🔁 รันทุกชั่วโมง
cron.schedule('0 * * * *', () => {
  console.log('🔁 เริ่มตรวจสอบบัญชีทั้งหมด...');
  checkAllAccounts();
});

// รันทันทีเมื่อเริ่ม
checkAllAccounts();
