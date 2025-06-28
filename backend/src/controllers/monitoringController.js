// monitoringController.js
// Handles API endpoints for contract monitoring events and flagging

const realTimeMonitoringService = require('../services/realTimeMonitoringService');

// GET /api/contracts/:id/monitoring
async function getMonitoringEvents(req, res) {
  try {
    const contractId = req.params.id;
    const events = await realTimeMonitoringService.getMonitoringEvents(contractId);
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/contracts/:id/monitoring/flag
async function flagMonitoringEvent(req, res) {
  try {
    const eventId = req.body.eventId;
    const reason = req.body.reason || '';
    if (!eventId) return res.status(400).json({ success: false, error: 'eventId required' });
    await realTimeMonitoringService.flagMonitoringEvent(eventId, reason);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getMonitoringEvents,
  flagMonitoringEvent
};
