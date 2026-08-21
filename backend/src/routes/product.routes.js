const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema
} = require('../validators/product.validator');

const router = express.Router();

// Public Specific Routes (Must come BEFORE /:slug to avoid route collision)
router.get('/featured', productController.getFeaturedProducts);
router.get('/search', productController.searchProducts);

// Public General Routes
router.get('/', validate(productQuerySchema), productController.getProducts);
router.get('/:slug', productController.getProductBySlug);

// Admin Only Product Management Routes
router.post('/', authenticate, authorizeAdmin, validate(createProductSchema), productController.createProduct);
router.patch('/:id', authenticate, authorizeAdmin, validate(updateProductSchema), productController.updateProduct);
router.patch('/:id/status', authenticate, authorizeAdmin, productController.toggleProductStatus);
router.delete('/:id', authenticate, authorizeAdmin, productController.deleteProduct);

module.exports = router;
