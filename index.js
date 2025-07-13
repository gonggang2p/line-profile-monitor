const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config.json');

// โหลดโปรไฟล์เก่า
function loadPreviousProfile(accountName) {
  const filename = `lastProfile_${accountName}.json`;
  if (!fs.existsSync(filename)) return {};
  const raw = fs.readFileSync(filename);
  return JSON.parse(raw);
}

// บันทึกโปรไฟล์ใหม่
function saveProfile(accountName, profile) {
  const filename = `lastProfile_${accountName}.json`;
  fs.writeFileSync(filename, JSON.stringify(profile, null, 2));
}

// ดึงข้อมูล OA
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

// ส่งแจ้งเตือนผ่าน Telegram
async function sendTelegram(botToken, chatId, message) {
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message
  });
}

// ตรวจสอบทุกบัญชี
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
        const msg = `📢 [${account.name}] พบการเปลี่ยนแปลง:\n${changes.join('\n')}`;
        await sendTelegram(account.telegramBotToken, account.telegramChatId, msg);
        saveProfile(account.name, current);
        console.log(`✅ แจ้งเตือนแล้ว: ${account.name}`);
      } else {
        console.log(`✅ ไม่มีการเปลี่ยนแปลง: ${account.name}`);
      }
    } catch (err) {
      console.error(`❌ [${account.name}] เกิดข้อผิดพลาด:`, err.message);
    }
  }
}

// ตั้ง cron รันทุกชั่วโมง
cron.schedule('0 * * * *', () => {
  console.log('🔁 ตรวจสอบ LINE OA...');
  checkAllAccounts();
});

// รันทันทีเมื่อเริ่มต้น
checkAllAccounts();
