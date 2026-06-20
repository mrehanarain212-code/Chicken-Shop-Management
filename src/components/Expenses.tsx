import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Trash2, 
  Plus, 
  Info, 
  Skull, 
  Calendar, 
  ShieldAlert, 
  Sparkles,
  Award,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Expense, ExpenseCategory, Product, LocalDB } from '../types';
import { safeConfirm } from '../utils/safeConfirm';

interface ExpensesProps {
  expenses: Expense[];
  products: Product[];
  settings: LocalDB['settings'];
  onExpenseAdded: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function Expenses({
  expenses,
  products,
  settings,
  onExpenseAdded,
  onDeleteExpense
}: ExpensesProps) {
  const { t } = useTranslation();
  // New Expense Log States
  const [category, setCategory] = useState<ExpenseCategory>('feed');
  const [amount, setAmount] = useState('500');
  const [description, setDescription] = useState('');
  const [mortalityKg, setMortalityKg] = useState('3.8');
  const [mortalityCount, setMortalityCount] = useState('2');

  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-calculated mortality rates
  const liveBirdPrice = useMemo(() => {
    const liveBird = products.find(p => p.id === 'p1'); // live chicken
    return liveBird ? liveBird.buyingPricePerKg : 240; // fallback wholesale benchmark
  }, [products]);

  // Adjust default loss value based on mortality weight count
  React.useEffect(() => {
    if (category === 'mortality') {
      const wt = parseFloat(mortalityKg) || 0;
      const computedLoss = wt * liveBirdPrice;
      setAmount(computedLoss.toFixed(0));
      if (!description.startsWith('Bird Mortality:')) {
        setDescription(`Bird Mortality: ${mortalityCount} birds died naturally. Approx ${wt} kg total.`);
      }
    }
  }, [category, mortalityKg, mortalityCount, liveBirdPrice]);

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    setValidationError('');
    if (cat === 'mortality') {
      const wt = parseFloat(mortalityKg) || 3.8;
      const computedLoss = wt * liveBirdPrice;
      setAmount(computedLoss.toFixed(0));
      setDescription(`Bird Mortality: ${mortalityCount} birds died naturally. Approx ${wt} kg total.`);
    } else {
      setAmount('1000');
      setDescription('');
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('Expense cash value must be greater than zero.');
      return;
    }

    if (!description.trim()) {
      setValidationError('Expense description memo is required.');
      return;
    }

    let resolvedMortKg: number | undefined;
    let resolvedMortCnt: number | undefined;

    if (category === 'mortality') {
      resolvedMortKg = parseFloat(mortalityKg);
      resolvedMortCnt = parseInt(mortalityCount);

      if (isNaN(resolvedMortKg) || resolvedMortKg <= 0) {
        setValidationError('Mortality dead bird weight in Kg is invalid');
        return;
      }
      if (isNaN(resolvedMortCnt) || resolvedMortCnt <= 0) {
        setValidationError('Mortality bird headcount is invalid');
        return;
      }

      // Check live stock level before writing down
      const liveBird = products.find(p => p.id === 'p1');
      if (liveBird && liveBird.currentStockKg < resolvedMortKg) {
        const proceedAnyway = safeConfirm(
          `Alert: Mortality weight (${resolvedMortKg} Kg) exceeds your current whole bird stock levels (${liveBird.currentStockKg.toFixed(1)} Kg). Adjust inventory negative anyway?`
        );
        if (!proceedAnyway) return;
      }
    }

    const payload: Expense = {
      id: `exp_${Date.now()}`,
      category,
      amount: amt,
      expenseDate: new Date().toISOString(),
      description: description.trim(),
      mortalityKg: resolvedMortKg,
      mortalityCount: resolvedMortCnt
    };

    try {
      onExpenseAdded(payload);
      
      // Cleanup States
      if (category !== 'mortality') {
        setAmount('500');
        setDescription('');
      } else {
        setCategory('other');
        setAmount('200');
        setDescription('');
      }
      setSuccessMsg(`Logged expenditure of ${settings.currencySymbol}${amt} in system ledger successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setValidationError('Critical operational database failure.');
    }
  };

  const formattedCategoryLabel = (cat: ExpenseCategory) => {
    if (cat === 'mortality') return t('bird_mortality_loss');
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="space-y-6" id="expenses_panel">
      
      {/* Header element */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            {t('shop_outflows_tracking')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('outflow_desc')}
          </p>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5 animate-shake" id="expense_err">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5" id="expense_success">
          <Award className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Grid split logs vs form input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Entry Forms column left */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-655 text-slate-600">{t('register_outflow_receipt')}</h3>

            <form onSubmit={handleAddExpense} className="space-y-4" id="log_expense_form">
              
              {/* Category selector option */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('exp_category')}</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="select_expense_category"
                >
                  <option value="feed">{t('feed_bags')}</option>
                  <option value="rent">{t('shop_rent')}</option>
                  <option value="bills">{t('utility_bills')}</option>
                  <option value="salary">{t('helper_salaries')}</option>
                  <option value="mortality">{t('bird_mortality_loss')}</option>
                  <option value="other">{t('general_other')}</option>
                </select>
              </div>

              {/* Special panel if category is Bird mortality */}
              {category === 'mortality' && (
                <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl space-y-3 animate-fade-in" id="mortality_spec_card">
                  <div className="flex gap-2 items-center text-rose-800 font-bold text-xs uppercase tracking-wide">
                    <Skull className="w-4 h-4 text-rose-500" />
                    {t('live_mortality_logs')}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500">{t('dead_count')}</label>
                      <input 
                        type="number" 
                        value={mortalityCount}
                        onChange={(e) => setMortalityCount(e.target.value)}
                        className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                        id="input_mort_count"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500">{t('total_weight_lost')}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={mortalityKg}
                        onChange={(e) => setMortalityKg(e.target.value)}
                        className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                        id="input_mort_weight"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-rose-700 leading-relaxed font-semibold">
                    * Automated inventory write-off: Deducts {mortalityKg} kg from "Live Chicken" whole bird stock in the system automatically. Live benchmark buying price is {settings.currencySymbol} {liveBirdPrice}/Kg.
                  </p>
                </div>
              )}

              {/* Cash value billing */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('cash_outflow_cost')} ({settings.currencySymbol})</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none"
                  id="input_expense_amt"
                />
              </div>

              {/* Description box */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('memo_notes')}</label>
                <textarea 
                  rows={3}
                  placeholder="Memo details e.g. paid helper salary or electricity voucher details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="input_expense_desc"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-705 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black tracking-widest uppercase rounded-2xl shadow-md transition cursor-pointer text-center"
                id="btn_save_expense"
              >
                {t('log_receipt_outflow')}
              </button>

            </form>

          </div>
        </div>

        {/* History stream list table right */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Historical Expenditure stream</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-2.5">{t('date_time')}</th>
                  <th className="py-2.5">{t('category')}</th>
                  <th className="py-2.5">{t('notes_detail')}</th>
                  <th className="py-2.5 text-right">{t('debit_cost')}</th>
                  <th className="py-2.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-705 text-slate-700">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-3.5 text-slate-500">
                      {new Date(e.expenseDate).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                        e.category === 'feed' ? 'bg-sky-100 border border-sky-200 text-sky-850 text-sky-800' :
                        e.category === 'rent' ? 'bg-purple-100 border border-purple-200 text-purple-850 text-purple-800' :
                        e.category === 'bills' ? 'bg-amber-100 border border-amber-200 text-amber-850 text-amber-800' :
                        e.category === 'salary' ? 'bg-emerald-100 border border-emerald-200 text-emerald-850 text-emerald-800' :
                        e.category === 'mortality' ? 'bg-rose-100 border border-rose-200 text-rose-850 text-rose-800' :
                        'bg-slate-100 border border-slate-200 text-slate-800'
                      }`}>
                        {formattedCategoryLabel(e.category)}
                      </span>
                    </td>
                    <td className="py-3.5 font-medium max-w-[320px] truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900 font-mono">
                      {settings.currencySymbol} {e.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right">
                      {deleteConfirmId === e.id ? (
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => { onDeleteExpense(e.id); setDeleteConfirmId(null); }}
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
                          onClick={() => setDeleteConfirmId(e.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                      {t('no_expenditure_logs')}
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
