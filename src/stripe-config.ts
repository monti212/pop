// Stripe configuration stub

export interface StripeProduct {
  id: string;
  name: string;
  priceId: string;
  price: string;
  monthlyPrice: string;
  description: string;
}

export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  plus: {
    id: 'plus',
    name: 'Uhuru Plus',
    priceId: '',
    price: 'Free',
    monthlyPrice: 'Free',
    description: 'Access to all Uhuru features'
  },
  free: {
    id: 'free',
    name: 'Uhuru Free',
    priceId: '',
    price: 'Free',
    monthlyPrice: 'Free',
    description: 'Free access to core features'
  }
};

export const getProductById = (id: string): StripeProduct | null => {
  return STRIPE_PRODUCTS[id] || null;
};

export const getProductDisplayInfo = (_id: string): StripeProduct => {
  return STRIPE_PRODUCTS['plus'];
};
