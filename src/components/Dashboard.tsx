import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Scale, 
  AlertTriangle, 
  ShieldAlert, 
  Layers, 
  IndianRupee, 
  DollarSign, 
  Calendar,
  Layers3,
  RefreshCw,
  Clock,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sale, Expense, Product, LocalDB, Purchase } from '../types';

interface DashboardProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  customers: { outstandingCredit: number }[];
  suppliers: { outstandingBalance: number }[];
  settings: LocalDB['settings'];
  onRefresh: () => void;
  onDeleteSale: (id: string) => void;
}

export default function Dashboard({
  sales,
  purchases,
  expenses,
  products,
  customers,
  suppliers,
  settings,
  onRefresh,
  onDeleteSale
}: DashboardProps) {
  const { t } = useTranslation();
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Metric Computations based on selected period
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Set threshold dates
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyStart = oneWeekAgo.getTime();
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const monthlyStart = oneMonthAgo.getTime();

    const getPeriodFilter = (dateStr: string) => {
      const time = new Date(dateStr).getTime();
      if (reportPeriod === 'daily') {
        return time >= todayStart;
      } else if (reportPeriod === 'weekly') {
        return time >= weeklyStart;
      } else {
        return time >= monthlyStart;
      }
    };

    // Filtered transaction arrays
    const periodSales = sales.filter(s => getPeriodFilter(s.saleDate));
    const periodPurchases = purchases.filter(p => getPeriodFilter(p.purchaseDate));
    const periodExpenses = expenses.filter(e => getPeriodFilter(e.expenseDate));

    // Calculate totals
    const totalSales = periodSales.reduce((acc, s) => acc + s.netAmount, 0);
    const salesPaid = periodSales.reduce((acc, s) => acc + s.paidAmount, 0);
    const salesCredit = periodSales.reduce((acc, s) => acc + s.creditAmount, 0);
    const salesDiscount = periodSales.reduce((acc, s) => acc + s.discountAmount, 0);

    const totalPurchases = periodPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
    
    const totalExpenses = periodExpenses.reduce((acc, e) => acc + e.amount, 0);
    const mortalityLossKg = periodExpenses
      .filter(e => e.category === 'mortality')
      .reduce((acc, e) => acc + (e.mortalityKg || 0), 0);
    const mortalityCount = periodExpenses
      .filter(e => e.category === 'mortality')
      .reduce((acc, e) => acc + (e.mortalityCount || 0), 0);

    // Business net margin: net sales cash + accounts receivable (sales credit is included in revenue) - purchases - general expenses
    const netGains = totalSales - totalPurchases - totalExpenses;

    return {
      totalSales,
      salesPaid,
      salesCredit,
      salesDiscount,
      totalPurchases,
      totalExpenses,
      mortalityLossKg,
      mortalityCount,
      netGains,
      salesCount: periodSales.length,
      purchasesCount: periodPurchases.length,
      expensesCount: periodExpenses.length
    };
  }, [sales, purchases, expenses, reportPeriod]);

  // Overall ledger totals (independent of period)
  const totals = useMemo(() => {
    const totalCustomerUdhaar = customers.reduce((acc, c) => acc + c.outstandingCredit, 0);
    const totalSupplierDebt = suppliers.reduce((acc, s) => acc + s.outstandingBalance, 0);
    const totalStockKg = products.reduce((acc, p) => acc + p.currentStockKg, 0);
    const lowStockAlerts = products.filter(p => p.currentStockKg < 20);

    return {
      totalCustomerUdhaar,
      totalSupplierDebt,
      totalStockKg,
      lowStockAlerts
    };
  }, [customers, suppliers, products]);

  // Chart data calculation for the Last 7 Days (Sales trend)
  const salesHistoryChartData = useMemo(() => {
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return dates.map(day => {
      const dayStr = day.toLocaleDateString(undefined, { weekday: 'short' });
      const dayStartStamp = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      const dayEndStamp = dayStartStamp + 24 * 60 * 60 * 1000;

      const daySales = sales.filter(s => {
        const time = new Date(s.saleDate).getTime();
        return time >= dayStartStamp && time < dayEndStamp;
      });

      const total = daySales.reduce((acc, s) => acc + s.netAmount, 0);
      return { 
        name: dayStr, 
        amount: total,
        dateFormatted: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });
  }, [sales]);

  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...salesHistoryChartData.map(d => d.amount));
    return maxVal === 0 ? 1000 : maxVal * 1.15; // padding top
  }, [salesHistoryChartData]);

  // Expense distribution categories helpers
  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = { rent: 0, feed: 0, bills: 0, salary: 0, mortality: 0, other: 0 };
    expenses.forEach(e => {
      if (categories[e.category] !== undefined) {
        categories[e.category] += e.amount;
      } else {
        categories.other += e.amount;
      }
    });
    return Object.entries(categories).map(([category, amount]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      color: 
        category === 'feed' ? '#0ea5e9' : 
        category === 'rent' ? '#8b5cf6' : 
        category === 'bills' ? '#f59e0b' : 
        category === 'salary' ? '#10b981' : 
        category === 'mortality' ? '#ef4444' : '#6b7280'
    }));
  }, [expenses]);

  const totalAllTimeExpenses = expenses.reduce((acc, e) => acc + e.amount, 0) || 1;

  return (
    <div className="space-y-6" id="dashboard_panel">
      
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {settings.shopName}
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-500" />
            {t('dashboard_subtitle')}
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button 
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition rounded-lg border border-slate-200"
            title={t('reload_data')}
            id="btn_refresh_dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setReportPeriod(period)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all uppercase tracking-wide cursor-pointer ${
                  reportPeriod === period 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
                id={`btn_period_${period}`}
              >
                {t(`period_${period}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts & Low Warnings */}
      {totals.lowStockAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3.5 items-start text-amber-900 animate-fade-in" id="stock_alert">
          <AlertTriangle className="w-5.5 h-5.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{t('low_stock_alert', { count: totals.lowStockAlerts.length })}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {totals.lowStockAlerts.map(p => (
                <span key={p.id} className="bg-white/80 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-medium inline-block text-amber-800">
                  {t('stock_left', { name: p.name, amount: p.currentStockKg.toFixed(1) })}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary & Operational Key Metrics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metric_widgets">
        
        {/* Total Billed Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t('billed_revenue')} ({reportPeriod})
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {settings.currencySymbol} {metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-emerald-600">
              {settings.currencySymbol} {metrics.salesPaid.toLocaleString('en-IN')} {t('cash')}
            </span>
            <span>&bull;</span>
            <span className="text-rose-500 font-medium">
              {settings.currencySymbol} {metrics.salesCredit.toLocaleString('en-IN')} {t('udhaar')}
            </span>
          </div>
        </div>

        {/* Restocks cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t('stock_purchases')} ({reportPeriod})
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:scale-110 transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {settings.currencySymbol} {metrics.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{metrics.purchasesCount} {t('restock_shipments')}</span>
            {metrics.totalPurchases > 0 && (
              <span className="text-indigo-600 font-medium">
                {((metrics.totalPurchases / (metrics.totalSales || 1)) * 100).toFixed(0)}% {t('of_revenue')}
              </span>
            )}
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t('op_expenses')} ({reportPeriod})
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-500 group-hover:scale-110 transition">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {settings.currencySymbol} {metrics.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{metrics.expensesCount} {t('receipts_tracked')}</span>
            {metrics.mortalityLossKg > 0 && (
              <span className="text-rose-600 font-medium flex items-center gap-0.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {metrics.mortalityLossKg.toFixed(1)} {t('kg_loss')}
              </span>
            )}
          </div>
        </div>

        {/* Profit Margin / Income Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t('net_gains')} ({reportPeriod})
            </span>
            <div className={`p-2 rounded-lg group-hover:scale-110 transition ${metrics.netGains >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              <Layers3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold tracking-tight ${metrics.netGains >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              {settings.currencySymbol} {metrics.netGains.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <span>{t('net_cash_info')}</span>
          </div>
        </div>

      </div>

      {/* Credit & Liabilities - High priority tracking for small shops */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ledger_credit_widgets">
        
        {/* Customer credit Udhaar balances */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <Users className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-100" />
            <span className="text-xs font-medium text-rose-100 uppercase tracking-widest">{t('receivable_accounts')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tight mt-3">
            {settings.currencySymbol} {totals.totalCustomerUdhaar.toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-rose-100 mt-2 font-medium">
            Outstanding customer debt (Udhaar balance) to collect.
          </p>
        </div>

        {/* Supplier Payables */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <TrendingDown className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-indigo-150" />
            <span className="text-xs font-medium text-indigo-100 uppercase tracking-widest">{t('payable_accounts')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tight mt-3">
            {settings.currencySymbol} {totals.totalSupplierDebt.toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-indigo-100 mt-2 font-medium">
            Outstanding balance we owe to broiler farms.
          </p>
        </div>

        {/* Live Stock Storage capacity */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <Scale className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">{t('stock_on_premises')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tight mt-3 text-emerald-400">
            {totals.totalStockKg.toFixed(1)} <span className="text-xl">Kg</span>
          </h3>
          <p className="text-xs text-slate-300 mt-2 font-medium">
            Cumulative weight of entire on-shelves chicken.
          </p>
        </div>

      </div>

      {/* Graphical section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts_section">
        
        {/* Custom SVG Bar Graph: Daily Sales Sales trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800">{t('sales_trend_7d')}</h3>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {t('retail_receipts')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">{t('sales_chart_hint', { symbol: settings.currencySymbol })}</p>
          </div>

          {/* SVG bar container */}
          <div className="h-64 flex flex-col justify-end">
            <div className="flex items-end justify-between h-48 px-2 gap-2 relative">
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
              </div>

              {salesHistoryChartData.map((d, index) => {
                const heightPercent = maxChartValue > 0 ? (d.amount / maxChartValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative z-10">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-950 text-white rounded-lg px-2.5 py-1 text-[10px] font-mono shadow-xl text-center whitespace-nowrap min-w-[70px] z-50">
                      <div>{d.dateFormatted}</div>
                      <div className="font-bold text-emerald-300">{settings.currencySymbol} {d.amount.toLocaleString()}</div>
                    </div>
                    
                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                      className="w-full sm:w-8 bg-gradient-to-t from-sky-500 to-indigo-500 group-hover:from-emerald-500 group-hover:to-emerald-400 rounded-t-lg transition-all duration-300 hover:shadow-lg relative overflow-hidden flex items-end justify-center"
                    >
                      {d.amount > 0 && <span className="text-[9px] text-white font-bold mb-1 hidden sm:inline">{((d.amount / maxChartValue) * 100) > 20 ? `${(d.amount / 1000).toFixed(0)}k` : ''}</span>}
                    </div>

                    {/* Label */}
                    <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                      {d.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expense distribution details & list */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Cumulative Expense Distribution</h3>
            <p className="text-xs text-slate-500 mb-6">Historical expenditure split (All-time tracking).</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {expenseBreakdown.map((item, idx) => {
              const sharesPercent = (item.amount / totalAllTimeExpenses) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-slate-550 font-mono">
                      {settings.currencySymbol} {item.amount.toLocaleString('en-IN')} &bull; <strong className="font-bold text-slate-800">{sharesPercent.toFixed(1)}%</strong>
                    </span>
                  </div>
                  {/* Progress track */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.max(1, sharesPercent)}%`, 
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom recent logs row */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm" id="recent_bills_table">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Today's &amp; Recent Sales Checkout Stream</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Buyer/Customer</th>
                <th className="py-3 px-4 text-center">Qty / KG weight</th>
                <th className="py-3 px-4 text-right">Invoice (Net)</th>
                <th className="py-3 px-4 text-right header_settled">Settled Paid</th>
                <th className="py-3 px-4 text-right text-rose-500">Udhaar Credit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.slice(0, 5).map((sale) => (
                <tr key={sale.id} className="text-xs hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{sale.billNumber}</td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(sale.saleDate).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{sale.customerName}</td>
                  <td className="py-3.5 px-4 text-center text-slate-600 font-semibold font-mono">
                    {sale.items.reduce((sum, item) => sum + item.weightKg, 0).toFixed(2)} Kg
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {settings.currencySymbol} {sale.netAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                    {settings.currencySymbol} {sale.paidAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-600 font-bold">
                    {sale.creditAmount > 0 ? `${settings.currencySymbol} ${sale.creditAmount.toLocaleString('en-IN')}` : 'Settled'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {deleteConfirmId === sale.id ? (
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => { onDeleteSale(sale.id); setDeleteConfirmId(null); }}
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
                        onClick={() => setDeleteConfirmId(sale.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                    No sales billed in system yet. Navigate to Billing tab to generate your first invoice!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
