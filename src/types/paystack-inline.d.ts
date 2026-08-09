declare module "@paystack/inline-js" {
  export interface PaystackTransaction {
    id: number;
    reference: string;
    message: string;
    accessCode: string;
    customer: Record<string, unknown>;
  }

  export interface PaystackError {
    message: string;
  }

  export interface PaystackCallbacks {
    onLoad?: (transaction: PaystackTransaction) => void;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
  }

  export default class PaystackPop {
    constructor();
    resumeTransaction(accessCode: string, callbacks: PaystackCallbacks): unknown;
    newTransaction(options: Record<string, unknown>): unknown;
    isLoaded(): boolean;
    preloadTransaction(): void;
    cancelTransaction(): void;
    checkout(): void;
    paymentRequest(): void;
  }
}
