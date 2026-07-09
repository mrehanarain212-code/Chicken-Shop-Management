import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  DollarSign,
  Briefcase,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  Customer, 
  Supplier, 
  CustomerPayment, 
  SupplierPayment, 
  CustomerLedgerEntry, 
  SupplierLedgerEntry, 
  LocalDB 
} from '../types';
import { safeConfirm } from '../utils/safeConfirm';
import EmptyState from './EmptyState';

interface LedgerProps {
  customers: Customer[];
  suppliers: Supplier[];
  customerLedger: CustomerLedgerEntry[];
  supplierLedger: SupplierLedgerEntry[];
  settings: LocalDB['settings'];
  onCustomerPayment: (pay: CustomerPayment) => void;
  onSupplierPayment: (pay: SupplierPayment) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function Ledger({
  customers,
  suppliers,
  customerLedger,
  supplierLedger,
  settings,
  onCustomerPayment,
  onSupplierPayment,
  onDeleteCustomer
}: LedgerProps) {
  const { t } = useTranslation();
  // Navigation tabs: Customers Ledger Accounts vs Suppliers Payables
  const [activeSegment, setActiveSegment] = useState<'customers' | 'suppliers'>('customers');
  
  // Selection states for deeper ledger history reports
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Search parameters
  const [custSearch, setCustSearch] = useState('');
  const [supSearch, setSupSearch] = useState('');

  // Payment Settlement Dialog Dialogs
  const [isPayingCustomer, setIsPayingCustomer] = useState(false);
  const [isPayingSupplier, setIsPayingSupplier] = useState(false);

  // Local Payment Inputs
  const [payAmount, setPayAmount] = useState('1000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Computations
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
    c.phone.includes(custSearch)
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supSearch.toLowerCase()) || 
    s.phone.includes(supSearch)
  );

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const activeSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Filter specific ledger lists sorted chronological
  const activeCustLedger = customerLedger
    .filter(l => l.customerId === selectedCustomerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeSuppLedger = supplierLedger
    .filter(l => l.supplierId === selectedSupplierId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle Customer payment submission
  const handleSubmitCustomerPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!selectedCustomerId || !activeCustomer) {
      setValidationError(t('val_select_cust_ledger'));
      return;
    }

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError(t('val_pay_positive'));
      return;
    }

    if (amt > activeCustomer.outstandingCredit) {
      const wantToOverpay = safeConfirm(
        t('warn_overpay', { owed: activeCustomer.outstandingCredit, amt: amt })
      );
      if (!wantToProceedPayment(wantToOverpay)) return;
    }

    const payload: CustomerPayment = {
      id: `cpay_${Date.now()}`,
      customerId: selectedCustomerId,
      customerName: activeCustomer.name,
      amount: amt,
      paymentMethod,
      paymentDate: new Date().toISOString(),
      notes: payNotes.trim()
    };

    try {
      onCustomerPayment(payload);
      setIsPayingCustomer(false);
      setPayAmount('1000');
      setPayNotes('');
      setSuccessMsg(t('Successfully logged payment of Rs.{{amt}} from {{name}}!', { amt: amt, name: activeCustomer.name }));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setValidationError(t('val_rec_payment_err'));
    }
  };

  // Helper safety check block
  const wantToProceedPayment = (decision: boolean) => decision;

  // Handle Supplier payout submission
  const handleSubmitSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!selectedSupplierId || !activeSupplier) {
      setValidationError(t('val_select_supp_card'));
      return;
    }

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError(t('val_payout_positive'));
      return;
    }

    if (amt > activeSupplier.outstandingBalance) {
      const wantToOverpay = safeConfirm(
        t('warn_overpayout', { owed: activeSupplier.outstandingBalance, amt: amt })
      );
      if (!wantToProceedPayment(wantToOverpay)) return;
    }

    const payload: SupplierPayment = {
      id: `spay_${Date.now()}`,
      supplierId: selectedSupplierId,
      supplierName: activeSupplier.name,
      amount: amt,
      paymentMethod,
      paymentDate: new Date().toISOString(),
      notes: payNotes.trim()
    };

    try {
      onSupplierPayment(payload);
      setIsPayingSupplier(false);
      setPayAmount('1000');
      setPayNotes('');
      setSuccessMsg(t('Successfully logged payout of Rs.{{amt}} to {{name}}!', { amt: amt, name: activeSupplier.name }));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setValidationError(t('val_rec_payout_err'));
    }
  };

  return (
    <div className="space-y-6" id="ledger_panel">
      
      {/* Structural layout Segment Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            {t('ledger_balances_accounts')}
          </h2>
          <p className="text-xs text-slate-505 text-slate-500 mt-1">
            {t('ledger_desc')}
          </p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50 self-stretch sm:self-auto">
          <button
            onClick={() => {
              setActiveSegment('customers');
              setSelectedCustomerId(null);
              setIsPayingCustomer(false);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition cursor-pointer flex-1 sm:flex-none ${
              activeSegment === 'customers' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn_segment_cust"
          >
            {t('cust_udhaar_ledger')}
          </button>
          <button
            onClick={() => {
              setActiveSegment('suppliers');
              setSelectedSupplierId(null);
              setIsPayingSupplier(false);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition cursor-pointer flex-1 sm:flex-none ${
              activeSegment === 'suppliers' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
            }`}
            id="btn_segment_supp"
          >
            {t('supp_payables_ledger')}
          </button>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5" id="ledger_err">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5" id="ledger_success">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Segment Content customer Udhaar Ledger Accounts */}
      {activeSegment === 'customers' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Customers search and table list left */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-655 text-slate-600">{t('reg_ledger_acc')}</h3>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{customers.length} {t('total')}</span>
            </div>

            {/* Look up input bar */}
            <div className="relative">
              <input 
                type="text" 
                placeholder={t('search_name_phone')}
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* List Stream grid */}
            <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1 scrollbar-mini">
              {filteredCustomers.map(c => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setIsPayingCustomer(false);
                    }}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${
                      isSelected 
                      ? 'bg-indigo-50/50 border-indigo-205 border-indigo-300' 
                      : 'bg-white hover:bg-slate-50 border-slate-100'
                    }`}
                    id={`cust_card_${c.id}`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-455 text-slate-400 font-mono">Mob: {c.phone}</div>
                    </div>
                    {/* Amount owed tag */}
                    <div className="text-right flex items-center justify-end gap-3">
                      <div>
                        <div className={`font-black font-mono text-[13px] ${c.outstandingCredit > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {settings.currencySymbol} {c.outstandingCredit.toLocaleString()}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Udhaar Debt</div>
                      </div>
                      
                      {deleteConfirmId === c.id ? (
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteCustomer(c.id); setDeleteConfirmId(null); }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[9px] font-bold"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredCustomers.length === 0 && (
                <EmptyState message={t('no_registered_ledger')} />
              )}
            </div>
          </div>

          {/* Customer history logs detail tracer panel right */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5" id="cust_detail_view">
            {activeCustomer ? (
              <div className="space-y-5">
                
                {/* Panel action heading card header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-50 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{activeCustomer.name}</h3>
                    <p className="text-[10px] text-slate-455 mt-0.5 text-slate-400">Registered date: {new Date(activeCustomer.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPayingCustomer(!isPayingCustomer)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1"
                      id="btn_receive_payout"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Receive Cash Ledger Payment
                    </button>
                  </div>
                </div>

                {/* Submitting Payment slip Form */}
                {isPayingCustomer && (
                  <form onSubmit={handleSubmitCustomerPayment} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4 animate-fade-in" id="pay_settlement_form">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">New Payment Settlement Voucher</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Paid Cash Amount Received ({settings.currencySymbol})</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          id="input_settlement_amt"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Settled Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online')}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                          id="select_settlement_method"
                        >
                          <option value="cash">Cash Drawer (Currency Note)</option>
                          <option value="online">Online / GPay Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-550 block text-slate-500">Receipt Notes / Comments</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cleared bill BILL-1001 debit accounts"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setIsPayingCustomer(false)}
                        className="px-3.5 py-1.5 border border-slate-300 text-slate-600 bg-white hover:bg-slate-100 text-xs rounded-xl font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                        id="btn_submit_settlement"
                      >
                        Log Payment Receipt
                      </button>
                    </div>
                  </form>
                )}

                {/* Ledger Historical running Statements trace table */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-505 text-slate-500 flex items-center gap-1">
                    <History className="w-4 h-4" /> {t('ledger_statements_trans')}
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          <th className="py-2.5">{t('date_time')}</th>
                          <th className="py-2.5">{t('stmt_memo_entries')}</th>
                          <th className="py-2.5 text-right">{t('debit_udhaar')}</th>
                          <th className="py-2.5 text-right">{t('credit_paid')}</th>
                          <th className="py-2.5 text-right">{t('owe_balance')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {activeCustLedger.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/20 text-slate-700">
                            <td className="py-3 text-slate-500 font-mono text-[10px]">
                              {new Date(l.date).toLocaleString()}
                            </td>
                            <td className="py-3 font-medium text-slate-700 max-w-[200px] truncate" title={l.description}>
                              {l.description}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-rose-600">
                              {l.type === 'debit' ? `+${settings.currencySymbol}${l.amount.toFixed(0)}` : ''}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-600">
                              {l.type === 'credit' ? `-${settings.currencySymbol}${l.amount.toFixed(0)}` : ''}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-slate-900">
                              {settings.currencySymbol} {l.balanceAfter.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                        {activeCustLedger.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                              This ledger account has no debt or payment history records yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center space-y-2 text-slate-400 italic font-medium" id="noselect_ledger">
                <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs">Choose a customer payment credit account card on the left to review historical statements.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Segment Suppliers segment accounts */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Suppliers left */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{t('comm_farms_acc')}</h3>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{suppliers.length} total</span>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder={t('search_broiler_suppliers')}
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1 scrollbar-mini">
              {filteredSuppliers.map(s => {
                const isSelected = selectedSupplierId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSupplierId(s.id);
                      setIsPayingSupplier(false);
                    }}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${
                      isSelected 
                      ? 'bg-indigo-50/50 border-indigo-205 border-indigo-300' 
                      : 'bg-white hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-medium">Mob: {s.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black font-mono text-[13px] ${s.outstandingBalance > 0 ? 'text-indigo-600' : 'text-slate-405'}`}>
                        {settings.currencySymbol} {s.outstandingBalance.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-400">Total Debt</div>
                    </div>
                  </div>
                );
              })}
              {filteredSuppliers.length === 0 && (
                <EmptyState message={t('no_breeding_vendors')} />
              )}
            </div>
          </div>

          {/* Supplier right */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
            {activeSupplier ? (
              <div className="space-y-5">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-55 pb-4 border-slate-50">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{activeSupplier.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Vendors account creation: {new Date(activeSupplier.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPayingSupplier(!isPayingSupplier)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Log Supplier Settlement Payout
                    </button>
                  </div>
                </div>

                {isPayingSupplier && (
                  <form onSubmit={handleSubmitSupplierPayment} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-fade-in">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-800">New Supplier Settlement Payout Slip</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Cash Paid out ({settings.currencySymbol})</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Paid Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online')}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                        >
                          <option value="cash">Cash Outflow from Drawer</option>
                          <option value="online">Online Banking / Mob Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Expenditure Reference Comments</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Settlement for cargo intake cargo"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setIsPayingSupplier(false)}
                        className="px-3.5 py-1.5 border border-slate-300 text-slate-600 bg-white hover:bg-slate-100 text-xs rounded-xl font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Confirm Cash Payout
                      </button>
                    </div>
                  </form>
                )}

                {/* Ledger Trace statement */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <History className="w-4 h-4" /> Supplier Cargo Account Statement Actions
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          <th className="py-2.5">Date &amp; Time</th>
                          <th className="py-2.5">Cargo Statement Log Entries / Memo</th>
                          <th className="py-2.5 text-right">Debited (Paid Out)</th>
                          <th className="py-2.5 text-right">Credited (Restocks)</th>
                          <th className="py-2.5 text-right">Owe Balances</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {activeSuppLedger.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/20">
                            <td className="py-3 text-slate-500 font-mono text-[10px]">
                              {new Date(l.date).toLocaleString()}
                            </td>
                            <td className="py-3 font-medium text-slate-850 max-w-[200px] truncate" title={l.description}>
                              {l.description}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-600">
                              {l.type === 'debit' ? `${settings.currencySymbol}${l.amount.toFixed(0)}` : ''}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-indigo-600">
                              {l.type === 'credit' ? `${settings.currencySymbol}${l.amount.toFixed(0)}` : ''}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold text-slate-900">
                              {settings.currencySymbol} {l.balanceAfter.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                        {activeSuppLedger.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-405 italic">
                              {t('no_supp_ledger_history')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center space-y-2 text-slate-400 italic font-medium">
                <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs">{t('supp_select_placeholder')}</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
