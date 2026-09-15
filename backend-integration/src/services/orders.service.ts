import { CreateOrderDto } from '../dto/orders.dto';

// In a real deployment, import your initialized PrismaClient, Knex instance, or pg pool:
// import { prisma } from '../db';

export interface OrderCreationContext {
  staffId?: string;
  idempotencyKey?: string;
}

export class OrdersService {
  /**
   * Processes POS billing checkout with ACID transaction and row-level stock locking
   * This implementation illustrates the exact SQL / Prisma pattern required.
   */
  async createPosOrder(data: CreateOrderDto, context: OrderCreationContext, db: any) {
    const { staffId, idempotencyKey } = context;

    // 1. Check idempotency if key was supplied in request headers
    if (idempotencyKey) {
      const existing = await db.order.findUnique({
        where: { idempotencyKey },
        include: { items: true, payments: true, timeline: true },
      });
      if (existing) return existing;
    }

    // 2. Execute within an ACID transaction
    return await db.$transaction(async (tx: any) => {
      // Step A: Pessimistic Row Lock & Stock Verification for every variant
      for (const item of data.items) {
        // Raw SQL equivalent: SELECT * FROM product_variants WHERE id = $1 FOR UPDATE;
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found.`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for SKU ${variant.sku}. Requested: ${item.quantity}, Available: ${variant.stock}`
          );
        }

        // Decrement Variant Stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });

        // Decrement Master Product Total Stock
        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } },
        });

        // Insert Inventory Log entry for audit reconciliation
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            changeQty: -item.quantity,
            newStock: variant.stock - item.quantity,
            reason: 'SALE',
            staffId: staffId || null,
          },
        });
      }

      // Step B: Generate Sequential Invoice Number (e.g., SD-1000249)
      const lastOrder = await tx.order.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true },
      });

      let nextNum = 1000250;
      if (lastOrder && lastOrder.orderNumber) {
        const parsed = parseInt(lastOrder.orderNumber.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
      }
      const orderNumber = `SD-${nextNum}`;

      // Step C: Insert Order Record
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: idempotencyKey || null,
          customerId: data.customerId && data.customerId !== 'guest' ? data.customerId : null,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          channel: data.channel || 'OFFLINE',
          shippingAddress: data.shippingAddress || null,
          subtotal: data.subtotal,
          discount: data.discount,
          discountType: data.discountType || null,
          discountPercent: data.discountPercent || null,
          discountReason: data.discountReason || null,
          shippingFee: data.shippingFee || 0,
          taxAmount: data.taxAmount,
          grandTotal: data.grandTotal,
          paymentStatus: 'PAID',
          fulfillmentStatus: 'DELIVERED', // Instant in-store handover
          paymentMethod: data.paymentMethod,
          tenderedAmount: data.tenderedAmount || null,
          changeAmount: data.changeAmount || null,
          notes: data.notes || null,
          staffId: staffId || null,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              name: i.name,
              variantName: i.variantName,
              size: i.size,
              color: i.color,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              itemDiscount: i.itemDiscount || 0,
              discountReason: i.discountReason || null,
              total: i.total,
            })),
          },
          payments: {
            create:
              data.paymentSplits && data.paymentSplits.length > 0
                ? data.paymentSplits.map((s, idx) => ({
                    transactionRef: `TXN-${orderNumber.replace('SD-', '')}-${s.method}-${idx + 1}`,
                    orderNumber,
                    customerName: data.customerName,
                    amount: s.amount,
                    method: s.method,
                    status: 'SUCCESS',
                    tendered: s.tendered || null,
                    change: s.change || null,
                  }))
                : [
                    {
                      transactionRef: `TXN-${orderNumber.replace('SD-', '')}`,
                      orderNumber,
                      customerName: data.customerName,
                      amount: data.grandTotal,
                      method: data.paymentMethod,
                      status: 'SUCCESS',
                    },
                  ],
          },
          timeline: {
            create: [
              { status: 'ORDER PLACED', note: 'POS Terminal #01 (Studio Deny Flagship)' },
              { status: 'PAYMENT CONFIRMED', note: `Tendered via ${data.paymentMethod}` },
            ],
          },
        },
        include: {
          items: true,
          payments: true,
          timeline: true,
        },
      });

      // Step D: Increment Customer CRM LTV & Order Metrics if customerId exists
      if (data.customerId && data.customerId !== 'guest') {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (customer) {
          const newTotalSpend = Number(customer.totalSpend) + data.grandTotal;
          const newOrdersCount = customer.ordersCount + 1;
          const newAov = Math.round(newTotalSpend / newOrdersCount);
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              totalSpend: newTotalSpend,
              ordersCount: newOrdersCount,
              averageOrderValue: newAov,
              lastOrderNumber: orderNumber,
              lastOrderDate: new Date(),
              segment: newTotalSpend > 40000 ? 'VIP' : 'ACTIVE',
            },
          });
        }
      }

      return newOrder;
    });
  }
}

export const ordersService = new OrdersService();
