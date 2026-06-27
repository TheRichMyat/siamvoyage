/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation, type Transition } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin,
  Star,
  Waves,
  Palmtree,
  Compass,
  ShieldCheck,
  Clock,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  Quote,
  Search,
  Mail,
  Phone,
  Send,
  Users,
  Calendar,
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Copy,
  Globe,
  TrendingUp,
  Car,
  Fuel,
  Cog
} from 'lucide-react';
import { COUNTRIES } from './data/countries';
import { useBookings } from './hooks/useBookings';
import { slugifyPackage } from './services/bookingApi';
import type { Booking, CreateBookingPayload } from './types/booking';
import { getBookingCheckInUrl } from './lib/bookingQr';

const DESTINATIONS = [
  'Bangkok', 'Phuket', 'Chiang Mai', 'Krabi', 'Pattaya', 'Koh Samui',
  'Ayutthaya', 'Phi Phi Islands', 'Hua Hin', 'Koh Phangan', 'Sukhothai', 'Pai'
];

// Maps each destination to the closest available tour package.
const DESTINATION_TO_TOUR: Record<string, string> = {
  'Bangkok': 'Bangkok Cultural Journey',
  'Phuket': 'Phi Phi Island Escape',
  'Chiang Mai': 'Chiang Mai Mountain Retreat',
  'Krabi': 'Krabi Beach Paradise',
  'Pattaya': 'Bangkok Cultural Journey',
  'Koh Samui': 'Koh Samui Luxury Getaway',
  'Ayutthaya': 'Ayutthaya Historic Tour',
  'Phi Phi Islands': 'Phi Phi Island Escape',
  'Hua Hin': 'Hua Hin Royal Seaside',
  'Koh Phangan': 'Koh Phangan Full Moon Escape',
  'Sukhothai': 'Ayutthaya Historic Tour',
  'Pai': 'Chiang Mai Mountain Retreat'
};

// ─── Booking System ──────────────────────────────────────────────────────────

type TourInfo = {
  name: string;
  price: string;
  img: string;
  duration: string;
  description: string;
  highlights: string[];
  includes: string[];
  excluded?: string[];
  itinerary?: string[];
  gallery?: string[];
};

const TOUR_CATALOG: TourInfo[] = [
  {
    name: 'Phi Phi Island Escape',
    price: '฿6,900',
    duration: '2 Days / 1 Night',
    img: 'https://images.pexels.com/photos/176400/pexels-photo-176400.jpeg',
    description: "Set sail to the stunning Phi Phi archipelago where towering limestone cliffs meet crystal-clear waters. Snorkel vibrant reefs, lounge on Maya Bay's powdery sands, and unwind in a beachfront resort under the stars.",
    highlights: [
      'Speedboat tour of Phi Phi Don & Phi Phi Leh',
      'Snorkel at Bamboo Island & Monkey Beach',
      'Golden-hour stop at Maya Bay viewpoint',
      'Beachfront overnight with sunrise swim'
    ],
    includes: ['Beachfront resort stay', 'Daily breakfast', 'Speedboat transfers', 'English-speaking guide', 'Snorkel gear & life jackets']
  },
  {
    name: 'Bangkok Cultural Journey',
    price: '฿2,900',
    duration: '1 Day',
    img: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=800',
    description: "Discover the soul of Bangkok in a single unforgettable day. From the gleaming spires of the Grand Palace to floating markets and bustling street stalls — experience the rhythm and reverence of Thailand's capital with a local guide who knows the hidden corners.",
    highlights: [
      'Grand Palace & Wat Phra Kaew',
      'Reclining Buddha at Wat Pho',
      'Chao Phraya river longtail boat ride',
      'Street-food tour through Yaowarat (Chinatown)'
    ],
    includes: ['Hotel pickup & drop-off', 'Lunch & food tastings', 'Air-conditioned transport', 'Expert local guide', 'All entrance fees']
  },
  {
    name: 'Chiang Mai Mountain Retreat',
    price: '฿8,500',
    duration: '3 Days / 2 Nights',
    img: 'https://images.pexels.com/photos/16240113/pexels-photo-16240113.jpeg',
    description: "Escape into Northern Thailand's misty mountains and ancient temples. Spend ethical time with rescued elephants, trek through jungle to hill-tribe villages, and end each day with locally sourced meals at a boutique mountain lodge.",
    highlights: [
      'Ethical elephant sanctuary (no riding)',
      'Doi Suthep temple at sunrise',
      'Hill-tribe village jungle trek',
      'Hands-on Thai cooking class with mountain views'
    ],
    includes: ['Boutique mountain lodge', 'All meals included', 'Private transport', 'Certified naturalist guide', 'All activities & gear']
  },
  {
    name: 'Krabi Beach Paradise',
    price: '฿11,900',
    duration: '4 Days / 3 Nights',
    img: 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg',
    description: "Krabi blends raw nature with quiet luxury. Kayak through emerald lagoons hidden between limestone cliffs, swim in jungle hot springs, and watch sunsets from a beachfront pool that seems to spill into the Andaman Sea.",
    highlights: [
      'Four Islands speedboat tour',
      'Emerald Pool & jungle hot springs',
      'Railay Beach kayaking or climbing',
      'Sunset dinner at Phra Nang Cave'
    ],
    includes: ['4★ beachfront resort', 'Daily breakfast', 'All island day tours', 'Airport transfers', '24/7 concierge support']
  },
  {
    name: 'Ayutthaya Historic Tour',
    price: '฿2,500',
    duration: '1 Day',
    img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&q=80&w=800',
    description: "Step into the lost capital of Siam. Cycle past 700-year-old temple ruins, see the iconic Buddha head wrapped in tree roots, and cruise the river that once carried kings — all in one magical day from Bangkok.",
    highlights: [
      'Wat Mahathat & the Buddha-in-tree-roots',
      'Wat Phra Si Sanphet royal ruins',
      'Optional elephant heritage village',
      'Scenic river cruise back to Bangkok'
    ],
    includes: ['Bangkok hotel pickup', 'Lunch on the riverboat', 'Bicycle rental on site', 'Licensed historian guide', 'All site entrance fees']
  },
  {
    name: 'Koh Samui Luxury Getaway',
    price: '฿24,900',
    duration: '5 Days / 4 Nights',
    img: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg',
    description: "Five days of pure indulgence on Thailand's most refined island. Private pool villa overlooking the Gulf of Thailand, sunset yacht cruises around the Five Islands, world-class Thai spa rituals, and a private chef who tailors every meal to you.",
    highlights: [
      'Private pool villa with sea view',
      'Sunset yacht cruise to the Five Islands',
      'Full-day Thai spa & wellness ritual',
      'Private chef in-villa dining experience'
    ],
    includes: ['5★ private pool villa', 'Dedicated butler', 'Sunset yacht cruise', 'Two spa treatments', 'Airport transfers']
  },
  {
    name: 'Hua Hin Royal Seaside',
    price: '฿9,500',
    duration: '3 Days / 2 Nights',
    img: 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&q=80&w=800',
    description: "A graceful royal beach town two hours from Bangkok. Floating markets, hilltop temples, and calm, family-friendly waters — Thailand's quiet, sophisticated coastal escape, far from the crowds but close to everything.",
    highlights: [
      'Wat Khao Takiab hilltop temple & monkey forest',
      'Sam Phan Nam floating market experience',
      'Cicada night market for crafts & street food',
      'Calm-water beach day with sunset cruise'
    ],
    includes: ['Beachfront hotel stay', 'Daily breakfast', 'Bangkok return transfer', 'Local English-speaking guide', 'All market & temple entrance fees']
  },
  {
    name: 'Koh Phangan Full Moon Escape',
    price: '฿10,900',
    duration: '3 Days / 2 Nights',
    img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=800',
    description: "The legendary Full Moon Party island. By day, hidden waterfalls and secret coves reached only by longtail. By night, fire shows and dancing under the stars on Haad Rin's golden sand — pure island energy with jungle hideaways to recover in.",
    highlights: [
      'Full Moon Party at Haad Rin (date-dependent)',
      'Bottle Beach hidden cove by longtail',
      'Phaeng waterfall jungle trek',
      'Sunset views from Three Sixty Bar'
    ],
    includes: ['Beachfront bungalow stay', 'Daily breakfast', 'Speedboat & ferry transfers', 'Party-area access', '24/7 concierge support']
  }
];

const TOURS = TOUR_CATALOG.map(t => t.name);

const parseTourPrice = (price: string): number => parseInt(price.replace(/[^\d]/g, ''), 10) || 0;

const formatBaht = (amount: number): string => `฿${amount.toLocaleString('en-US')}`;

const tourPrice = (tour: TourInfo): number => parseTourPrice(tour.price);

const findTourByName = (name: string): TourInfo | undefined => TOUR_CATALOG.find(t => t.name === name);

const findTourBySlug = (slug?: string): TourInfo | undefined =>
  TOUR_CATALOG.find(t => slugifyPackage(t.name) === slug);

const tourGallery = (tour: TourInfo): string[] => tour.gallery ?? [
  tour.img,
  'https://images.pexels.com/photos/2161449/pexels-photo-2161449.jpeg',
  'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&q=80&w=1000',
  'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg',
  'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg',
  'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=1000',
  'https://images.pexels.com/photos/16240113/pexels-photo-16240113.jpeg'
];

const tourExcluded = (tour: TourInfo): string[] => tour.excluded ?? [
  'International flights',
  'Personal expenses',
  'Travel insurance',
  'Optional activities not listed'
];

const tourItinerary = (tour: TourInfo): string[] => tour.itinerary ?? [
  `Meet your Siam Voyage host and begin ${tour.name}.`,
  'Enjoy the curated highlights with time for photos and local discoveries.',
  'Return with assistance from your guide and onward travel support.'
];

// ─── Car Rental ──────────────────────────────────────────────────────────────
type CarInfo = {
  name: string;
  category: string;
  seats: number;
  transmission: 'Automatic' | 'Manual';
  fuel: string;
  pricePerDay: string;
  originalPrice?: string;
  badge?: string;
  img: string;
};

const CAR_CATALOG: CarInfo[] = [
  {
    name: 'Toyota Yaris',
    category: 'Compact',
    seats: 4,
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: '฿900',
    originalPrice: '฿1,200',
    badge: 'BEST VALUE',
    img: '/cars/yaris.jpg'
  },
  {
    name: 'Honda City',
    category: 'Sedan',
    seats: 5,
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: '฿1,200',
    originalPrice: '฿1,500',
    badge: 'POPULAR',
    img: '/cars/city.jpg'
  },
  {
    name: 'Toyota Vios',
    category: 'Sedan',
    seats: 5,
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: '฿1,100',
    originalPrice: '฿1,400',
    img: '/cars/vios.jpg'
  },
  {
    name: 'Honda CR-V',
    category: 'SUV',
    seats: 5,
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: '฿2,400',
    originalPrice: '฿2,900',
    badge: 'FAMILY',
    img: '/cars/crv.jpg'
  },
  {
    name: 'Toyota Fortuner',
    category: 'SUV',
    seats: 7,
    transmission: 'Automatic',
    fuel: 'Diesel',
    pricePerDay: '฿2,800',
    originalPrice: '฿3,400',
    badge: '7 SEATS',
    img: '/cars/fortuner.jpg'
  },
  {
    name: 'Toyota Innova',
    category: 'MPV',
    seats: 7,
    transmission: 'Automatic',
    fuel: 'Diesel',
    pricePerDay: '฿2,000',
    originalPrice: '฿2,500',
    img: '/cars/innova.jpg'
  }
];

const PICKUP_LOCATIONS = [
  'Bangkok — Suvarnabhumi Airport',
  'Bangkok — Don Mueang Airport',
  'Bangkok — City Center',
  'Phuket Airport',
  'Phuket — Patong',
  'Chiang Mai Airport',
  'Chiang Mai — Old City',
  'Krabi Airport',
  'Koh Samui Airport',
  'Hua Hin',
  'Free hotel delivery'
];

const timeAgo = (ms: number): string => {
  const diff = Math.max(0, Date.now() - ms);
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const isToday = (ms: number): boolean => {
  const a = new Date(ms);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const generateReference = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'SV-';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const SearchBar = ({ onSelect, compact = false }: { onSelect?: (d: string) => void; compact?: boolean }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query
    ? DESTINATIONS.filter(d => d.toLowerCase().includes(query.toLowerCase()))
    : DESTINATIONS;

  const submit = (destination?: string) => {
    const target = destination ?? filtered[0];
    if (!target) return;
    setQuery(target);
    setOpen(false);
    onSelect?.(target);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-white rounded-full shadow-lg border border-slate-100 ${compact ? 'px-3 py-2' : 'px-4 py-2.5 sm:px-6 sm:py-3'}`}
      >
        <Search className="hidden sm:block text-sunset shrink-0 ml-1" size={compact ? 18 : 20} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search destinations..."
          className={`min-w-0 flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}
        />
        <button
          type="button"
          onClick={() => submit()}
          aria-label="Search"
          className={`shrink-0 bg-sunset hover:bg-orange-600 text-white rounded-full font-semibold transition-colors active:scale-[0.98] ${compact ? 'px-3 py-1.5 text-sm' : 'p-2.5 sm:px-6 sm:py-2'}`}
        >
          <Search size={18} className="sm:hidden" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="px-6 py-4 text-sm text-slate-500">
                No destination matches "{query}". Try Bangkok, Chiang Mai, or Phi Phi.
              </div>
            ) : (
              <>
                <div className="px-6 pt-3 pb-1 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  {query ? 'Matches' : 'Popular destinations'}
                </div>
                {filtered.map((d) => {
                  const tour = TOUR_CATALOG.find(t => t.name === DESTINATION_TO_TOUR[d]);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => submit(d)}
                      className="w-full text-left px-4 py-2.5 hover:bg-tropical-bg flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                        {tour && (
                          <img
                            src={tour.img}
                            alt={tour.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm">
                          <MapPin size={12} className="text-sunset shrink-0" /> {d}
                        </div>
                        {tour && (
                          <div className="text-xs text-slate-500 truncate">
                            {tour.name} · <span className="text-sunset font-semibold">{tour.price}</span>
                          </div>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-sunset group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ onPlanTrip, onSearch }: { onPlanTrip: () => void; onSearch: (d: string) => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Services', href: '#services' },
    { name: 'Tours', href: '#tours' },
    { name: 'Cars', href: '#rentals' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Why Us', href: '#why-us' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md py-3 shadow-sm' : 'bg-transparent py-4 sm:py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-4 sm:gap-6">
        <a href="#" className="flex items-center leading-none shrink-0 min-w-0 pr-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          <span className="text-3xl italic font-semibold text-sunset">Siam</span>
          <span className={`text-3xl italic font-semibold ${isScrolled ? 'text-slate-900' : 'text-white'}`}>Voyage</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`font-medium transition-colors hover:text-sunset ${isScrolled ? 'text-slate-600' : 'text-white/90'}`}
            >
              {link.name}
            </a>
          ))}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${isScrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white/90 hover:bg-white/10'}`}
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={onPlanTrip}
            className="bg-sunset hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-semibold transition-all transform hover:scale-105 whitespace-nowrap"
          >
            Plan My Trip
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-sunset" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} className={isScrolled ? 'text-slate-900' : 'text-white'} />}
        </button>
      </div>

      {/* Desktop Search Dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="hidden md:block max-w-3xl mx-auto px-4 sm:px-6 mt-4"
          >
            <SearchBar compact onSelect={(d) => { setShowSearch(false); onSearch(d); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 max-h-[min(85vh,calc(100dvh-5rem))] overflow-y-auto overscroll-contain bg-white shadow-xl p-4 sm:p-6 md:hidden flex flex-col gap-4 border-t border-slate-100"
          >
            <SearchBar compact onSelect={(d) => { setIsMenuOpen(false); onSearch(d); }} />

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-tropical-bg text-slate-700 font-semibold text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-1">Popular tours</div>
              <div className="grid grid-cols-2 gap-2">
                {TOUR_CATALOG.slice(0, 4).map(t => (
                  <a
                    key={t.name}
                    href="#tours"
                    onClick={() => setIsMenuOpen(false)}
                    className="relative rounded-xl overflow-hidden h-20 group"
                  >
                    <img src={t.img} alt={t.name} className="absolute inset-0 w-full h-full object-cover group-active:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 to-slate-900/10" />
                    <div className="absolute bottom-1.5 left-2 right-2 text-white text-[11px] font-bold leading-tight line-clamp-2">{t.name}</div>
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setIsMenuOpen(false); onPlanTrip(); }}
              className="bg-sunset text-white px-6 py-3 rounded-xl font-semibold w-full"
            >
              Plan My Trip
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const TripPlannerModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    travelers: '2',
    interests: '',
    name: '',
    email: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2200);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative max-h-[min(90dvh,90vh)] overflow-y-auto overscroll-contain"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 p-3 bg-white shadow-md rounded-full hover:bg-slate-100 active:bg-slate-100 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X size={20} className="text-slate-700" />
            </button>

            {/* Header */}
            <div className="relative h-28 sm:h-32 bg-gradient-to-br from-sunset to-orange-600 px-5 sm:px-8 flex items-center">
              <div className="absolute inset-0 opacity-20">
                <img
                  src="https://images.pexels.com/photos/11104933/pexels-photo-11104933.jpeg"
                  alt="Thailand"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-white/90 mb-1">
                  <Sparkles size={18} />
                  <span className="text-sm font-semibold tracking-widest uppercase">Free Consultation</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white pr-10">Plan Your Dream Trip</h2>
              </div>
            </div>

            {submitted ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Send className="text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h3>
                <p className="text-slate-500">Our travel expert will reach out within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <MapPin size={14} className="text-sunset" /> Destination
                  </label>
                  <select
                    required
                    value={form.destination}
                    onChange={(e) => update('destination', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  >
                    <option value="">Where would you like to go?</option>
                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-sunset" /> Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => update('startDate', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Users size={14} className="text-sunset" /> Travelers
                    </label>
                    <select
                      value={form.travelers}
                      onChange={(e) => update('travelers', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                    >
                      {['1', '2', '3', '4', '5+'].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Interests</label>
                  <input
                    type="text"
                    value={form.interests}
                    onChange={(e) => update('interests', e.target.value)}
                    placeholder="Beaches, temples, food, adventure..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="Email address"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-sunset hover:bg-orange-600 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sunset/30"
                >
                  Get My Free Itinerary <ArrowRight size={20} />
                </button>
                <p className="text-xs text-center text-slate-400">No spam. We respond within 24 hours.</p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Hero = ({ onBookNow, onPlanTrip, onSearch }: { onBookNow: () => void; onPlanTrip: () => void; onSearch: (d: string) => void }) => {
  return (
    <section className="relative min-h-[620px] sm:h-screen flex items-center justify-center overflow-hidden pt-24 pb-14 sm:pt-0 sm:pb-0">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.pexels.com/photos/11104933/pexels-photo-11104933.jpeg"
          alt="Thailand Landscape"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-serif font-bold mb-5 sm:mb-6 leading-[1.08] sm:leading-tight px-1">
            <span className="block text-4xl sm:text-5xl md:text-7xl">Discover Thailand</span>
            <span className="block text-xl sm:text-2xl md:text-4xl italic text-sunset mt-2">Like Never Before</span>
          </h1>
          <div className="max-w-2xl mx-auto mb-6 sm:mb-8 mt-6 sm:mt-8">
            <SearchBar onSelect={onSearch} />
          </div>

          <div className="flex w-full max-w-md mx-auto flex-col sm:max-w-none sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onBookNow}
              className="bg-sunset hover:bg-orange-600 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-base sm:text-lg font-bold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-sunset/30 active:scale-[0.98]"
            >
              Book Now
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onPlanTrip}
              className="bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/20 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-base sm:text-lg font-bold transition-all whitespace-nowrap active:scale-[0.98]"
            >
              Plan My Trip
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 text-white/60 flex flex-col items-center gap-2 max-sm:pointer-events-none"
      >
        <span className="text-xs uppercase tracking-widest font-semibold">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent" />
      </motion.div>
    </section>
  );
};

const TestimonialMarquee = () => {
  const testimonials = [
    { text: "Best trip of my life. Everything was perfectly planned!", author: "Sarah M.", country: "United Kingdom", rating: 5, avatar: "https://i.pravatar.cc/100?img=1" },
    { text: "Affordable and premium experience at the same time.", author: "Daniel K.", country: "Germany", rating: 5, avatar: "https://i.pravatar.cc/100?img=12" },
    { text: "Our guide made Thailand feel like home.", author: "Lina T.", country: "Sweden", rating: 5, avatar: "https://i.pravatar.cc/100?img=5" },
    { text: "The island hopping tour was breathtaking. Highly recommend!", author: "Marco P.", country: "Italy", rating: 5, avatar: "https://i.pravatar.cc/100?img=33" },
    { text: "From Bangkok to Chiang Mai — flawless service throughout.", author: "Aiko S.", country: "Japan", rating: 5, avatar: "https://i.pravatar.cc/100?img=44" },
    { text: "They went above and beyond. Couldn't have asked for more.", author: "Olivia R.", country: "Australia", rating: 5, avatar: "https://i.pravatar.cc/100?img=20" },
    { text: "Honest pricing, real local experiences. Will book again!", author: "James W.", country: "USA", rating: 5, avatar: "https://i.pravatar.cc/100?img=15" },
    { text: "The hidden temples in Ayutthaya were magical.", author: "Sophie L.", country: "France", rating: 5, avatar: "https://i.pravatar.cc/100?img=9" }
  ];

  const Row = ({ items, direction = 'left', duration = 40 }: { items: typeof testimonials; direction?: 'left' | 'right'; duration?: number }) => (
    <div className="overflow-hidden relative">
      {/* Cheap edge fades — positioned overlays instead of mask-image (GPU-friendly on mobile) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-tropical-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-tropical-bg to-transparent" />
      <motion.div
        className="flex gap-6 w-max"
        style={{ willChange: 'transform' }}
        animate={{ x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((t, idx) => (
          <div key={idx} className="w-[min(18.5rem,calc(100vw-2.5rem))] sm:w-[22rem] md:w-[23.75rem] shrink-0 p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={16} className="fill-sunset text-sunset" />
              ))}
            </div>
            <p className="text-slate-700 mb-6 leading-relaxed line-clamp-3">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <img src={t.avatar} alt={t.author} className="w-11 h-11 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div>
                <div className="font-bold text-slate-900">{t.author}</div>
                <div className="text-xs text-slate-500">{t.country}</div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );

  return (
    <section id="reviews" className="py-16 sm:py-24 bg-tropical-bg overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 sm:mb-14">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-sunset font-semibold uppercase tracking-widest text-sm">Reviews</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-3 mb-4 leading-tight">
            Loved by travelers <span className="italic text-sunset">worldwide</span>
          </h2>
          <p className="text-slate-500 text-[15px] sm:text-base px-1">Real stories from real adventurers who explored Thailand with us.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-sunset text-sunset" />)}
              </div>
              <span className="font-bold text-slate-900">4.9 / 5</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-300" aria-hidden />
            <span className="text-slate-600 font-semibold text-sm sm:text-base">10,000+ Reviews</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Row items={testimonials} direction="left" duration={50} />
        <Row items={[...testimonials].reverse()} direction="right" duration={60} />
      </div>
    </section>
  );
};

const Services = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const step = scrollRef.current.clientWidth * 0.5;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };
  const services = [
    { title: "Island Tours", desc: "Explore crystal clear waters and tropical islands.", icon: <Waves className="text-ocean" />, img: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=800" },
    { title: "Cultural Experiences", desc: "Discover temples, traditions, and local life.", icon: <Compass className="text-sunset" />, img: "https://images.unsplash.com/photo-1505993597083-3bd19fb75e57?auto=format&fit=crop&q=80&w=800" },
    { title: "Private Luxury Trips", desc: "Exclusive journeys designed just for you.", icon: <Palmtree className="text-emerald-600" />, img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800" },
    { title: "Adventure Tours", desc: "Jungle trekking, diving, and adrenaline activities.", icon: <MapPin className="text-red-500" />, img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&q=80&w=800" },
    { title: "Car Rentals", desc: "Self-drive freedom across Thailand with insurance.", icon: <Car className="text-sunset" />, img: "/services/car-rental.jpg" }
  ];

  return (
    <section id="services" className="py-16 sm:py-24 px-4 sm:px-6 bg-white scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">Our Services</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">Tailored experiences to make your Thai holiday truly special.</p>
        </div>

        <div className="relative">
          {/* Desktop nav arrows */}
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center bg-white rounded-full shadow-lg border border-slate-100 text-slate-700 hover:text-sunset hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center bg-white rounded-full shadow-lg border border-slate-100 text-slate-700 hover:text-sunset hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronRight size={20} />
          </button>

          <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 gap-5 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {services.map((s, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -10 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 snap-center shrink-0 w-[80%] sm:w-[46%] md:w-[30%] lg:w-[23%]"
            >
              <div className="h-48 overflow-hidden relative">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm">
                  {s.icon}
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const TourPackages = ({ highlightedTour }: { highlightedTour?: string | null }) => {
  const packages = [
    { title: "Phi Phi Island Escape", duration: "2 Days / 1 Night", desc: "Swim, relax, and explore Thailand's most famous islands.", price: "฿12,000 → ฿6,900", badge: "LIMITED OFFER", img: "https://images.pexels.com/photos/176400/pexels-photo-176400.jpeg" },
    { title: "Bangkok Cultural Journey", duration: "1 Day", desc: "Temples, street food, and hidden city gems.", price: "฿5,000 → ฿2,900", badge: "PROMOTION", img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=800" },
    { title: "Chiang Mai Mountain Retreat", duration: "3 Days / 2 Nights", desc: "Nature, elephants, and peaceful mountain vibes.", price: "฿15,000 → ฿8,500", badge: "SPECIAL DEAL", img: "https://images.pexels.com/photos/16240113/pexels-photo-16240113.jpeg" },
    { title: "Krabi Beach Paradise", duration: "4 Days / 3 Nights", desc: "Limestone cliffs, hidden lagoons, and turquoise waters.", price: "฿18,000 → ฿11,900", badge: "BESTSELLER", img: "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg" },
    { title: "Ayutthaya Historic Tour", duration: "1 Day", desc: "Step back in time through ancient ruins and royal temples.", price: "฿4,500 → ฿2,500", badge: "FAMILY FRIENDLY", img: "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&q=80&w=800" },
    { title: "Koh Samui Luxury Getaway", duration: "5 Days / 4 Nights", desc: "Beachfront villas, spa treatments, and sunset cruises.", price: "฿35,000 → ฿24,900", badge: "LUXURY", img: "https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg" },
    { title: "Hua Hin Royal Seaside", duration: "3 Days / 2 Nights", desc: "Royal beach town, floating markets, and calm family-friendly waters.", price: "฿14,000 → ฿9,500", badge: "FAMILY FAVORITE", img: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&q=80&w=800" },
    { title: "Koh Phangan Full Moon Escape", duration: "3 Days / 2 Nights", desc: "Hidden coves by day, legendary Full Moon Party by night.", price: "฿16,000 → ฿10,900", badge: "TRENDING", img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=800" }
  ];

  return (
    <section id="tours" className="py-16 sm:py-24 px-4 sm:px-6 bg-white scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-4 sm:gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">Tour Packages</h2>
            <p className="text-slate-500 max-w-xl">Handpicked itineraries with exclusive discounts for a limited time.</p>
          </div>
          <button className="text-sunset font-bold flex items-center gap-2 hover:gap-3 transition-all">
            View All Packages <ArrowRight size={20} />
          </button>
        </div>

        <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-4 sm:mx-0 px-4 sm:px-0 pb-4 sm:pb-0 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {packages.map((p, idx) => {
            const isHighlighted = highlightedTour === p.title;
            return (
            <motion.div
              key={idx}
              id={`tour-${idx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={isHighlighted ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={isHighlighted ? { duration: 0.6, repeat: 2 } : undefined}
              className={`group bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-500 scroll-mt-28 snap-center shrink-0 w-[82%] sm:w-auto sm:shrink ${isHighlighted ? 'border-sunset ring-4 ring-sunset/30 shadow-2xl shadow-sunset/20' : 'border-slate-100'}`}
            >
              <div className="relative h-44 overflow-hidden">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute top-3 left-3">
                  <span className="bg-sunset text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider shadow-md">
                    {p.badge}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 text-white">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-xs font-medium">
                    <Clock size={12} /> {p.duration}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-1">{p.title}</h3>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-snug">{p.desc}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs line-through decoration-sunset/40">
                      {p.price.split(' → ')[0]}
                    </span>
                    <span className="text-lg font-bold text-sunset">
                      {p.price.split(' → ')[1]}
                    </span>
                  </div>
                  <Link
                    to={`/tour/${slugifyPackage(p.title)}#book`}
                    aria-label={`Book ${p.title}`}
                    className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-sunset transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
                  >
                    Book <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
          })}
        </div>
      </div>
    </section>
  );
};

const WhyChooseUs = () => {
  const reasons = [
    { title: "Local Experts", icon: <MapPin className="text-sunset" /> },
    { title: "Best Price Guarantee", icon: <ShieldCheck className="text-ocean" /> },
    { title: "Personalized Experiences", icon: <Star className="text-sunset" /> },
    { title: "24/7 Support", icon: <Clock className="text-ocean" /> }
  ];

  return (
    <section id="why-us" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-900 text-white overflow-hidden relative scroll-mt-24">
      <div className="absolute top-0 right-0 w-96 h-96 bg-sunset/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-ocean/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold mb-6 sm:mb-8 leading-tight">
              Why Choose <br />
              <span className="italic text-sunset">SiamVoyage?</span>
            </h2>
            <p className="text-white/60 text-lg mb-12 max-w-lg">
              We don't just book trips; we create memories that last a lifetime. Our deep local knowledge ensures you see the side of Thailand most tourists miss.
            </p>
            <div className="grid sm:grid-cols-2 gap-8">
              {reasons.map((r, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
                    {r.icon}
                  </div>
                  <span className="font-semibold text-lg">{r.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-2xl">
              <img
                src="https://www.thailand.go.th/uploads/posts/the_post_1757694312.webp"
                alt="Thailand Experience"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-10 -left-10 glass-card p-8 rounded-3xl text-slate-900 hidden md:block"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <span className="font-bold">10k+ Reviews</span>
              </div>
              <p className="text-sm text-slate-500">"The best travel agency in SE Asia!"</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContactSection = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <section id="contact" className="py-16 sm:py-24 px-4 sm:px-6 bg-tropical-bg scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <span className="text-sunset font-semibold uppercase tracking-widest text-sm">Get in Touch</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-3 mb-6 leading-tight">
              Let's plan your <br /><span className="italic text-sunset">perfect Thai journey</span>
            </h2>
            <p className="text-slate-600 mb-10 leading-relaxed">
              Have a question or ready to book? Our travel experts are here 24/7 to craft an unforgettable experience for you.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <Mail className="text-sunset" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Email Us</div>
                  <div className="text-slate-500">hello@siamvoyage.com</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <Phone className="text-sunset" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Call Us</div>
                  <div className="text-slate-500">+66 2 123 4567</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <MapPin className="text-sunset" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Visit Us</div>
                  <div className="text-slate-500">Sukhumvit Road, Bangkok 10110, Thailand</div>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100"
          >
            {sent ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Send className="text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Message sent!</h3>
                <p className="text-slate-500">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                  />
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="Phone Number (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                />
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  placeholder="Subject"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                />
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Tell us about your dream trip..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all resize-none"
                />
                <button
                  type="submit"
                  className="w-full bg-sunset hover:bg-orange-600 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sunset/30"
                >
                  Send Message <Send size={18} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = ({ onPlanTrip }: { onPlanTrip: () => void }) => {
  return (
    <section className="py-12 sm:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl sm:rounded-[3rem] overflow-hidden bg-slate-900 py-14 sm:py-24 px-5 sm:px-8 text-center">
          <img
            src="https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=2000"
            alt="Beach background"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-white mb-6 sm:mb-8 leading-tight px-1">
              Your dream Thailand <br /> trip starts here
            </h2>
            <button
              onClick={onPlanTrip}
              className="bg-sunset hover:bg-orange-600 text-white w-full max-w-sm mx-auto sm:w-auto px-10 sm:px-12 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold transition-all transform hover:scale-105 active:scale-[0.98] shadow-2xl shadow-sunset/40"
            >
              Plan My Trip
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-slate-100 bg-tropical-bg px-4 pb-[calc(2.75rem+env(safe-area-inset-bottom,0px))] pt-16 sm:px-6 sm:pb-12 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-16">
          <div className="sm:col-span-2">
            <a href="#" className="flex items-center leading-none mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <span className="text-3xl italic font-semibold text-sunset">Siam</span>
              <span className="text-3xl italic font-semibold text-slate-900">Voyage</span>
            </a>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Experience the magic of Thailand with SiamVoyage. We provide premium, personalized travel experiences that showcase the true beauty of the Land of Smiles.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-sunset transition-colors">Home</a></li>
              <li><a href="#services" className="hover:text-sunset transition-colors">Services</a></li>
              <li><a href="#tours" className="hover:text-sunset transition-colors">Tours</a></li>
              <li><a href="#why-us" className="hover:text-sunset transition-colors">Why Choose Us</a></li>
              <li><a href="#contact" className="hover:text-sunset transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex items-center gap-3"><MapPin size={16} /> Bangkok, Thailand</li>
              <li className="flex items-center gap-3"><Mail size={16} /> hello@siamvoyage.com</li>
              <li className="flex items-center gap-3"><Clock size={16} /> 24/7 Support</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} SiamVoyage Tourism Company. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// ─── Booking Modal ───────────────────────────────────────────────────────────
const BookingModal = ({
  open,
  initialTour,
  onClose,
  onBook
}: {
  open: boolean;
  initialTour?: string;
  onClose: () => void;
  onBook: (payload: CreateBookingPayload) => Promise<{ booking: Booking; bookingId: string }>;
}) => {
  const [stage, setStage] = useState<'form' | 'success'>('form');
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ booking: Booking; ref: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tour: '',
    name: '',
    email: '',
    phone: '',
    country: 'United Kingdom',
    startDate: '',
    travelers: '2',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      setStage('form');
      setConfirmation(null);
      setCopied(false);
      setSubmitting(false);
      setSubmitError(null);
      setForm(f => ({ ...f, tour: initialTour || f.tour || TOURS[0] }));
    }
  }, [open, initialTour]);

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    const country = COUNTRIES.find(c => c.name === form.country) || COUNTRIES[0];

    try {
      const result = await onBook({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: country.name,
        countryCode: country.code,
        package: form.tour,
        packageSlug: slugifyPackage(form.tour),
        travelDate: form.startDate,
        guestCount: parseInt(form.travelers, 10) || 1,
        notes: form.notes.trim()
      });

      setConfirmation({ booking: result.booking, ref: result.bookingId });
      setStage('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTour = TOUR_CATALOG.find(t => t.name === form.tour) || TOUR_CATALOG[0];

  const copyRef = async () => {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl sm:rounded-3xl w-full overflow-hidden shadow-2xl relative max-h-[min(92dvh,92vh)] overflow-y-auto overscroll-contain ${stage === 'form' ? 'max-w-5xl' : 'max-w-2xl'}`}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-30 p-3 bg-white rounded-full hover:bg-slate-100 active:bg-slate-100 transition-colors shadow-md touch-manipulation"
              aria-label="Close"
            >
              <X size={20} className="text-slate-700" />
            </button>

            {stage === 'form' && (
              <>
                {/* Tour banner */}
                <div className="relative h-44 md:h-52">
                  <img
                    src={selectedTour.img}
                    alt={selectedTour.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-5 left-6 right-6 text-white">
                    <div className="text-xs uppercase tracking-widest text-sunset font-bold mb-1">Book Now</div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold leading-tight">{selectedTour.name}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-white/90">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {selectedTour.duration}</span>
                      <span className="w-1 h-1 rounded-full bg-white/50" />
                      <span className="font-bold text-sunset">{selectedTour.price} <span className="text-white/70 font-normal">/ person</span></span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                  {/* Mobile-only accordion toggle */}
                  <button
                    type="button"
                    onClick={() => setMobileDetailsOpen(o => !o)}
                    className="md:hidden flex items-center justify-between w-full px-6 py-3 bg-tropical-bg border-b border-slate-100 text-sm font-bold text-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles size={14} className="text-sunset" /> About this trip
                    </span>
                    <ChevronRight size={18} className={`text-sunset transition-transform ${mobileDetailsOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Trip context */}
                  <div key={selectedTour.name} className={`${mobileDetailsOpen ? 'block' : 'hidden'} md:block p-6 md:p-8 md:border-r border-slate-100 bg-gradient-to-br from-tropical-bg/60 to-white`}>
                    <div>
                      <div className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-sunset mb-2">About this trip</div>
                      <p className="text-sm text-slate-600 leading-relaxed">{selectedTour.description}</p>
                    </div>

                    <div className="mt-6">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Trip highlights</div>
                      <ul className="space-y-2.5">
                        {selectedTour.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-sunset/10 flex items-center justify-center">
                              <CheckCircle2 size={12} className="text-sunset" strokeWidth={2.5} />
                            </span>
                            <span className="leading-snug">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">What's included</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTour.includes.map((inc, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full">
                            <Sparkles size={10} className="text-sunset" /> {inc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>Free cancellation up to 72h before departure</span>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tour Package</label>
                    <select
                      required
                      value={form.tour}
                      onChange={(e) => update('tour', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all bg-white"
                    >
                      {TOURS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Country</label>
                      <select
                        value={form.country}
                        onChange={(e) => update('country', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all bg-white"
                      >
                        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+44 7700 900000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Start Date</label>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        onChange={(e) => update('startDate', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Travelers</label>
                      <select
                        value={form.travelers}
                        onChange={(e) => update('travelers', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all bg-white"
                      >
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'traveler' : 'travelers'}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Special Requests (optional)</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      placeholder="Dietary needs, accessibility, anniversary surprise..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-sunset hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sunset/30 text-lg"
                  >
                    {submitting ? 'Confirming…' : <>Confirm Booking <ArrowRight size={20} /></>}
                  </button>
                  {submitError && (
                    <p className="text-xs text-center text-red-600">{submitError}</p>
                  )}
                  <p className="text-xs text-center text-slate-400">No payment required now. We'll confirm details within 24 hours.</p>
                </form>
                </div>
              </>
            )}

            {stage === 'success' && confirmation && (
              <BookingSuccess
                booking={confirmation.booking}
                reference={confirmation.ref}
                tour={selectedTour}
                copied={copied}
                onCopy={copyRef}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const BookingSuccess = ({
  booking,
  reference,
  tour,
  copied,
  onCopy,
  onClose
}: {
  booking: Booking;
  reference: string;
  tour: TourInfo;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) => {
  const formattedDate = booking.startDate
    ? new Date(booking.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Flexible';
  const pricePerPerson = tourPrice(tour);
  const total = pricePerPerson * booking.travelers;

  return (
    <div className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sunset/5 via-white to-ocean/5 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sunset/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-ocean/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none text-sunset"
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [-20, -120],
            x: [(i - 3) * 8, (i - 3) * 24],
            rotate: [0, 180]
          }}
          transition={{ duration: 3, delay: 0.4 + i * 0.15, repeat: Infinity, repeatDelay: 2 }}
          style={{ left: `${20 + i * 12}%`, top: '40%' }}
        >
          <Sparkles size={14 + (i % 3) * 4} />
        </motion.div>
      ))}

      <div className="relative p-8 md:p-10">
        {/* Check icon */}
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          className="mx-auto w-20 h-20 mb-6 relative"
        >
          <div className="absolute inset-0 bg-sunset/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-sunset to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-sunset/40">
            <CheckCircle2 size={42} strokeWidth={2.5} className="text-white" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">
            You're going to Thailand <span className="text-sunset">🌴</span>
          </h2>
          <p className="text-slate-500">Booking secured — your adventure starts here.</p>
        </motion.div>

        {/* Travel voucher */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-6"
        >
          <div className="grid sm:grid-cols-[150px_1fr_170px]">
            <div className="h-40 sm:h-auto relative">
              <img src={tour.img} alt={tour.name} className="h-full w-full object-cover sm:absolute sm:inset-0" referrerPolicy="no-referrer" />
            </div>
            <div className="p-5 sm:border-r border-dashed border-slate-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sunset mb-0.5">Siam Voyage Voucher</div>
                  <div className="font-mono font-bold text-slate-900 tracking-wider">{reference}</div>
                </div>
                <button
                  onClick={onCopy}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:bg-sunset/10 px-2 py-1 rounded-md transition-colors"
                  aria-label="Copy reference"
                >
                  {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <div className="text-sm font-bold text-slate-900 line-clamp-1">{tour.name}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Calendar size={12} /> {formattedDate}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1"><Users size={12} /> {booking.travelers} {booking.travelers === 1 ? 'guest' : 'guests'}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="font-bold uppercase tracking-widest text-slate-400 text-[9px]">Per Person</div>
                  <div className="mt-1 font-bold text-slate-900">{formatBaht(pricePerPerson)}</div>
                </div>
                <div className="rounded-xl bg-sunset/10 p-3">
                  <div className="font-bold uppercase tracking-widest text-sunset text-[9px]">Total</div>
                  <div className="mt-1 font-bold text-slate-900">{formatBaht(total)}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-tropical-bg p-5 text-center">
              <div className="rounded-xl bg-white p-3 shadow-inner border border-slate-100">
                <QRCodeSVG value={getBookingCheckInUrl(reference)} size={116} level="M" includeMargin={false} fgColor="#0f172a" bgColor="#ffffff" />
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Check-in QR</div>
              <div className="mt-1 text-xs text-slate-500">Present this voucher to staff</div>
            </div>
          </div>
        </motion.div>

        {/* What's next timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">What happens next</div>
          <div className="space-y-3">
            {[
              { title: 'Booking received', desc: 'Confirmation just hit your inbox.', done: true },
              { title: 'Personal call within 24h', desc: 'Your travel expert will tailor every detail.', done: false },
              { title: 'Final itinerary + deposit', desc: 'You secure the trip. We handle everything else.', done: false }
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.done ? 'bg-sunset text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {step.done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  {i < 2 && <div className={`w-px flex-1 mt-1 ${step.done ? 'bg-sunset/40' : 'bg-slate-200'}`} style={{ minHeight: 14 }} />}
                </div>
                <div className="pb-1">
                  <div className={`font-semibold text-sm ${step.done ? 'text-slate-900' : 'text-slate-700'}`}>{step.title}</div>
                  <div className="text-xs text-slate-500">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <button
            onClick={onClose}
            className="w-full flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors"
          >
            Continue exploring
          </button>
          <button
            onClick={onCopy}
            className="flex w-full items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold transition-colors border-2 border-slate-200 hover:border-sunset hover:text-sunset text-slate-700 sm:w-auto sm:min-w-[3.25rem]"
            aria-label="Share booking"
          >
            <Send size={18} />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Live Bookings Section ───────────────────────────────────────────────────
type TourBookingFormState = {
  name: string;
  email: string;
  phone: string;
  country: string;
  startDate: string;
  travelers: string;
  notes: string;
};

type BookingStage = 'form' | 'review' | 'success';

const TourBookingPanel = ({ tour, onStageChange }: { tour: TourInfo; onStageChange?: (stage: BookingStage) => void }) => {
  const navigate = useNavigate();
  const { addBooking } = useBookings();
  const [stage, setStageState] = useState<BookingStage>('form');
  const setStage = (next: BookingStage) => {
    setStageState(next);
    onStageChange?.(next);
  };
  const [form, setForm] = useState<TourBookingFormState>({
    name: '',
    email: '',
    phone: '',
    country: 'United Kingdom',
    startDate: '',
    travelers: '2',
    notes: ''
  });
  const [confirmation, setConfirmation] = useState<{ booking: Booking; ref: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const guests = parseInt(form.travelers, 10) || 1;
  const pricePerPerson = tourPrice(tour);
  const total = pricePerPerson * guests;
  const country = COUNTRIES.find(c => c.name === form.country) || COUNTRIES[0];
  const formattedDate = form.startDate
    ? new Date(form.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const update = (k: keyof TourBookingFormState, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const buildPayload = (): CreateBookingPayload => ({
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    country: country.name,
    countryCode: country.code,
    package: tour.name,
    packageSlug: slugifyPackage(tour.name),
    travelDate: form.startDate,
    guestCount: guests,
    notes: form.notes.trim()
  });

  const confirmBooking = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await addBooking(buildPayload());
      setConfirmation({ booking: result.booking, ref: result.bookingId });
      setStage('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = async () => {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  if (stage === 'success' && confirmation) {
    return (
      <div className="rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        <BookingSuccess booking={confirmation.booking} reference={confirmation.ref} tour={tour} copied={copied} onCopy={copyRef} onClose={() => navigate('/')} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-950 text-white p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-sunset mb-2">Reserve this tour</div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-serif font-bold">{tour.price}</div>
            <div className="text-sm text-white/60">per person</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50">Estimated total</div>
            <div className="text-2xl font-bold text-sunset">{formatBaht(total)}</div>
          </div>
        </div>
      </div>

      {stage === 'form' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitError(null);
            setStage('review');
          }}
          className="p-6 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input required value={form.name} onChange={(e) => update('name', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Country</label>
              <select value={form.country} onChange={(e) => update('country', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none bg-white">
                {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
              <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none" placeholder="+44 7700 900000" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Travel Date</label>
              <input type="date" required value={form.startDate} onChange={(e) => update('startDate', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Guests</label>
              <select value={form.travelers} onChange={(e) => update('travelers', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none bg-white">
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Special Requests (optional)</label>
            <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none resize-none" placeholder="Dietary needs, accessibility, anniversary surprise..." />
          </div>
          <button type="submit" className="w-full bg-sunset hover:bg-orange-600 text-white py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sunset/25">
            Review Booking <ArrowRight size={20} />
          </button>
          <p className="text-xs text-center text-slate-400">No payment required now. Review your details before confirmation.</p>
        </form>
      )}

      {stage === 'review' && (
        <div className="p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Review booking</div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden mb-5">
            {[
              ['Package', tour.name],
              ['Travel Date', formattedDate],
              ['Guest Count', `${guests}`],
              ['Price Per Person', formatBaht(pricePerPerson)],
              ['Total Amount', formatBaht(total)],
              ['Customer', form.name],
              ['Email', form.email],
              ['Phone', form.phone],
              ['Country', `${country.flag} ${country.name}`],
              ['Notes', form.notes || '-']
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-3 text-sm">
                <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">{label}</div>
                <div className="font-medium text-slate-800">{value}</div>
              </div>
            ))}
          </div>
          {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setStage('form')} className="py-3.5 rounded-xl font-bold border border-slate-200 text-slate-700 hover:bg-slate-50">Back</button>
            <button type="button" disabled={submitting} onClick={confirmBooking} className="py-3.5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white">
              {submitting ? 'Creating booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export function TourDetailPage() {
  const { tourSlug } = useParams<{ tourSlug: string }>();
  const location = useLocation();
  const tour = findTourBySlug(tourSlug);
  const [bookingStage, setBookingStage] = useState<BookingStage>('form');

  // Scroll to #book anchor when arriving with that hash (e.g. from a home Book button)
  useEffect(() => {
    if (location.hash === '#book') {
      // Defer so the page paints first
      const t = window.setTimeout(() => {
        document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(t);
    }
  }, [location.hash]);

  // When user advances to review/success, scroll back to top of the clean booking page
  useEffect(() => {
    if (bookingStage !== 'form') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [bookingStage]);

  if (!tour) return <Navigate to="/" replace />;

  const gallery = tourGallery(tour);
  const pricePerPerson = tourPrice(tour);
  const showTourContent = bookingStage === 'form';

  return (
    <div className="min-h-screen bg-tropical-bg text-slate-900">
      {/* Header — overlays hero on form stage, solid white on review/success */}
      {showTourContent ? (
        <header className="absolute top-0 left-0 right-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <span className="text-3xl italic font-semibold text-sunset">Siam</span>
              <span className="text-3xl italic font-semibold text-white">Voyage</span>
            </Link>
            <Link to="/" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/25">Back home</Link>
          </div>
        </header>
      ) : (
        <header className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <span className="text-3xl italic font-semibold text-sunset">Siam</span>
              <span className="text-3xl italic font-semibold text-slate-900">Voyage</span>
            </Link>
            <Link to="/" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Back home</Link>
          </div>
        </header>
      )}

      {/* Tour content — only visible on form stage */}
      {showTourContent && (
        <>
          <section className="relative min-h-[74vh] flex items-end overflow-hidden">
            <img src={tour.img} alt={tour.name} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/15" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-14 pt-28 w-full">
              <div className="max-w-3xl text-white">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                  <Clock size={14} /> {tour.duration}
                </div>
                <h1 className="text-4xl sm:text-6xl font-serif font-bold leading-tight mb-5">{tour.name}</h1>
                <p className="text-lg text-white/80 leading-relaxed max-w-2xl">{tour.description}</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a href="#book" className="inline-flex items-center gap-2 rounded-full bg-sunset px-6 py-3 font-bold text-white shadow-xl shadow-black/20 hover:bg-orange-600">Book this tour <ArrowRight size={18} /></a>
                  <div className="text-white"><span className="text-3xl font-bold">{formatBaht(pricePerPerson)}</span><span className="ml-2 text-white/60">per person</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* Project Gallery — directly below hero, full width */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-sunset mb-2">Gallery</div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">A glimpse of {tour.name}</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((img, i) => (
                <div
                  key={img}
                  className={`overflow-hidden rounded-2xl bg-slate-100 ${i === 0 ? 'col-span-2 row-span-2 aspect-[16/10]' : 'aspect-[4/3]'}`}
                >
                  <img
                    src={img}
                    alt={`${tour.name} gallery ${i + 1}`}
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 space-y-8">
            <section className="grid md:grid-cols-3 gap-4">
              {[
                ['Duration', tour.duration],
                ['Price', `${formatBaht(pricePerPerson)} per person`],
                ['Booking', 'Pay later after confirmation']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</div>
                  <div className="font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <h2 className="text-2xl font-serif font-bold mb-3">Tour Information</h2>
              <p className="text-slate-600 leading-relaxed">{tour.description}</p>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                <h2 className="text-xl font-serif font-bold mb-4">Highlights</h2>
                <ul className="space-y-3">
                  {tour.highlights.map(item => <li key={item} className="flex gap-3 text-sm text-slate-700"><CheckCircle2 size={18} className="text-sunset shrink-0 mt-0.5" /> {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                <h2 className="text-xl font-serif font-bold mb-4">Included</h2>
                <ul className="space-y-3">
                  {tour.includes.map(item => <li key={item} className="flex gap-3 text-sm text-slate-700"><Sparkles size={18} className="text-ocean shrink-0 mt-0.5" /> {item}</li>)}
                </ul>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                <h2 className="text-xl font-serif font-bold mb-4">Excluded</h2>
                <ul className="space-y-3">
                  {tourExcluded(tour).map(item => <li key={item} className="flex gap-3 text-sm text-slate-700"><X size={18} className="text-slate-400 shrink-0 mt-0.5" /> {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                <h2 className="text-xl font-serif font-bold mb-4">Itinerary</h2>
                <div className="space-y-4">
                  {tourItinerary(tour).map((item, i) => (
                    <div key={item} className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-sunset text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      {/* Booking section — STAYS MOUNTED across stages so form state survives.
          On form stage: anchors at #book at the bottom of the page.
          On review/success: occupies the full clean page. */}
      <section
        id="book"
        className={
          showTourContent
            ? 'max-w-7xl mx-auto px-4 sm:px-6 pb-14 scroll-mt-24'
            : 'px-4 sm:px-6 py-10 sm:py-16'
        }
      >
        <div className="max-w-2xl mx-auto">
          {showTourContent && (
            <div className="text-center mb-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-sunset mb-2">Reserve your spot</div>
              <h2 className="text-3xl font-serif font-bold text-slate-900">Book {tour.name}</h2>
            </div>
          )}
          <TourBookingPanel tour={tour} onStageChange={setBookingStage} />
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </div>
  );
}

const BookingRow = ({ b, highlight = false }: { b: Booking; highlight?: boolean }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`flex flex-col gap-2 p-3.5 sm:p-4 rounded-2xl transition-all sm:flex-row sm:items-center sm:gap-3 ${highlight ? 'bg-white border border-sunset/20 shadow-sm hover:shadow-md' : 'bg-white/60 border border-slate-100 hover:bg-white'}`}
  >
    <div className="flex items-start gap-3 sm:contents">
      <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-sunset/15 to-ocean/10 flex items-center justify-center text-lg font-bold text-slate-700">
        <span aria-hidden>{b.flag}</span>
      </div>
      <div className="flex-1 min-w-0 sm:flex sm:flex-1 sm:flex-col sm:justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">{b.firstName} {b.lastInitial}.</span>
          <span className="text-xs text-slate-500">from {b.country}</span>
          {b.isMine && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
        </div>
        <div className="text-xs text-slate-500 sm:truncate mt-0.5">
          booked <span className="text-slate-800 font-semibold">{b.tour}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0 sm:block sm:text-right sm:shrink-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right">{timeAgo(b.createdAt)}</div>
      <div className="text-[10px] text-slate-400 sm:mt-0.5 sm:text-right">{b.travelers} {b.travelers === 1 ? 'guest' : 'guests'}</div>
    </div>
  </motion.div>
);

const LiveBookingsSection = ({ bookings }: { bookings: Booking[] }) => {
  const today = bookings.filter(b => isToday(b.createdAt));
  const recent = bookings.filter(b => !isToday(b.createdAt)).slice(0, 8);
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-tropical-bg to-white scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-700 font-bold text-xs uppercase tracking-widest">Live</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-3 leading-tight px-1">
            People booking <span className="italic text-sunset">right now</span>
          </h2>
          <p className="text-slate-500">Real travelers, real bookings — see who's joining us today.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sunset to-orange-600 flex items-center justify-center">
                  <TrendingUp size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Booking Today</div>
                  <div className="text-xs text-slate-500">{todayDate}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">{today.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">bookings</div>
              </div>
            </div>
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {today.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Be the first to book today!</div>
                ) : today.map(b => <BookingRow key={b.id} b={b} highlight />)}
              </AnimatePresence>
            </div>
          </div>

          {/* Recent */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean to-blue-600 flex items-center justify-center">
                  <Globe size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Recent Bookings</div>
                  <div className="text-xs text-slate-500">Past 7 days</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">{recent.length}+</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">travelers</div>
              </div>
            </div>
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {recent.map(b => <BookingRow key={b.id} b={b} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Floating Booking Toast ──────────────────────────────────────────────────
const BookingToast = ({ bookings }: { bookings: Booking[] }) => {
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const candidates = bookings.filter(b => !b.isMine).slice(0, 20);

  useEffect(() => {
    if (dismissed || candidates.length === 0) return;
    let pos = 0;
    const showNext = () => {
      setCurrentIdx(pos % candidates.length);
      pos++;
      // Hide after 5s
      setTimeout(() => setCurrentIdx(null), 5000);
    };
    // First appearance after 8s, then every 22s
    const firstId = setTimeout(showNext, 8000);
    const intervalId = setInterval(showNext, 22000);
    return () => { clearTimeout(firstId); clearInterval(intervalId); };
  }, [candidates.length, dismissed]);

  const current = currentIdx !== null ? candidates[currentIdx] : null;

  return (
    <div className="fixed left-3 right-3 top-20 sm:left-auto sm:right-6 sm:top-24 z-[55] pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22 }}
            className="pointer-events-auto ml-auto bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-100 p-2 pr-3 sm:p-3 sm:pr-4 flex items-center gap-2 sm:gap-3 w-full max-w-[min(18rem,calc(100vw-1.5rem))] sm:max-w-none sm:w-[340px]"
          >
            <div className="w-7 h-7 sm:w-10 sm:h-10 shrink-0 rounded-full bg-gradient-to-br from-sunset/15 to-ocean/10 flex items-center justify-center text-sm sm:text-lg">
              <span aria-hidden>{current.flag}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-700 leading-snug line-clamp-2 sm:line-clamp-none">
                <span className="font-bold text-slate-900">{current.firstName} {current.lastInitial}.</span> booked{' '}
                <span className="font-semibold text-slate-900">{current.tour}</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">{current.country} · {timeAgo(current.createdAt)}</div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss notifications"
              className="shrink-0 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Car Rental Section ─────────────────────────────────────────────────────
const CarRentalSection = ({ onRentCar }: { onRentCar: (car: string) => void }) => {
  return (
    <section id="rentals" className="py-16 sm:py-24 px-4 sm:px-6 bg-tropical-bg scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-14 gap-4">
          <div>
            <span className="text-sunset font-semibold uppercase tracking-widest text-xs sm:text-sm">Self-drive</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-2 mb-3 leading-tight">
              Car <span className="italic text-sunset">Rentals</span>
            </h2>
            <p className="text-slate-500 max-w-xl text-sm sm:text-base">
              Explore Thailand at your own pace. Reliable family cars with insurance included and free hotel delivery.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck size={16} /> Insurance included
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin size={16} className="text-sunset" /> 10+ pickup points
            </div>
          </div>
        </div>

        <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-4 sm:mx-0 px-4 sm:px-0 pb-4 sm:pb-0 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CAR_CATALOG.map((c, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 snap-center shrink-0 w-[82%] sm:w-auto sm:shrink"
            >
              <div className="relative h-40 sm:h-44 overflow-hidden bg-slate-100">
                <img
                  src={c.img}
                  alt={c.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {c.badge && (
                  <span className="absolute top-3 left-3 bg-sunset text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider shadow-md">
                    {c.badge}
                  </span>
                )}
                <span className="absolute top-3 right-3 bg-white/95 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider">
                  {c.category}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-1">{c.name}</h3>

                <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users size={13} className="text-sunset shrink-0" /> {c.seats} seats
                  </div>
                  <div className="flex items-center gap-1">
                    <Cog size={13} className="text-sunset shrink-0" /> {c.transmission.slice(0, 4)}.
                  </div>
                  <div className="flex items-center gap-1">
                    <Fuel size={13} className="text-sunset shrink-0" /> {c.fuel}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex flex-col">
                    {c.originalPrice && (
                      <span className="text-slate-400 text-xs line-through decoration-sunset/40">
                        {c.originalPrice}
                      </span>
                    )}
                    <span className="text-lg font-bold text-sunset">
                      {c.pricePerDay} <span className="text-xs text-slate-400 font-normal">/ day</span>
                    </span>
                  </div>
                  <button
                    onClick={() => onRentCar(c.name)}
                    aria-label={`Rent ${c.name}`}
                    className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-sunset transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
                  >
                    Rent <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Car Rental Modal ───────────────────────────────────────────────────────
const CarRentalModal = ({
  open,
  initialCar,
  onClose
}: {
  open: boolean;
  initialCar?: string;
  onClose: () => void;
}) => {
  const [stage, setStage] = useState<'form' | 'success'>('form');
  const [reference, setReference] = useState('');
  const [form, setForm] = useState({
    car: '',
    pickupLocation: PICKUP_LOCATIONS[0],
    pickupDate: '',
    returnDate: '',
    driverName: '',
    driverAge: '30',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (open) {
      setStage('form');
      setReference('');
      setForm(f => ({ ...f, car: initialCar || f.car || CAR_CATALOG[0].name }));
    }
  }, [open, initialCar]);

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReference(generateReference().replace('SV-', 'CR-'));
    setStage('success');
  };

  const selected = CAR_CATALOG.find(c => c.name === form.car) || CAR_CATALOG[0];

  const days = form.pickupDate && form.returnDate
    ? Math.max(1, Math.round((new Date(form.returnDate).getTime() - new Date(form.pickupDate).getTime()) / 86_400_000))
    : 0;
  const rate = parseInt(selected.pricePerDay.replace(/[^\d]/g, ''), 10) || 0;
  const total = days * rate;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 z-30 p-3 bg-white rounded-full hover:bg-slate-100 active:bg-slate-100 transition-colors shadow-md touch-manipulation"
              aria-label="Close"
            >
              <X size={20} className="text-slate-700" />
            </button>

            {stage === 'form' && (
              <>
                {/* Car banner */}
                <div className="relative h-40 sm:h-48">
                  <img
                    src={selected.img}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-5 left-6 right-6 text-white">
                    <div className="text-xs uppercase tracking-widest text-sunset font-bold mb-1 flex items-center gap-2">
                      <Car size={14} /> Rent a Car
                    </div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold leading-tight">{selected.name}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm text-white/90">
                      <span>{selected.category} · {selected.seats} seats</span>
                      <span className="w-1 h-1 rounded-full bg-white/50" />
                      <span className="font-bold text-sunset">{selected.pricePerDay} <span className="text-white/70 font-normal">/ day</span></span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Vehicle</label>
                    <select
                      required
                      value={form.car}
                      onChange={(e) => update('car', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all bg-white"
                    >
                      {CAR_CATALOG.map(c => <option key={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Pickup Location</label>
                    <select
                      required
                      value={form.pickupLocation}
                      onChange={(e) => update('pickupLocation', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all bg-white"
                    >
                      {PICKUP_LOCATIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Pickup Date</label>
                      <input
                        type="date"
                        required
                        value={form.pickupDate}
                        onChange={(e) => update('pickupDate', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Return Date</label>
                      <input
                        type="date"
                        required
                        value={form.returnDate}
                        onChange={(e) => update('returnDate', e.target.value)}
                        min={form.pickupDate || undefined}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_120px] gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Driver Name</label>
                      <input
                        type="text"
                        required
                        value={form.driverName}
                        onChange={(e) => update('driverName', e.target.value)}
                        placeholder="As on driver's license"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Driver Age</label>
                      <input
                        type="number"
                        required
                        min={21}
                        max={80}
                        value={form.driverAge}
                        onChange={(e) => update('driverAge', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Phone</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+44 7700 900000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sunset focus:ring-2 focus:ring-sunset/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Live total */}
                  {days > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-tropical-bg border border-sunset/20">
                      <span className="text-sm text-slate-600">
                        {days} day{days === 1 ? '' : 's'} × {selected.pricePerDay}
                      </span>
                      <span className="text-xl font-bold text-sunset">฿{total.toLocaleString()}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-sunset hover:bg-orange-600 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sunset/30 text-lg"
                  >
                    Confirm Rental <ArrowRight size={20} />
                  </button>
                  <p className="text-xs text-center text-slate-400">Insurance included. No payment required now — pay on pickup.</p>
                </form>
              </>
            )}

            {stage === 'success' && (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-sunset/5 via-white to-ocean/5 pointer-events-none" />
                <div className="relative p-8 md:p-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                    className="mx-auto w-20 h-20 mb-6 relative"
                  >
                    <div className="absolute inset-0 bg-sunset/20 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-sunset to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-sunset/40">
                      <Car size={36} strokeWidth={2.5} className="text-white" />
                    </div>
                  </motion.div>

                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">
                      Your keys are reserved <span className="text-sunset">🚗</span>
                    </h2>
                    <p className="text-slate-500">We'll have {selected.name} ready for you.</p>
                  </div>

                  <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden mb-6">
                    <div className="flex">
                      <div className="w-28 shrink-0">
                        <img src={selected.img} alt={selected.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 p-5">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Reference</div>
                        <div className="font-mono font-bold text-slate-900 tracking-wider mb-2">{reference}</div>
                        <div className="text-sm font-bold text-slate-900 line-clamp-1">{selected.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <MapPin size={12} /> {form.pickupLocation}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <Calendar size={12} /> {days} day{days === 1 ? '' : 's'} · <span className="font-bold text-sunset">฿{total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors"
                  >
                    Continue exploring
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PULSE_TRANSITION: Transition = {
  duration: 1.4,
  repeat: Infinity,
  repeatDelay: 2.6,
  ease: 'easeInOut'
};

const BOUNCE_TRANSITION: Transition = {
  duration: 0.6,
  ease: 'easeOut'
};

const ChatActionLink = ({ href, label, bgClass, icon }: { href: string; label: string; bgClass: string; icon: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all hover:scale-[1.03] hover:brightness-110 ${bgClass}`}
  >
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">{icon}</span>
    <span>{label}</span>
  </a>
);

const ChatActionButton = ({ label, bgClass, onClick, icon, expanded }: { label: string; bgClass: string; onClick: () => void; icon: ReactNode; expanded?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={expanded}
    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all hover:scale-[1.03] hover:brightness-110 ${bgClass}`}
  >
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">{icon}</span>
    <span>{label}</span>
  </button>
);

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const buttonControls = useAnimation();

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      buttonControls.stop();
      buttonControls.set({ scale: 1 });
      return;
    }
    const run = async () => {
      await new Promise((r) => setTimeout(r, 5000));
      if (cancelled) return;
      await buttonControls.start({ scale: [1, 1.18, 0.95, 1.06, 1], transition: BOUNCE_TRANSITION });
      if (cancelled) return;
      await buttonControls.start({ scale: [1, 1.05, 1], transition: PULSE_TRANSITION });
    };
    void run();
    return () => { cancelled = true; };
  }, [isOpen, buttonControls]);

  useEffect(() => {
    if (!isOpen) setShowQR(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            role="dialog"
            aria-label="Chat with SiamVoyage"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto w-[min(20rem,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-2xl bg-slate-900 shadow-2xl sm:w-[320px]"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-sunset to-orange-600 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-700 font-serif text-[18px] font-bold text-white shadow-md">
                S
              </div>
              <div className="flex flex-1 flex-col leading-tight">
                <span className="text-[15px] font-semibold text-white">SiamVoyage</span>
                <span className="text-[12px] text-white/80">Online · Replies in minutes</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-2 p-4">
              <ChatActionLink
                href="https://t.me/Riven_Myat"
                label="Telegram"
                bgClass="bg-[#229ED9]"
                icon={<Send className="h-4 w-4 text-[#229ED9]" strokeWidth={2} />}
              />
              <ChatActionLink
                href="https://wa.me/66950287983"
                label="WhatsApp"
                bgClass="bg-[#25D366]"
                icon={<MessageCircle className="h-4 w-4 text-[#25D366]" strokeWidth={2} />}
              />
              <ChatActionButton
                label="LINE"
                bgClass="bg-[#06C755]"
                expanded={showQR}
                onClick={() => setShowQR((p) => !p)}
                icon={
                  <span className="inline-flex items-center justify-center rounded-sm bg-[#06C755] px-1 text-[7px] font-bold leading-[1.1] tracking-tight text-white">
                    LINE
                  </span>
                }
              />
              <ChatActionLink
                href="https://www.facebook.com/aungkmyattt"
                label="Messenger"
                bgClass="bg-[#0084FF]"
                icon={<MessageCircle className="h-4 w-4 text-[#0084FF]" strokeWidth={2} />}
              />
              <a
                href="tel:+66950287983"
                className="group flex items-center gap-3 rounded-xl border border-white/40 bg-transparent px-4 py-3 text-[14px] font-semibold text-white transition-all hover:scale-[1.03] hover:bg-white/10"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
                  <Phone className="h-4 w-4 text-white" strokeWidth={2} />
                </span>
                <span>Call us</span>
              </a>
            </div>

            {showQR && (
              <motion.div
                key="qr-reveal"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mx-4 mb-4 rounded-xl bg-white p-6 text-center"
              >
                <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-slate-100 text-slate-400 text-sm">
                  LINE QR Placeholder
                </div>
                <p className="mt-3 text-xs text-slate-500">Scan to add us on LINE</p>
                <button
                  type="button"
                  onClick={() => setShowQR(false)}
                  className="mx-auto mt-2 inline-flex text-xs font-semibold text-sunset transition-colors hover:text-orange-600"
                >
                  Hide QR
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
        animate={buttonControls}
        whileTap={{ scale: 0.95 }}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sunset to-orange-600 text-white shadow-2xl transition-shadow hover:shadow-[0_8px_32px_rgba(242,125,38,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset sm:h-14 sm:w-14"
      >
        {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} /> : <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />}
      </motion.button>
    </div>
  );
};

export default function App() {
  const [showPlanner, setShowPlanner] = useState(false);
  const [rentalOpen, setRentalOpen] = useState(false);
  const [rentalCar, setRentalCar] = useState<string | undefined>(undefined);
  const [highlightedTour, setHighlightedTour] = useState<string | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const { bookings } = useBookings();

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('plannerDismissed');
    if (dismissed) return;
    const timer = setTimeout(() => setShowPlanner(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const closePlanner = () => {
    setShowPlanner(false);
    sessionStorage.setItem('plannerDismissed', '1');
  };

  const openRental = (car?: string) => {
    setRentalCar(car);
    setRentalOpen(true);
  };

  const handleSearch = (destination: string) => {
    const tour = DESTINATION_TO_TOUR[destination];
    const toursEl = document.getElementById('tours');
    toursEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (tour) {
      setHighlightedTour(tour);
      window.setTimeout(() => setHighlightedTour(null), 6000);
    }
  };

  return (
    <div className="min-h-screen selection:bg-sunset selection:text-white">
      <Navbar onPlanTrip={() => setShowPlanner(true)} onSearch={handleSearch} />
      <main>
        <Hero
          onBookNow={() => document.getElementById('tours')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onPlanTrip={() => setShowPlanner(true)}
          onSearch={handleSearch}
        />
        <LiveBookingsSection bookings={bookings} />
        <TestimonialMarquee />
        <Services />
        <TourPackages highlightedTour={highlightedTour} />
        <CarRentalSection onRentCar={(c) => openRental(c)} />
        <WhyChooseUs />
        <ContactSection />
        <FinalCTA onPlanTrip={() => setShowPlanner(true)} />
      </main>
      <Footer />
      <TripPlannerModal open={showPlanner} onClose={closePlanner} />
      <CarRentalModal
        open={rentalOpen}
        initialCar={rentalCar}
        onClose={() => setRentalOpen(false)}
      />
      <BookingToast bookings={bookings} />

      {/* Mobile-only sticky Book Now — appears after scrolling past hero */}
      <div className={`sm:hidden fixed bottom-4 left-4 right-20 z-40 pointer-events-none transition-all duration-300 ${showStickyCTA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button
          onClick={() => document.getElementById('tours')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="pointer-events-auto w-full bg-sunset hover:bg-orange-600 text-white py-3.5 rounded-full font-bold shadow-2xl shadow-sunset/40 flex items-center justify-center gap-2"
        >
          Book Now <ArrowRight size={18} />
        </button>
      </div>
      <ChatWidget />
    </div>
  );
}
