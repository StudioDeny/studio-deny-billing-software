import React, { useState } from 'react';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  ShieldCheck,
  Plus,
  Users,
  KeyRound,
  Check,
  UserCheck,
} from 'lucide-react';
import { StaffRole, StaffMember } from '../../types';

export const StaffPage: React.FC = () => {
  const { staff } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('BILLING');

  const adminCount = staff.filter((s) => s.role === 'ADMIN').length;
  const billingCount = staff.filter((s) => s.role === 'BILLING').length;
  const fulfillmentCount = staff.filter((s) => s.role === 'FULFILLMENT').length;

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      name,
      email,
      role,
      status: 'ACTIVE',
      permissions:
        role === 'ADMIN'
          ? ['ALL_ACCESS', 'BILLING', 'INVENTORY', 'REFUNDS', 'SETTINGS']
          : role === 'BILLING'
          ? ['POS_BILLING', 'INVOICES', 'CUSTOMER_CRM']
          : ['WAREHOUSE_PACKING', 'SHIPPING_DISPATCH', 'STOCK_AUDIT'],
    };

    store.addToast('Staff Member Created', `${name} assigned role of [${role}].`, 'success');
    setIsModalOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            SECURITY & ACCESS CONTROL
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            STAFF & OPERATOR PERMISSIONS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Managing POS Cashiers, Warehouse Logistics Operators, and Studio Executives
          </div>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} className="mr-2" /> NEW STAFF OPERATOR
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="ACTIVE OPERATORS"
          value={staff.length}
          subtext="Configured store staff"
        />
        <MetricBlock
          label="ADMIN PRIVILEGES"
          value={adminCount}
          subtext="Unrestricted studio access"
        />
        <MetricBlock
          label="POS CASHIERS"
          value={billingCount}
          subtext="Authorized iPad billing"
        />
        <MetricBlock
          label="WAREHOUSE CREW"
          value={fulfillmentCount}
          subtext="Packing & shipping queue"
        />
      </div>

      {/* Staff Members Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="p-4 border-b border-[rgba(0,0,0,0.18)] bg-[#E2E2E4] flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
            AUTHORIZED OPERATOR DIRECTORY
          </h3>
          <span className="text-xs font-mono text-[#4A4844]">{staff.length} Active Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">OPERATOR NAME</th>
                <th className="py-3 px-4 font-medium">AUTHENTICATION EMAIL</th>
                <th className="py-3 px-4 font-medium">ASSIGNED ROLE</th>
                <th className="py-3 px-4 font-medium">MODULE PERMISSIONS</th>
                <th className="py-3 px-4 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-[#E2E2E4] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#111111] text-[#E2E2E4] flex items-center justify-center font-bold text-xs">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-[#111111]">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#4A4844]">{member.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#111111] text-[#E2E2E4] text-[10px] font-bold tracking-wider uppercase">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="text-[9px] font-mono px-1.5 py-0.2 bg-[#D5D5D8] text-[#111111] border border-[rgba(0,0,0,0.18)]"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={member.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="INVITE STAFF OPERATOR"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
              Full Name
            </label>
            <Input
              placeholder="e.g. Samir Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
              Store Email Address
            </label>
            <Input
              type="email"
              placeholder="samir@studiodeny.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
              Role & Responsibility
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none"
            >
              <option value="BILLING">BILLING CASHIER (iPad POS Register)</option>
              <option value="FULFILLMENT">FULFILLMENT & WAREHOUSE (Packing & Dispatch)</option>
              <option value="MANAGER">STORE MANAGER (Inventory, Catalog, CRM)</option>
              <option value="ADMIN">SYSTEM ADMIN (Full Privileges)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-[rgba(0,0,0,0.18)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Grant Store Access
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
