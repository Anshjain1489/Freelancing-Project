const aiAnomalyDetectionService = require('../services/aiAnomalyDetection.service');

exports.getAnomalies = async (req, res) => {
  try {
    const anomalies = await aiAnomalyDetectionService.getAnomalies(req.query.limit || 50);
    return res.status(200).json({ success: true, data: anomalies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.scanAnomalies = async (req, res) => {
  try {
    const anomalies = await aiAnomalyDetectionService.scanForAnomalies(req.body.storeId);
    return res.status(200).json({ success: true, data: anomalies });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveAnomaly = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await aiAnomalyDetectionService.resolveAnomaly(id, req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
