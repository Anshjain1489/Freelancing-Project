const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');

const authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Access denied: Authentication token required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      req.user = decoded;
    } catch {}
  }
  next();
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Forbidden: Admin permissions required', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
  }
  next();
};

const authorizeDeliveryPartner = (req, res, next) => {
  if (!req.user || (req.user.role !== 'DELIVERY_PARTNER' && req.user.role !== 'ADMIN')) {
    return next(new AppError('Forbidden: Delivery Partner permissions required', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
  }
  next();
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(`Forbidden: Access denied`, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
    }
    next();
  };
};

module.exports = { authenticate, optionalAuth, authorizeAdmin, authorizeDeliveryPartner, authorizeRoles };
