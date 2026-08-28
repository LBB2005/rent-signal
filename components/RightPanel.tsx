'use client';

import { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Listing } from '@/lib/types';

// ── Theme ──────────────────────────────────────────────────────────────────
const T = {
  bg: '#FBFAF6',
  bgSubtle: '#F1EDE2',
  surface: '#FFFFFF',
  border: '#EBE7DC',
  text: '#1A1916',
  textStrong: '#1A1916',
  textMuted: '#75736A',
  textSubtle: '#A6A39A',
  brand: '#3F7D4A',
  brandDeep: '#2E5E37',
  brandSoftBg: '#EEF3E9',
  brandSoftBorder: '#DDE8D2',
};

const FONT = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

interface RightPanelProps {
  areaName: string;
  listings: Listing[];
  listingsLoading: boolean;
  onCollapse: () => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke={T.textMuted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v8m0 0l-3-3m3 3l3-3M2 12h10" stroke={T.brand} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowUpRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 9l6-6m0 0H4m5 0v5" stroke={T.textMuted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
};

// ── Tag computation ────────────────────────────────────────────────────────
function computeTags(listings: Listing[]): Record<string, string> {
  const tags: Record<string, string> = {};
  if (listings.length < 2) return tags;

  const withSqft = listings.filter(l => l.sqft && l.sqft > 0);

  // Best value = lowest price/sqft
  if (withSqft.length >= 2) {
    const best = [...withSqft].sort((a, b) => (a.price / a.sqft!) - (b.price / b.sqft!))[0];
    tags[best.id] = 'Best value';
  }

  // Cheapest = lowest price (if not already tagged)
  const cheapest = [...listings].sort((a, b) => a.price - b.price)[0];
  if (!tags[cheapest.id]) tags[cheapest.id] = 'Cheapest';

  // Largest = most sqft (if not already tagged)
  if (withSqft.length >= 2) {
    const largest = [...withSqft].sort((a, b) => b.sqft! - a.sqft!)[0];
    if (!tags[largest.id]) tags[largest.id] = 'Largest';
  }

  return tags;
}

const TAG_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'Cheapest':   { bg: T.brandSoftBg,  color: T.brandDeep, border: T.brandSoftBorder },
  'Best value': { bg: '#FFF9E6',       color: '#8A6300',   border: '#F0E0A0' },
  'Largest':    { bg: '#EEF2FF',       color: '#3B5BDB',   border: '#C5D0F0' },
};

// ── Price pin label ────────────────────────────────────────────────────────
function PriceLabel({ price, active }: { price: number; active: boolean }) {
  return (
    <div style={{
      background: active ? T.brandDeep : T.brand,
      color: 'white',
      fontSize: 10.5,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      boxShadow: active
        ? '0 0 0 3px rgba(22,163,74,.22), 0 2px 6px rgba(0,0,0,.22)'
        : '0 1px 4px rgba(0,0,0,.2)',
      letterSpacing: '-0.01em',
      fontFamily: FONT,
      whiteSpace: 'nowrap' as const,
      transform: 'translateY(-4px)',
    }}>
      ${Math.round(price / 100) * 100 === price
        ? (price / 1000).toFixed(1) + 'k'
        : price.toLocaleString()}
    </div>
  );
}

// ── Listing card ───────────────────────────────────────────────────────────
function ListingCard({ listing, rank, active, tag, onClick }: {
  listing: Listing;
  rank: number;
  active: boolean;
  tag?: string | null;
  onClick: () => void;
}) {
  const shortAddr = listing.address.split(',')[0];
  const pricePerSqft = listing.sqft && listing.sqft > 0
    ? Math.round(listing.price / listing.sqft)
    : null;

  const searchUrl = listing.zillowUrl
    ?? `https://www.google.com/search?q=${encodeURIComponent(listing.address + ' rental')}`;

  const photo = listing.photoUrls?.[0] ?? listing.photoUrl;
  const extraPhotos = (listing.photoUrls?.length ?? 0) > 1 ? listing.photoUrls!.length - 1 : 0;

  return (
    <div
      onClick={() => {
        onClick();
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      }}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: active ? 'rgba(63,125,74,.04)' : T.bg,
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Photo — full height, flush edges */}
      <div style={{
        width: 90, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        background: T.bgSubtle,
      }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={shortAddr}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', minHeight: 72,
            background: 'linear-gradient(160deg, #EEEAE0 0%, #DCDFCB 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <path d="M2 16L7 10L11 14L15 9L20 12V18H2V16Z" fill="rgba(120,115,104,.35)" />
              <circle cx="15" cy="7" r="2" fill="rgba(120,115,104,.35)" />
            </svg>
          </div>
        )}
        <span style={{
          position: 'absolute', top: 5, left: 5,
          width: 16, height: 16, borderRadius: 3,
          background: T.textStrong, color: 'white',
          fontSize: 8, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{rank}</span>
        {extraPhotos > 0 && (
          <span style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,.5)', borderRadius: 3,
            fontSize: 8, fontWeight: 600, color: 'white', padding: '1px 4px',
          }}>+{extraPhotos}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, padding: '11px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, letterSpacing: '-0.011em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0 }}>
            {shortAddr}
          </div>
          {tag && TAG_STYLE[tag] && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
              background: TAG_STYLE[tag].bg, color: TAG_STYLE[tag].color, border: `1px solid ${TAG_STYLE[tag].border}`,
              letterSpacing: '0.01em',
            }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted }}>
          {listing.beds}bd · {listing.baths}ba{listing.sqft ? ` · ${listing.sqft.toLocaleString()} sqft` : ''}
          {pricePerSqft ? <span style={{ color: T.textSubtle }}> · ${pricePerSqft}/sqft</span> : null}
        </div>
      </div>

      {/* Price + link */}
      <div style={{ textAlign: 'right', flexShrink: 0, padding: '11px 14px 11px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textStrong, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' as const }}>
          ${listing.price.toLocaleString()}<span style={{ fontSize: 10, color: T.textSubtle, fontWeight: 500 }}>/mo</span>
        </div>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10.5, color: T.brand, fontWeight: 500, textDecoration: 'none',
          }}
        >
          View <IconArrowUpRight />
        </a>
      </div>
    </div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: T.bg, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ width: 90, flexShrink: 0, minHeight: 72, background: T.bgSubtle, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1, padding: '11px 10px' }}>
        <div style={{ height: 13, background: T.bgSubtle, borderRadius: 4, width: '70%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 11, background: T.bgSubtle, borderRadius: 4, width: '45%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ width: 64, padding: '11px 14px 11px 0' }}>
        <div style={{ height: 16, background: T.bgSubtle, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

// ── Market summary stat cards ──────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textSubtle, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: '-0.022em', marginTop: 5, fontVariantNumeric: 'tabular-nums' as const, lineHeight: 1 }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, letterSpacing: 0 }}>{sub}</span>}
      </div>
    </div>
  );
}

function SummaryCards({ listings }: { listings: Listing[] }) {
  if (!listings.length) return null;

  const prices = listings.map(l => l.price).sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const median = prices.length % 2 === 0
    ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
    : prices[Math.floor(prices.length / 2)];
  const min = prices[0];
  const max = prices[prices.length - 1];

  // Per-bedroom breakdown
  const byBeds: Record<number, number[]> = {};
  listings.forEach(l => {
    if (!byBeds[l.beds]) byBeds[l.beds] = [];
    byBeds[l.beds].push(l.price);
  });
  const bedRows = Object.entries(byBeds)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([beds, ps]) => ({
      beds: Number(beds),
      count: ps.length,
      avg: Math.round(ps.reduce((s, p) => s + p, 0) / ps.length),
      min: Math.min(...ps),
      max: Math.max(...ps),
    }));

  const tdBase: React.CSSProperties = { padding: '6px 10px', fontSize: 11.5, color: T.text, borderBottom: `1px solid ${T.border}` };
  const thBase: React.CSSProperties = { ...tdBase, fontWeight: 600, color: T.textMuted, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' as const, background: T.bgSubtle };

  return (
    <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textSubtle, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        Market Summary
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="Avg rent" value={`$${avg.toLocaleString()}`} sub="/mo" />
        <StatCard label="Median rent" value={`$${median.toLocaleString()}`} sub="/mo" />
        <StatCard label="Active listings" value={String(listings.length)} />
        <StatCard label="Price range" value={`$${(min / 1000).toFixed(1)}k–$${(max / 1000).toFixed(1)}k`} />
      </div>

      {bedRows.length > 1 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textSubtle, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginTop: 4 }}>
            By Bedroom
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', fontSize: 12 }}>
            <thead>
              <tr>{['Beds', 'Units', 'Avg rent', 'Range'].map(h => <th key={h} style={{ ...thBase, textAlign: 'left' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {bedRows.map(row => (
                <tr key={row.beds}>
                  <td style={{ ...tdBase, fontWeight: 600 }}>{row.beds}bd</td>
                  <td style={tdBase}>{row.count}</td>
                  <td style={{ ...tdBase, fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const }}>${row.avg.toLocaleString()}</td>
                  <td style={{ ...tdBase, color: T.textMuted, fontVariantNumeric: 'tabular-nums' as const }}>${row.min.toLocaleString()}–${row.max.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Map placeholder (no API key) ───────────────────────────────────────────
function MapPlaceholder({ count }: { count: number }) {
  return (
    <div style={{
      height: 200, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${T.border}`, position: 'relative',
      background: 'linear-gradient(180deg, #EEEAE0 0%, #DCDFCB 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', color: T.textMuted }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Map unavailable</div>
        <div style={{ fontSize: 11 }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        background: 'rgba(255,255,255,.92)', borderRadius: 8,
        fontSize: 11, fontWeight: 600, padding: '5px 9px', color: T.text,
        border: `1px solid ${T.border}`,
      }}>
        {count} listings nearby
      </div>
    </div>
  );
}

// ── Zoom controls (inside Map so useMap works) ─────────────────────────────
function ZoomControls() {
  const map = useMap();
  const btnStyle: React.CSSProperties = {
    width: 32, height: 32, background: 'white',
    border: `1px solid ${T.border}`,
    borderRadius: 6, cursor: 'pointer',
    fontSize: 20, fontWeight: 300, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: T.text, fontFamily: FONT,
    boxShadow: '0 1px 4px rgba(0,0,0,.12)',
  };
  return (
    <div style={{
      position: 'absolute', right: 10, bottom: 24, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <button style={btnStyle} onClick={() => map && map.setZoom((map.getZoom() ?? 13) + 1)}>+</button>
      <button style={btnStyle} onClick={() => map && map.setZoom((map.getZoom() ?? 13) - 1)}>−</button>
    </div>
  );
}

// ── Live map ──────────────────────────────────────────────────────────────
function ListingsMap({ listings, activeId, onSelect }: {
  listings: Listing[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [infoId, setInfoId] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState<Record<string, number>>({});

  if (!listings.length) return null;

  const center = {
    lat: listings.reduce((s, l) => s + l.latitude, 0) / listings.length,
    lng: listings.reduce((s, l) => s + l.longitude, 0) / listings.length,
  };

  const infoListing = infoId ? listings.find(l => l.id === infoId) : null;

  function getPhotos(listing: Listing): string[] {
    if (listing.photoUrls?.length) return listing.photoUrls;
    if (listing.photoUrl) return [listing.photoUrl];
    return [];
  }

  const infoPhotos = infoListing ? getPhotos(infoListing) : [];
  const currentPhotoIdx = infoListing ? (photoIdx[infoListing.id] ?? 0) : 0;
  const currentPhoto = infoPhotos[currentPhotoIdx];

  function prevPhoto(id: string, total: number) {
    setPhotoIdx(p => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) }));
    void total;
  }
  function nextPhoto(id: string, total: number) {
    setPhotoIdx(p => ({ ...p, [id]: Math.min(total - 1, (p[id] ?? 0) + 1) }));
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={13}
      mapId="appraise-rent-map"
      style={{ width: '100%', height: '100%' }}
      disableDefaultUI
      gestureHandling="greedy"
    >
      <ZoomControls />

      {listings.map(listing => (
        <AdvancedMarker
          key={listing.id}
          position={{ lat: listing.latitude, lng: listing.longitude }}
          onClick={() => {
            setInfoId(listing.id === infoId ? null : listing.id);
            onSelect(listing.id);
          }}
        >
          <PriceLabel
            price={listing.price}
            active={activeId === listing.id || infoId === listing.id}
          />
        </AdvancedMarker>
      ))}

      {infoListing && (
        <InfoWindow
          position={{ lat: infoListing.latitude, lng: infoListing.longitude }}
          onCloseClick={() => setInfoId(null)}
          pixelOffset={[0, -10]}
          maxWidth={204}
        >
          <div style={{ fontFamily: FONT, width: 187, margin: '-8px -12px -8px' }}>
            {/* Photo gallery */}
            <div style={{
              position: 'relative', height: 119,
              background: T.bgSubtle, overflow: 'hidden',
              borderRadius: '8px 8px 0 0',
            }}>
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPhoto}
                  alt={infoListing.address.split(',')[0]}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(160deg, #EEEAE0 0%, #DCDFCB 100%)',
                }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="6" fill="#DDD9CE" />
                    <path d="M6 26L14 16L20 22L26 14L30 18V30H6V26Z" fill="rgba(255,255,255,.5)" />
                    <circle cx="24" cy="12" r="3" fill="rgba(255,255,255,.5)" />
                  </svg>
                </div>
              )}

              {/* Prev / Next arrows */}
              {infoPhotos.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); prevPhoto(infoListing.id, infoPhotos.length); }}
                    disabled={currentPhotoIdx === 0}
                    style={{
                      position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(255,255,255,.88)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: T.text, opacity: currentPhotoIdx === 0 ? 0.35 : 1,
                      boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                    }}
                  >‹</button>
                  <button
                    onClick={e => { e.stopPropagation(); nextPhoto(infoListing.id, infoPhotos.length); }}
                    disabled={currentPhotoIdx === infoPhotos.length - 1}
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(255,255,255,.88)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: T.text, opacity: currentPhotoIdx === infoPhotos.length - 1 ? 0.35 : 1,
                      boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                    }}
                  >›</button>
                </>
              )}

              {/* Photo counter badge */}
              {infoPhotos.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: 6, right: 6,
                  background: 'rgba(0,0,0,.52)', borderRadius: 4,
                  fontSize: 10, fontWeight: 600, color: 'white',
                  padding: '2px 6px', letterSpacing: '0.02em',
                }}>
                  {currentPhotoIdx + 1}/{infoPhotos.length}
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ padding: '10px 12px 8px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.brandDeep, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                ${infoListing.price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>/mo</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginTop: 3, letterSpacing: '-0.01em' }}>
                {infoListing.address.split(',')[0]}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
                {infoListing.beds}bd · {infoListing.baths}ba
                {infoListing.sqft ? ` · ${infoListing.sqft.toLocaleString()} sqft` : ''}
              </div>
              {infoListing.zillowUrl && (
                <a
                  href={infoListing.zillowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11.5, color: T.brand, fontWeight: 600, textDecoration: 'none',
                    background: T.brandSoftBg, border: `1px solid ${T.brandSoftBorder}`,
                    padding: '4px 10px', borderRadius: 6,
                  }}
                >
                  View on Zillow <IconArrowUpRight />
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function RightPanel({ areaName, listings, listingsLoading, onCollapse }: RightPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const shortName = areaName.split(',')[0];
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const sortedListings = [...listings].sort((a, b) => a.price - b.price);

  const tags = computeTags(listings);

  return (
    <aside className="panel-enter" style={{
      width: '100%', flexShrink: 0, background: T.bg,
      borderLeft: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      height: '100%',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
        background: T.bg, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.textSubtle, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Area</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: T.textStrong, letterSpacing: '-0.018em' }}>{shortName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {listings.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: T.brandDeep,
              background: T.brandSoftBg, border: `1px solid ${T.brandSoftBorder}`,
              padding: '3px 9px', borderRadius: 999,
            }}>
              {listings.length} listings
            </span>
          )}
          <button className="btn-icon" onClick={onCollapse} title="Collapse" style={iconBtn}>
            <IconChevronRight />
          </button>
        </div>
      </div>

      {/* Scrollable body: map + summary + listings */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Map */}
        <div style={{ padding: '14px 14px 0' }}>
          <div style={{ height: 240, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {listingsLoading ? (
              <div style={{
                height: '100%', background: T.bgSubtle,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>Loading map…</div>
              </div>
            ) : listings.length === 0 ? (
              <div style={{
                height: '100%',
                background: 'linear-gradient(180deg, #EEEAE0 0%, #DCDFCB 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>No listings found</div>
              </div>
            ) : mapsKey ? (
              <APIProvider apiKey={mapsKey}>
                <ListingsMap listings={listings} activeId={activeId} onSelect={setActiveId} />
              </APIProvider>
            ) : (
              <MapPlaceholder count={listings.length} />
            )}
          </div>
        </div>

        {/* Summary cards */}
        {!listingsLoading && <SummaryCards listings={listings} />}

        {/* Listings */}
        <div>
          <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 600, color: T.textSubtle, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
            {listingsLoading ? 'Loading listings…' : `${listings.length} active rentals`}
          </div>

          <div style={{ borderTop: `1px solid ${T.border}` }}>
            {listingsLoading ? (
              [0, 1, 2, 3].map(i => <SkeletonCard key={i} />)
            ) : (
              sortedListings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  rank={i + 1}
                  active={activeId === listing.id}
                  tag={tags[listing.id]}
                  onClick={() => setActiveId(prev => prev === listing.id ? null : listing.id)}
                />
              ))
            )}
          </div>

          {!listingsLoading && listings.length > 0 && (
            <div style={{ padding: '10px 14px' }}>
              <button className="chip-btn" style={{
                width: '100%',
                padding: '10px 14px', fontSize: 12.5, fontWeight: 600,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, cursor: 'pointer', color: T.text,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.005em', fontFamily: FONT,
              }}>
                <IconDownload /> Export this report
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
