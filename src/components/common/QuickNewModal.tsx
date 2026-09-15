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

interface QuickNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveAction = 'MENU' | 'NEW_PRODUCT' | 'NEW_CUSTOMER' | 'ADJUST_STOCK';

export const QuickNewModal: React.FC<QuickNewModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { products, collections } = useStore();
  const [activeAction, setActiveAction] = useState<ActiveAction>('MENU');

  // New Product Form State
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [collection, setCollection] = useState(collections[0]?.name || 'CORE');
  const [category, setCategory] = useState('T-Shirts');
  const [price, setPrice] = useState('2990');
  const [stock, setStock] = useState('25');

  // New Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('Mumbai');
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

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !sku) return;

    const numPrice = Number(price) || 2490;
    const numStock = Number(stock) || 10;

    const newProd = await store.addProduct({
      name: productName,
      sku: sku.toUpperCase(),
      collection,
      category,
      price: numPrice,
      compareAtPrice: Math.round(numPrice * 1.2),
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black'],
      status: 'ACTIVE',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      description: `Studio Deny ${collection} release. Premium heavyweight construction.`,
      tags: [collection, category],
      variants: [
        { id: `var-${Date.now()}-s`, sku: `${sku.toUpperCase()}-S`, color: 'Black', size: 'S', price: numPrice, stock: Math.round(numStock * 0.2) },
        { id: `var-${Date.now()}-m`, sku: `${sku.toUpperCase()}-M`, color: 'Black', size: 'M', price: numPrice, stock: Math.round(numStock * 0.4) },
        { id: `var-${Date.now()}-l`, sku: `${sku.toUpperCase()}-L`, color: 'Black', size: 'L', price: numPrice, stock: Math.round(numStock * 0.3) },
        { id: `var-${Date.now()}-xl`, sku: `${sku.toUpperCase()}-XL`, color: 'Black', size: 'XL', price: numPrice, stock: Math.round(numStock * 0.1) },
      ],
    });

    handleClose();
    navigate(`/products/${newProd.id}`);
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
          : activeAction === 'NEW_PRODUCT'
          ? 'NEW PRODUCT RELEASE'
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
            className="p-3.5 border border-[#0A0A0A] bg-[#0A0A0A] text-white hover:bg-neutral-800 cursor-pointer flex items-center justify-between transition-colors group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/10 text-white border border-white/20">
                <Receipt size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-white">START NEW BILL</div>
                <div className="text-xs text-neutral-300">Open touch POS billing terminal to scan, tender, & print</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-white" />
          </div>

          <div
            onClick={() => setActiveAction('NEW_CUSTOMER')}
            className="p-3.5 border border-[#CFCFD2] hover:border-[#0A0A0A] hover:bg-[#F1F1F3] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#F1F1F3] group-hover:bg-white border border-[#CFCFD2]">
                <UserPlus size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#0A0A0A]">REGISTER NEW PATRON</div>
                <div className="text-xs text-[#666666]">Add customer name, phone number, and city</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#888888] group-hover:text-[#0A0A0A]" />
          </div>

          <div
            onClick={() => setActiveAction('NEW_PRODUCT')}
            className="p-3.5 border border-[#CFCFD2] hover:border-[#0A0A0A] hover:bg-[#F1F1F3] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#F1F1F3] group-hover:bg-white border border-[#CFCFD2]">
                <Shirt size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#0A0A0A]">ADD NEW PRODUCT</div>
                <div className="text-xs text-[#666666]">Create streetwear SKU with size variants and price</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#888888] group-hover:text-[#0A0A0A]" />
          </div>

          <div
            onClick={() => setActiveAction('ADJUST_STOCK')}
            className="p-3.5 border border-[#CFCFD2] hover:border-[#0A0A0A] hover:bg-[#F1F1F3] cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#F1F1F3] group-hover:bg-white border border-[#CFCFD2]">
                <Boxes size={16} />
              </span>
              <div>
                <div className="font-display font-bold text-sm text-[#0A0A0A]">ADJUST STOCK</div>
                <div className="text-xs text-[#666666]">Quick stock increment or count reconciliation</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#888888] group-hover:text-[#0A0A0A]" />
          </div>
        </div>
      )}

      {/* NEW PRODUCT FORM */}
      {activeAction === 'NEW_PRODUCT' && (
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="PRODUCT NAME"
              required
              placeholder="e.g. ARCHIVE TRACK JACKET"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <Input
              label="BASE SKU"
              required
              placeholder="e.g. DNY-JKT-008"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="COLLECTION"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              options={collections.map((c) => ({ value: c.name, label: c.name }))}
            />
            <Select
              label="CATEGORY"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'T-Shirts', label: 'T-Shirts' },
                { value: 'Hoodies', label: 'Hoodies' },
                { value: 'Pants', label: 'Pants & Cargos' },
                { value: 'Jackets', label: 'Jackets & Outerwear' },
                { value: 'Headwear', label: 'Headwear' },
                { value: 'Jewelry', label: 'Jewelry' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="RETAIL PRICE (INR ₹)"
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="INITIAL BATCH TOTAL UNITS"
              type="number"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-between border-t border-[#CFCFD2]">
            <Button type="button" variant="outline" onClick={() => setActiveAction('MENU')}>
              Back
            </Button>
            <Button type="submit" variant="primary">
              [ CREATE PRODUCT ]
            </Button>
          </div>
        </form>
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

          <div className="pt-3 flex justify-between border-t border-[#CFCFD2]">
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

          <div className="pt-3 flex justify-between border-t border-[#CFCFD2]">
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
