const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');

const router = express.Router();

// Public Category Routes
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Admin Only Category Management Routes
router.post('/', authenticate, authorizeAdmin, validate(createCategorySchema), categoryController.createCategory);
router.patch('/:id', authenticate, authorizeAdmin, validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authenticate, authorizeAdmin, categoryController.deleteCategory);

module.exports = router;
