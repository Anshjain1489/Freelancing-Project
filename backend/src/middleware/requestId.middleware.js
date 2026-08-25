const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: require('crypto').randomUUID } : require('uuid');

const requestIdMiddleware = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || (typeof uuidv4 === 'function' ? uuidv4() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
