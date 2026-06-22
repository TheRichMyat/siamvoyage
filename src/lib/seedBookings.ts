import { COUNTRIES } from '../data/countries';
import type { Booking } from '../types/booking';

const SEED_PROFILES: [string, string][] = [
  ['Sarah', 'M'], ['Daniel', 'K'], ['Lina', 'T'], ['Marco', 'P'], ['Aiko', 'S'],
  ['Olivia', 'R'], ['James', 'W'], ['Sophie', 'L'], ['Liam', 'B'], ['Emma', 'H'],
  ['Noah', 'F'], ['Mia', 'C'], ['Lucas', 'V'], ['Chloe', 'D'], ['Ethan', 'A'],
  ['Zoe', 'N'], ['Hugo', 'G'], ['Yuki', 'O']
];

const SEED_OFFSETS_MIN = [
  2, 9, 21, 38, 74, 138, 215, 332,
  1480, 1820, 2310, 3050, 3960, 4720, 5850, 7180, 8920, 9760
];

const SEED_TOURS = [
  'Phi Phi Island Escape',
  'Bangkok Cultural Journey',
  'Chiang Mai Mountain Retreat',
  'Krabi Beach Paradise',
  'Ayutthaya Historic Tour',
  'Koh Samui Luxury Getaway',
  'Hua Hin Royal Seaside',
  'Koh Phangan Full Moon Escape'
];

/** Fallback social-proof rows when the sheet is empty or unreachable. */
export function generateSeedBookings(): Booking[] {
  const now = Date.now();
  return SEED_OFFSETS_MIN.map((off, i) => {
    const c = COUNTRIES[i % COUNTRIES.length];
    return {
      id: `seed-${i}`,
      firstName: SEED_PROFILES[i % SEED_PROFILES.length][0],
      lastInitial: SEED_PROFILES[i % SEED_PROFILES.length][1],
      country: c.name,
      flag: c.flag,
      tour: SEED_TOURS[i % SEED_TOURS.length],
      travelers: 1 + (i % 4),
      createdAt: now - off * 60_000
    };
  });
}
