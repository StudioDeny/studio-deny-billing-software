import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE, PERMISSION_LABELS, PermissionKey, DbStaffRole } from '../../constants/permissions';
import { printThermalReceipt } from '../../utils/receiptPrinter';
import { EditInvoicePanel } from './EditInvoicePanel';

export const SettingsPage: React.FC = () => {
  const { settings, staff, currentStaff } = useStore();
  const canManageStaff = currentStaff?.role === 'OWNER';
  const [activeTab, setActiveTab] = useState<'BUSINESS' | 'BILLING' | 'PRINTER' | 'STAFF'>('BUSINESS');
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);

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
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'SD');
  const [taxRate, setTaxRate] = useState(String(settings.taxRate ?? 0));
  const [defaultDiscount, setDefaultDiscount] = useState('0');

  // Printer Configuration Form
  const [printerName, setPrinterName] = useState(settings.printer?.name || '');
  const [paperWidth, setPaperWidth] = useState<'80MM' | '58MM'>('80MM');
  const [autoPrint, setAutoPrint] = useState(true);

  // These forms mount before the live Supabase settings finish loading (settings
  // starts as an empty placeholder), so re-sync every field once the real row arrives.
  useEffect(() => {
    setBrand(settings.brand);
    setTagline(settings.tagline);
    setAddress(settings.address);
    setCityState(settings.cityState);
    setEmail(settings.email);
    setPhone(settings.phone);
    setGstin(settings.gstin);
    setPan(settings.pan);
    setInvoicePrefix(settings.invoicePrefix || 'SD');
    setTaxRate(String(settings.taxRate ?? 0));
    setPrinterName(settings.printer?.name || '');
  }, [settings]);

  // Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newDbStaffRole, setNewDbStaffRole] = useState<DbStaffRole>('BILLING');
  const [newStaffPermissions, setNewStaffPermissions] = useState<PermissionKey[]>(
    DEFAULT_PERMISSIONS_BY_ROLE.BILLING
  );
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.updateSettings({
      brand,
      tagline,
      address,
      cityState,
      email,
      phone,
      gstin,
      pan,
      invoicePrefix,
      taxRate: Number.isFinite(Number(taxRate)) ? Number(taxRate) : 0,
      printer: {
        ...settings.printer,
        name: printerName,
      },
    });
  };

  const [isTestPrinting, setIsTestPrinting] = useState(false);

  const handleTestPrint = async () => {
    setIsTestPrinting(true);
    try {
      // Actually hand a real print job to the browser's print dialog - the
      // only thing a web app can verify. Whether a physical printer is
      // plugged in and picks it up is then between the browser and the OS.
      const sentToPrintDialog = await printThermalReceipt({
        orderNumber: 'TEST-PRINT',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        customerName: 'Test Customer',
        items: [{ name: 'Sample Item', size: 'M', color: 'Black', quantity: 1, unitPrice: 999, total: 999 }],
        subtotal: 999,
        discount: 0,
        taxAmount: 0,
        grandTotal: 999,
        paymentMethod: 'CASH',
        storeSettings: {
          storeName: settings.storeName,
          address: settings.address,
          cityState: settings.cityState,
          gstin: settings.gstin,
          taxRate: settings.taxRate,
        },
      });

      if (sentToPrintDialog) {
        await store.testPrint();
      } else {
        store.addToast('Test Print Failed', 'The browser could not open the print dialog.', 'error');
      }
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reload catalog, orders, customers, and inventory from the live database? Any unsaved local changes will be discarded.')) {
      store.reloadFromDatabase();
    }
  };

  const handleDbStaffRoleChange = (role: DbStaffRole) => {
    setNewDbStaffRole(role);
    setNewStaffPermissions(DEFAULT_PERMISSIONS_BY_ROLE[role]);
  };

  const toggleNewStaffPermission = (key: PermissionKey) => {
    setNewStaffPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || newStaffPassword.length < 6) {
      store.addToast(
        'Validation',
        'Name, email, and a password of at least 6 characters are required.',
        'error'
      );
      return;
    }

    setIsCreatingStaff(true);
    try {
      await store.createStaffMember({
        displayName: newStaffName.trim(),
        email: newStaffEmail.trim(),
        password: newStaffPassword,
        role: newDbStaffRole,
        permissions: newStaffPermissions,
      });

      setIsStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewDbStaffRole('BILLING');
      setNewStaffPermissions(DEFAULT_PERMISSIONS_BY_ROLE.BILLING);
    } catch (err) {
      store.addToast(
        'Could Not Create Account',
        err instanceof Error ? err.message : 'Something went wrong creating this login.',
        'error'
      );
    } finally {
      setIsCreatingStaff(false);
    }
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
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#4A4844]">
            TERMINAL CONFIGURATION
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            SETTINGS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-1">
            Configure Studio Deny store profile, GSTIN, thermal printer & terminal staff roles
          </div>
        </div>

        <Button variant="secondary" onClick={handleResetData}>
          <RotateCcw size={14} className="mr-2" /> RELOAD FROM DATABASE
        </Button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[rgba(0,0,0,0.18)] overflow-x-auto gap-1 font-mono text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-bold flex items-center gap-2 uppercase tracking-wider shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#111111] text-[#E2E2E4]'
                : 'bg-[#D5D5D8] text-[#4A4844] hover:text-[#111111]'
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
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[rgba(0,0,0,0.1)] pb-3 flex items-center gap-2">
              <Building2 size={16} className="text-[#111111]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
                STUDIO BRAND & FLAGSHIP STORE PROFILE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Brand Title
                </label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Tagline
                </label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Store Street Address
                </label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  City & State
                </label>
                <Input value={cityState} onChange={(e) => setCityState(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Contact Phone
                </label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Support Email
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[rgba(0,0,0,0.1)]">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  GSTIN (Apparel & Retail)
                </label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Income Tax PAN
                </label>
                <Input value={pan} onChange={(e) => setPan(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* 2. BILLING & TAX TAB */}
        {activeTab === 'BILLING' && (
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[rgba(0,0,0,0.1)] pb-3 flex items-center gap-2">
              <Receipt size={16} className="text-[#111111]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
                INVOICE NUMBERING & TAX ENGINE
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Invoice Prefix
                </label>
                <Input
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="SD-INV-"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
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
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
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

            <div className="p-4 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
              <div className="font-bold text-xs text-[#111111]">TAX CONFIGURATION NOTE</div>
              <p className="text-[11px] text-[#4A4844]">
                Studio Deny operates under GST Rate schedule for branded streetwear garments.
                All POS calculations apply {taxRate}% GST on taxable subtotal after discounts.
              </p>
            </div>
          </div>
        )}

        {/* 3. PRINTER CONFIGURATION TAB */}
        {activeTab === 'PRINTER' && (
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[rgba(0,0,0,0.1)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-[#111111]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
                  THERMAL RECEIPT HARDWARE
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${settings.printer?.lastTestPrint ? 'bg-emerald-500' : 'bg-[rgba(0,0,0,0.18)]'}`} />
                <span className={`text-[10px] font-bold uppercase ${settings.printer?.lastTestPrint ? 'text-emerald-700' : 'text-[#4A4844]'}`}>
                  {settings.printer?.lastTestPrint ? `TESTED ${settings.printer.lastTestPrint}` : 'NOT TESTED YET'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#4A4844] bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-3">
              A browser can't detect a physical printer on its own. Printing works through your OS: connect the
              thermal printer to this till's computer (USB, or Bluetooth/WiFi if the printer supports it) and
              install its printer driver so Windows/macOS lists it as a normal printer - then "Test Thermal
              Print" and every real sale's "Pay &amp; Print" will open the print dialog where you pick it.
              "Tested" above only confirms the browser could open that dialog, not that paper actually came out.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Printer Hardware Model
                </label>
                <Input
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Thermal Paper Width
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80MM')}
                    className={`flex-1 py-2 px-3 border font-bold text-xs ${
                      paperWidth === '80MM'
                        ? 'bg-[#111111] text-[#E2E2E4] border-[#111111]'
                        : 'bg-[#D5D5D8] text-[#4A4844] border-[rgba(0,0,0,0.18)]'
                    }`}
                  >
                    80MM (STANDARD POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth('58MM')}
                    className={`flex-1 py-2 px-3 border font-bold text-xs ${
                      paperWidth === '58MM'
                        ? 'bg-[#111111] text-[#E2E2E4] border-[#111111]'
                        : 'bg-[#D5D5D8] text-[#4A4844] border-[rgba(0,0,0,0.18)]'
                    }`}
                  >
                    58MM (COMPACT)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
              <div>
                <div className="font-bold text-xs text-[#111111]">AUTO-PRINT ON SETTLEMENT</div>
                <div className="text-[11px] text-[#4A4844]">
                  Automatically trigger thermal slip print when staff taps [PAY & PRINT]
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 accent-[#111111] cursor-pointer"
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
          <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-6 space-y-5 shadow-subtle">
            <div className="border-b border-[rgba(0,0,0,0.1)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#111111]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
                  TERMINAL STAFF & ACCESS ROLES
                </h3>
              </div>
              {canManageStaff && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStaffModalOpen(true)}
                >
                  <Plus size={13} className="mr-1" /> ADD STAFF
                </Button>
              )}
            </div>

            {!canManageStaff && (
              <div className="text-[11px] text-[#4A4844] bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-3">
                Only the OWNER account can create or edit staff logins and permissions.
              </div>
            )}

            {/* Roles Description Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
                <div className="font-bold text-[#111111]">OWNER</div>
                <div className="text-[#4A4844]">Full access to billing, settings, reports, overrides</div>
              </div>
              <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
                <div className="font-bold text-[#111111]">MANAGER</div>
                <div className="text-[#4A4844]">Billing, Bills history, Products catalog, Customers</div>
              </div>
              <div className="p-3 bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] space-y-1">
                <div className="font-bold text-[#111111]">BILLING STAFF</div>
                <div className="text-[#4A4844]">Dashboard overview, New Bill (POS), Customers</div>
              </div>
            </div>

            {/* Staff Table */}
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                  <th className="py-2.5 px-3">STAFF MEMBER</th>
                  <th className="py-2.5 px-3">ROLE</th>
                  <th className="py-2.5 px-3">CAN SEE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  {canManageStaff && <th className="py-2.5 px-3 text-right">ACCESS</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-3 font-bold text-[#111111]">{s.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-[#111111] text-[#E2E2E4] text-[10px] font-bold">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#4A4844] text-[10px]">
                      {s.permissions.length === ALL_PERMISSIONS.length
                        ? 'Everything'
                        : s.permissions.length === 0
                        ? 'Nothing yet'
                        : `${s.permissions.length} of ${ALL_PERMISSIONS.length} sections`}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          s.status === 'ACTIVE' ? 'text-emerald-700' : 'text-[#4A4844]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-[rgba(0,0,0,0.18)]'
                          }`}
                        />
                        {s.status}
                      </span>
                    </td>
                    {canManageStaff && (
                      <td className="py-3 px-3 text-right">
                        {s.id === currentStaff?.id ? (
                          <span className="text-[10px] text-[#4A4844]" title="You can't edit your own access - ask another OWNER, or use the database directly.">
                            (you)
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingStaffId(s.id === editingStaffId ? null : s.id)}
                          >
                            {editingStaffId === s.id ? 'CLOSE' : 'EDIT ACCESS'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {canManageStaff && editingStaffId && (
              <StaffAccessEditor
                key={editingStaffId}
                staffMember={staff.find((s) => s.id === editingStaffId)!}
                onClose={() => setEditingStaffId(null)}
              />
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            <Save size={14} className="mr-2" /> SAVE SETTINGS
          </Button>
        </div>
      </form>

      {/* Not a button, not a tab, not labeled - the OWNER knows this dot
          opens the settled-invoice editor. Renders as nothing at all for
          anyone else. */}
      {canManageStaff && (
        <button
          type="button"
          onClick={() => setIsInvoiceEditorOpen(true)}
          title="."
          aria-label="Edit invoices"
          className="fixed bottom-3 right-3 w-2 h-2 rounded-full bg-[rgba(0,0,0,0.1)] hover:bg-[#111111] transition-colors z-10"
        />
      )}

      {isInvoiceEditorOpen && (
        <div className="fixed inset-0 z-50 bg-[#111111]/50 flex items-center justify-center p-4">
          <div className="bg-[#D5D5D8] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-4 border-b border-[rgba(0,0,0,0.18)] flex items-center justify-between sticky top-0 bg-[#D5D5D8]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#4A4844]">
                Owner-only
              </span>
              <button
                type="button"
                onClick={() => setIsInvoiceEditorOpen(false)}
                className="text-[#4A4844] hover:text-[#111111] font-mono text-xs"
              >
                CLOSE ✕
              </button>
            </div>
            <div className="p-4">
              <EditInvoicePanel />
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#111111]/50 flex items-center justify-center p-4">
          <div className="bg-[#D5D5D8] border border-[#111111] p-6 max-w-md w-full font-mono text-xs space-y-4 shadow-xl">
            <h3 className="font-display font-bold text-base text-[#111111]">
              REGISTER TERMINAL OPERATOR
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">
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
                <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">
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
                <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Temporary Password * (min 6 characters)
                </label>
                <div className="relative flex items-center">
                  <Input
                    required
                    type={showNewStaffPassword ? 'text' : 'password'}
                    placeholder="e.g. Deny@2026"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword((v) => !v)}
                    className="absolute right-3 text-[#4A4844] hover:text-[#111111]"
                    title={showNewStaffPassword ? 'Hide password' : 'Show password to relay it to the new hire'}
                  >
                    {showNewStaffPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Role Permission
                </label>
                <select
                  value={newDbStaffRole}
                  onChange={(e) => handleDbStaffRoleChange(e.target.value as DbStaffRole)}
                  className="w-full bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-2 text-xs font-mono focus:outline-none"
                >
                  <option value="BILLING">BILLING STAFF (Dashboard, POS, Bills)</option>
                  <option value="FULFILLMENT">FULFILLMENT (Dashboard, Bills only)</option>
                  <option value="MANAGER">MANAGER (Billing, Products, Customers)</option>
                  <option value="OWNER">OWNER (Full Access)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">
                  Can See (toggle per section)
                </label>
                <div className="grid grid-cols-2 gap-1.5 border border-[rgba(0,0,0,0.18)] p-2.5 bg-[#E2E2E4]">
                  {ALL_PERMISSIONS.map((key) => (
                    <label key={key} className="flex items-center gap-1.5 text-[10px] text-[#111111] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStaffPermissions.includes(key)}
                        onChange={() => toggleNewStaffPermission(key)}
                        className="accent-[#111111]"
                      />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
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
                <Button type="submit" variant="primary" size="sm" disabled={isCreatingStaff}>
                  {isCreatingStaff ? 'CREATING...' : 'SAVE OPERATOR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StaffAccessEditor: React.FC<{
  staffMember: { id: string; name: string; role: DbStaffRole | 'ADMIN'; permissions: string[]; status: 'ACTIVE' | 'OFFLINE' };
  onClose: () => void;
}> = ({ staffMember, onClose }) => {
  const [role, setRole] = useState<DbStaffRole>(staffMember.role === 'ADMIN' ? 'OWNER' : staffMember.role);
  const [permissions, setPermissions] = useState<PermissionKey[]>(staffMember.permissions as PermissionKey[]);
  const [isActive, setIsActive] = useState(staffMember.status === 'ACTIVE');
  const [saving, setSaving] = useState(false);

  const togglePermission = (key: PermissionKey) => {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await store.updateStaffPermissions(staffMember.id, { role, permissions, isActive });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[#111111] p-4 space-y-3 bg-[#E2E2E4] font-mono text-xs">
      <div className="font-bold text-[#111111]">EDIT ACCESS — {staffMember.name}</div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as DbStaffRole)}
          className="w-full bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] p-2 text-xs font-mono focus:outline-none"
        >
          <option value="BILLING">BILLING STAFF</option>
          <option value="FULFILLMENT">FULFILLMENT</option>
          <option value="MANAGER">MANAGER</option>
          <option value="OWNER">OWNER</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-[10px] text-[#111111] cursor-pointer w-fit">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#111111]" />
          Account Active (unchecking blocks login)
        </label>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-[#4A4844] mb-1">Can See</label>
        <div className="grid grid-cols-2 gap-1.5 border border-[rgba(0,0,0,0.18)] p-2.5 bg-[#D5D5D8]">
          {ALL_PERMISSIONS.map((key) => (
            <label key={key} className="flex items-center gap-1.5 text-[10px] text-[#111111] cursor-pointer">
              <input
                type="checkbox"
                checked={permissions.includes(key)}
                onChange={() => togglePermission(key)}
                className="accent-[#111111]"
              />
              {PERMISSION_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          CANCEL
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'SAVING...' : 'SAVE ACCESS'}
        </Button>
      </div>
    </div>
  );
};
