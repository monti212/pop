// Stripe product configuration
export const STRIPE_PRODUCTS = {
  // Uhuru Plus subscription
  plus: {
    id: 'prod_SeIGwTuTcrwNa3',
    priceId: 'price_1RizgRKhB7e46jXjQPLd8LMT',
    name: 'Uhuru Plus',
    description: 'Unlimited messaging, Uhuru Docs and Sheets, Image generation, custom train Uhuru, Web Search, file upload.',
    mode: 'subscription'
  }
};

// Get product by ID
export const getProductById = (id: 'plus'): typeof STRIPE_PRODUCTS[typeof id] => {
  return STRIPE_PRODUCTS[id];
};

// Get all products
export const getAllProducts = (): typeof STRIPE_PRODUCTS[keyof typeof STRIPE_PRODUCTS][] => {
  return Object.values(STRIPE_PRODUCTS);
};

// Get product pricing display
export const getProductPrice = (id: 'plus'): string => {
  if (id === 'plus') return '$7.00';
  return '$0.00';
};

// Get product pricing for display in different contexts
export const getProductDisplayInfo = (id: 'plus' | 'free') => {
  const product = STRIPE_PRODUCTS[id];
  return {
    ...product,
    price: getProductPrice(id),
    monthlyPrice: id === 'plus' ? '$7/month' : 'Free'
  };
};