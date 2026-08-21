const { z } = require('zod');

const updateInventorySchema = {
  body: z.object({
    quantity: z.number().int().nonnegative('Quantity cannot be negative').optional(),
    lowStockThreshold: z.number().int().nonnegative('Low stock threshold cannot be negative').optional(),
    reorderLevel: z.number().int().nonnegative().optional()
  })
};

const adjustInventorySchema = {
  body: z.object({
    quantityChange: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be 0'),
    movementType: z.enum(['STOCK_IN', 'STOCK_OUT', 'ORDER_RESERVED', 'ORDER_RELEASED', 'ADJUSTMENT', 'RETURN']),
    notes: z.string().optional()
  })
};

module.exports = {
  updateInventorySchema,
  adjustInventorySchema
};
