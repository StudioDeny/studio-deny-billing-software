export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString?: string): string {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).toUpperCase();
  } catch {
    return dateTimeString;
  }
}

export function getStatusTheme(status: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'DELIVERED':
    case 'SUCCESS':
    case 'IN_STOCK':
    case 'VIP':
    case 'ONLINE':
    case 'ACTIVE':
    case 'APPROVED':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };

    case 'UNFULFILLED':
    case 'PROCESSING':
    case 'PENDING':
    case 'PACKED':
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'HIGH_VALUE':
    case 'LOW_STOCK':
    case 'REQUESTED':
    case 'RECEIVED':
    case 'INSPECTED':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };

    case 'CANCELLED':
    case 'REFUNDED':
    case 'FAILED':
    case 'OUT_OF_STOCK':
    case 'AT_RISK':
    case 'REJECTED':
    case 'OFFLINE':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };

    case 'RETURNED':
    case 'EXCHANGED':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
      };

    case 'DRAFT':
    case 'ARCHIVED':
    case 'NEW':
    default:
      return {
        bg: 'bg-zinc-100',
        text: 'text-zinc-700',
        border: 'border-zinc-300',
        dot: 'bg-zinc-400',
      };
  }
}
