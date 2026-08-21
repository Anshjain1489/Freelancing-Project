import { SITE_CONFIG } from '../../config/siteConfig';

export const getLocalBusinessSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "name": SITE_CONFIG.name,
    "description": SITE_CONFIG.description,
    "telephone": SITE_CONFIG.phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Near Bada Jain Mandir, Tikamgarh Road",
      "addressLocality": "Mahruni",
      "addressRegion": "Uttar Pradesh",
      "addressCountry": "IN"
    },
    "priceRange": "₹"
  };
};

export const getProductSchema = (product) => {
  if (!product) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `Buy ${product.name} from ${SITE_CONFIG.name} in Mahruni.`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Chaudhary Kirana"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": product.sellingPrice,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
};

export const getBreadcrumbSchema = (items = []) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${SITE_CONFIG.siteUrl}${item.path}`
    }))
  };
};
