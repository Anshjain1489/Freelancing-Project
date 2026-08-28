const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || (typeof randomUUID === 'function' ? randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  
  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
