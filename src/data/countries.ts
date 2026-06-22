export type Country = {
  name: string;
  flag: string;
  code: string;
};

export const COUNTRIES: Country[] = [
  { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  { name: 'United States', flag: '🇺🇸', code: 'US' },
  { name: 'Germany', flag: '🇩🇪', code: 'DE' },
  { name: 'France', flag: '🇫🇷', code: 'FR' },
  { name: 'Japan', flag: '🇯🇵', code: 'JP' },
  { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  { name: 'Italy', flag: '🇮🇹', code: 'IT' },
  { name: 'Sweden', flag: '🇸🇪', code: 'SE' },
  { name: 'Spain', flag: '🇪🇸', code: 'ES' },
  { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  { name: 'Netherlands', flag: '🇳🇱', code: 'NL' },
  { name: 'South Korea', flag: '🇰🇷', code: 'KR' },
  { name: 'Singapore', flag: '🇸🇬', code: 'SG' },
  { name: 'India', flag: '🇮🇳', code: 'IN' },
  { name: 'Brazil', flag: '🇧🇷', code: 'BR' },
  { name: 'Switzerland', flag: '🇨🇭', code: 'CH' },
  { name: 'Thailand', flag: '🇹🇭', code: 'TH' },
  { name: 'Myanmar', flag: '🇲🇲', code: 'MM' },
  { name: 'Vietnam', flag: '🇻🇳', code: 'VN' },
  { name: 'Philippines', flag: '🇵🇭', code: 'PH' },
  { name: 'Indonesia', flag: '🇮🇩', code: 'ID' },
  { name: 'Malaysia', flag: '🇲🇾', code: 'MY' },
  { name: 'Cambodia', flag: '🇰🇭', code: 'KH' },
  { name: 'Laos', flag: '🇱🇦', code: 'LA' }
];

export function flagForCountryCode(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.flag ?? '🌍';
}

export function countryByName(name: string): Country {
  return COUNTRIES.find(c => c.name === name) ?? COUNTRIES[0];
}
