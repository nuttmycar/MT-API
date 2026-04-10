const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../config/db');

const ALERT_SETTING_KEY = 'alert_channels';

const DEFAULT_ALERT_CONFIG = {
  enabled: false,
  coolDownMinutes: 15,
  triggers: {
    pendingApprovals: true,
    pendingThreshold: 5,
    cpuHigh: true,
    cpuThreshold: 85,
    backupError: true,
  },
  channels: {
    line: {
      enabled: false,
      token: '',
    },
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
    },
  },
};

const dispatchCache = new Map();

const normalizeAlertConfig = (config = {}) => ({
  ...DEFAULT_ALERT_CONFIG,
  ...config,
  triggers: {
    ...DEFAULT_ALERT_CONFIG.triggers,
    ...(config.triggers || {}),
  },
  channels: {
    line: {
      ...DEFAULT_ALERT_CONFIG.channels.line,
      ...(config.channels?.line || {}),
    },
    telegram: {
      ...DEFAULT_ALERT_CONFIG.channels.telegram,
      ...(config.channels?.telegram || {}),
    },
  },
});

const getAlertConfig = async () => {
  try {
    const sequelize = getSequelize();
    const result = await sequelize.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      {
        replacements: [ALERT_SETTING_KEY],
        type: QueryTypes.SELECT,
      }
    );

    if (!result?.[0]?.setting_value) {
      return normalizeAlertConfig();
    }

    return normalizeAlertConfig(JSON.parse(result[0].setting_value || '{}'));
  } catch (error) {
    console.error('[Alerts] Error loading config:', error.message);
    return normalizeAlertConfig();
  }
};

const saveAlertConfig = async (payload = {}) => {
  const sequelize = getSequelize();
  const config = normalizeAlertConfig(payload);
  const settingValue = JSON.stringify(config);

  await sequelize.query(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    {
      replacements: [ALERT_SETTING_KEY, settingValue, settingValue],
      type: QueryTypes.INSERT,
    }
  );

  return config;
};

const sendLineAlert = async ({ token, message }) => {
  if (!token) {
    return { channel: 'line', success: false, skipped: true, reason: 'Missing LINE token' };
  }

  const params = new URLSearchParams();
  params.set('message', message);

  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await response.text();
  return {
    channel: 'line',
    success: response.ok,
    status: response.status,
    message: text,
  };
};

const sendTelegramAlert = async ({ botToken, chatId, message }) => {
  if (!botToken || !chatId) {
    return { channel: 'telegram', success: false, skipped: true, reason: 'Missing Telegram bot token or chat id' };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  return {
    channel: 'telegram',
    success: response.ok && payload?.ok !== false,
    status: response.status,
    message: payload?.description || (payload?.ok ? 'sent' : 'Request failed'),
    payload,
  };
};

const sendConfiguredAlert = async (message, options = {}) => {
  const config = options.config ? normalizeAlertConfig(options.config) : await getAlertConfig();

  if (!config.enabled) {
    return {
      success: false,
      skipped: true,
      reason: 'Alerts disabled',
      results: [],
      config,
    };
  }

  const results = [];
  if (config.channels?.line?.enabled) {
    results.push(await sendLineAlert({ token: config.channels.line.token, message }));
  }

  if (config.channels?.telegram?.enabled) {
    results.push(await sendTelegramAlert({
      botToken: config.channels.telegram.botToken,
      chatId: config.channels.telegram.chatId,
      message,
    }));
  }

  return {
    success: results.some((item) => item.success),
    skipped: results.length === 0,
    results,
    config,
  };
};

const shouldSendForKey = (key, coolDownMinutes = 15) => {
  const lastSent = dispatchCache.get(key);
  const threshold = Math.max(1, Number(coolDownMinutes) || 15) * 60 * 1000;

  if (lastSent && (Date.now() - lastSent) < threshold) {
    return false;
  }

  dispatchCache.set(key, Date.now());
  return true;
};

const maybeDispatchSystemAlerts = async ({ notifications = [], pendingApprovals = 0, quick = {} } = {}) => {
  const config = await getAlertConfig();
  if (!config.enabled) {
    return { sent: false, skipped: true, reason: 'Alerts disabled', matches: [] };
  }

  const matches = [];
  const triggers = config.triggers || {};

  if (triggers.pendingApprovals && pendingApprovals >= (Number(triggers.pendingThreshold) || 5)) {
    const item = notifications.find((entry) => entry.id === 'pending-approvals');
    if (item) matches.push(item);
  }

  if (triggers.cpuHigh && Number(quick?.cpu || 0) >= (Number(triggers.cpuThreshold) || 85)) {
    const item = notifications.find((entry) => entry.id === 'cpu-high');
    if (item) matches.push(item);
  }

  if (triggers.backupError) {
    const item = notifications.find((entry) => entry.id === 'backup-error');
    if (item) matches.push(item);
  }

  const uniqueMatches = matches.filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
  if (uniqueMatches.length === 0) {
    return { sent: false, skipped: true, reason: 'No alert rule matched', matches: [] };
  }

  const dispatchKey = uniqueMatches.map((item) => item.id).sort().join('|');
  if (!shouldSendForKey(dispatchKey, config.coolDownMinutes)) {
    return { sent: false, skipped: true, reason: 'Cooldown active', matches: uniqueMatches.map((item) => item.id) };
  }

  const message = [
    '🚨 <b>MT-API Alert</b>',
    ...uniqueMatches.map((item) => `• <b>${item.title}</b>\n${item.message}`),
    '',
    `Time: ${new Date().toLocaleString('sv-SE').replace(' ', ' ')}`,
  ].join('\n');

  const result = await sendConfiguredAlert(message, { config });
  return {
    sent: result.success,
    skipped: !!result.skipped,
    matches: uniqueMatches.map((item) => item.id),
    results: result.results || [],
  };
};

module.exports = {
  ALERT_SETTING_KEY,
  DEFAULT_ALERT_CONFIG,
  getAlertConfig,
  saveAlertConfig,
  sendConfiguredAlert,
  maybeDispatchSystemAlerts,
};
