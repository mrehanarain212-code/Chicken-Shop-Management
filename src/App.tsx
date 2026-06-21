import React, { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { 
  Building, 
  Scale, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingDown, 
  Settings, 
  AlertTriangle,
  LogOut,
  Sparkles,
  Menu,
  X,
  CreditCard,
  Moon,
  Sun
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dbEvents } from './utils/eventBus';
import { DuckDatabase } from './services/db';
import { useTheme } from './components/ThemeProvider';
import { 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  Purchase, 
  Expense, 
  CustomerPayment, 
  SupplierPayment, 
  LocalDB 
} from './types';

// Import subcomponents
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Purchases from './components/Purchases';
import Ledger from './components/Ledger';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Backup from './components/Backup';

type ActiveTab = 'dashboard' | 'billing' | 'inventory' | 'purchases' | 'ledgers' | 'expenses' | 'reports' | 'settings';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error'>('synced');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleSync = (status: 'synced' | 'error') => {
      setSyncStatus(status);
    };
    dbEvents.on('sync', handleSync);
    return () => dbEvents.off('sync', handleSync);
  }, []);

  // Core reactive database state
  const [cacheTrigger, setCacheTrigger] = useState(0); // use to force refresh data trigger

  // Retrieve current database snapshot
  const dbSnapshot = useMemo(() => {
    return DuckDatabase.getRawDump();
  }, [cacheTrigger]);

  const {
    products,
    customers,
    suppliers,
    sales,
    purchases,
    expenses,
    settings,
    customerLedger,
    supplierLedger
  } = dbSnapshot;

  const triggerStateReload = () => {
    setCacheTrigger(prev => prev + 1);
  };

  // Automated offline syncer alerts
  useEffect(() => {
    // Synchronize document title with shop identifier
    document.title = `${settings.shopName} - Poultry Management System`;
  }, [settings.shopName]);

  // Alert Metrics computation for Side Navigation
  const navigationBadges = useMemo(() => {
    const lowStockCount = products.filter(p => p.currentStockKg < 20).length;
    const activeDebtorsCount = customers.filter(c => c.outstandingCredit > 0).length;
    return {
      lowStockCount,
      activeDebtorsCount
    };
  }, [products, customers]);

  // Core callback modifiers that write back to storage and trigger UI re-renders
  const handleSaveProduct = (prod: Product) => {
    DuckDatabase.saveProduct(prod);
    triggerStateReload();
  };

  const handleDeleteProduct = (id: string) => {
    DuckDatabase.deleteProduct(id);
    triggerStateReload();
  };

  const handleDeletePurchase = (id: string) => {
    DuckDatabase.deletePurchase(id);
    triggerStateReload();
  };

  const handleDeleteSale = (id: string) => {
    DuckDatabase.deleteSale(id);
    triggerStateReload();
  };

  const handleDeleteCustomer = (id: string) => {
    DuckDatabase.deleteCustomer(id);
    triggerStateReload();
  };

  const handleDeleteExpense = (id: string) => {
    DuckDatabase.deleteExpense(id);
    triggerStateReload();
  };

  const handleAddSale = (saleData: Omit<Sale, 'billNumber'>): Sale => {
    const completedBill = DuckDatabase.addSale(saleData);
    triggerStateReload();
    return completedBill;
  };

  const handleAddCustomer = (cust: Customer) => {
    DuckDatabase.saveCustomer(cust);
    triggerStateReload();
  };

  const handleAddSupplier = (sup: Supplier) => {
    DuckDatabase.saveSupplier(sup);
    triggerStateReload();
  };

  const handleAddPurchase = (pur: Purchase) => {
    DuckDatabase.addPurchase(pur);
    triggerStateReload();
  };

  const handleAddExpense = (exp: Expense) => {
    DuckDatabase.addExpense(exp);
    triggerStateReload();
  };

  const handleCustomerPayment = (pay: CustomerPayment) => {
    DuckDatabase.addCustomerPayment(pay);
    triggerStateReload();
  };

  const handleSupplierPayment = (pay: SupplierPayment) => {
    DuckDatabase.addSupplierPayment(pay);
    triggerStateReload();
  };

  const handleUpdateSettings = (updatedSettings: LocalDB['settings']) => {
    DuckDatabase.updateSettings(updatedSettings);
    triggerStateReload();
  };

  const handleResetDB = () => {
    DuckDatabase.resetToDefault();
    triggerStateReload();
  };

  const handleRestoreDump = (dump: LocalDB): boolean => {
    const ok = DuckDatabase.restoreDump(dump);
    if (ok) {
      triggerStateReload();
      setActiveTab('dashboard');
    }
    return ok;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased" id="main_app_layout">
      <Toaster position="top-right" />
      
      {/* Mobile Responsive Header Menu */}
      <header className="md:hidden bg-indigo-950 text-white px-4 py-3.5 flex justify-between items-center shadow-lg border-b border-indigo-900/50">
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-xl" />
          ) : (
            <div className="bg-indigo-600/30 p-1.5 rounded-xl border border-indigo-500/10">
              <Building className="w-5 h-5 text-indigo-400" />
            </div>
          )}
          <div>
            <h1 className="text-xs font-black tracking-wide uppercase leading-tight line-clamp-1">{settings.shopName}</h1>
            <p className="text-[9px] text-indigo-300 font-bold uppercase leading-none mt-0.5">{t('engine_name')}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
          id="btn_mobile_menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar navigation system */}
      <aside className={`
        fixed inset-y-0 left-0 bg-indigo-950 text-indigo-100 w-64 p-5 z-40 shadow-2xl transition-transform duration-300 ease-in-out border-r border-indigo-900/50 flex flex-col justify-between
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `} id="app_sidebar">
        
        <div className="space-y-6">
          
          {/* Brand header */}
          <div className="flex justify-between items-center pb-5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-indigo-500/10 shadow-lg">
                  <Building className="w-5 h-5 text-indigo-100" />
                </div>
              )}
              <div>
                <h1 className="text-xs font-black tracking-widest text-white uppercase leading-snug">{settings.shopName}</h1>
                <span className="text-[9px] text-emerald-450 text-indigo-300/80 font-bold uppercase tracking-wide">{t('poultry_erp')}</span>
              </div>
            </div>
            
            <button 
              className="md:hidden p-1 bg-white/5 rounded-lg text-slate-350"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation link choices */}
          <nav className="space-y-1" id="nav_links_container">
            {[
              { id: 'dashboard', label: t('dashboard_reports'), icon: Building, badge: null },
              { id: 'billing', label: t('billing_pos'), icon: ShoppingCart, badge: null },
              { id: 'inventory', label: t('stock_weight'), icon: Scale, badge: navigationBadges.lowStockCount ? { count: navigationBadges.lowStockCount, style: 'bg-rose-500 text-white' } : null },
              { id: 'purchases', label: t('farm_procurement'), icon: Package, badge: null },
              { id: 'ledgers', label: t('credit_ledgers'), icon: Users, badge: navigationBadges.activeDebtorsCount ? { count: navigationBadges.activeDebtorsCount, style: 'bg-amber-500 text-slate-900' } : null },
              { id: 'expenses', label: t('shop_outflows'), icon: TrendingDown, badge: null },
              { id: 'reports', label: t('reports_pl'), icon: Scale, badge: null },
              { id: 'settings', label: t('settings_backup'), icon: Settings, badge: null }
            ].map((link) => {
              const Icon = link.icon;
              const isLinkActive = activeTab === link.id;

              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full py-3 px-3.5 text-xs font-semibold rounded-xl flex items-center justify-between transition cursor-pointer font-sans
                    ${isLinkActive 
                      ? 'bg-indigo-600 text-white font-extrabold shadow-sm relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:bg-indigo-300 before:rounded-full' 
                      : 'text-indigo-200/90 hover:text-white hover:bg-white/5'
                    }
                  `}
                  id={`nav_link_${link.id}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4.5 h-4.5" />
                    {link.label}
                  </span>
                  
                  {link.badge && (
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-lg ${link.badge.style}`}>
                      {link.badge.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Footer info branding block */}
        <div className="pt-4 border-t border-white/5 space-y-2 text-[10px] text-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-[9px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              V1.0.2 Stable
            </div>
            <div 
              className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
              title={`Data Status: ${syncStatus}`} 
            />
          </div>
          <p className="leading-snug">Designed for micro and small scale breeding broiler business units.</p>
        </div>

      </aside>

      {/* Main dynamic screen containers */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[100vh]" id="app_content_stage">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            sales={sales}
            purchases={purchases}
            expenses={expenses}
            products={products}
            customers={customers}
            suppliers={suppliers}
            settings={settings}
            onRefresh={triggerStateReload}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {activeTab === 'billing' && (
          <Billing
            products={products}
            customers={customers}
            settings={settings}
            onBilled={handleAddSale}
            onAddCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'inventory' && (
          <Inventory
            products={products}
            settings={settings}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'purchases' && (
          <Purchases
            purchases={purchases}
            products={products}
            suppliers={suppliers}
            settings={settings}
            onPurchaseAdded={handleAddPurchase}
            onAddSupplier={handleAddSupplier}
            onDeletePurchase={handleDeletePurchase}
          />
        )}

        {activeTab === 'ledgers' && (
          <Ledger
            customers={customers}
            suppliers={suppliers}
            customerLedger={customerLedger}
            supplierLedger={supplierLedger}
            settings={settings}
            onCustomerPayment={handleCustomerPayment}
            onSupplierPayment={handleSupplierPayment}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {activeTab === 'expenses' && (
          <Expenses
            expenses={expenses}
            products={products}
            settings={settings}
            onExpenseAdded={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'reports' && (
          <Reports
            sales={sales}
            purchases={purchases}
            expenses={expenses}
            settings={settings}
          />
        )}

        {activeTab === 'settings' && (
          <Backup
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetDB={handleResetDB}
            onRestoreDump={handleRestoreDump}
          />
        )}

      </main>

      <Analytics />
    </div>
  );
}
