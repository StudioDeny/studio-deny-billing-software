// Products and their colour x size stock are created only in the website
// admin, so the billing app links there instead of keeping its own form.
export const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL as string | undefined) || 'https://studiodeny.com';
export const WEBSITE_ADMIN_NEW_PRODUCT_URL = `${WEBSITE_URL}/admin/products/new`;
export const websiteAdminProductUrl = (slug: string) => `${WEBSITE_URL}/admin/products/${encodeURIComponent(slug)}`;
