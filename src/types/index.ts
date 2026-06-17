export interface Sawmill {
  id: string;
  name: string;
  defaultRate: number;
  createdAt: string;
}

export interface Party {
  id: string;
  name: string;
  contact?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  partnerName: string;
  mobile?: string;
  email?: string;
  profitSharePercentage: number;
  investmentAmount: number;
  notes?: string;
  isOwner?: boolean;
  createdAt: string;
}

export type PaymentMode = 'cash' | 'bank' | 'credit';
/**
 * Expense "Paid By" / Withdrawal "Person" stores either the literal string
 * `'business'` or a Partner UUID. Kept as plain string so the dynamic partner
 * list works without enum churn.
 */
export type PaidBy = string;

export interface Purchase {
  id: string;
  date: string;
  sawmillId: string;
  sawmillName: string;
  rate: number;
  quantity: number;
  amount: number;
  vehicleNumber: string;
  paymentMode: PaymentMode;
  notes?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  date: string;
  partyId: string;
  partyName: string;
  rate: number;
  quantity: number;
  amount: number;
  vehicleNumber: string;
  billNumber: string;
  paymentMode: PaymentMode;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  /** `'business'` or a Partner UUID */
  paidBy: PaidBy;
  paymentMode: 'cash' | 'bank';
  linkedVehicle?: string;
  createdAt: string;
}

export interface PaymentReceived {
  id: string;
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: 'cash' | 'bank';
  notes?: string;
  createdAt: string;
}

export interface PaymentMade {
  id: string;
  date: string;
  sawmillId: string;
  sawmillName: string;
  amount: number;
  paymentMode: 'cash' | 'bank';
  notes?: string;
  createdAt: string;
}

export interface Balances {
  cash: number;
  bank: number;
}

export interface Withdrawal {
  id: string;
  date: string;
  /** Partner UUID */
  person: string;
  amount: number;
  source: 'cash' | 'bank';
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  /** Legacy — kept for backwards compatibility with the settings row. */
  sunnyPercent: number;
  partnerPercent: number;
}
