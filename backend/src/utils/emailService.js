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

  return smtpSend({ config, to: email, subject, body });
};

/**
 * Pure Node.js SMTP sender.
 * Supports:
 *   - Port 465  → Implicit TLS (connect with tls.connect directly)
 *   - Port 587  → STARTTLS (plain connect → STARTTLS upgrade → re-EHLO → AUTH)
 *   - Port 25   → Plain (no TLS, rare, for internal relays)
 * AUTH method: AUTH PLAIN
 */
function smtpSend({ config, to, subject, body }) {
  return new Promise((resolve) => {
    const net = require('net');
    const tls = require('tls');

    const port = Number(config.port) || 587;
    const implicitTLS = config.secure === true || port === 465;

    const rawMessage = buildMimeMessage({
      from: `"${config.fromName || 'MT-API'}" <${config.fromAddress}>`,
      to,
      subject,
      body,
    });

    const b64Creds = Buffer.from(`\0${config.user}\0${config.password}`).toString('base64');

    let socket;
    let buf = '';
    let resolved = false;

    // SMTP conversation state machine
    // States: GREETING → EHLO → [STARTTLS → EHLO2 →] AUTH → MAIL → RCPT → DATA → BODY → QUIT
    let state = 'GREETING';
    let starttlsAdvertised = false;

    const finish = (success, message) => {
      if (resolved) return;
      resolved = true;
      try { socket.destroy(); } catch (_) {}
      resolve({ success, message });
    };

    const write = (cmd) => {
      try { socket.write(cmd + '\r\n'); } catch (e) { finish(false, e.message); }
    };

    // Process one complete (final) SMTP response line
    const handleResponse = (code, text) => {
      if (code >= 400) {
        finish(false, `SMTP ${code}: ${text}`);
        return;
      }

      switch (state) {
        case 'GREETING':
          // Server sent 220 greeting — send EHLO
          state = 'EHLO';
          write(`EHLO mt-api`);
          break;

        case 'EHLO':
          // 250 OK after EHLO — decide next step
          if (!implicitTLS && starttlsAdvertised) {
            state = 'STARTTLS';
            write('STARTTLS');
          } else {
            state = 'AUTH';
            write(`AUTH PLAIN ${b64Creds}`);
          }
          break;

        case 'STARTTLS':
          // 220 ready — upgrade socket to TLS
          if (code !== 220) { finish(false, `STARTTLS failed: ${text}`); return; }
          const plain = socket;
          plain.removeAllListeners('data');
          const upgraded = tls.connect(
            { socket: plain, host: config.host, servername: config.host },
            () => {
              socket = upgraded;
              socket.on('data', onData);
              socket.on('error', (err) => finish(false, err.message));
              buf = '';
              state = 'EHLO2';
              write('EHLO mt-api');
            }
          );
          upgraded.on('error', (err) => finish(false, `TLS upgrade error: ${err.message}`));
          break;

        case 'EHLO2':
          // 250 after re-EHLO post-STARTTLS
          state = 'AUTH';
          write(`AUTH PLAIN ${b64Creds}`);
          break;

        case 'AUTH':
          state = 'MAIL';
          write(`MAIL FROM:<${config.fromAddress}>`);
          break;

        case 'MAIL':
          state = 'RCPT';
          write(`RCPT TO:<${to}>`);
          break;

        case 'RCPT':
          state = 'DATA';
          write('DATA');
          break;

        case 'DATA':
          // 354 = send data
          if (code !== 354) { finish(false, `DATA error: ${text}`); return; }
          state = 'BODY';
          write(rawMessage + '\r\n.');
          break;

        case 'BODY':
          // 250 = message accepted
          state = 'QUIT';
          write('QUIT');
          finish(true, 'Email sent successfully');
          break;

        case 'QUIT':
          break;
      }
    };

    const onData = (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\r\n');
      buf = lines.pop(); // keep partial line

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        const isFinal = line[3] === ' ' || line.length === 3; // '-' means continuation
        const text = line.slice(4);

        // Collect EHLO capabilities from continuation lines
        if (line[3] === '-') {
          const cap = text.toUpperCase();
          if (cap === 'STARTTLS' || cap.startsWith('STARTTLS')) {
            starttlsAdvertised = true;
          }
          continue; // don't act on continuation lines
        }

        if (isNaN(code)) continue;
        handleResponse(code, text);
      }
    };

    try {
      if (implicitTLS) {
        socket = tls.connect(
          { host: config.host, port, servername: config.host },
          () => { socket.on('data', onData); }
        );
      } else {
        socket = net.createConnection({ host: config.host, port }, () => {
          socket.on('data', onData);
        });
      }
      socket.setTimeout(15000, () => finish(false, 'SMTP connection timed out'));
      socket.on('error', (err) => finish(false, err.message));
    } catch (err) {
      resolve({ success: false, message: err.message });
    }
  });
}

function buildMimeMessage({ from, to, subject, body }) {
  const date = new Date().toUTCString();
  // Encode subject as UTF-8 Base64 if it contains non-ASCII
  const encodedSubject = /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
    : subject;
  return [
    `Date: ${date}`,
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
  ].join('\r\n');
}

module.exports = { getEmailConfig, saveEmailConfig, sendApprovalEmail, DEFAULT_EMAIL_CONFIG, EMAIL_SETTING_KEY };
