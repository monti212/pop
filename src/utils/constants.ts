export const REGIONS = [
  { code: 'global', name: 'Global', flag: '' },
  { code: 'africa', name: 'Africa', flag: '🌍' },
  // SADC Countries
  { code: 'angola', name: 'Angola', flag: '🇦🇴', group: 'SADC' },
  { code: 'botswana', name: 'Botswana', flag: '🇧🇼', group: 'SADC' },
  { code: 'comoros', name: 'Comoros', flag: '🇰🇲', group: 'SADC' },
  { code: 'dr_congo', name: 'DR Congo', flag: '🇨🇩', group: 'SADC' },
  { code: 'eswatini', name: 'Eswatini', flag: '🇸🇿', group: 'SADC' },
  { code: 'lesotho', name: 'Lesotho', flag: '🇱🇸', group: 'SADC' },
  { code: 'madagascar', name: 'Madagascar', flag: '🇲🇬', group: 'SADC' },
  { code: 'malawi', name: 'Malawi', flag: '🇲🇼', group: 'SADC' },
  { code: 'mauritius', name: 'Mauritius', flag: '🇲🇺', group: 'SADC' },
  { code: 'mozambique', name: 'Mozambique', flag: '🇲🇿', group: 'SADC' },
  { code: 'namibia', name: 'Namibia', flag: '🇳🇦', group: 'SADC' },
  { code: 'seychelles', name: 'Seychelles', flag: '🇸🇨', group: 'SADC' },
  { code: 'south_africa', name: 'South Africa', flag: '🇿🇦', group: 'SADC' },
  { code: 'tanzania', name: 'Tanzania', flag: '🇹🇿', group: 'SADC' },
  { code: 'zambia', name: 'Zambia', flag: '🇿🇲', group: 'SADC' },
  { code: 'zimbabwe', name: 'Zimbabwe', flag: '🇿🇼', group: 'SADC' },
  // Other African Countries
  { code: 'nigeria', name: 'Nigeria', flag: '🇳🇬', group: 'West Africa' },
  { code: 'kenya', name: 'Kenya', flag: '🇰🇪', group: 'East Africa' }
];

// Group regions by category for dropdown menu
export const getGroupedRegions = () => {
  const groups: { [key: string]: typeof REGIONS } = {
    'General': [],
    'SADC': [],
    'Other African Countries': []
  };
  
  REGIONS.forEach(region => {
    if (region.code === 'global' || region.code === 'africa') {
      groups['General'].push(region);
    } else if (region.group === 'SADC') {
      groups['SADC'].push(region);
    } else {
      groups['Other African Countries'].push(region);
    }
  });
  
  return groups;
};

export const getRegionByCode = (code: string) => {
  const region = REGIONS.find(region => region.code === code);
  if (!region) {
    console.warn(`Region with code ${code} not found, defaulting to global`);
    return REGIONS[0]; // Default to global
  }
  return region;
};

// Threshold for determining if a message should be treated as a long response
export const LONG_RESPONSE_THRESHOLD = 2500; // ~500 words