const { z } = require('zod');

const addCartItemSchema = {
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be at least 1')
  })
};

const updateCartItemSchema = {
  body: z.object({
    quantity: z.number().int().nonnegative('Quantity cannot be negative')
  })
};

const syncCartSchema = {
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive()
      })
    )
  })
};

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  syncCartSchema
};
