import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  Settings, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Check, 
  AlertCircle,
  HelpCircle,
  Database,
  Building,
  Phone,
  MapPin,
  Coins,
  Languages,
  Moon,
  Sun
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';
import { LocalDB } from '../types';
import { safeConfirm } from '../utils/safeConfirm';

interface BackupProps {
  settings: LocalDB['settings'];
  onUpdateSettings: (settings: LocalDB['settings']) => void;
  onResetDB: () => void;
  onRestoreDump: (dump: LocalDB) => boolean;
}

export default function Backup({
  settings,
  onUpdateSettings,
  onResetDB,
  onRestoreDump
}: BackupProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  // Settings Form States
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);

  // File Upload State
  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Background watcher for browser container online offline indicators
  React.useEffect(() => {
    const onlineH = () => setIsOnline(true);
    const offlineH = () => setIsOnline(false);
    
    window.addEventListener('online', onlineH);
    window.addEventListener('offline', offlineH);
    return () => {
      window.removeEventListener('online', onlineH);
      window.removeEventListener('offline', offlineH);
    };
  }, []);

  const handleUpdateStoreDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!shopName.trim()) {
      setValidationError('Shop display header name is required');
      return;
    }

    onUpdateSettings({
      ...settings,
      shopName: shopName.trim(),
      shopAddress: shopAddress.trim(),
      shopPhone: shopPhone.trim(),
      currencySymbol: currencySymbol.trim() || 'Rs.'
    });

    setSuccessMsg('Store config settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleBackupExport = () => {
    try {
      setValidationError('');
      const dbStr = localStorage.getItem('chicken_shop_db_v1');
      if (!dbStr) throw new Error('Repository empty');

      // Build text blob
      const fileBlob = new Blob([dbStr], { type: 'application/json' });
      const dlLink = document.createElement('a');
      dlLink.href = URL.createObjectURL(fileBlob);
      dlLink.download = `ChickenShop_Accounting_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      
      setSuccessMsg('JSON ledger database exported successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setValidationError('Failed to compile local cache storage database.');
    }
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError('');
    setSuccessMsg('');

    const targetFile = e.target.files?.[0];
    if (!targetFile) return;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const rawJsonData = JSON.parse(fileReader.result as string);
        const verified = onRestoreDump(rawJsonData);
        if (verified) {
          setSuccessMsg('Database logs restored successfully! Reloading views...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setValidationError('Corrupt JSON backup schema. The file violates required ledger formats.');
        }
      } catch {
        setValidationError('Invalid JSON encoding. File can not be loaded by ERP kernel.');
      }
    };
    fileReader.readAsText(targetFile);
  };

  const handleDatabaseReset = () => {
    const isConfirmed = safeConfirm(
      'CRITICAL DANGER: You are about to RESET the entire database backend back to preset demo seeds. All sales bills, customer outstanding debt, and procurement records will be PERMANENTLY lost. Do you wish to proceed?'
    );
    if (isConfirmed) {
      onResetDB();
      setSuccessMsg('Shop state restored successfully to demo records! Refreshing application...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-6" id="settings_panel">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            {t('settings')}
          </h2>
          <p className="text-xs text-slate-505 text-slate-500 mt-1">
            Setup billing information headers, check online sandbox indicators, and manage secure text rollbacks.
          </p>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5 animate-shake" id="settings_err">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-semibold">{validationError}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-1.5" id="settings_success">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Grid splits preferences vs systems */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left column Settings preferences */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Building className="w-4 h-4 text-slate-400" /> Store Profile Metadata
          </h3>

          <form onSubmit={handleUpdateStoreDetails} className="space-y-4 font-sans" id="store_meta_form">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{t('language')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${i18n.language === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t('english')}
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage('ur')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${i18n.language === 'ur' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t('urdu')}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Shop Logo</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 500 * 1024) {
                      setValidationError('Logo image too large (max 500KB).');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      onUpdateSettings({...settings, logoUrl: reader.result as string});
                      setSuccessMsg('Logo updated!');
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs"
              />
              {settings.logoUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
                  <button type="button" onClick={() => onUpdateSettings({...settings, logoUrl: undefined})} className="text-xs text-rose-500">Remove</button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Shop Display Title Header</label>
              <input 
                type="text" 
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                id="input_settings_name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-bold">Physical Market Address</label>
              <input 
                type="text" 
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                id="input_settings_address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-0.5"><Phone className="w-3.5 h-3.5" /> Mobile Contact No</label>
                <input 
                  type="text" 
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-0.5"><Coins className="w-3.5 h-3.5" /> Currency Symbol</label>
                <input 
                  type="text" 
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              id="btn_save_settings"
            >
              Commit Metadata Update
            </button>

          </form>
        </div>

        {/* Right column sandbox systems backups */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Connection status sandbox */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-650 text-slate-600">Container Sandbox Connection</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Local Environment Status:</span>
              {isOnline ? (
                <span className="bg-emerald-50 border border-emerald-250 border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Online Network Access
                </span>
              ) : (
                <span className="bg-amber-50 border border-amber-250 border-amber-200 text-amber-800 px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 flex animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline Mode Active
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-455 text-slate-400 leading-relaxed pt-1.5 border-t border-slate-50 font-medium">
              Poultry system runs on a 100% Client-Side database engine. Transactions write to secure local containers and will remain completely accessible even if the internet access fails.
            </p>
          </div>

          {/* Backup modules */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <Database className="w-4 h-4 text-indigo-500" /> Accounting Backups Data Center
            </h3>

            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Export accounting lists and credit ledgers as structured JSON configuration packages to lock shop audits.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1 font-sans">
              
              {/* Export backup buttons download */}
              <button
                onClick={handleBackupExport}
                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200/50 flex items-center justify-between transition cursor-pointer"
                id="btn_export_db"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" /> Download Secure Backup (.json)
                </span>
              </button>

              {/* Import backup labels upload */}
              <label 
                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200/50 flex items-center justify-between transition cursor-pointer"
                id="lbl_import_db"
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" /> Upload Restore Ledger Backup
                </span>
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleBackupImport}
                  className="hidden" 
                />
              </label>

              {/* Reset to system presets */}
              <button
                onClick={handleDatabaseReset}
                type="button"
                className="py-3 px-4 bg-rose-50 hover:bg-rose-100/80 text-rose-800 rounded-xl text-xs font-extrabold flex items-center justify-between border border-rose-150 border-rose-200 transition cursor-pointer"
                id="btn_reset_db"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-600" /> Factory Reset Demo Seeds
                </span>
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
