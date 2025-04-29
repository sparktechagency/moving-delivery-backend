

// Define types for payment request
export interface PaymentRequest {
    amount: number;
    currency: string;
    paymentMethodId?: string;
    items?: Array<{
      name: string;
      price: number;
  
    }>;
  }