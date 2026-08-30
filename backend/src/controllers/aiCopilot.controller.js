const aiCopilotService = require('../services/aiCopilot.service');

exports.queryCopilot = async (req, res) => {
  try {
    const { prompt, storeId } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    const result = await aiCopilotService.processQuery(req.user.id, prompt, storeId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCopilotHistory = async (req, res) => {
  try {
    const history = await aiCopilotService.getHistory(req.user.id);
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
