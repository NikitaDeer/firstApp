const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ВСТАВЬТЕ СВОИ ДАННЫЕ В .env:
// TELEGRAM_BOT_TOKEN=...
// TELEGRAM_CHAT_ID=...
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Разрешаем запросы от локально открытого index.html (file://) и от браузера по http(s).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.post('/api/applications', async (req, res) => {
  const { name, email, message } = req.body || {};

  // Валидация на стороне сервера
  const errors = [];
  
  // Проверка типа данных
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ ok: false, error: 'Некорректные типы данных' });
  }
  
  // Валидация имени
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    errors.push('Имя должно быть от 2 до 50 символов');
  }
  if (!/^[a-zA-Zа-яА-ЯёЁ\s\-]{2,50}$/.test(cleanName)) {
    errors.push('Имя содержит недопустимые символы');
  }
  
  // Валидация email
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.push('Некорректный email');
  }
  if (cleanEmail.length > 100) {
    errors.push('Email слишком длинный');
  }
  
  // Валидация сообщения
  const cleanMessage = message.trim();
  if (cleanMessage.length < 5 || cleanMessage.length > 1000) {
    errors.push('Сообщение должно быть от 5 до 1000 символов');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, error: errors.join(', ') });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Не настроены TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID' });
  }

  const text = [
    'Новая заявка с сайта АгроЛаб',
    '',
    `<b>Имя:</b> ${escapeHtml(cleanName)}`,
    `<b>Email:</b> ${escapeHtml(cleanEmail)}`,
    `<b>Сообщение:</b>`,
    escapeHtml(cleanMessage)
  ].join('\n');

  try {
    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });

    if (!tgResponse.ok) {
      const details = await tgResponse.text();
      return res.status(502).json({ ok: false, error: `Telegram API error: ${details}` });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Ошибка отправки в Telegram' });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
