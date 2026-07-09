import React, { useState } from 'react';
import { 
  Scale, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Percent, 
  ArrowRight, 
  AlertCircle,
  TrendingUp,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Product, LocalDB } from '../types';

interface InventoryProps {
  products: Product[];
  settings: LocalDB['settings'];
  onSaveProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export default function Inventory({
  products,
  settings,
  onSaveProduct,
  onDeleteProduct
}: InventoryProps) {
  const { t } = useTranslation();
  // Product state management
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState('0');
  const [editBuyPrice, setEditBuyPrice] = useState('0');
  const [editSellPrice, setEditSellPrice] = useState('0');

  // New product addition state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('50');
  const [newBuyPrice, setNewBuyPrice] = useState('200');
  const [newSellPrice, setNewSellPrice] = useState('280');
  const [validationError, setValidationError] = useState('');

  // Sizing & yield contraction calculator state (critical poultry feature)
  const [liveWeight, setLiveWeight] = useState('2.0');
  const [yieldPercent, setYieldPercent] = useState('68'); // standard dressed yield is 65% - 70%

  // Compute conversion yield
  const computedYield = React.useMemo(() => {
    const wt = parseFloat(liveWeight) || 0;
    const pct = parseFloat(yieldPercent) || 0;
    const cleanWeight = (wt * pct) / 100;
    const lossWeight = wt - cleanWeight;
    return {
      cleanWeight: cleanWeight.toFixed(2),
      lossWeight: lossWeight.toFixed(2)
    };
  }, [liveWeight, yieldPercent]);

  const handleEditClick = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditStock(p.currentStockKg.toString());
    setEditBuyPrice(p.buyingPricePerKg.toString());
    setEditSellPrice(p.sellingPricePerKg.toString());
    setValidationError('');
  };

  const handleSaveEdit = (id: string) => {
    // Validations
    if (!editName.trim()) {
      setValidationError(t('msg_poultry_name_empty'));
      return;
    }
    const stockVal = parseFloat(editStock);
    const buyVal = parseFloat(editBuyPrice);
    const sellVal = parseFloat(editSellPrice);

    if (isNaN(stockVal) || stockVal < 0) {
      setValidationError(t('msg_stock_positive'));
      return;
    }
    if (isNaN(buyVal) || buyVal <= 0) {
      setValidationError(t('msg_wholesale_gt_zero'));
      return;
    }
    if (isNaN(sellVal) || sellVal <= 0) {
      setValidationError(t('msg_retail_gt_zero'));
      return;
    }

    onSaveProduct({
      id,
      name: editName.trim(),
      currentStockKg: stockVal,
      buyingPricePerKg: buyVal,
      sellingPricePerKg: sellVal,
      lastUpdated: new Date().toISOString()
    });

    if (stockVal < 5) {
      toast.error(t('low_stock_threshold_alert', { name: editName.trim(), remaining: stockVal.toFixed(2) }));
    }
    
    setEditingId(null);
    setValidationError('');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setValidationError(t('msg_prod_name_required'));
      return;
    }
    const stockVal = parseFloat(newStock);
    const buyVal = parseFloat(newBuyPrice);
    const sellVal = parseFloat(newSellPrice);

    if (isNaN(stockVal) || stockVal < 0) {
      setValidationError(t('msg_initial_stock_valid'));
      return;
    }
    if (isNaN(buyVal) || buyVal < 0) {
      setValidationError(t('msg_wholesale_invalid'));
      return;
    }
    if (isNaN(sellVal) || sellVal < 0) {
      setValidationError(t('msg_retail_invalid'));
      return;
    }

    onSaveProduct({
      id: `p_gen_${Date.now()}`,
      name: newName.trim(),
      currentStockKg: stockVal,
      buyingPricePerKg: buyVal,
      sellingPricePerKg: sellVal,
      lastUpdated: new Date().toISOString()
    });

    if (stockVal < 5) {
      toast.error(t('low_stock_threshold_alert', { name: newName.trim(), remaining: stockVal.toFixed(2) }));
    }

    setNewName('');
    setNewStock('50');
    setNewBuyPrice('200');
    setNewSellPrice('280');
    setIsAdding(false);
    setValidationError('');
  };

  return (
    <div className="space-y-6" id="inventory_panel">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-500" />
            {t('stock_pricing_mgmt')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('displaying_live_inventory')}
          </p>
        </div>

        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setValidationError('');
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition hover:scale-[1.02] active:scale-95 cursor-pointer"
          id="btn_add_product_toggle"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? t('close_drawer') : t('new_poultry_item')}
        </button>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs flex items-center gap-2 animate-shake" id="inventory_err">
          <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {/* Adding Module Panel Form */}
      {isAdding && (
        <form onSubmit={handleAddProduct} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-fade-in" id="add_item_form">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">{t('register_new_chicken')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">{t('poultry_name_desc')}</label>
              <input 
                type="text" 
                placeholder="e.g. Skinless Boneless Cubes"
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                id="input_new_prod_name"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">{t('initial_stock_weight_kg')}</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.0" 
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                id="input_new_prod_stock"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">{t('wholesale_buy_price')}</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="0.0"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                id="input_new_prod_buy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">{t('retail_sale_price')}</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="0.0"
                value={newSellPrice}
                onChange={(e) => setNewSellPrice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                id="input_new_prod_sell"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-medium bg-white hover:bg-slate-50 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              id="btn_save_new_product"
            >
              {t('save_product_record')}
            </button>
          </div>
        </form>
      )}

      {/* Main listings Grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500 text-xs">
          No products found. <button onClick={() => setIsAdding(true)} className="text-indigo-600 font-bold underline">Click Add Product to begin.</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="inventory_table">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-4 px-5">{t('poultry_portion_name')}</th>
                  <th className="py-4 px-5 text-right w-1/5">{t('live_stock_level')}</th>
                  <th className="py-4 px-5 text-right">{t('wholesale_rate')}</th>
                  <th className="py-4 px-5 text-right">{t('selling_rate_retail')}</th>
                  <th className="py-4 px-5 text-center">{t('net_margin')}</th>
                  <th className="py-4 px-5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => {
                  const isEditing = editingId === p.id;
                  const margin = p.sellingPricePerKg - p.buyingPricePerKg;
                  const marginPct = (margin / (p.buyingPricePerKg || 1)) * 100;
                  const lowStock = p.currentStockKg < 20;

                  return (
                    <tr key={p.id} className={`text-xs hover:bg-slate-50/50 transition duration-150 ${lowStock ? 'bg-rose-50/20' : ''}`}>
                      {/* Portion Name */}
                      <td className="py-4 px-5 font-semibold text-slate-800">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                            id={`edit_prod_name_${p.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {lowStock && (
                              <span className="bg-rose-100 border border-rose-200 text-rose-800 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 animate-pulse">
                                {t('low_stock_level')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Stock level in Kg */}
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-right w-20 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                              id={`edit_prod_stock_${p.id}`}
                            />
                            <span className="text-[10px] text-slate-400 font-bold uppercase select-none">{t('kg')}</span>
                          </div>
                        ) : (
                          <span className={lowStock ? 'text-rose-600' : 'text-slate-800'}>
                            {p.currentStockKg.toFixed(2)} {t('kg')}
                          </span>
                        )}
                      </td>

                      {/* Wholesale rate (Buying) */}
                      <td className="py-4 px-5 text-right font-semibold text-slate-600">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 text-[10px] font-bold select-none">{settings.currencySymbol}</span>
                            <input 
                              type="number" 
                              step="0.1" 
                              value={editBuyPrice}
                              onChange={(e) => setEditBuyPrice(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-right w-16 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                              id={`edit_prod_buy_${p.id}`}
                            />
                          </div>
                        ) : (
                          <span>{settings.currencySymbol} {p.buyingPricePerKg.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Retail rate */}
                      <td className="py-4 px-5 text-right font-bold text-slate-800">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 text-[10px] font-bold select-none">{settings.currencySymbol}</span>
                            <input 
                              type="number" 
                              step="0.1" 
                              value={editSellPrice}
                              onChange={(e) => setEditSellPrice(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-right w-16 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                              id={`edit_prod_sell_${p.id}`}
                            />
                          </div>
                        ) : (
                          <span className="text-indigo-600">{settings.currencySymbol} {p.sellingPricePerKg.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Profit margin */}
                      <td className="py-4 px-5 text-center">
                        {isEditing ? (
                          <span className="text-slate-400 font-mono text-[11px] select-none">&mdash;</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-emerald-600 font-bold mb-0.5">+{settings.currencySymbol}{margin.toFixed(0)}/{t('kg')}</span>
                            <span className="text-[10px] font-medium text-slate-400">{marginPct.toFixed(0)}% Profit</span>
                          </div>
                        )}
                      </td>

                      {/* Actions controllers */}
                      <td className="py-4 px-5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleSaveEdit(p.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                              id={`btn_save_edit_${p.id}`}
                              title="Confirm Edits"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Decline changes"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : deleteConfirmId === p.id ? (
                          <div className="flex justify-end gap-1.5 items-center">
                            <span className="text-[10px] text-rose-600 font-bold uppercase select-none">Sure?</span>
                            <button 
                              onClick={() => {
                                onDeleteProduct(p.id);
                                setDeleteConfirmId(null);
                              }}
                              className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer font-bold animate-pulse"
                              title="Yes, Delete SKU"
                              id={`btn_delete_confirm_${p.id}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Cancel Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleEditClick(p)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit Pricing &amp; Stock"
                              id={`btn_edit_${p.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete SKU"
                              id={`btn_delete_prompt_${p.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chicken-Specific Cleansing yield Yield Ratio Analyzer */}
      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-4 opacity-10">
          <Sparkles className="w-40 h-40 text-indigo-500" />
        </div>
        
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs uppercase tracking-wide">
            <Percent className="w-4.5 h-4.5" />
            {t('poultry_dressing_calc')}
          </div>
          <p className="text-[11px] text-slate-505 text-slate-500 leading-relaxed">
            {t('calculator_desc')}
          </p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t('calculator_params')}</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">{t('live_bird_weight_kg')}</label>
                <input 
                  type="number" 
                  step="0.05" 
                  value={liveWeight} 
                  onChange={(e) => setLiveWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">{t('dressed_meat_yield_pct')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={yieldPercent} 
                    onChange={(e) => setYieldPercent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-6 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-4 rounded-xl text-white space-y-2.5 shadow-md flex flex-col justify-between h-full min-h-[140px]">
            <h4 className="text-[9px] font-bold tracking-widest text-indigo-300 uppercase">{t('est_poultry_yield_outturn')}</h4>
            
            <div className="flex items-center justify-between gap-1 mt-1">
              <div>
                <div className="text-[10px] text-indigo-200 uppercase font-medium">{t('edible_meat')}</div>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{computedYield.cleanWeight} {t('kg')}</div>
              </div>

              <ArrowRight className="w-5 h-5 text-indigo-400/50" />
              
              <div className="text-right">
                <div className="text-[10px] text-indigo-200 uppercase font-medium">{t('waste_contraction')}</div>
                <div className="text-lg font-bold text-rose-450 text-rose-350 font-mono tracking-tight text-rose-400">{computedYield.lossWeight} {t('kg')}</div>
              </div>
            </div>

            <div className="text-[9px] text-indigo-200 italic leading-snug border-t border-white/10 pt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-indigo-300 shrink-0" />
              {t('standard_loss_msg')}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
