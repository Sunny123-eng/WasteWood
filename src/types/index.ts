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

export type PaymentMode = 'cash' | 'bank' | 'credit';
export type PaidBy = 'business' | 'sunny' | 'partner';

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

export interface AppSettings {
  sunnyPercent: number;
  partnerPercent: number;
}
