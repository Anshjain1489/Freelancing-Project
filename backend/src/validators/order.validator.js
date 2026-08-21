const { z } = require('zod');

const createOrderSchema = {
  body: z.object({
    addressId: z.string().min(1, 'Address ID is required')
  })
};

const cancelOrderSchema = {
  body: z.object({
    reason: z.string().optional()
  })
};

module.exports = {
  createOrderSchema,
  cancelOrderSchema
};
