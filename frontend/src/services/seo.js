export const updateMetaTags = ({
  title = 'Chaudhary Kirana Store — Fresh Groceries Delivered Fast',
  description = 'Order daily Kirana & fresh groceries online from Chaudhary Kirana Store near Bada Jain Mandir, Mahruni. Fast local delivery at ₹10/KM.',
  keywords = 'Kirana, Grocery, Mahruni, Atta, Dal, Oil, Home Delivery, Akash Chaudhary'
}) => {
  document.title = title;
  
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }
};

export const generateLocalBusinessSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    'name': 'Chaudhary Kirana Store',
    'image': 'https://chaudhary-kirana-store.vercel.app/logo.png',
    'telephone': '+917897837095',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Near Bada Jain Mandir, Tikamgarh Road',
      'addressLocality': 'Mahruni',
      'addressRegion': 'Uttar Pradesh',
      'postalCode': '284405',
      'addressCountry': 'IN'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': 24.2381,
      'longitude': 78.7364
    },
    'url': 'https://chaudhary-kirana-store.vercel.app',
    'priceRange': '₹',
    'openingHoursSpecification': [
      {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        'opens': '07:00',
        'closes': '21:30'
      }
    ]
  };
};
