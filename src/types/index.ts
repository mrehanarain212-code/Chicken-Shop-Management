/**
 * Chicken Shop Management System Types
 */

export interface Product {
  id: string;
  name: string;
  currentStockKg: number;    // Supporting decimal weights
  buyingPricePerKg: number;  // Latest purchase wholesale rate
  sellingPricePerKg: number; // Current retail price rate
  lastUpdated: string;       // ISO datetime string
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  outstandingCredit: number; // Plus means customer owes us money (Udhaar)
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  outstandingBalance: number; // Plus means we owe money to supplier
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  weightKg: number;  // support dual decimals (e.g. 1.25 kg)
  ratePerKg: number;
  total: number;     // weightKg * ratePerKg
}

export interface Sale {
  id: string;
  billNumber: string;
  customerId: string | null;  // null if Walk-in Cash Customer
  customerName: string;        // "Walk-in Cash" or customer registered name
  items: SaleItem[];
  totalAmount: number;         // sum of items total
  discountAmount: number;      // promotional discounts
  netAmount: number;           // totalAmount - discountAmount
  paidAmount: number;          // cash/online collected
  creditAmount: number;        // amount added to customer Udhaar ledger (netAmount - paidAmount)
  paymentMethod: 'cash' | 'credit' | 'online' | 'mixed';
  saleDate: string;            // ISO Date string
  notes?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  weightKg: number;
  ratePerKg: number;
  totalAmount: number;         // weightKg * ratePerKg
  paidAmount: number;          // amount paid in cash/instantly
  creditAmount: number;        // amount added to supplier ledger
  purchaseDate: string;        // ISO Date string
  notes?: string;
}

export type ExpenseCategory = 'rent' | 'feed' | 'bills' | 'salary' | 'mortality' | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;         // ISO Date string
  description: string;
  mortalityKg?: number;         // If category is 'mortality' - records wasted weight in kg
  mortalityCount?: number;     // If category is 'mortality' - count of birds lost
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'online';
  paymentDate: string;         // ISO Date string
  notes?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: 'cash' | 'online';
  paymentDate: string;         // ISO Date string
  notes?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'debit' | 'credit';    // debit = purchased on credit (increases Udhaar), credit = payment made (reduces Udhaar)
  amount: number;
  balanceAfter: number;         // running balance
  referenceId: string;          // saleId or paymentId or manual adjustment
  description: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  date: string;
  type: 'credit' | 'debit';    // credit = purchased on credit (we owe more), debit = paid to supplier (we owe less)
  amount: number;
  balanceAfter: number;
  referenceId: string;          // purchaseId or paymentId or manual adjustment
  description: string;
}

// Structuring system-wide database model for localStorage representation
export interface LocalDB {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  settings: {
    shopName: string;
    shopAddress: string;
    shopPhone: string;
    currencySymbol: string;
    lastBillSequence: number;
    logoUrl?: string;
  };
}
