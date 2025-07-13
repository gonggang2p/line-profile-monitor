const axios = require('axios');
const fs = require('fs');
const config = require('./config.json');

const PROFILE_FILE = 'lastProfile.json';

async function getLineProfile() {
  const res = await axios.get('https://api.line.me/v2/bot/info', {
    headers: {
      Authorization: `Bearer ${config.lineChannelAccessToken}`
    }
  });
  return {
    displayName: res.data.displayName,
    pictureUrl: res.data.pictureUrl
  };
}

function loadPreviousProfile() {
  if (!fs.existsSync(PROFILE_FILE)) return {};
  const raw = fs.readFileSync(PROFILE_FILE);
  return JSON.parse(raw);
}

function saveProfile(profile) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

async function sendLineNotify(message) {
  await axios.post('https://notify-api.line.me/api/notify', 
    new URLSearchParams({ message }), 
    {
      headers: {
        'Authorization': `Bearer ${config.lineNotifyToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
}

async function checkForChanges() {
  try {
    const current = await getLineProfile();
    const previous = loadPreviousProfile();
    let changes = [];

    if (current.displayName !== previous.displayName) {
      changes.push(`ชื่อเปลี่ยนจาก "${previous.displayName || 'ไม่พบ'}" → "${current.displayName}"`);
    }

    if (current.pictureUrl !== previous.pictureUrl) {
      changes.push(`รูปโปรไฟล์มีการเปลี่ยนแปลง`);
    }

    if (changes.length > 0) {
      const msg = `[แจ้งเตือน] มีการเปลี่ยนแปลงใน LINE OA:\n\n${changes.join('\n')}`;
      await sendLineNotify(msg);
      saveProfile(current);
      console.log('✅ พบการเปลี่ยนแปลงและแจ้งเตือนแล้ว');
    } else {
      console.log('✅ ไม่มีการเปลี่ยนแปลง');
    }

  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err.message);
  }
}

// เริ่มการตรวจสอบ
checkForChanges();