import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useStore, store } from '../../services/store';
import {
  ShoppingBag,
  Shirt,
  UserPlus,
  Boxes,
  Percent,
  CreditCard,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { CustomerSegment } from '../../types';
import { WEBSITE_ADMIN_NEW_PRODUCT_URL } from '../../constants/website';

interface QuickNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveAction = 'MENU' | 'NEW_CUSTOMER' | 'ADJUST_STOCK';

export const QuickNewModal: React.FC<QuickNewModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { products, collections } = useStore();
  const [activeAction, setActiveAction] = useState<ActiveAction>('MENU');

  // New Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('Visakhapatnam');
  const [segment, setSegment] = useState<CustomerSegment>('NEW');

  // Adjust Inventory State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const activeProduct = products.find((p) => p.id === selectedProductId);
  const [selectedVariantId, setSelectedVariantId] = useState(
    activeProduct?.variants[0]?.id || ''
  );
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState<'RESTOCK' | 'ADJUSTMENT' | 'DAMAGED'>('RESTOCK');

  const handleClose = () => {
    setActiveAction('MENU');
    onClose();
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) return;

    const newCust = await store.addCustomer({
      name: customerName,
      email: customerEmail,
      phone: customerPhone || '+91 98200 00000',
      address: customerAddress || 'Residence Address TBD',
      city: customerCity,
      segment,
    });

    handleClose();
    navigate(`/customers/${newCust.id}`);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedVariantId) return;

    await store.adjustStock(
      selectedProductId,
      selectedVariantId,
      Number(adjustQty) || 0,
      adjustReason
    );

    handleClose();
    navigate('/products');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        activeAction === 'MENU'
          ? 'DENY OS COMMAND CENTER'
          : activeAction === 'NEW_CUSTOMER'
          ? 'ONBOARD CUSTOMER'
          : 'ADJUST INVENTORY STOCK'
      }
      subtitle={
        activeAction === 'MENU'
          ? 'QUICK COMMERCE ACTIONS'
          : 'FILL REQUIRED STREETWEAR DATA FIELDS'
      }
      maxWidth={activeAction === 'MENU' ? 'md' : 'lg'}
    >
      {activeAction === 'MENU' && (
        <div className="grid grid-cols-1 gap-2">
          <div
            onClick={() => {
              handleClose();
              navigate('/billing/new');
            }}
            className="p-3.5 border border-[#111111] bg-[#111111] text-[#E2E2E4] hover:bg-neutral-800 cursor-pointer flex items-center justify-between transition-colors group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#D5D5D8]/10 text-[#E2E2E4] border border-[#E2E2E4]/20">
                <Receipt size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#E2E2E4]">START NEW BILL</div>
                <div className="text-xs text-neutral-300">Open touch POS billing terminal to scan, tender, & print</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#E2E2E4]" />
          </div>

          <div
            onClick={() => setActiveAction('NEW_CUSTOMER')}
            className="p-3.5 border border-[rgba(0,0,0,0.18)] hover:border-[#111111] hover:bg-[#D5D5D8] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#D5D5D8] group-hover:bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
                <UserPlus size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#111111]">REGISTER NEW PATRON</div>
                <div className="text-xs text-[#4A4844]">Add customer name, phone number, and city</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#4A4844] group-hover:text-[#111111]" />
          </div>

          <div
            onClick={() => { window.open(WEBSITE_ADMIN_NEW_PRODUCT_URL, '_blank', 'noopener'); handleClose(); }}
            className="p-3.5 border border-[rgba(0,0,0,0.18)] hover:border-[#111111] hover:bg-[#D5D5D8] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#D5D5D8] group-hover:bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
                <Shirt size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#111111]">ADD NEW PRODUCT</div>
                <div className="text-xs text-[#4A4844]">Opens the website admin — add colours, sizes and stock per size there</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#4A4844] group-hover:text-[#111111]" />
          </div>

          <div
            onClick={() => setActiveAction('ADJUST_STOCK')}
            className="p-3.5 border border-[rgba(0,0,0,0.18)] hover:border-[#111111] hover:bg-[#D5D5D8] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#D5D5D8] group-hover:bg-[#D5D5D8] border border-[rgba(0,0,0,0.18)]">
                <Boxes size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#111111]">ADJUST STOCK</div>
                <div className="text-xs text-[#4A4844]">Quick stock increment or count reconciliation</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#4A4844] group-hover:text-[#111111]" />
          </div>
        </div>
      )}

      {/* NEW CUSTOMER FORM */}
      {activeAction === 'NEW_CUSTOMER' && (
        <form onSubmit={handleCustomerSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="FULL NAME"
              required
              placeholder="e.g. Rohan Mehra"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              label="EMAIL ADDRESS"
              type="email"
              required
              placeholder="rohan@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="PHONE NUMBER"
              placeholder="+91 98200 00000"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <Input
              label="CITY"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
            />
          </div>

          <Input
            label="SHIPPING ADDRESS"
            placeholder="Apartment, Street, Area"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />

          <div className="pt-3 flex justify-between border-t border-[rgba(0,0,0,0.18)]">
            <Button type="button" variant="outline" onClick={() => setActiveAction('MENU')}>
              Back
            </Button>
            <Button type="submit" variant="primary">
              [ SAVE CUSTOMER ]
            </Button>
          </div>
        </form>
      )}

      {/* ADJUST INVENTORY FORM */}
      {activeAction === 'ADJUST_STOCK' && (
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <Select
            label="SELECT PRODUCT"
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const p = products.find((prod) => prod.id === e.target.value);
              if (p && p.variants[0]) setSelectedVariantId(p.variants[0].id);
            }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
          />

          {activeProduct && (
            <Select
              label="SELECT SPECIFIC VARIANT"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              options={activeProduct.variants.map((v) => ({
                value: v.id,
                label: `${v.sku} — ${v.color} / ${v.size} (Current: ${v.stock} units)`,
              }))}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="QUANTITY TO ADJUST (±)"
              type="number"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
            <Select
              label="REASON"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value as any)}
              options={[
                { value: 'RESTOCK', label: 'RESTOCK (+ Units)' },
                { value: 'ADJUSTMENT', label: 'INVENTORY AUDIT RECOUNT' },
                { value: 'DAMAGED', label: 'DAMAGED GOODS REMOVAL' },
              ]}
            />
          </div>

          <div className="pt-3 flex justify-between border-t border-[rgba(0,0,0,0.18)]">
            <Button type="button" variant="outline" onClick={() => setActiveAction('MENU')}>
              Back
            </Button>
            <Button type="submit" variant="primary">
              [ COMMIT ADJUSTMENT ]
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
