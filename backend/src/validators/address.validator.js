const { z } = require('zod');

const createAddressSchema = {
  body: z.object({
    recipientName: z.string().min(2, 'Recipient name must be at least 2 characters').max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
    addressLine1: z.string().min(5, 'Address line 1 is required').max(255),
    addressLine2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().min(2).default('Mahruni'),
    state: z.string().min(2).default('Uttar Pradesh'),
    postalCode: z.string().min(6).max(6).default('274702'),
    isDefault: z.boolean().optional()
  })
};

const updateAddressSchema = {
  body: z.object({
    recipientName: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    addressLine1: z.string().min(5).max(255).optional(),
    addressLine2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    isDefault: z.boolean().optional()
  })
};

module.exports = {
  createAddressSchema,
  updateAddressSchema
};
