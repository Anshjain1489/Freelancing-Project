const express = require('express');
const { getHealthStatus, getHealthReadiness } = require('../controllers/health.controller');

const router = express.Router();

router.get('/', getHealthStatus);
router.get('/ready', getHealthReadiness);

module.exports = router;
