export const CLOUDFRONT_DOMAIN = import.meta.env.VITE_CLOUDFRONT_DOMAIN || 'd3v1ijc4huf10a.cloudfront.net';
export const cfUrl = (key: string) => `https://${CLOUDFRONT_DOMAIN}/${key}`;
