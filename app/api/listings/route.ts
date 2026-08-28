import { NextRequest, NextResponse } from 'next/server';
import { Listing } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function parseLocation(location: string): { neighborhood: string; city: string; state: string } {
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return { neighborhood: parts[0], city: parts[1], state: parts[2] };
  }
  if (parts.length === 2) {
    return { neighborhood: parts[0], city: parts[0], state: parts[1] };
  }
  return { neighborhood: parts[0], city: parts[0], state: '' };
}

function streetViewUrl(address: string, mapsKey: string): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(address)}&key=${mapsKey}&return_error_code=true`;
}

// ── Demo fallback (no API keys) ────────────────────────────────────────────
function buildDemoListings(location: string, lat: number, lng: number): Listing[] {
  const offsets: [number, number, number, number, number, number?][] = [
    [ 0.005, -0.008, 2450, 1, 1, 680  ],
    [ 0.012, -0.004, 2950, 2, 1, 920  ],
    [ 0.008,  0.006, 3400, 2, 2, 1100 ],
    [-0.003, -0.012, 1950, 0, 1, 480  ],
    [ 0.016,  0.003, 3750, 3, 2, 1350 ],
    [-0.007,  0.009, 2200, 1, 1, 610  ],
    [ 0.021, -0.011, 4100, 3, 2, 1480 ],
    [-0.014,  0.015, 2750, 2, 1, 850  ],
    [ 0.003,  0.019, 1850, 0, 1, 440  ],
    [ 0.018,  0.012, 3100, 2, 2, 980  ],
    [-0.009, -0.005, 2650, 1, 1, 720  ],
    [ 0.025, -0.017, 4600, 3, 3, 1620 ],
    [-0.018,  0.022, 2300, 1, 1, 660  ],
    [ 0.011, -0.020, 3250, 2, 2, 1050 ],
    [-0.022,  0.008, 2050, 1, 1, 530  ],
    [ 0.007,  0.027, 3850, 3, 2, 1380 ],
    [-0.027, -0.014, 2550, 1, 1, 700  ],
    [ 0.030,  0.006, 5200, 4, 3, 1900 ],
    [-0.005,  0.031, 2100, 0, 1, 490  ],
    [ 0.019, -0.025, 3500, 2, 2, 1150 ],
  ];
  const streets = [
    'Main St', 'Oak Ave', 'Elm Blvd', 'Park Rd', 'Lake Dr', 'Maple Ln',
    'Cedar Way', 'Sunset Dr', 'Hillside Ave', 'Garden Ct', 'Vine St',
    'Prospect Ave', 'Valley Rd', 'Rosewood Dr', 'Canyon Blvd', 'Maplewood Ln',
    'Lakeview Ter', 'Ridgecrest Dr', 'Brookside Ave', 'Summit Ct',
  ];
  const areaLabel = location.split(',')[0];
  return offsets.map(([dlat, dlng, price, beds, baths, sqft], i) => ({
    id: `demo-${i + 1}`,
    address: `${100 + i * 117} ${streets[i]}, ${areaLabel}`,
    price: price as number,
    beds: beds as number,
    baths: baths as number,
    sqft: sqft as number | undefined,
    latitude: lat + (dlat as number),
    longitude: lng + (dlng as number),
  }));
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: 'location required' }, { status: 400 });
  }

  const rentcastKey = process.env.RENTCAST_API_KEY;
  const mapsKey     = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '';

  // ── Geocode the location (always — used for demo fallback too) ─────────
  let lat = 34.0779, lng = -118.2741;
  if (mapsKey) {
    try {
      const geo = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey}`
      );
      const gd = await geo.json();
      const loc = gd?.results?.[0]?.geometry?.location;
      if (loc) { lat = loc.lat; lng = loc.lng; }
    } catch { /* use defaults */ }
  }

  // ── No Rentcast key → demo listings ───────────────────────────────────
  if (!rentcastKey) {
    return NextResponse.json({ listings: buildDemoListings(location, lat, lng) });
  }

  // ── Rentcast: search by lat/lng radius for hyper-local results ─────────
  const { city, state } = parseLocation(location);
  const radius = 3; // miles — tight radius around the neighbourhood

  let listings: Listing[] = [];

  try {
    // Try radius search first (most accurate for neighbourhoods)
    const radiusUrl = `https://api.rentcast.io/v1/listings/rental/long-term?latitude=${lat}&longitude=${lng}&radius=${radius}&status=Active&limit=40`;
    const radiusRes = await fetch(radiusUrl, {
      headers: { 'X-Api-Key': rentcastKey },
      next: { revalidate: 300 },
    });

    if (radiusRes.ok) {
      const data: RentcastListing[] = await radiusRes.json();
      listings = data
        .filter(p => p.latitude && p.longitude && p.price)
        .slice(0, 20)
        .map(p => toListing(p, mapsKey));
    }

    // Fall back to city search if radius returned too few
    if (listings.length < 8 && city && state) {
      const cityUrl = `https://api.rentcast.io/v1/listings/rental/long-term?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&status=Active&limit=40`;
      const cityRes = await fetch(cityUrl, {
        headers: { 'X-Api-Key': rentcastKey },
        next: { revalidate: 300 },
      });
      if (cityRes.ok) {
        const data: RentcastListing[] = await cityRes.json();
        listings = data
          .filter(p => p.latitude && p.longitude && p.price)
          .slice(0, 20)
          .map(p => toListing(p, mapsKey));
      }
    }
  } catch (err) {
    console.error('Rentcast error:', err);
    return NextResponse.json({ listings: buildDemoListings(location, lat, lng) });
  }

  if (!listings.length) {
    return NextResponse.json({ listings: buildDemoListings(location, lat, lng) });
  }

  return NextResponse.json({ listings });
}

// ── Types + mapper ─────────────────────────────────────────────────────────
interface RentcastListing {
  id: string;
  formattedAddress: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  price: number;
  mlsNumber?: string;
  listingAgent?: { website?: string };
}

function toListing(p: RentcastListing, mapsKey: string): Listing {
  const address = p.formattedAddress ?? p.addressLine1 ?? 'Unknown address';
  return {
    id: p.id ?? String(Math.random()),
    address,
    price: p.price,
    beds: p.bedrooms ?? 0,
    baths: p.bathrooms ?? 0,
    sqft: p.squareFootage,
    latitude: p.latitude,
    longitude: p.longitude,
    // Street View photo — real exterior shot of the property
    photoUrl: mapsKey ? streetViewUrl(address, mapsKey) : undefined,
    // Link to Google Maps search for the address (Rentcast doesn't give listing URLs)
    zillowUrl: `https://www.google.com/maps/search/${encodeURIComponent(address)}`,
  };
}
