import outputs from '../../amplify_outputs.json';

const domain = (outputs as { custom?: { cloudfrontDomain?: string } }).custom?.cloudfrontDomain;

export const CLOUDFRONT_DOMAIN = domain;
export const cfUrl = (key: string) => {
  if (!domain) throw new Error('cloudfrontDomain not set in amplify_outputs.json — run `npx ampx sandbox` with CLOUDFRONT_DOMAIN set');
  return `https://${domain}/${key}`;
};
