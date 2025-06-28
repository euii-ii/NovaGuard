// monitoringRoutes.js
const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');

// GET /api/contracts/:id/monitoring
router.get('/contracts/:id/monitoring', monitoringController.getMonitoringEvents);
// POST /api/contracts/:id/monitoring/flag
router.post('/contracts/:id/monitoring/flag', monitoringController.flagMonitoringEvent);

module.exports = router;
