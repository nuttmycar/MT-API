const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../config/db');

const EMAIL_SETTING_KEY = 'email_config';

const DEFAULT_EMAIL_CONFIG = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  fromName: 'MT-API System',
  fromAddress: '',
  notifyOnApprove: true,
  subjectTemplate: 'Your Hotspot account has been approved',
  bodyTemplate: 'Dear {{fullName}},\n\nYour hotspot account has been approved.\n\nUsername: {{username}}\nPassword: {{password}}\n\nPlease keep this information confidential.\n\nRegards,\nMT-API Team',
};

const getEmailConfig = async () => {
  try {
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      { replacements: [EMAIL_SETTING_KEY], type: QueryTypes.SELECT }
    );
    if (!result?.[0]?.setting_value) return { ...DEFAULT_EMAIL_CONFIG };
    return { ...DEFAULT_EMAIL_CONFIG, ...JSON.parse(result[0].setting_value) };
  } catch {
    return { ...DEFAULT_EMAIL_CONFIG };
  }
};

const saveEmailConfig = async (payload = {}) => {
  const sequelize = getSequelize();
  const config = { ...DEFAULT_EMAIL_CONFIG, ...payload };
  const val = JSON.stringify(config);
  await sequelize.query(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    { replacements: [EMAIL_SETTING_KEY, val, val], type: QueryTypes.INSERT }
  );
  return config;
};

const sendApprovalEmail = async ({ fullName, username, password, email }) => {
  const config = await getEmailConfig();
  if (!config.enabled || !config.notifyOnApprove) {
    return { skipped: true, reason: 'Email notifications disabled' };
  }
  if (!config.host || !config.user || !config.password || !config.fromAddress) {
    return { skipped: true, reason: 'Incomplete SMTP configuration' };
  }
  if (!email) {
    return { skipped: true, reason: 'No recipient email address' };
  }

  const subject = config.subjectTemplate || DEFAULT_EMAIL_CONFIG.subjectTemplate;
  const body = (config.bodyTemplate || DEFAULT_EMAIL_CONFIG.bodyTemplate)
    .replace(/{{fullName}}/g, fullName || '')
    .replace(/{{username}}/g, username || '')
    .replace(/{{password}}/g, password || '');

  // Use Node's built-in net to send SMTP (no external dependency)
  return new Promise((resolve) => {
    const net = require('net');
    const tls = require('tls');
    const port = Number(config.port) || 587;
    const secure = config.secure === true || port === 465;

    const rawMessage = [
      `From: "${config.fromName}" <${config.fromAddress}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ].join('\r\n');

    const b64Creds = Buffer.from(`\0${config.user}\0${config.password}`).toString('base64');

    let socket;
    let buffer = '';
    let step = 0;
    let resolved = false;

    const finish = (success, message) => {
      if (resolved) return;
      resolved = true;
      try { socket.destroy(); } catch (_) {}
      resolve({ success, message });
    };

    const send = (cmd) => socket.write(cmd + '\r\n');

    const onData = (data) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) { finish(false, line); return; }
        step++;
        if (step === 1) send(`EHLO mt-api`);
        else if (step === 2) send(`AUTH PLAIN ${b64Creds}`);
        else if (step === 3) send(`MAIL FROM:<${config.fromAddress}>`);
        else if (step === 4) send(`RCPT TO:<${email}>`);
        else if (step === 5) send(`DATA`);
        else if (step === 6) send(`${rawMessage}\r\n.`);
        else if (step === 7) { send(`QUIT`); finish(true, 'Email sent'); }
      }
    };

    try {
      if (secure) {
        socket = tls.connect({ host: config.host, port }, () => socket.on('data', onData));
      } else {
        socket = net.connect({ host: config.host, port }, () => socket.on('data', onData));
      }
      socket.setTimeout(10000, () => finish(false, 'SMTP timeout'));
      socket.on('error', (err) => finish(false, err.message));
    } catch (err) {
      resolve({ success: false, message: err.message });
    }
  });
};

module.exports = { getEmailConfig, saveEmailConfig, sendApprovalEmail, DEFAULT_EMAIL_CONFIG, EMAIL_SETTING_KEY };
