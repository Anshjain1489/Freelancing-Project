const asyncHandler = require('../utils/asyncHandler');
const {
  verifyWebhookSubscription,
  verifyWebhookPayloadSignature,
  processWhatsAppWebhookEvent
} = require('../providers/whatsapp/whatsapp.webhook.service');

const verifyWebhook = asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifiedChallenge = verifyWebhookSubscription(mode, token, challenge);
  if (verifiedChallenge) {
    return res.status(200).send(verifiedChallenge);
  }
  return res.status(403).send('Forbidden');
});

const handleWebhookEvent = asyncHandler(async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const isValid = verifyWebhookPayloadSignature(rawBody, signature);
  if (!isValid) {
    return res.status(401).send('Unauthorized webhook signature');
  }

  const result = await processWhatsAppWebhookEvent(req.body);
  return res.status(200).json({ status: 'ok', result });
});

module.exports = {
  verifyWebhook,
  handleWebhookEvent
};
