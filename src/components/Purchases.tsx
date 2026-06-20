import React, { useState, useMemo } from 'react';
import { 
  Layers3, 
  Plus, 
  Trash2, 
  User, 
  ArrowDownLeft, 
  Package, 
  ShieldAlert, 
  Coins,
  History,
  AlertCircle
} from 'lucide-react';
import { Product, Supplier, Purchase, LocalDB } from '../types';
import { useTranslation } from 'react-i18next';

interface PurchasesProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  settings: LocalDB['settings'];
  onPurchaseAdded: (purchase: Purchase) => void;
  onAddSupplier: (sup: Supplier) => void;
  onDeletePurchase: (id: string) => void;
}

export default function Purchases({
  purchases,
  products,
  suppliers,
  settings,
  onPurchaseAdded,
  onAddSupplier,
  onDeletePurchase
}: PurchasesProps) {
  const { t } = useTranslation();
  // New Procurement States
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [procWeight, setProcWeight] = useState('100');
  const [procRate, setProcRate] = useState('240');
  const [paidAmt, setPaidAmt] = useState('0');
  const [notes, setNotes] = useState('');

  // New Supplier Quick Dialog State
  const [isRegisteringSupplier, setIsRegisteringSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Procurement Math computation live display
  const totalAmount = useMemo(() => {
    const wt = parseFloat(procWeight) || 0;
    const rate = parseFloat(procRate) || 0;
    return wt * rate;
  }, [procWeight, procRate]);

  const creditAmount = useMemo(() => {
    const paid = parseFloat(paidAmt) || 0;
    return Math.max(0, totalAmount - paid);
  }, [totalAmount, paidAmt]);

  // Adjust default values based on selected product cost rate index
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setProcRate(prod.buyingPricePerKg.toString());
    }
  };

  // Add new Supplier ledger accounts
  const handleRegisterSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!newSupName.trim()) {
      setValidationError(t('supplier_name_required'));
      return;
    }

    const newSup: Supplier = {
      id: `s_gen_${Date.now()}`,
      name: newSupName.trim(),
      phone: newSupPhone.trim() || 'No Phone',
      outstandingBalance: 0,
      createdAt: new Date().toISOString()
    };

    onAddSupplier(newSup);
    setSelectedSupplierId(newSup.id);
    setIsRegisteringSupplier(false);
    setNewSupName('');
    setNewSupPhone('');
    setSuccessMsg(t('supplier_registered_success'));
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Submit Restock Procurement Purchase
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!selectedSupplierId) {
      setValidationError(t('please_select_farm'));
      return;
    }
    if (!selectedProductId) {
      setValidationError(t('please_select_product'));
      return;
    }

    const weightNum = parseFloat(procWeight);
    const rateNum = parseFloat(procRate);
    const paidNum = parseFloat(paidAmt);

    if (isNaN(weightNum) || weightNum <= 0) {
      setValidationError(t('weight_greater_than_zero'));
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      setValidationError(t('rate_greater_than_zero'));
      return;
    }
    if (isNaN(paidNum) || paidNum < 0) {
      setValidationError(t('invalid_paid_amount'));
      return;
    }
    if (paidNum > totalAmount) {
      setValidationError(t('paid_exceeds_total'));
      return;
    }

    const targetProduct = products.find(p => p.id === selectedProductId);
    const targetSupplier = suppliers.find(s => s.id === selectedSupplierId);

    if (!targetProduct || !targetSupplier) {
      setValidationError(t('mismatch_identifiers'));
      return;
    }

    const purchaseRec: Purchase = {
      id: `pur_${Date.now()}`,
      supplierId: selectedSupplierId,
      supplierName: targetSupplier.name,
      productId: selectedProductId,
      productName: targetProduct.name,
      weightKg: weightNum,
      ratePerKg: rateNum,
      totalAmount,
      paidAmount: paidNum,
      creditAmount,
      purchaseDate: new Date().toISOString(),
      notes: notes.trim()
    };

    try {
      onPurchaseAdded(purchaseRec);
      
      // Clear forms
      setSelectedProductId('');
      setProcWeight('100');
      setProcRate('240');
      setPaidAmt('0');
      setNotes('');
      setSuccessMsg(t('restocked_success'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setValidationError(t('operational_failure'));
    }
  };

  return (
    <div className="space-y-6" id="purchases_panel">
      
      {/* Upper header summary */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            {t('poultry_procurement_restock')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('procurement_desc')}
          </p>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5 animate-shake" id="purchase_err">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5" id="purchase_success">
          <div className="bg-emerald-100 p-1 text-emerald-700 rounded-md">
            <CoinIndicator />
          </div>
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Dynamic Grid Form vs History list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Restocking Cargo Intake form left */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('cargo_intake_bill')}</h3>
              <button
                type="button"
                onClick={() => setIsRegisteringSupplier(!isRegisteringSupplier)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
              >
                {isRegisteringSupplier ? t('cancel') : t('new_supplier')}
              </button>
            </div>

            {isRegisteringSupplier ? (
              <form onSubmit={handleRegisterSupplier} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">{t('quick_register_farm')}</h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">{t('farm_name_provider')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Al-Noor Breeding Ltd"
                      value={newSupName}
                      onChange={(e) => setNewSupName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">{t('supplier_phone')}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0345-xxxxxxx"
                      value={newSupPhone}
                      onChange={(e) => setNewSupPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button 
                    type="button"
                    onClick={() => setIsRegisteringSupplier(false)}
                    className="px-2 py-1 text-[9px] text-slate-500 bg-white border border-slate-200 rounded-md cursor-pointer"
                  >
                    {t('back')}
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1 text-[9px] text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-bold cursor-pointer"
                  >
                    {t('save_farm')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitPurchase} className="space-y-4" id="submit_proc_form">
                
                {/* Farmer Supplier choices */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('breeding_provider_farm')}</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    id="select_proc_supplier"
                  >
                    <option value="">{t('choose_farm_placeholder')}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.outstandingBalance > 0 ? `(We owe: ${settings.currencySymbol}${s.outstandingBalance})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU product choices */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('poultry_item_portion_restocked')}</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    id="select_proc_product"
                  >
                    <option value="">{t('choose_inventory_sku')}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weight kilograms inside cargo truck */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('cargo_weight_kg')}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={procWeight}
                        onChange={(e) => setProcWeight(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        id="input_proc_weight"
                      />
                      <span className="absolute right-2 top-3 text-[10px] text-slate-400 uppercase font-black">{t('kg')}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('cost_rate_kg')}</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="0"
                        value={procRate}
                        onChange={(e) => setProcRate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none"
                        id="input_proc_rate"
                      />
                    </div>
                  </div>
                </div>

                {/* Net invoice summary billing */}
                <div className="bg-slate-50 border border-slate-200/50 p-3.5 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-650">
                    <span className="font-semibold text-slate-500">{t('gross_cargo_total')}</span>
                    <strong className="font-mono text-slate-900">{settings.currencySymbol} {totalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between items-center text-rose-600 bg-white border border-rose-100 px-2 py-1.5 rounded-lg text-[11px] font-semibold mt-1">
                    <span className="flex items-center gap-0.5">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> {t('credit_debt_liability')}
                    </span>
                    <strong className="font-mono">{settings.currencySymbol} {creditAmount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Paid amount layout */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('paid_instant_cash')} ({settings.currencySymbol})</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={paidAmt}
                    onChange={(e) => setPaidAmt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none"
                    id="input_proc_paid"
                  />
                  <span className="text-[9px] text-slate-400 italic font-medium block">
                    {t('unpaid_debt_note')}
                  </span>
                </div>

                {/* Details note memo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('intake_logs_notes')}</label>
                  <textarea 
                    rows={2}
                    placeholder={t('intake_logs_placeholder')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black tracking-widest uppercase rounded-2xl shadow-md transition cursor-pointer text-center"
                  id="btn_commit_purchase"
                >
                  {t('confirm_cargo_intake')}
                </button>

              </form>
            )}

          </div>
        </div>

        {/* History Stream List right */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-650 text-slate-600 flex items-center justify-between">
            <span>{t('cargo_restocking_history')}</span>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <History className="w-3.5 h-3.5" /> {t('live_log')}
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-2.5">{t('date_time')}</th>
                  <th className="py-2.5">{t('supplier_farm')}</th>
                  <th className="py-2.5">{t('portion_cargo')}</th>
                  <th className="py-2.5 text-right font-mono">{t('weight_kg')}</th>
                  <th className="py-2.5 text-right font-mono">{t('cost_invoice')}</th>
                  <th className="py-2.5 text-right text-emerald-600">{t('paid_cash')}</th>
                  <th className="py-2.5 text-right text-rose-500">{t('credit_debt')}</th>
                  <th className="py-2.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-3.5 text-slate-500">
                      {new Date(pur.purchaseDate).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 font-semibold text-slate-800">{pur.supplierName}</td>
                    <td className="py-3.5 font-semibold text-indigo-800">{pur.productName}</td>
                    <td className="py-3.5 text-right font-mono text-slate-600">{pur.weightKg.toFixed(1)} {t('kg')}</td>
                    <td className="py-3.5 text-right font-black text-slate-900">{settings.currencySymbol} {pur.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-right font-semibold text-emerald-600">{settings.currencySymbol} {pur.paidAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-right font-semibold text-rose-600 font-bold">{pur.creditAmount > 0 ? `${settings.currencySymbol} ${pur.creditAmount.toLocaleString('en-IN')}` : t('settled')}</td>
                    <td className="py-3.5 text-right">
                      {deleteConfirmId === pur.id ? (
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { onDeletePurchase(pur.id); setDeleteConfirmId(null); }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                          >
                            Delete
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(pur.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 italic font-medium leading-relaxed">
                      {t('no_procurement_data')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

// Micro icons inline definitions
function CoinIndicator() {
  return (
    <svg className="w-4.5 h-4.5 text-emerald-500 fill-current" viewBox="0 0 24 24">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V8H9V10H11V14H8V16H11V18H13V16H15v-2H13V10H16V8F13V6" />
    </svg>
  );
}
