import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  User, 
  Check, 
  IndianRupee, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Product, Customer, Sale, SaleItem, LocalDB } from '../types';
import { safeConfirm } from '../utils/safeConfirm';

interface BillingProps {
  products: Product[];
  customers: Customer[];
  settings: LocalDB['settings'];
  onBilled: (sale: Omit<Sale, 'billNumber'>) => Sale;
  onAddCustomer: (cust: Customer) => void;
}

export default function Billing({
  products,
  customers,
  settings,
  onBilled,
  onAddCustomer
}: BillingProps) {
  const { t } = useTranslation();
  // Cart management states
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemWeight, setItemWeight] = useState('2.5');
  const [itemRateOverride, setItemRateOverride] = useState('');

  // Customer registration / links states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [isRegisteringCust, setIsRegisteringCust] = useState(false);

  // Discount / overall transaction billing checkout states
  const [discountVal, setDiscountVal] = useState('0');
  const [paidVal, setPaidVal] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'online' | 'mixed'>('cash');
  const [notes, setNotes] = useState('');

  // Success state: show printed coupon receipt
  const [lastBilledReceipt, setLastBilledReceipt] = useState<Sale | null>(null);
  const [validationError, setValidationError] = useState('');

  // Auto-loaded product rate display helpers
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const activeRate = useMemo(() => {
    if (itemRateOverride !== '') return parseFloat(itemRateOverride) || 0;
    return selectedProduct ? selectedProduct.sellingPricePerKg : 0;
  }, [selectedProduct, itemRateOverride]);

  const activeSubtotal = useMemo(() => {
    const wt = parseFloat(itemWeight) || 0;
    return wt * activeRate;
  }, [itemWeight, activeRate]);

  // Handle setting default rate when product dropdown shifts
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setItemRateOverride(prod.sellingPricePerKg.toString());
      // Suggest default weight based on poultry type (e.g. 2.5kg for whole birds, 1kg for boneless)
      if (prod.id === 'p1') setItemWeight('2.50');
      else if (prod.id === 'p3') setItemWeight('1.00');
      else setItemWeight('1.50');
    } else {
      setItemRateOverride('');
    }
  };

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F1 for Quick Add
      if (event.key === 'F1') {
        event.preventDefault();
        document.getElementById('btn_add_to_cart')?.click();
      }
      // Enter for Checkout (only if not focused on an input/textarea)
      if (event.key === 'Enter') {
        const activeElem = document.activeElement;
        if (activeElem instanceof HTMLInputElement || activeElem instanceof HTMLTextAreaElement) {
          return;
        }
        event.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper for translating product names
  const getDisplayName = (id: string, name: string) => {
    const productNameKeyMap: Record<string, string> = {
      'p1': 'prod_live_chicken',
      'p2': 'prod_cleaned_chicken',
      'p3': 'prod_premium_boneless',
      'p4': 'prod_chicken_wings',
      'p5': 'prod_leg_quarters',
    };
    return productNameKeyMap[id] ? t(productNameKeyMap[id]) : name;
  };

  // Add Item to active basket cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedProductId) {
      setValidationError(t('msg_select_product'));
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) {
      setValidationError(t('msg_product_not_found'));
      return;
    }

    const weightNum = parseFloat(itemWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setValidationError(t('msg_weight_gt_zero'));
      toast.error(t('msg_weight_gt_zero'));
      return;
    }

    // Live Stock constraint validation warning
    if (prod.currentStockKg < weightNum) {
      const wantToProceed = safeConfirm(
        t('msg_stock_warning', { stock: prod.currentStockKg.toFixed(2), name: prod.name, weight: weightNum.toFixed(2) })
      );
      if (!wantToProceed) return;
    }

    const newItem: SaleItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      productId: prod.id,
      productName: prod.name,
      weightKg: weightNum,
      ratePerKg: activeRate,
      total: weightNum * activeRate
    };

    // Check if product is already in basket, collapse to single record
    const existsIdx = cart.findIndex(item => item.productId === newItem.productId && item.ratePerKg === newItem.ratePerKg);
    if (existsIdx !== -1) {
      const updated = [...cart];
      updated[existsIdx].weightKg += newItem.weightKg;
      updated[existsIdx].total += newItem.total;
      setCart(updated);
    } else {
      setCart([...cart, newItem]);
    }

    // Reset single item fields
    setSelectedProductId('');
    setItemRateOverride('');
    setItemWeight('2.5');
  };

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Pricing calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const discAmount = useMemo(() => {
    return parseFloat(discountVal) || 0;
  }, [discountVal]);

  const netAmount = useMemo(() => {
    return Math.max(0, cartSubtotal - discAmount);
  }, [cartSubtotal, discAmount]);

  // Watch payments adjustment based on billing methods
  React.useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'online') {
      setPaidVal(netAmount.toFixed(0));
    } else if (paymentMethod === 'credit') {
      setPaidVal('0');
    }
  }, [paymentMethod, netAmount]);

  const finalPaid = useMemo(() => {
    return parseFloat(paidVal) || 0;
  }, [paidVal]);

  const creditAmount = useMemo(() => {
    return Math.max(0, netAmount - finalPaid);
  }, [netAmount, finalPaid]);

  // Create on-the-fly credit ledger customer
  const handleAddNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!newCustName.trim()) {
      setValidationError(t('msg_cust_name_blank'));
      return;
    }

    const newCust: Customer = {
      id: `c_gen_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || 'No Phone',
      outstandingCredit: 0,
      createdAt: new Date().toISOString()
    };

    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setIsRegisteringCust(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Commit POS checkout sale transaction
  const handleCheckout = () => {
    setValidationError('');

    if (cart.length === 0) {
      setValidationError(t('msg_cart_empty'));
      return;
    }

    // Under credit/Mixed models, we require a registered ledger customer mapped
    if ((paymentMethod === 'credit' || paymentMethod === 'mixed') && selectedCustomerId === 'walkin') {
      setValidationError(t('msg_credit_requires_cust'));
      return;
    }

    // Validation checks for rates
    if (finalPaid > netAmount) {
      setValidationError(t('msg_paid_exceeds_net'));
      return;
    }

    const currentCustomer = customers.find(c => c.id === selectedCustomerId);
    const resolvedCustomerName = currentCustomer ? currentCustomer.name : t('walkin_customer');

    const newSale: Omit<Sale, 'billNumber'> = {
      id: `sale_${Date.now()}`,
      customerId: selectedCustomerId === 'walkin' ? null : selectedCustomerId,
      customerName: resolvedCustomerName,
      items: cart,
      totalAmount: cartSubtotal,
      discountAmount: discAmount,
      netAmount,
      paidAmount: finalPaid,
      creditAmount,
      paymentMethod,
      saleDate: new Date().toISOString(),
      notes: notes.trim()
    };

    try {
      // Stock alert check
      cart.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const remaining = prod.currentStockKg - item.weightKg;
          if (remaining < 5) {
            toast.error(t('low_stock_threshold_alert', { 
              name: getDisplayName(prod.id, prod.name), 
              remaining: remaining.toFixed(2) 
            }));
          }
        }
      });

      const completedInvoice = onBilled(newSale);
      setLastBilledReceipt(completedInvoice);
      
      // Clear cart state
      setCart([]);
      setDiscountVal('0');
      setPaidVal('0');
      setPaymentMethod('cash');
      setNotes('');
      // Set customer back to default walkin
      setSelectedCustomerId('walkin');
    } catch (e) {
      setValidationError(t('msg_critical_failure'));
    }
  };

  return (
    <div className="space-y-6" id="billing_panel">
      
      {/* Header title */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-500" />
            {t('pos_cashier_register')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('pos_description')}
          </p>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5 animate-shake" id="billing_err">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {/* Main Grid: split billing cart build on left, checkout tally on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Cart Builder */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Quick-add item widget form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              {t('poultry_portions')}
            </h3>

            <form onSubmit={handleAddToCart} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              
              {/* Product choice dropdown */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('choose_stock')}</label>
                <select 
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="select_billing_product"
                >
                  <option value="">{t('choose_stock_placeholder')}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {getDisplayName(p.id, p.name)} ({p.currentStockKg.toFixed(1)} {t('kg')} {t('stock')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Precise weight weightKg inside shop */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('weight_kg')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={itemWeight}
                    onChange={(e) => setItemWeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-8 text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    id="input_billing_weight"
                  />
                  <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 uppercase font-black tracking-wide">Kg</span>
                </div>
              </div>

              {/* Rate Per Kg (with custom local overrides support) */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('rate_kg')} ({settings.currencySymbol})</label>
                <input 
                  type="number" 
                  step="0.5" 
                  placeholder="0.0"
                  value={itemRateOverride}
                  onChange={(e) => setItemRateOverride(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="input_billing_rate"
                />
              </div>

              {/* Quick Submit click */}
              <div className="sm:col-span-2">
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1 cursor-pointer"
                  id="btn_add_to_cart"
                >
                  <Plus className="w-4 h-4" /> {t('add_to_cart')}
                </button>
              </div>

            </form>

            {/* Micro layout display live rate total math */}
            {selectedProduct && (
              <div className="bg-slate-50 text-slate-600 rounded-xl px-3 py-2 text-[11px] flex justify-between items-center font-medium border border-slate-100">
                <span>{t('calculated_line_subtotal')}</span>
                <span className="font-mono font-black text-slate-800">
                  {itemWeight || '0'} Kg x {settings.currencySymbol}{activeRate}/Kg = <strong className="text-indigo-600">{settings.currencySymbol} {activeSubtotal.toFixed(2)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Active Shopping items cart table list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>{t('checkout_basket')}</span>
              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{cart.length} unique SKU items</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-2.5">{t('meat_portion_name')}</th>
                    <th className="py-2.5 text-right">{t('net_weight')}</th>
                    <th className="py-2.5 text-right">{t('selling_rate')}</th>
                    <th className="py-2.5 text-right">{t('price_total')}</th>
                    <th className="py-2.5 text-right">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-55 divide-slate-100 text-xs">
                  {cart.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20">
                      <td className="py-3 font-semibold text-slate-800">{getDisplayName(item.productId, item.productName)}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-600">{item.weightKg.toFixed(2)} Kg</td>
                      <td className="py-3 text-right text-slate-500 font-mono">{settings.currencySymbol} {item.ratePerKg.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-slate-800 font-mono">{settings.currencySymbol} {item.total.toFixed(0)}</td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 italic font-medium leading-relaxed">
                        {t('no_items')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-500">{t('cart_subtotal')}</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {settings.currencySymbol} {cartSubtotal.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Invoice Customer Ledger & Payment settlement */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Customer Association and Direct Registration box */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('customer_link')}</h3>
              <button 
                type="button"
                onClick={() => setIsRegisteringCust(!isRegisteringCust)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isRegisteringCust ? t('select_ledger') : t('new_client')}
              </button>
            </div>

            {isRegisteringCust ? (
              <form onSubmit={handleAddNewCustomer} className="space-y-3 bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-indigo-700">Quick-Register Credit Account</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500">{t('client_name')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Madina Caterers"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-lg p-2 text-xs focus:outline-none"
                      id="input_cust_reg_name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500">{t('mobile_phone')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 03xx-xxxxxxx"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsRegisteringCust(false)}
                    className="px-2.5 py-1.5 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    id="btn_save_reg_customer"
                  >
                    Create Ledger
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Attached Account</label>
                <select 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="select_billing_customer"
                >
                  <option value="walkin">Walk-in Customer (Instant Cash)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.outstandingCredit > 0 ? `(Udhaar: ${settings.currencySymbol}${c.outstandingCredit})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Payment breakdown and collection summary box */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('checkout_bill_total')}</h3>

            <div className="space-y-3.5 divide-y divide-slate-100">
              
              {/* Promotional Discount rate */}
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-semibold text-slate-500">{t('promotions_discount')} ({settings.currencySymbol})</span>
                <input 
                  type="number" 
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right w-24 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_billing_discount"
                />
              </div>

              {/* Net Payable block */}
              <div className="flex justify-between items-center py-3.5 font-sans">
                <span className="text-xs font-extrabold text-slate-700 uppercase">{t('grand_net_amount')}</span>
                <span className="text-xl font-black text-indigo-650 font-mono text-indigo-600">
                  {settings.currencySymbol} {netAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Select method */}
              <div className="space-y-2 py-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{t('payment_terms')}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['cash', 'online', 'credit', 'mixed'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-xl tracking-wide uppercase transition border cursor-pointer text-center ${
                        paymentMethod === method 
                        ? 'bg-indigo-650 text-white bg-indigo-600 border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      id={`btn_pay_method_${method}`}
                    >
                      {method === 'credit' ? t('method_udhaar') : method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash amount physically collected in shop drawer */}
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-semibold text-slate-500"> {t('amount_paid')} ({settings.currencySymbol})</span>
                <input 
                  type="number" 
                  value={paidVal}
                  disabled={paymentMethod === 'cash' || paymentMethod === 'online' || paymentMethod === 'credit'}
                  onChange={(e) => setPaidVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right w-24 text-xs font-mono font-bold disabled:opacity-50 disabled:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_billing_paid"
                />
              </div>

              {/* Remaining Udhaar Debt debit to ledger */}
              {creditAmount > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    {t('ledger_debit')}
                  </span>
                  <span className="font-black font-mono">
                    {settings.currencySymbol} {creditAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Operational / Dispatch Notes */}
              <div className="space-y-1.5 py-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('transaction_memo')}</label>
                <textarea 
                  rows={2}
                  placeholder={t('memo_placeholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

            </div>

            {/* Commit Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all hover:scale-[1.01] active:scale-95 disabled:pointer-events-none cursor-pointer text-center"
              id="btn_commit_checkout"
            >
              {t('commit_checkout')}
            </button>
          </div>

        </div>

      </div>

      {/* Success Receipt voucher Modal print layout component */}
      {lastBilledReceipt && (
        <div className="bg-slate-900/60 inset-0 fixed flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm" id="receipt_modal_container">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-100 mb-3">
              <span className="text-xs font-extrabold text-indigo-600 uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Invoice Billed Successfully
              </span>
              <button 
                onClick={() => setLastBilledReceipt(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 p-1 bg-slate-100 rounded-lg cursor-pointer"
              >
                Close Ticket
              </button>
            </div>

            {/* Printed Voucher Paper Area */}
            <div 
              className="flex-1 overflow-y-auto p-4 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-800 font-mono text-[11px] space-y-4 shadow-inner" 
              id="bill_receipt_paper"
            >
              
              {/* Brand Center */}
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">{settings.shopName}</h4>
                <p className="text-[9px] text-slate-500 leading-snug">{settings.shopAddress}</p>
                <p className="text-[9px] text-slate-400">{settings.shopPhone}</p>
              </div>

              {/* Receipt metadata */}
              <div className="border-y border-dashed border-slate-350 border-slate-300 py-2.5 space-y-1 text-slate-600 text-[10px]">
                <div className="flex justify-between">
                  <span>{t('bill_voucher')}:</span>
                  <strong className="text-slate-900">{lastBilledReceipt.billNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('date_time_receipt')}:</span>
                  <span>{new Date(lastBilledReceipt.saleDate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('customer_receipt')}:</span>
                  <span className="font-bold text-slate-900">{lastBilledReceipt.customerName}</span>
                </div>
                {lastBilledReceipt.notes && (
                  <div className="text-slate-400 italic">
                    {t('note_label')}: {lastBilledReceipt.notes}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold border-b border-dashed pb-1">
                  <span>ITEM PORTION (Kg)</span>
                  <span>RATE</span>
                  <span>TOTAL</span>
                </div>
                {lastBilledReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                    <span>{getDisplayName(item.productId, item.productName).substring(0, 18)} ({item.weightKg.toFixed(2)} {t('kg')})</span>
                    <span>{item.ratePerKg}</span>
                    <span className="font-bold">{settings.currencySymbol}{item.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Totals math */}
              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1.5 text-right font-semibold">
                <div className="flex justify-between">
                  <span>{t('gross_sub')}:</span>
                  <span>{settings.currencySymbol} {lastBilledReceipt.totalAmount.toLocaleString()}</span>
                </div>
                {lastBilledReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('official_disc')}:</span>
                    <span>-{settings.currencySymbol} {lastBilledReceipt.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-y border-dashed py-1.5">
                  <span className="text-slate-900">{t('net_bill_amount')}:</span>
                  <span className="text-indigo-600">{settings.currencySymbol} {lastBilledReceipt.netAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('cash_disbursal_paid')}:</span>
                  <span>{settings.currencySymbol} {lastBilledReceipt.paidAmount.toLocaleString()}</span>
                </div>
                {lastBilledReceipt.creditAmount > 0 ? (
                  <div className="flex justify-between text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded">
                    <span>{t('udhaar_carried')}:</span>
                    <span>{settings.currencySymbol} {lastBilledReceipt.creditAmount.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-600 font-medium">{t('fully_settled')}</div>
                )}
              </div>

              {/* JazakAllah / Islamic Thank You Retail Footer */}
              <div className="text-center pt-2.5 text-[9px] text-slate-455 text-slate-500 leading-relaxed border-t border-dashed border-slate-300">
                <p className="font-bold text-slate-700 uppercase">Jazak'Allah Khair &bull; Thank You!</p>
                <p className="italic">Software by Duck ERP systems Solutions.</p>
              </div>

            </div>

            {/* Print and complete controls */}
            <div className="grid grid-cols-2 gap-2 mt-4 font-sans">
              <button 
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 border border-slate-300 text-slate-655 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn_print_receipt"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Web Print
              </button>
              <button 
                onClick={() => setLastBilledReceipt(null)}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black text-center cursor-pointer"
                id="btn_finish_receipt"
              >
                Close Ticket
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
