import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MetricBlock } from '../../components/ui/MetricBlock';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { formatINR } from '../../utils/formatters';
import {
  Users,
  Plus,
  Search,
  ArrowRight,
  Crown,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { customers } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [segment, setSegment] = useState<'VIP' | 'HIGH_VALUE' | 'ACTIVE' | 'NEW'>('ACTIVE');

  const totalLTV = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgLTV = customers.length ? Math.round(totalLTV / customers.length) : 0;
  const vipCount = customers.filter((c) => c.segment === 'VIP').length;

  const filterTabs = [
    { id: 'ALL', label: 'ALL CLIENTS', count: customers.length },
    { id: 'VIP', label: 'VIP COLLECTORS', count: vipCount },
    {
      id: 'HIGH_VALUE',
      label: 'HIGH VALUE',
      count: customers.filter((c) => c.segment === 'HIGH_VALUE').length,
    },
    {
      id: 'ACTIVE',
      label: 'ACTIVE',
      count: customers.filter((c) => c.segment === 'ACTIVE').length,
    },
    {
      id: 'NEW',
      label: 'FIRST-TIME',
      count: customers.filter((c) => c.segment === 'NEW').length,
    },
  ];

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.city.toLowerCase().includes(search.toLowerCase());

    const matchesTab = activeTab === 'ALL' || c.segment === activeTab;

    return matchesSearch && matchesTab;
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newCust = await store.addCustomer({
      name,
      email,
      phone: phone || '+91 98000 00000',
      address: address || 'High Street Studio Ward, Mumbai',
      city: city || 'Mumbai',
      segment,
    });

    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    navigate(`/customers/${newCust.id}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.18)] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest-editorial text-[#4A4844]">
            CLIENT RELATIONSHIP MANAGEMENT
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] mt-1">
            CUSTOMERS & COLLECTORS
          </h1>
          <div className="text-xs font-mono text-[#4A4844] mt-2">
            Managing {customers.length} Verified Streetwear Patrons & VIP Drop Subscribers
          </div>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} className="mr-2" /> ADD CUSTOMER
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock
          label="REGISTERED CLIENTS"
          value={customers.length}
          subtext="Verified profiles in CRM"
        />
        <MetricBlock
          label="VIP TIER COLLECTORS"
          value={vipCount}
          subtext="Lifetime spend > ₹40,000"
        />
        <MetricBlock
          label="AGGREGATE LTV"
          value={formatINR(totalLTV)}
          subtext="Cumulative client GMV"
        />
        <MetricBlock
          label="AVERAGE CLIENT LTV"
          value={formatINR(avgLTV)}
          subtext="Mean spend per customer"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[#D5D5D8] p-3 border border-[rgba(0,0,0,0.18)]">
        <Search size={15} className="text-[#4A4844]" />
        <input
          type="text"
          placeholder="Search by client name, email, phone number, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent font-mono text-xs focus:outline-none placeholder:text-[#4A4844]"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.18)] bg-[#D5D5D8] text-[10px] uppercase text-[#4A4844]">
                <th className="py-3 px-4 font-medium">PATRON DOSSIER</th>
                <th className="py-3 px-4 font-medium">CONTACT & CITY</th>
                <th className="py-3 px-4 font-medium">TIER STATUS</th>
                <th className="py-3 px-4 font-medium text-center">TOTAL ORDERS</th>
                <th className="py-3 px-4 font-medium">LIFETIME VALUE</th>
                <th className="py-3 px-4 font-medium">AOV</th>
                <th className="py-3 px-4 font-medium">LAST ORDER</th>
                <th className="py-3 px-4 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => navigate(`/customers/${cust.id}`)}
                  className="hover:bg-[#E2E2E4] transition-colors cursor-pointer group"
                >
                  {/* Patron Dossier */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#111111] text-[#E2E2E4] flex items-center justify-center font-bold text-xs shrink-0">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[#111111] group-hover:underline flex items-center gap-1.5">
                          {cust.name}
                          {cust.segment === 'VIP' && (
                            <Crown size={12} className="text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <span className="text-[11px] text-[#4A4844] block">{cust.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact & City */}
                  <td className="py-3 px-4 text-[#111111]">
                    <div>{cust.phone}</div>
                    <span className="text-[10px] text-[#4A4844] flex items-center gap-1">
                      <MapPin size={10} /> {cust.city}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="py-3 px-4">
                    <StatusBadge status={cust.segment} />
                  </td>

                  {/* Orders */}
                  <td className="py-3 px-4 text-center font-bold text-[#111111]">
                    {cust.ordersCount} orders
                  </td>

                  {/* LTV */}
                  <td className="py-3 px-4 font-bold text-[#111111]">
                    {formatINR(cust.totalSpend)}
                  </td>

                  {/* AOV */}
                  <td className="py-3 px-4 text-[#111111] font-medium">
                    {formatINR(cust.averageOrderValue)}
                  </td>

                  {/* Last Order */}
                  <td className="py-3 px-4 text-[#4A4844]">
                    <div>{cust.lastOrderNumber || '—'}</div>
                    <span className="text-[10px] text-[#4A4844]">{cust.lastOrderDate || 'No orders yet'}</span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/billing/new?customerId=${cust.id}`)}
                      className="px-2.5 py-1 bg-[#111111] text-[#E2E2E4] text-xs font-mono font-semibold hover:bg-neutral-800"
                    >
                      + BILL
                    </button>
                    <button
                      onClick={() => navigate(`/customers/${cust.id}`)}
                      className="px-2.5 py-1 border border-[rgba(0,0,0,0.18)] hover:border-[#111111] text-xs font-mono"
                    >
                      VIEW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="REGISTER NEW PATRON PROFILE"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
              Full Name
            </label>
            <Input
              placeholder="e.g. Arjun Kapoor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="collector@studiodeny.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                Phone Number
              </label>
              <Input
                placeholder="+91 98200 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                City / Region
              </label>
              <Input
                placeholder="e.g. Mumbai, Delhi, Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
                Initial Tier Segment
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as any)}
                className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE PATRON</option>
                <option value="VIP">VIP COLLECTOR</option>
                <option value="HIGH_VALUE">HIGH VALUE</option>
                <option value="NEW">FIRST-TIME REGISTRANT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-[#4A4844] mb-1">
              Primary Shipping Address
            </label>
            <textarea
              rows={2}
              placeholder="Apartment, Street address, Pincode..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#E2E2E4] border border-[rgba(0,0,0,0.18)] p-2.5 text-xs font-mono focus:bg-[#D5D5D8] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[rgba(0,0,0,0.18)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
