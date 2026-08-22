const { z } = require('zod');

const createOrderSchema = {
  body: z.object({
    addressId: z.string().min(1, 'Address ID is required'),
    couponCode: z.string().nullable().optional()
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
