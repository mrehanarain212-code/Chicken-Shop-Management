import { 
  LocalDB, 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  Purchase, 
  Expense, 
  CustomerPayment, 
  SupplierPayment, 
  CustomerLedgerEntry, 
  SupplierLedgerEntry 
} from '../types';
import { dbEvents } from '../utils/eventBus';

const STORAGE_KEY = 'chicken_shop_db_v1';

// Default / Initial Seed Data - Now empty for fresh start
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_SUPPLIERS: Supplier[] = [];
const DEFAULT_SALES: Sale[] = [];
const DEFAULT_PURCHASES: Purchase[] = [];
const DEFAULT_EXPENSES: Expense[] = [];
const DEFAULT_CUSTOMER_PAYMENTS: CustomerPayment[] = [];
const DEFAULT_SUPPLIER_PAYMENTS: SupplierPayment[] = [];
const DEFAULT_CUSTOMER_LEDGER: CustomerLedgerEntry[] = [];
const DEFAULT_SUPPLIER_LEDGER: SupplierLedgerEntry[] = [];

const DEFAULT_DB: LocalDB = {
  products: DEFAULT_PRODUCTS,
  customers: DEFAULT_CUSTOMERS,
  suppliers: DEFAULT_SUPPLIERS,
  sales: DEFAULT_SALES,
  purchases: DEFAULT_PURCHASES,
  expenses: DEFAULT_EXPENSES,
  customerPayments: DEFAULT_CUSTOMER_PAYMENTS,
  supplierPayments: DEFAULT_SUPPLIER_PAYMENTS,
  customerLedger: DEFAULT_CUSTOMER_LEDGER,
  supplierLedger: DEFAULT_SUPPLIER_LEDGER,
  settings: {
    shopName: 'New Poultry Shop',
    shopAddress: '',
    shopPhone: '',
    currencySymbol: 'Rs.',
    lastBillSequence: 0
  }
};

export class DuckDatabase {
  private static loadDB(): LocalDB {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
        return DEFAULT_DB;
      }
      return JSON.parse(dataStr);
    } catch (e) {
      console.error("Corrupted localStorage backup. Re-initializing default database to prevent crash.", e);
      return DEFAULT_DB;
    }
  }

  private static saveDB(db: LocalDB): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      dbEvents.emit('sync', 'synced');
    } catch (e) {
      console.error("Failed to commit database updates to browser container localStorage.", e);
      dbEvents.emit('sync', 'error');
    }
  }

  // --- GENERAL BACKUP & INTEGRITY ---
  public static resetToDefault(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
  }

  public static getRawDump(): LocalDB {
    return this.loadDB();
  }

  public static restoreDump(raw: LocalDB): boolean {
    if (
      raw &&
      Array.isArray(raw.products) &&
      Array.isArray(raw.customers) &&
      Array.isArray(raw.suppliers) &&
      Array.isArray(raw.sales) &&
      Array.isArray(raw.purchases) &&
      Array.isArray(raw.expenses)
    ) {
      this.saveDB(raw);
      return true;
    }
    return false;
  }

  // --- SETTINGS ---
  public static getSettings() {
    return this.loadDB().settings;
  }

  public static updateSettings(settings: LocalDB['settings']): void {
    const db = this.loadDB();
    db.settings = settings;
    this.saveDB(db);
  }

  // --- PRODUCTS / STOCK ---
  public static getProducts(): Product[] {
    return this.loadDB().products;
  }

  public static saveProduct(prod: Product): void {
    const db = this.loadDB();
    const idx = db.products.findIndex(p => p.id === prod.id);
    if (idx !== -1) {
      db.products[idx] = { ...prod, lastUpdated: new Date().toISOString() };
    } else {
      db.products.push({ ...prod, lastUpdated: new Date().toISOString() });
    }
    this.saveDB(db);
  }

  public static deleteProduct(id: string): void {
    const db = this.loadDB();
    db.products = db.products.filter(p => p.id !== id);
    this.saveDB(db);
  }

  public static deletePurchase(id: string): void {
    const db = this.loadDB();
    db.purchases = db.purchases.filter(p => p.id !== id);
    this.saveDB(db);
  }

  public static deleteSale(id: string): void {
    const db = this.loadDB();
    db.sales = db.sales.filter(s => s.id !== id);
    this.saveDB(db);
  }

  public static deleteCustomer(id: string): void {
    const db = this.loadDB();
    db.customers = db.customers.filter(c => c.id !== id);
    this.saveDB(db);
  }

  public static deleteExpense(id: string): void {
    const db = this.loadDB();
    db.expenses = db.expenses.filter(e => e.id !== id);
    this.saveDB(db);
  }

  // --- CUSTOMERS ---
  public static getCustomers(): Customer[] {
    return this.loadDB().customers;
  }

  public static saveCustomer(cust: Customer): void {
    const db = this.loadDB();
    const idx = db.customers.findIndex(c => c.id === cust.id);
    if (idx !== -1) {
      db.customers[idx] = cust;
    } else {
      db.customers.push(cust);
    }
    this.saveDB(db);
  }

  // --- SUPPLIERS ---
  public static getSuppliers(): Supplier[] {
    return this.loadDB().suppliers;
  }

  public static saveSupplier(supp: Supplier): void {
    const db = this.loadDB();
    const idx = db.suppliers.findIndex(s => s.id === supp.id);
    if (idx !== -1) {
      db.suppliers[idx] = supp;
    } else {
      db.suppliers.push(supp);
    }
    this.saveDB(db);
  }

  // --- SALES BILLING (Double-entry / Auto Stock Adjust) ---
  public static getSales(): Sale[] {
    return this.loadDB().sales;
  }

  public static addSale(sale: Omit<Sale, 'billNumber'>): Sale {
    const db = this.loadDB();
    const nextSeq = db.settings.lastBillSequence + 1;
    const billNumber = `BILL-${nextSeq}`;
    
    const configuredSale: Sale = {
      ...sale,
      billNumber
    };

    // 1. Append sale transaction
    db.sales.unshift(configuredSale);
    db.settings.lastBillSequence = nextSeq;

    // 2. Adjust local product stock weights
    configuredSale.items.forEach(item => {
      const pIdx = db.products.findIndex(p => p.id === item.productId);
      if (pIdx !== -1) {
        db.products[pIdx].currentStockKg = Math.max(0, db.products[pIdx].currentStockKg - item.weightKg);
        db.products[pIdx].lastUpdated = new Date().toISOString();
      }
    });

    // 3. Balance customer credit/Udhaar ledger
    if (configuredSale.customerId && configuredSale.creditAmount > 0) {
      const custIdx = db.customers.findIndex(c => c.id === configuredSale.customerId);
      if (custIdx !== -1) {
        const oldOut = db.customers[custIdx].outstandingCredit;
        const newOut = oldOut + configuredSale.creditAmount;
        db.customers[custIdx].outstandingCredit = newOut;

        const ledgerEntry: CustomerLedgerEntry = {
          id: `cl_gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          customerId: configuredSale.customerId,
          date: configuredSale.saleDate,
          type: 'debit',
          amount: configuredSale.creditAmount,
          balanceAfter: newOut,
          referenceId: configuredSale.id,
          description: `Billed credit sale for ${configuredSale.items.map(i => `${i.productName} (${i.weightKg} Kg)`).join(', ')} (Bill No: ${billNumber})`
        };

        db.customerLedger.unshift(ledgerEntry);
      }
    }

    this.saveDB(db);
    return configuredSale;
  }

  // --- PURCHASES (Restocking Poultry) ---
  public static getPurchases(): Purchase[] {
    return this.loadDB().purchases;
  }

  public static addPurchase(pur: Purchase): void {
    const db = this.loadDB();
    
    // 1. Increment Stock for the relevant poultry bird/part
    const pIdx = db.products.findIndex(p => p.id === pur.productId);
    if (pIdx !== -1) {
      db.products[pIdx].currentStockKg += pur.weightKg;
      // Dynamically update latest purchase prices to keep tracking buying rates
      db.products[pIdx].buyingPricePerKg = pur.ratePerKg;
      db.products[pIdx].lastUpdated = new Date().toISOString();
    }

    // 2. Append Purchase Record
    db.purchases.unshift(pur);

    // 3. Update Supplier Ledger if restocked via credit
    if (pur.creditAmount > 0) {
      const sIdx = db.suppliers.findIndex(s => s.id === pur.supplierId);
      if (sIdx !== -1) {
        const oldBal = db.suppliers[sIdx].outstandingBalance;
        const newBal = oldBal + pur.creditAmount;
        db.suppliers[sIdx].outstandingBalance = newBal;

        const ledgerEntry: SupplierLedgerEntry = {
          id: `sl_gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          supplierId: pur.supplierId,
          date: pur.purchaseDate,
          type: 'credit',
          amount: pur.creditAmount,
          balanceAfter: newBal,
          referenceId: pur.id,
          description: `Purchased restock of ${pur.productName} (${pur.weightKg} Kg @ Rs.${pur.ratePerKg}/Kg)`
        };

        db.supplierLedger.unshift(ledgerEntry);
      }
    }

    this.saveDB(db);
  }

  // --- EXPENSES & MORTALITY ACCIDENTS ---
  public static getExpenses(): Expense[] {
    return this.loadDB().expenses;
  }

  public static addExpense(exp: Expense): void {
    const db = this.loadDB();
    db.expenses.unshift(exp);

    // Dynamic stock control for "mortality" - reduce whole live chickens weight from stock as wasted weight
    if (exp.category === 'mortality' && exp.mortalityKg && exp.mortalityKg > 0) {
      // Find "Live Chicken (Whole Bird)" - the primary stock item subject to mortality
      const liveBirdIdx = db.products.findIndex(p => p.id === 'p1'); 
      if (liveBirdIdx !== -1) {
        db.products[liveBirdIdx].currentStockKg = Math.max(0, db.products[liveBirdIdx].currentStockKg - exp.mortalityKg);
        db.products[liveBirdIdx].lastUpdated = new Date().toISOString();
      }
    }

    this.saveDB(db);
  }

  // --- CUSTOMER PAYMENTS (Settling Ledger Credit) ---
  public static getCustomerPayments(): CustomerPayment[] {
    return this.loadDB().customerPayments;
  }

  public static getCustomerLedger(customerId: string): CustomerLedgerEntry[] {
    return this.loadDB().customerLedger.filter(l => l.customerId === customerId);
  }

  public static addCustomerPayment(pay: CustomerPayment): void {
    const db = this.loadDB();
    
    // Add payment transaction
    db.customerPayments.unshift(pay);

    // Update customer outstanding and log double-entry ledger credit transaction
    const custIdx = db.customers.findIndex(c => c.id === pay.customerId);
    if (custIdx !== -1) {
      const oldOut = db.customers[custIdx].outstandingCredit;
      const newOut = Math.max(0, oldOut - pay.amount); // credit reduces outer debt
      db.customers[custIdx].outstandingCredit = newOut;

      const ledgerEntry: CustomerLedgerEntry = {
        id: `cl_pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        customerId: pay.customerId,
        date: pay.paymentDate,
        type: 'credit',
        amount: pay.amount,
        balanceAfter: newOut,
        referenceId: pay.id,
        description: `Settlement via ${pay.paymentMethod.toUpperCase()}: Received payment on ledger account. ${pay.notes ? `(${pay.notes})` : ''}`
      };

      db.customerLedger.unshift(ledgerEntry);
    }

    this.saveDB(db);
  }

  // --- SUPPLIER PAYMENTS (Paying Outstanding Restock) ---
  public static getSupplierPayments(): SupplierPayment[] {
    return this.loadDB().supplierPayments;
  }

  public static getSupplierLedger(supplierId: string): SupplierLedgerEntry[] {
    return this.loadDB().supplierLedger.filter(l => l.supplierId === supplierId);
  }

  public static addSupplierPayment(pay: SupplierPayment): void {
    const db = this.loadDB();
    
    db.supplierPayments.unshift(pay);

    const sIdx = db.suppliers.findIndex(s => s.id === pay.supplierId);
    if (sIdx !== -1) {
      const oldBal = db.suppliers[sIdx].outstandingBalance;
      const newBal = Math.max(0, oldBal - pay.amount); // debit reduces supplier liability
      db.suppliers[sIdx].outstandingBalance = newBal;

      const ledgerEntry: SupplierLedgerEntry = {
        id: `sl_pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        supplierId: pay.supplierId,
        date: pay.paymentDate,
        type: 'debit',
        amount: pay.amount,
        balanceAfter: newBal,
        referenceId: pay.id,
        description: `Paid supplier via ${pay.paymentMethod.toUpperCase()}. ${pay.notes ? `(${pay.notes})` : ''}`
      };

      db.supplierLedger.unshift(ledgerEntry);
    }

    this.saveDB(db);
  }
}
