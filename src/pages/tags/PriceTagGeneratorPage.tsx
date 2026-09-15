import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../services/store';
import { Button } from '../../components/ui/Button';
import { formatINR } from '../../utils/formatters';
import { BarcodeSvg } from '../../components/common/BarcodeSvg';
import { ClothingCategory, TagFormat } from '../../types';
import {
  Tag,
  Printer,
  Sparkles,
  Layers,
  Shirt,
  Scissors,
  Check,
  RefreshCw,
  Sliders,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Grid,
} from 'lucide-react';

interface TagVariantItem {
  id: string;
  sku: string;
  color: string;
  size: string;
  mrp: number;
  price: number;
  printQty: number;
}

const CATEGORY_PRESETS: Record<
  ClothingCategory,
  {
    label: string;
    icon: string;
    defaultFabric: string;
    defaultFit: string;
    sizes: string[];
    defaultCare: string[];
  }
> = {
  'T-SHIRTS': {
    label: 'T-SHIRTS & TEES',
    icon: '👕',
    defaultFabric: '100% Combed Cotton · 260 GSM Heavyweight',
    defaultFit: 'Oversized Streetwear Fit · Drop Shoulder',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    defaultCare: ['30°C Machine Wash', 'Do Not Bleach', 'Warm Iron Inside Out', 'Line Dry In Shade'],
  },
  'SHIRTS': {
    label: 'WOVEN SHIRTS',
    icon: '👔',
    defaultFabric: '100% Oxford Cotton / Pure Linen Blend',
    defaultFit: 'Relaxed Resort Fit · Cuban Collar',
    sizes: ['38 (S)', '40 (M)', '42 (L)', '44 (XL)', '46 (XXL)'],
    defaultCare: ['Gentle Machine Wash', 'Do Not Tumble Dry', 'Warm Iron', 'Dry Clean Safe'],
  },
  'JEANS': {
    label: 'DENIM & JEANS',
    icon: '👖',
    defaultFabric: '100% Cotton · 14.5oz Japanese Raw Selvedge Denim',
    defaultFit: 'Straight Cut · Articulated Knee · High Rise',
    sizes: ['28/30', '30/32', '32/32', '34/32', '36/34', '38/34'],
    defaultCare: ['Wash Rare & Cold', 'Turn Inside Out', 'Do Not Tumble Dry', 'Dries Naturally'],
  },
  'FOOTWEAR': {
    label: 'FOOTWEAR & SNEAKERS',
    icon: '👟',
    defaultFabric: 'Full-Grain Calfskin Leather & Breathable Mesh',
    defaultFit: 'Vibram® Custom Lugged Outsole · OrthoLite® Insole',
    sizes: ['UK 6 / EU 40', 'UK 7 / EU 41', 'UK 8 / EU 42', 'UK 9 / EU 43', 'UK 10 / EU 44', 'UK 11 / EU 45'],
    defaultCare: ['Wipe With Damp Cloth', 'Use Leather Conditioner', 'Store In Dustbag', 'Keep Dry'],
  },
  'HOODIES': {
    label: 'HOODIES & SWEATS',
    icon: '🧥',
    defaultFabric: '450 GSM French Terry Cotton · Fleece Lined',
    defaultFit: 'Boxy Cropped Silhouette · Double Layer Hood',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultCare: ['Cold Delicate Cycle', 'Do Not Wring', 'Flat Dry Only', 'Iron Low Heat'],
  },
  'JACKETS': {
    label: 'JACKETS & OUTERWEAR',
    icon: '🦺',
    defaultFabric: '3-Layer Weatherproof Ripstop Nylon · Teflon Finish',
    defaultFit: 'Modular Tech Silhouette · Fidlock Magnetic Latches',
    sizes: ['M', 'L', 'XL'],
    defaultCare: ['Spot Clean Only', 'Do Not Dry Clean', 'No Bleach', 'Air Dry Outdoors'],
  },
  'PANTS': {
    label: 'CARGO & PANTS',
    icon: '🩳',
    defaultFabric: 'Articulated Cotton Twill · Reinforced Seat',
    defaultFit: 'Tapered Utility Cargo · 8 Pockets',
    sizes: ['30', '32', '34', '36'],
    defaultCare: ['30°C Normal Wash', 'Wash With Similar Colors', 'Tumble Dry Low'],
  },
  'ACCESSORIES': {
    label: 'ACCESSORIES & JEWELRY',
    icon: '🧢',
    defaultFabric: 'Hallmarked 925 Sterling Silver / Heavy Twill',
    defaultFit: 'Engineered Precision Finish',
    sizes: ['ONE SIZE', 'Size 8', 'Size 9', 'Size 10', 'Size 11'],
    defaultCare: ['Wipe With Microfiber', 'Keep Away From Harsh Solvents'],
  },
};

export const PriceTagGeneratorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { products, settings } = useStore();

  const preselectedProdId = searchParams.get('productId') || '';
  const initialProduct = products.find((p) => p.id === preselectedProdId) || products[0];

  // Selected Category
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory>(
    (initialProduct?.category.toUpperCase().includes('SHIRT')
      ? initialProduct.category.toUpperCase().includes('T-')
        ? 'T-SHIRTS'
        : 'SHIRTS'
      : initialProduct?.category.toUpperCase().includes('JEAN') || initialProduct?.category.toUpperCase().includes('PANT')
      ? 'JEANS'
      : initialProduct?.category.toUpperCase().includes('HOOD')
      ? 'HOODIES'
      : initialProduct?.category.toUpperCase().includes('JACKET')
      ? 'JACKETS'
      : initialProduct?.category.toUpperCase().includes('FOOT') || initialProduct?.category.toUpperCase().includes('SHOE')
      ? 'FOOTWEAR'
      : 'T-SHIRTS') as ClothingCategory
  );

  // Layout Format
  const [tagFormat, setTagFormat] = useState<TagFormat>('HANG_TAG');

  // Product Core Info
  const [productName, setProductName] = useState(initialProduct?.name || 'DENY OVERSIZED TEE');
  const [brandName, setBrandName] = useState(settings.storeName || 'STUDIO DENY');
  const [collectionName, setCollectionName] = useState(initialProduct?.collection || 'CORE');
  const [fabricSpecs, setFabricSpecs] = useState(
    CATEGORY_PRESETS[selectedCategory]?.defaultFabric || '100% Combed Cotton'
  );
  const [garmentFit, setGarmentFit] = useState(
    CATEGORY_PRESETS[selectedCategory]?.defaultFit || 'Oversized Streetwear Fit'
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState('MADE IN INDIA');
  const [mfdDate, setMfdDate] = useState('09/2026');

  // Multi-variant tag generation list
  const [variantList, setVariantList] = useState<TagVariantItem[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      return initialProduct.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        mrp: initialProduct.compareAtPrice || Math.round(v.price * 1.25),
        price: v.price,
        printQty: 2,
      }));
    }

    return [
      { id: 'v-s', sku: 'DNY-TEE-001-S', color: 'Stealth Black', size: 'S', mrp: 3490, price: 2490, printQty: 2 },
      { id: 'v-m', sku: 'DNY-TEE-001-M', color: 'Stealth Black', size: 'M', mrp: 3490, price: 2490, printQty: 4 },
      { id: 'v-l', sku: 'DNY-TEE-001-L', color: 'Stealth Black', size: 'L', mrp: 3490, price: 2490, printQty: 4 },
      { id: 'v-xl', sku: 'DNY-TEE-001-XL', color: 'Stealth Black', size: 'XL', mrp: 3490, price: 2490, printQty: 2 },
    ];
  });

  // Selected single variant for live preview focus
  const [previewVariantIndex, setPreviewVariantIndex] = useState(0);

  // Quick switch product from catalog
  const handleLoadProduct = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setProductName(prod.name);
    setCollectionName(prod.collection);

    // Guess category
    let cat: ClothingCategory = 'T-SHIRTS';
    const cUpper = prod.category.toUpperCase();
    if (cUpper.includes('T-SHIRT') || cUpper.includes('TEE')) cat = 'T-SHIRTS';
    else if (cUpper.includes('SHIRT')) cat = 'SHIRTS';
    else if (cUpper.includes('JEAN') || cUpper.includes('PANT')) cat = 'JEANS';
    else if (cUpper.includes('HOOD')) cat = 'HOODIES';
    else if (cUpper.includes('JACKET')) cat = 'JACKETS';
    else if (cUpper.includes('FOOT') || cUpper.includes('SHOE')) cat = 'FOOTWEAR';
    else if (cUpper.includes('ACC') || cUpper.includes('JEWEL') || cUpper.includes('CAP')) cat = 'ACCESSORIES';

    setSelectedCategory(cat);
    setFabricSpecs(CATEGORY_PRESETS[cat].defaultFabric);
    setGarmentFit(CATEGORY_PRESETS[cat].defaultFit);

    setVariantList(
      prod.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        mrp: prod.compareAtPrice || Math.round(v.price * 1.25),
        price: v.price,
        printQty: Math.max(1, Math.min(10, v.stock)),
      }))
    );
    setPreviewVariantIndex(0);
  };

  // Switch category presets
  const handleSelectCategory = (cat: ClothingCategory) => {
    setSelectedCategory(cat);
    setFabricSpecs(CATEGORY_PRESETS[cat].defaultFabric);
    setGarmentFit(CATEGORY_PRESETS[cat].defaultFit);

    // Auto-adjust format recommendation for footwear
    if (cat === 'FOOTWEAR' && tagFormat === 'HANG_TAG') {
      setTagFormat('SHOEBOX');
    } else if (cat !== 'FOOTWEAR' && tagFormat === 'SHOEBOX') {
      setTagFormat('HANG_TAG');
    }
  };

  // Add a new variant row manually
  const handleAddVariantRow = () => {
    const nextSize = CATEGORY_PRESETS[selectedCategory]?.sizes[variantList.length % CATEGORY_PRESETS[selectedCategory].sizes.length] || 'L';
    const newSku = `${productName.substring(0, 3).toUpperCase()}-${selectedCategory.substring(0, 3)}-${nextSize}`;
    setVariantList((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        sku: newSku,
        color: 'Pure Black',
        size: nextSize,
        mrp: 3490,
        price: 2490,
        printQty: 2,
      },
    ]);
  };

  const handleRemoveVariantRow = (id: string) => {
    if (variantList.length <= 1) return;
    setVariantList((prev) => prev.filter((v) => v.id !== id));
    setPreviewVariantIndex(0);
  };

  const handleUpdateVariantField = (
    id: string,
    field: keyof TagVariantItem,
    value: any
  ) => {
    setVariantList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Total tags in batch
  const totalTagsInBatch = useMemo(() => {
    return variantList.reduce((sum, v) => sum + (Number(v.printQty) || 0), 0);
  }, [variantList]);

  // Array of all tags expanded by quantity for batch print view
  const expandedBatchTags = useMemo(() => {
    const list: TagVariantItem[] = [];
    variantList.forEach((v) => {
      const qty = Math.max(1, Number(v.printQty) || 1);
      for (let i = 0; i < qty; i++) {
        list.push(v);
      }
    });
    return list;
  }, [variantList]);

  const activePreviewVariant = variantList[previewVariantIndex] || variantList[0];

  // Browser Print trigger
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="border-b border-[#CFCFD2] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#888888]">
            <button
              onClick={() => navigate('/products')}
              className="hover:text-[#0A0A0A] flex items-center gap-1"
            >
              <ArrowLeft size={12} /> CATALOG
            </button>
            <span>/</span>
            <span>SMART LABELING ENGINE</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A] mt-1">
            CLOTHING PRICE TAG GENERATOR
          </h1>
          <p className="text-xs font-mono text-[#666666] mt-1">
            Automated Barcode & Price Tag Formatting for T-Shirts, Shirts, Jeans, Footwear & Outerwear
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleLoadProduct(products[0]?.id)}
            icon={<RefreshCw size={14} />}
          >
            RESET TEMPLATE
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleTriggerPrint}
            icon={<Printer size={15} />}
          >
            PRINT {totalTagsInBatch} PRICE TAGS
          </Button>
        </div>
      </div>

      {/* Main Grid: Configuration Form (Left) vs Live Print Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* =========================================================================
            LEFT COLUMN (COL 7): CLOTHING SPECIFICATIONS & BATCH MATRIX
        ========================================================================= */}
        <div className="lg:col-span-7 space-y-6 no-print">
          {/* 1. CLOTHING CATEGORY PRESET SELECTOR */}
          <div className="bg-white border border-[#CFCFD2] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] font-bold">
                1. SELECT CLOTHING SILHOUETTE
              </span>
              <span className="text-[10px] font-mono text-[#666666]">
                Tailors legal metrology, sizing & fabric specs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_PRESETS) as ClothingCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`p-2.5 text-left border font-mono transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold shadow-subtle'
                      : 'bg-white text-[#444444] border-[#CFCFD2] hover:border-[#0A0A0A]'
                  }`}
                >
                  <div className="text-base">{CATEGORY_PRESETS[cat].icon}</div>
                  <div className="text-xs mt-1 uppercase truncate">{cat}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. PRODUCT & GARMENT METRICS */}
          <div className="bg-white border border-[#CFCFD2] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] font-bold">
                2. PRODUCT & BRAND METADATA
              </span>

              {/* Fast Import From Catalog */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[#888888] text-[10px]">IMPORT CATALOG:</span>
                <select
                  onChange={(e) => handleLoadProduct(e.target.value)}
                  className="bg-[#F1F1F3] border border-[#CFCFD2] p-1 text-[11px] font-mono focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs font-bold uppercase focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Style / Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs font-bold uppercase focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Fabric Composition & GSM</label>
                <input
                  type="text"
                  value={fabricSpecs}
                  onChange={(e) => setFabricSpecs(e.target.value)}
                  placeholder="e.g. 100% Combed Cotton 260 GSM"
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Silhouette & Fit Pattern</label>
                <input
                  type="text"
                  value={garmentFit}
                  onChange={(e) => setGarmentFit(e.target.value)}
                  placeholder="e.g. Oversized Drop-Shoulder"
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Mfg & Packaging Month/Year</label>
                <input
                  type="text"
                  value={mfdDate}
                  onChange={(e) => setMfdDate(e.target.value)}
                  placeholder="e.g. 09/2026"
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#666666] uppercase mb-1">Country of Origin</label>
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  className="w-full p-2 bg-[#FAFAFA] border border-[#CFCFD2] text-xs uppercase focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. TAG FORMAT & DIMENSIONS */}
          <div className="bg-white border border-[#CFCFD2] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] font-bold">
                3. TAG FORMAT & PRINT FORM FACTOR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => setTagFormat('HANG_TAG')}
                className={`p-3 text-left border transition-all ${
                  tagFormat === 'HANG_TAG'
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold'
                    : 'bg-white text-[#444444] border-[#CFCFD2] hover:border-[#0A0A0A]'
                }`}
              >
                <div className="text-xs uppercase">🏷️ LUXURY HANG TAG</div>
                <div className="text-[10px] opacity-75 mt-0.5">50 × 105mm Vertical Swing Tag with Punch Hole</div>
              </button>

              <button
                type="button"
                onClick={() => setTagFormat('STICKER')}
                className={`p-3 text-left border transition-all ${
                  tagFormat === 'STICKER'
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold'
                    : 'bg-white text-[#444444] border-[#CFCFD2] hover:border-[#0A0A0A]'
                }`}
              >
                <div className="text-xs uppercase">🏷️ BARCODE STICKER</div>
                <div className="text-[10px] opacity-75 mt-0.5">50 × 30mm Polybag & Retail Price Label</div>
              </button>

              <button
                type="button"
                onClick={() => setTagFormat('SHOEBOX')}
                className={`p-3 text-left border transition-all ${
                  tagFormat === 'SHOEBOX'
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-bold'
                    : 'bg-white text-[#444444] border-[#CFCFD2] hover:border-[#0A0A0A]'
                }`}
              >
                <div className="text-xs uppercase">👟 FOOTWEAR BOX LABEL</div>
                <div className="text-[10px] opacity-75 mt-0.5">95 × 60mm Shoebox Multi-Region Size Grid</div>
              </button>
            </div>
          </div>

          {/* 4. MULTI-SIZE VARIANT BATCH MATRIX */}
          <div className="bg-white border border-[#CFCFD2] overflow-hidden">
            <div className="p-4 bg-[#FAFAFA] border-b border-[#CFCFD2] flex items-center justify-between">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  4. SIZES, BARCODES & QUANTITY MATRIX
                </h3>
                <p className="text-[11px] font-mono text-[#666666] mt-0.5">
                  Specify MRP, Offer Price and sticker quantity per size
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddVariantRow}
                className="px-2.5 py-1 bg-[#0A0A0A] text-white text-xs font-mono font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> ADD SIZE
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#CFCFD2] bg-[#F1F1F3] text-[10px] uppercase text-[#666666]">
                    <th className="py-2.5 px-3">SIZE</th>
                    <th className="py-2.5 px-3">COLORWAY</th>
                    <th className="py-2.5 px-3">SKU / BARCODE</th>
                    <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-right">SALE (₹)</th>
                    <th className="py-2.5 px-3 text-center">PRINT QTY</th>
                    <th className="py-2.5 px-3 text-center">PREVIEW</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E7]">
                  {variantList.map((v, idx) => (
                    <tr
                      key={v.id}
                      className={`hover:bg-[#FAFAFA] transition-colors ${
                        previewVariantIndex === idx ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => handleUpdateVariantField(v.id, 'size', e.target.value)}
                          className="w-16 p-1 border border-[#CFCFD2] font-bold text-center text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => handleUpdateVariantField(v.id, 'color', e.target.value)}
                          className="w-24 p-1 border border-[#CFCFD2] text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => handleUpdateVariantField(v.id, 'sku', e.target.value)}
                          className="w-32 p-1 border border-[#CFCFD2] text-xs uppercase font-mono focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={v.mrp}
                          onChange={(e) =>
                            handleUpdateVariantField(v.id, 'mrp', Number(e.target.value) || 0)
                          }
                          className="w-20 p-1 border border-[#CFCFD2] text-right text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) =>
                            handleUpdateVariantField(v.id, 'price', Number(e.target.value) || 0)
                          }
                          className="w-20 p-1 border border-[#CFCFD2] text-right text-xs font-bold focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={v.printQty}
                          onChange={(e) =>
                            handleUpdateVariantField(
                              v.id,
                              'printQty',
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="w-12 p-1 border border-[#0A0A0A] text-center font-bold text-xs focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewVariantIndex(idx)}
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                            previewVariantIndex === idx
                              ? 'bg-[#0A0A0A] text-white'
                              : 'bg-white text-[#666666] border border-[#CFCFD2] hover:text-[#0A0A0A]'
                          }`}
                        >
                          {previewVariantIndex === idx ? 'VIEWING' : 'PREVIEW'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(v.id)}
                          disabled={variantList.length <= 1}
                          className="text-[#888888] hover:text-red-600 disabled:opacity-30 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#F1F1F3] border-t border-[#CFCFD2] flex items-center justify-between font-mono text-xs">
              <span className="text-[#666666]">
                Total Sizing Rows: <strong className="text-[#0A0A0A]">{variantList.length}</strong>
              </span>
              <span className="font-bold text-[#0A0A0A]">
                Total Tags Scheduled for Print: {totalTagsInBatch} Units
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (COL 5): INTERACTIVE LIVE PRINT PREVIEW
        ========================================================================= */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 no-print">
          <div className="bg-white border border-[#CFCFD2] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                <Tag size={14} />
                <span>LIVE TAG PREVIEW ({activePreviewVariant.size})</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0A0A0A] text-white font-bold uppercase">
                {tagFormat.replace('_', ' ')}
              </span>
            </div>

            {/* LIVE RENDER OF SELECTED TAG FORMAT */}
            <div className="bg-neutral-100 p-6 flex items-center justify-center border border-[#E5E5E7] overflow-hidden min-h-[420px]">
              {tagFormat === 'HANG_TAG' && (
                /* -------------------------------------------------------------
                   PREVIEW 1: LUXURY APPAREL HANG TAG (50x105mm)
                ------------------------------------------------------------- */
                <div className="w-[230px] bg-white border-2 border-[#0A0A0A] p-4 text-center font-mono text-xs shadow-xl relative select-none">
                  {/* Punch Hole Cutout Guide */}
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] mx-auto mb-2 bg-[#FAFAFA]" />

                  {/* Brand Header */}
                  <div className="border-b-2 border-[#0A0A0A] pb-2">
                    <div className="font-display font-black text-lg tracking-tight text-[#0A0A0A]">
                      {brandName}
                    </div>
                    <div className="text-[8px] uppercase tracking-widest text-[#666666] font-bold">
                      CAPSULE: {collectionName}
                    </div>
                  </div>

                  {/* Style & Details */}
                  <div className="py-2.5 space-y-1">
                    <div className="font-display font-bold text-xs uppercase text-[#0A0A0A] leading-tight">
                      {productName}
                    </div>
                    <div className="text-[9px] text-[#666666] uppercase">
                      COLOR: <span className="font-bold text-[#0A0A0A]">{activePreviewVariant.color}</span>
                    </div>

                    {/* Dominant Size Badge */}
                    <div className="my-2 py-1 bg-[#0A0A0A] text-white font-display font-black text-base uppercase tracking-wider">
                      SIZE: {activePreviewVariant.size}
                    </div>

                    <div className="text-[8px] text-[#666666] leading-tight px-1">
                      {fabricSpecs}
                    </div>
                  </div>

                  {/* Barcode SVG */}
                  <div className="border-t border-[#E5E5E7] pt-2">
                    <BarcodeSvg value={activePreviewVariant.sku} width={170} height={26} />
                  </div>

                  {/* Pricing Matrix */}
                  <div className="border-t-2 border-[#0A0A0A] pt-2 mt-2 space-y-0.5">
                    {activePreviewVariant.mrp > activePreviewVariant.price && (
                      <div className="text-[9px] text-[#888888] line-through">
                        MRP {formatINR(activePreviewVariant.mrp)}
                      </div>
                    )}
                    <div className="font-display font-black text-lg text-[#0A0A0A]">
                      {formatINR(activePreviewVariant.price)}
                    </div>
                    <div className="text-[7px] text-[#666666] uppercase tracking-wider">
                      INCL. OF ALL TAXES · NET QTY: 1 N
                    </div>
                  </div>

                  {/* Legal Metrology Footer */}
                  <div className="border-t border-[#E5E5E7] pt-2 mt-2 text-[7px] text-[#888888] uppercase leading-tight">
                    <div>MFD: {mfdDate} · {countryOfOrigin}</div>
                    <div>STUDIO DENY APPAREL CO., MUMBAI</div>
                  </div>
                </div>
              )}

              {tagFormat === 'STICKER' && (
                /* -------------------------------------------------------------
                   PREVIEW 2: RETAIL ADHESIVE STICKER (50x30mm)
                ------------------------------------------------------------- */
                <div className="w-[240px] bg-white border border-[#0A0A0A] p-2.5 font-mono text-xs shadow-md select-none">
                  <div className="flex justify-between items-start border-b border-[#0A0A0A] pb-1">
                    <div>
                      <div className="font-display font-black text-xs text-[#0A0A0A] tracking-tight">
                        {brandName}
                      </div>
                      <div className="text-[8px] font-bold text-[#444444] uppercase truncate max-w-[140px]">
                        {productName}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0A] text-white text-[10px] font-black px-1.5 py-0.5">
                      {activePreviewVariant.size}
                    </div>
                  </div>

                  <div className="py-1">
                    <BarcodeSvg value={activePreviewVariant.sku} width={180} height={24} />
                  </div>

                  <div className="flex justify-between items-baseline border-t border-[#0A0A0A] pt-1 text-[9px]">
                    <span className="text-[#666666]">{activePreviewVariant.color}</span>
                    <div className="text-right">
                      {activePreviewVariant.mrp > activePreviewVariant.price && (
                        <span className="text-[8px] text-[#888888] line-through mr-1">
                          {formatINR(activePreviewVariant.mrp)}
                        </span>
                      )}
                      <span className="font-black text-xs text-[#0A0A0A]">
                        {formatINR(activePreviewVariant.price)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tagFormat === 'SHOEBOX' && (
                /* -------------------------------------------------------------
                   PREVIEW 3: FOOTWEAR SHOEBOX SPECIFICATION LABEL (95x60mm)
                ------------------------------------------------------------- */
                <div className="w-[280px] bg-white border-2 border-[#0A0A0A] p-3 font-mono text-xs shadow-lg select-none">
                  <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] pb-1.5">
                    <div>
                      <div className="font-display font-black text-sm text-[#0A0A0A]">
                        {brandName} FOOTWEAR
                      </div>
                      <div className="text-[9px] font-bold text-[#666666] uppercase truncate max-w-[180px]">
                        {productName}
                      </div>
                    </div>
                    <div className="text-lg">👟</div>
                  </div>

                  {/* Multi-Region Size Matrix */}
                  <div className="grid grid-cols-4 gap-1 border-b border-[#0A0A0A] py-1.5 text-center">
                    <div className="bg-[#0A0A0A] text-white p-1">
                      <div className="text-[7px] text-neutral-300">SIZE</div>
                      <div className="font-black text-xs">{activePreviewVariant.size}</div>
                    </div>
                    <div className="bg-[#F1F1F3] p-1 border border-[#CFCFD2]">
                      <div className="text-[7px] text-[#666666]">COLOR</div>
                      <div className="font-bold text-[9px] truncate">{activePreviewVariant.color}</div>
                    </div>
                    <div className="bg-[#F1F1F3] p-1 border border-[#CFCFD2]">
                      <div className="text-[7px] text-[#666666]">ORIGIN</div>
                      <div className="font-bold text-[9px]">IND</div>
                    </div>
                    <div className="bg-[#F1F1F3] p-1 border border-[#CFCFD2]">
                      <div className="text-[7px] text-[#666666]">YEAR</div>
                      <div className="font-bold text-[9px]">2026</div>
                    </div>
                  </div>

                  <div className="text-[8px] text-[#666666] py-1 truncate">
                    UPPER: {fabricSpecs} · SOLE: {garmentFit}
                  </div>

                  {/* Barcode & Price */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#0A0A0A]">
                    <div className="w-[140px]">
                      <BarcodeSvg value={activePreviewVariant.sku} width={130} height={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-[7px] text-[#888888] line-through">
                        MRP {formatINR(activePreviewVariant.mrp)}
                      </div>
                      <div className="font-black text-sm text-[#0A0A0A]">
                        {formatINR(activePreviewVariant.price)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleTriggerPrint}
                className="w-full font-bold uppercase tracking-wider"
              >
                <Printer size={15} className="mr-2" />
                PRINT ALL {totalTagsInBatch} TAGS NOW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT-ONLY RENDER CONTAINER
          This section is hidden on screen and only displays when triggering window.print()
      ========================================================================= */}
      <div className="hidden print:block font-mono">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .print-grid {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 6mm !important;
                padding: 4mm !important;
                page-break-inside: avoid;
              }
              .print-tag-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }} />

        <div className="print-grid">
          {expandedBatchTags.map((tagItem, idx) => (
            <div key={`${tagItem.id}-${idx}`} className="print-tag-card">
              {tagFormat === 'HANG_TAG' && (
                <div
                  style={{
                    width: '52mm',
                    height: '105mm',
                    border: '1.5px solid #000000',
                    padding: '3mm',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    background: '#ffffff',
                    color: '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Punch Hole */}
                    <div
                      style={{
                        width: '3.5mm',
                        height: '3.5mm',
                        borderRadius: '50%',
                        border: '1.5px solid #000000',
                        margin: '0 auto 2mm',
                      }}
                    />

                    {/* Brand */}
                    <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                      {brandName}
                    </div>
                    <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', color: '#444444' }}>
                      COLLECTION: {collectionName}
                    </div>

                    <div style={{ borderBottom: '1px solid #000000', margin: '2mm 0' }} />

                    {/* Style */}
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1.2' }}>
                      {productName}
                    </div>
                    <div style={{ fontSize: '8px', color: '#333333', marginTop: '1mm' }}>
                      COLOR: <strong>{tagItem.color}</strong>
                    </div>

                    {/* Size Box */}
                    <div
                      style={{
                        background: '#000000',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '13px',
                        padding: '1.5mm 0',
                        margin: '2mm 0',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      SIZE: {tagItem.size}
                    </div>

                    <div style={{ fontSize: '7.5px', color: '#333333', lineHeight: '1.2' }}>
                      {fabricSpecs}
                    </div>
                  </div>

                  <div>
                    {/* Barcode */}
                    <BarcodeSvg value={tagItem.sku} width={150} height={24} />

                    {/* Price */}
                    <div style={{ borderTop: '1px solid #000000', paddingTop: '1.5mm', marginTop: '1.5mm' }}>
                      {tagItem.mrp > tagItem.price && (
                        <div style={{ fontSize: '8px', color: '#555555', textDecoration: 'line-through' }}>
                          MRP {formatINR(tagItem.mrp)}
                        </div>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: 900 }}>
                        {formatINR(tagItem.price)}
                      </div>
                      <div style={{ fontSize: '6.5px', textTransform: 'uppercase', color: '#333333' }}>
                        INCL. ALL TAXES · QTY: 1 N
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ fontSize: '6px', color: '#555555', marginTop: '1.5mm', textTransform: 'uppercase' }}>
                      MFD: {mfdDate} · {countryOfOrigin}
                    </div>
                  </div>
                </div>
              )}

              {tagFormat === 'STICKER' && (
                <div
                  style={{
                    width: '50mm',
                    height: '30mm',
                    border: '1px solid #000000',
                    padding: '2mm',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    color: '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 900 }}>{brandName}</div>
                      <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', maxWidth: '30mm', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {productName}
                      </div>
                    </div>
                    <div style={{ background: '#000000', color: '#ffffff', fontSize: '9px', fontWeight: 900, padding: '0.5mm 1.5mm' }}>
                      {tagItem.size}
                    </div>
                  </div>

                  <BarcodeSvg value={tagItem.sku} width={140} height={18} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '0.8px solid #000000', paddingTop: '0.8mm' }}>
                    <span style={{ fontSize: '7px', color: '#444444' }}>{tagItem.color}</span>
                    <span style={{ fontSize: '10px', fontWeight: 900 }}>{formatINR(tagItem.price)}</span>
                  </div>
                </div>
              )}

              {tagFormat === 'SHOEBOX' && (
                <div
                  style={{
                    width: '90mm',
                    height: '55mm',
                    border: '1.5px solid #000000',
                    padding: '3mm',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    color: '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000000', paddingBottom: '1mm' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 900 }}>{brandName} FOOTWEAR</div>
                      <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}>{productName}</div>
                    </div>
                    <div style={{ fontSize: '12px' }}>👟</div>
                  </div>

                  <div style={{ display: 'flex', gap: '2mm', margin: '1mm 0' }}>
                    <div style={{ background: '#000000', color: '#ffffff', padding: '1mm 2mm', textAlign: 'center' }}>
                      <div style={{ fontSize: '6px' }}>SIZE</div>
                      <div style={{ fontSize: '11px', fontWeight: 900 }}>{tagItem.size}</div>
                    </div>
                    <div style={{ border: '1px solid #000000', padding: '1mm 2mm', flex: 1 }}>
                      <div style={{ fontSize: '6px', color: '#444444' }}>COLORWAY</div>
                      <div style={{ fontSize: '8px', fontWeight: 700 }}>{tagItem.color}</div>
                    </div>
                    <div style={{ border: '1px solid #000000', padding: '1mm 2mm' }}>
                      <div style={{ fontSize: '6px', color: '#444444' }}>ORIGIN</div>
                      <div style={{ fontSize: '8px', fontWeight: 700 }}>IND</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #000000', paddingTop: '1mm' }}>
                    <BarcodeSvg value={tagItem.sku} width={130} height={18} />
                    <div style={{ textAlign: 'right' }}>
                      {tagItem.mrp > tagItem.price && (
                        <div style={{ fontSize: '7px', color: '#666666', textDecoration: 'line-through' }}>
                          MRP {formatINR(tagItem.mrp)}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', fontWeight: 900 }}>{formatINR(tagItem.price)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceTagGeneratorPage;
