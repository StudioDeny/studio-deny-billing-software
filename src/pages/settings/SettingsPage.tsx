import React, { useState } from 'react';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Settings,
  Printer,
  ShieldCheck,
  Building2,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Radio,
  Save,
  Users,
  Plus,
  Tag,
} from 'lucide-react';
import { StaffRole, StaffMember } from '../../types';

export const SettingsPage: React.FC = () => {
  const { settings, staff } = useStore();
  const [activeTab, setActiveTab] = useState<'BUSINESS' | 'BILLING' | 'PRINTER' | 'STAFF'>('BUSINESS');

  // Business Profile Form
  const [brand, setBrand] = useState(settings.brand);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [cityState, setCityState] = useState(settings.cityState);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [gstin, setGstin] = useState(settings.gstin);
  const [pan, setPan] = useState(settings.pan);

  // Billing Configuration Form
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'SD-INV-');
  const [taxRate, setTaxRate] = useState(String(settings.taxRate || 12));
  const [defaultDiscount, setDefaultDiscount] = useState('0');

  // Printer Configuration Form
  const [printerName, setPrinterName] = useState(settings.printer?.name || 'POS-80 Thermal Register');
  const [paperWidth, setPaperWidth] = useState<'80MM' | '58MM'>('80MM');
  const [autoPrint, setAutoPrint] = useState(true);

  // Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('BILLING');

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateSettings({
      brand,
      tagline,
      address,
      cityState,
      email,
      phone,
      gstin,
      pan,
      invoicePrefix,
      taxRate: Number(taxRate) || 12,
      printer: {
        ...settings.printer,
        name: printerName,
      },
    });
  };

  const handleTestPrint = () => {
    store.testPrint();
  };

  const handleResetData = () => {
    if (window.confirm('Reset all streetwear catalog, orders, and inventory to default Studio Deny state?')) {
      store.resetToDefaults();
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      status: 'ACTIVE',
      permissions:
        newStaffRole === 'OWNER'
          ? ['Full Terminal Access', 'Business Settings', 'Tax Engine', 'Staff Management']
          : newStaffRole === 'MANAGER'
          ? ['Billing', 'Bills History', 'Products Catalog', 'Customers', 'Basic Settings']
          : ['Dashboard Overview', 'New Bill (POS)', 'Bills History', 'Customer Directory'],
    };

    // Save staff in store
    const state = store.getState();
    (store as any).saveState?.({
      ...state,
      staff: [...state.staff, newMember],
    });
    store.addToast('Staff Member Created', `${newMember.name} added as ${newMember.role}.`, 'success');

    setIsStaffModalOpen(false);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  const tabs = [
    { id: 'BUSINESS' as const, label: 'BUSINESS PROFILE', icon: <Building2 size={14} /> },
    { id: 'BILLING' as const, label: 'BILLING & TAX', icon: <Receipt size={14} /> },
    { id: 'PRINTER' as const, label: 'PRINTER CONFIG', icon: <Printer size={14} /> },
    { id: 'STAFF' as const, label: 'STAFF & ROLES', icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#CFCFD2] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
            TERMINAL CONFIGURATION
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            SETTINGS
          </h1>
          <div className="text-xs font-mono text-[#666666] mt-1">
            Configure Studio Deny store profile, GSTIN, thermal printer & terminal staff roles
          </div>
        </div>

        <Button variant="secondary" onClick={handleResetData}>
          <RotateCcw size={14} className="mr-2" /> RESET DEMO DATA
        </Button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[#CFCFD2] overflow-x-auto gap-1 font-mono text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-bold flex items-center gap-2 uppercase tracking-wider shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-white text-[#666666] hover:text-[#0A0A0A]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6 font-mono text-xs">
        {/* 1. BUSINESS PROFILE TAB */}
        {activeTab === 'BUSINESS' && (
          <div className="bg-white border border-[#CFCFD2] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[#E5E5E7] pb-3 flex items-center gap-2">
              <Building2 size={16} className="text-[#0A0A0A]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A0A0A]">
                STUDIO BRAND & FLAGSHIP STORE PROFILE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Brand Title
                </label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Tagline
                </label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Store Street Address
                </label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  City & State
                </label>
                <Input value={cityState} onChange={(e) => setCityState(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Contact Phone
                </label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Support Email
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E5E7]">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  GSTIN (Apparel & Retail)
                </label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Income Tax PAN
                </label>
                <Input value={pan} onChange={(e) => setPan(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* 2. BILLING & TAX TAB */}
        {activeTab === 'BILLING' && (
          <div className="bg-white border border-[#CFCFD2] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[#E5E5E7] pb-3 flex items-center gap-2">
              <Receipt size={16} className="text-[#0A0A0A]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A0A0A]">
                INVOICE NUMBERING & TAX ENGINE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Invoice Prefix
                </label>
                <Input
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="SD-INV-"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Apparel GST Rate (%)
                </label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="12"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Default Discount (%)
                </label>
                <Input
                  type="number"
                  value={defaultDiscount}
                  onChange={(e) => setDefaultDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
              <div className="font-bold text-xs text-[#0A0A0A]">TAX CONFIGURATION NOTE</div>
              <p className="text-[11px] text-[#666666]">
                Studio Deny operates under GST Rate schedule for branded streetwear garments.
                All POS calculations apply {taxRate}% GST on taxable subtotal after discounts.
              </p>
            </div>
          </div>
        )}

        {/* 3. PRINTER CONFIGURATION TAB */}
        {activeTab === 'PRINTER' && (
          <div className="bg-white border border-[#CFCFD2] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[#E5E5E7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-[#0A0A0A]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A0A0A]">
                  THERMAL RECEIPT HARDWARE
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-700 font-bold uppercase">
                  READY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Printer Hardware Model
                </label>
                <Input
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#666666] mb-1">
                  Thermal Paper Width
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80MM')}
                    className={`flex-1 py-2 px-3 border font-bold text-xs ${
                      paperWidth === '80MM'
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                        : 'bg-white text-[#666666] border-[#CFCFD2]'
                    }`}
                  >
                    80MM (STANDARD POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth('58MM')}
                    className={`flex-1 py-2 px-3 border font-bold text-xs ${
                      paperWidth === '58MM'
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                        : 'bg-white text-[#666666] border-[#CFCFD2]'
                    }`}
                  >
                    58MM (COMPACT)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F1F1F3] border border-[#CFCFD2]">
              <div>
                <div className="font-bold text-xs text-[#0A0A0A]">AUTO-PRINT ON SETTLEMENT</div>
                <div className="text-[11px] text-[#666666]">
                  Automatically trigger thermal slip print when staff taps [PAY & PRINT]
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
              />
            </div>

            <div className="pt-2 flex justify-start">
              <Button type="button" variant="secondary" onClick={handleTestPrint}>
                <Printer size={13} className="mr-1.5" /> TEST THERMAL PRINT
              </Button>
            </div>
          </div>
        )}

        {/* 4. STAFF & ROLES TAB */}
        {activeTab === 'STAFF' && (
          <div className="bg-white border border-[#CFCFD2] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[#E5E5E7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#0A0A0A]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A0A0A]">
                  TERMINAL STAFF & ACCESS ROLES
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStaffModalOpen(true)}
              >
                <Plus size={13} className="mr-1" /> ADD STAFF
              </Button>
            </div>

            {/* Roles Description Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
                <div className="font-bold text-[#0A0A0A]">OWNER</div>
                <div className="text-[#666666]">Full access to billing, settings, reports, overrides</div>
              </div>
              <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
                <div className="font-bold text-[#0A0A0A]">MANAGER</div>
                <div className="text-[#666666]">Billing, Bills history, Products catalog, Customers</div>
              </div>
              <div className="p-3 bg-[#F1F1F3] border border-[#CFCFD2] space-y-1">
                <div className="font-bold text-[#0A0A0A]">BILLING STAFF</div>
                <div className="text-[#666666]">Dashboard overview, New Bill (POS), Customers</div>
              </div>
            </div>

            {/* Staff Table */}
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                  <th className="py-2.5 px-3">STAFF MEMBER</th>
                  <th className="py-2.5 px-3">EMAIL</th>
                  <th className="py-2.5 px-3">ROLE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E7]">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-3 font-bold text-[#0A0A0A]">{s.name}</td>
                    <td className="py-3 px-3 text-[#666666]">{s.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[10px] font-bold">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            <Save size={14} className="mr-2" /> SAVE SETTINGS
          </Button>
        </div>
      </form>

      {/* Quick Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#0A0A0A] p-6 max-w-md w-full font-mono text-xs space-y-4 shadow-xl">
            <h3 className="font-display font-bold text-base text-[#0A0A0A]">
              REGISTER TERMINAL OPERATOR
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">
                  Full Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Suhasini R."
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">
                  Email Address *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="staff@studiodeny.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#666666] mb-1">
                  Role Permission
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full bg-white border border-[#CFCFD2] p-2 text-xs font-mono focus:outline-none"
                >
                  <option value="BILLING">BILLING STAFF (Dashboard, POS, Bills)</option>
                  <option value="MANAGER">MANAGER (Billing, Products, Customers)</option>
                  <option value="OWNER">OWNER (Full Access)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsStaffModalOpen(false)}
                >
                  CANCEL
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  SAVE OPERATOR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
