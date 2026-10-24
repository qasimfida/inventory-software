export const companyFields = [
  { key: 'displayName', label: 'Company display name', max: 120 },
  { key: 'legalName', label: 'Legal name', max: 160 },
  { key: 'email', label: 'Contact email', max: 254 },
  { key: 'phone', label: 'Contact phone', max: 40 },
  { key: 'address', label: 'Address', max: 500 },
  { key: 'website', label: 'Website (HTTPS)', max: 2048 },
  { key: 'description', label: 'About the company', max: 1000 },
] as const;
