-- STUDIO DENY COMMERCE OPERATING SYSTEM
-- Production Relational Database Schema DDL (PostgreSQL 14+)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'BILLING', 'ADMIN', 'FULFILLMENT');
CREATE TYPE payment_method AS ENUM ('UPI', 'CARD', 'CASH', 'OTHER', 'SPLIT', 'COD', 'BANK');
CREATE TYPE payment_status AS ENUM ('PAID', 'PENDING', 'REFUNDED', 'FAILED');
CREATE TYPE fulfillment_status AS ENUM ('UNFULFILLED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
CREATE TYPE customer_segment AS ENUM ('VIP', 'HIGH_VALUE', 'ACTIVE', 'NEW', 'AT_RISK');
CREATE TYPE return_status AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUNDED', 'EXCHANGED', 'REJECTED');
CREATE TYPE sales_channel AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE inventory_reason AS ENUM ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN_RESTOCK', 'DAMAGED');

-- 2. STAFF
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role staff_role DEFAULT 'BILLING',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    segment customer_segment DEFAULT 'NEW',
    orders_count INT DEFAULT 0,
    total_spend NUMERIC(12, 2) DEFAULT 0.00,
    average_order_value NUMERIC(12, 2) DEFAULT 0.00,
    last_order_number VARCHAR(100),
    last_order_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);

-- 4. COLLECTIONS
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    compare_at_price NUMERIC(10, 2),
    total_stock INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    image TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 6. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    compare_at_price NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 0,
    barcode VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

-- 7. ORDERS (BILLS)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    channel sales_channel DEFAULT 'OFFLINE',
    shipping_address JSONB,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    discount_type VARCHAR(50),
    discount_percent NUMERIC(5, 2),
    discount_reason VARCHAR(255),
    shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    grand_total NUMERIC(10, 2) NOT NULL,
    payment_status payment_status DEFAULT 'PAID',
    fulfillment_status fulfillment_status DEFAULT 'DELIVERED',
    payment_method payment_method DEFAULT 'UPI',
    tendered_amount NUMERIC(10, 2),
    change_amount NUMERIC(10, 2),
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    notes TEXT,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_channel_date ON orders(channel, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_desc ON orders(created_at DESC);

-- 8. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    item_discount NUMERIC(10, 2) DEFAULT 0.00,
    discount_reason VARCHAR(255),
    total NUMERIC(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_items_variant ON order_items(variant_id);

-- 9. PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_ref VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method payment_method NOT NULL,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    tendered NUMERIC(10, 2),
    change NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payment_transactions(order_id);

-- 10. INVENTORY LOGS
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    change_qty INT NOT NULL,
    new_stock INT NOT NULL,
    reason inventory_reason NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inv_variant ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_created_desc ON inventory_logs(created_at DESC);

-- 11. COMMERCE SETTINGS
CREATE TABLE IF NOT EXISTS commerce_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(255) DEFAULT 'STUDIO DENY',
    brand VARCHAR(255) DEFAULT 'DENY OS',
    tagline VARCHAR(255),
    address TEXT,
    city_state VARCHAR(255),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    gstin VARCHAR(50),
    pan VARCHAR(50),
    invoice_prefix VARCHAR(50) DEFAULT 'SD-INV-',
    starting_invoice_number INT DEFAULT 1000248,
    currency VARCHAR(10) DEFAULT 'INR',
    tax_rate NUMERIC(5, 2) DEFAULT 12.00,
    shipping_flat_rate NUMERIC(10, 2) DEFAULT 250.00,
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 5000.00,
    printer_config JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
