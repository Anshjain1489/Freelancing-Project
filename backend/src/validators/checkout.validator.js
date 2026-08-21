const { z } = require('zod');

const checkoutPreviewSchema = {
  body: z.object({
    addressId: z.string().min(1, 'Address ID is required')
  })
};

module.exports = { checkoutPreviewSchema };
