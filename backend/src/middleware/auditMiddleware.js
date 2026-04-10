const { logAuditEvent, sanitizeAuditPayload } = require('../utils/auditLogger');

const auditAction = (metaOrFactory) => (req, res, next) => {
  const startedAt = Date.now();
  let responseBody;
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    responseBody = payload;
    return originalJson(payload);
  };

  res.on('finish', () => {
    Promise.resolve()
      .then(async () => {
        const meta = typeof metaOrFactory === 'function'
          ? await metaOrFactory(req, res, responseBody)
          : (metaOrFactory || {});

        if (!meta?.action) return;

        await logAuditEvent(req, {
          action: meta.action,
          entityType: meta.entityType || 'system',
          entityId: meta.entityId || req.params?.id || null,
          status: res.statusCode >= 400 ? 'failed' : (meta.status || 'success'),
          details: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            query: sanitizeAuditPayload(req.query),
            body: sanitizeAuditPayload(req.body),
            response: sanitizeAuditPayload(responseBody),
            ...(meta.details || {}),
          },
        });
      })
      .catch((error) => {
        console.error('[AuditMiddleware] Error recording audit event:', error.message);
      });
  });

  next();
};

module.exports = { auditAction };
