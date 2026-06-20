import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sale, Purchase, Expense, LocalDB } from '../types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReportsProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  settings: LocalDB['settings'];
}

export default function Reports({ sales, purchases, expenses, settings }: ReportsProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'daily' | 'monthly'>('daily');

  const formattedData = useMemo(() => {
    const combined: Record<string, { revenue: number, costs: number, profit: number }> = {};
    
    // Grouping logic depends on view (simplified)
    const formatDate = (dateStr: string) => view === 'daily' ? format(parseISO(dateStr), 'yyyy-MM-dd') : format(parseISO(dateStr), 'yyyy-MM');

    [...sales].forEach(s => {
      const d = formatDate(s.saleDate);
      if (!combined[d]) combined[d] = { revenue: 0, costs: 0, profit: 0 };
      combined[d].revenue += s.totalAmount;
    });

    [...purchases].forEach(p => {
      const d = formatDate(p.purchaseDate);
      if (!combined[d]) combined[d] = { revenue: 0, costs: 0, profit: 0 };
      combined[d].costs += p.totalAmount;
    });

    [...expenses].forEach(e => {
        const d = formatDate(e.expenseDate);
        if (!combined[d]) combined[d] = { revenue: 0, costs: 0, profit: 0 };
        combined[d].costs += e.amount;
    });

    return Object.keys(combined).sort().map(date => ({
      date,
      ...combined[date],
      profit: combined[date].revenue - combined[date].costs
    }));
  }, [sales, purchases, expenses, view]);

  const totals = useMemo(() => {
    return formattedData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      costs: acc.costs + curr.costs,
      profit: acc.profit + curr.profit
    }), { revenue: 0, costs: 0, profit: 0 });
  }, [formattedData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">{t('reports_pl')}</h2>
        <select value={view} onChange={(e) => setView(e.target.value as 'daily' | 'monthly')} className="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3">
          <option value="daily">Daily View</option>
          <option value="monthly">Monthly View</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: totals.revenue, color: 'text-emerald-600', icon: TrendingUp },
          { label: 'Total Costs', value: totals.costs, color: 'text-amber-600', icon: TrendingDown },
          { label: 'Net Profit', value: totals.profit, color: totals.profit >= 0 ? 'text-indigo-600' : 'text-rose-600', icon: DollarSign },
        ].map(m => (
            <div key={m.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">{m.label}</p>
                <div className="flex items-center gap-2 mt-1">
                    <m.icon className={`w-5 h-5 ${m.color}`} />
                    <p className={`text-xl font-black ${m.color}`}>{settings.currencySymbol} {m.value.toLocaleString()}</p>
                </div>
            </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80 min-h-[320px]">
        <ResponsiveContainer>
          <AreaChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" />
            <Area type="monotone" dataKey="costs" stroke="#f59e0b" fill="#f59e0b" />
            <Area type="monotone" dataKey="profit" stroke="#4f46e5" fill="#4f46e5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
