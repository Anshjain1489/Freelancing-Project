const { z } = require('zod');

const createProductSchema = {
  body: z.object({
    categoryId: z.string().uuid('Invalid category ID'),
    name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().min(2, 'SKU must be provided').max(100),
    brand: z.string().optional(),
    unit: z.enum(['kg', 'g', 'litre', 'ml', 'packet', 'piece']),
    unitValue: z.number().positive('Unit value must be greater than 0'),
    mrp: z.number().nonnegative('MRP cannot be negative'),
    sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
    discountPercentage: z.number().int().min(0).max(100).optional(),
    taxPercentage: z.number().min(0).optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional()
  }).refine((data) => data.sellingPrice <= data.mrp, {
    message: 'Selling price cannot exceed MRP',
    path: ['sellingPrice']
  })
};

const updateProductSchema = {
  body: z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(200).optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().min(2).max(100).optional(),
    brand: z.string().optional(),
    unit: z.enum(['kg', 'g', 'litre', 'ml', 'packet', 'piece']).optional(),
    unitValue: z.number().positive().optional(),
    mrp: z.number().nonnegative().optional(),
    sellingPrice: z.number().nonnegative().optional(),
    discountPercentage: z.number().int().min(0).max(100).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
};

const productQuerySchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc']).optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional()
  })
};

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema
};
