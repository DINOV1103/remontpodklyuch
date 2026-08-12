// ===== /api/lead — Vercel Serverless Function =====
// Sayt shu endpoint'ga POST yuboradi -> Telegram (keyinchalik: amoCRM, Google Sheets)
// Joylashuv: repo ildizida  api/lead.js  bo'lishi kerak (Vercel avtomatik /api/lead qilib tanib oladi)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Kelajakda qo'shiladi:
// const AMOCRM_SUBDOMAIN = process.env.AMOCRM_SUBDOMAIN;
// const AMOCRM_LONG_TERM_TOKEN = process.env.AMOCRM_LONG_TERM_TOKEN;
// const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

const ALLOWED_SOURCES = ["facebook", "telegram", "instagram", "youtube", "tiktok", "google"];

function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+998\d{9}$/.test(cleaned);
}

function cleanPhone(phone) {
  return phone.replace(/[\s\-()]/g, "");
}

function sanitize(str, maxLen) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen || 200);
}

async function sendToTelegram({ name, phone, formLabel, source, campaign }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram sozlamalari (env) topilmadi");
  }

  const text =
    "🆕 Yangi lead!\n\n" +
    "👤 Ism: " + name + "\n" +
    "📞 Telefon: " + phone + "\n" +
    "📍 Forma: " + formLabel + "\n" +
    "📣 Manba: " + (source || "aniqlanmadi") +
    (campaign ? " (" + campaign + ")" : "") + "\n" +
    "🕒 Vaqt: " + new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

  const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error("Telegram API xatosi: " + (data.description || "noma'lum xato"));
  }
  return data;
}

// TODO: keyinchalik shu funksiyalarni qo'shamiz
// async function sendToAmoCRM({ name, phone, source, campaign }) { ... }
// async function sendToGoogleSheets({ name, phone, formLabel, source, medium, campaign }) { ... }

module.exports = async function handler(req, res) {
  // CORS: Vercel'da sayt va API bir domenda bo'lgani uchun odatda kerak emas,
  // lekin boshqa domendan (masalan eski remontpodkluch.uz) chaqirilsa ruxsat beramiz.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  try {
    const body = req.body || {};
    const name = sanitize(body.name, 100);
    const phone = cleanPhone(sanitize(body.phone, 20));
    const formLabel = sanitize(body.formLabel, 150) || "Noma'lum forma";
    let source = sanitize(body.source, 30).toLowerCase();
    const campaign = sanitize(body.campaign, 100);

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: "Ism va telefon raqami majburiy" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ ok: false, error: "Telefon raqam formati noto'g'ri (+998XXXXXXXXX bo'lishi kerak)" });
    }
    if (!source || ALLOWED_SOURCES.indexOf(source) === -1) {
      source = source || "aniqlanmadi";
    }

    await sendToTelegram({ name, phone, formLabel, source, campaign });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead xatosi:", err.message);
    return res.status(500).json({ ok: false, error: "Server xatosi, keyinroq urinib ko'ring" });
  }
};

