export type PassportCode = 'KA' | 'TN';
export type Confidence = 'high' | 'medium' | 'low' | 'approximate' | 'missing' | 'editorial';
export type BookletStatus = 'listed' | 'press-mentioned' | 'candidate';

export interface StampLocation {
  id: string;
  passport: PassportCode;
  order: number;
  state: string;
  district: string;
  place: string;
  ppcTheme: string;
  ppcSince: string | null;
  guide: string | null;
  postOffice: string;
  postOfficeRank: string;
  officeType: 'GPO' | 'HO' | 'SO' | 'BO' | null;
  pin: string;
  lat: number | null;
  lng: number | null;
  booklet: { status: BookletStatus; note: string };
  confidence: Record<'place' | 'ppcTheme' | 'postOffice' | 'pin' | 'officeType' | 'coords' | 'guide', Confidence>;
  geocode: { method: string; note: string };
  notes: string[];
  sources: string[];
}

export interface PassportMeta {
  name: string;
  edition: string;
  slots: number;
  price: number;
}

export interface Dataset {
  meta: {
    generated: string;
    disclaimer: string;
    passports: Record<PassportCode, PassportMeta>;
    sources: Record<string, string>;
  };
  locations: StampLocation[];
}

export interface Visit {
  id: string;
  /** ISO date (yyyy-mm-dd) the ink cancellation was collected. */
  date: string;
  note?: string;
}

export interface StampPhoto {
  key: string;
  locationId: string;
  blob: Blob;
  createdAt: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
