const { z } = require('zod');

const createCategorySchema = {
  body: z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
    description: z.string().optional(),
    iconName: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional()
  })
};

const updateCategorySchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    iconName: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional()
  })
};

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
