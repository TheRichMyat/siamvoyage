// Single source of truth for tour prices in the office dashboard + detail pages.
// Keep in sync with TOUR_CATALOG.price values in src/App.tsx and the
// packagePrice_ map in google-apps-script/Code.gs.

export const TOUR_PRICES: Record<string, number> = {
  'Phi Phi Island Escape': 6900,
  'Bangkok Cultural Journey': 2900,
  'Chiang Mai Mountain Retreat': 8500,
  'Krabi Beach Paradise': 11900,
  'Ayutthaya Historic Tour': 2500,
  'Koh Samui Luxury Getaway': 24900,
  'Hua Hin Royal Seaside': 9500,
  'Koh Phangan Full Moon Escape': 10900
};

export function pricePerPerson(pkg: string): number {
  return TOUR_PRICES[pkg] || 0;
}

export function bookingTotal(pkg: string, guestCount: number): number {
  return pricePerPerson(pkg) * (Number(guestCount) || 0);
}

export function formatBaht(amount: number): string {
  return `฿${(Number(amount) || 0).toLocaleString('en-US')}`;
}
