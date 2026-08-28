'use client';

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const A = {
  ink: '#1A1916',
  ink2: '#3F3E39',
  mute: '#75736A',
  faint: '#A6A39A',
  hair: '#EBE7DC',
  hairSoft: '#F1EDE2',
  brand: '#3F7D4A',
  brandDeep: '#2E5E37',
  brandSoft: '#EEF3E9',
  brandSoftBorder: '#DDE8D2',
};

const FONT  = "var(--font-inter), 'Inter', ui-sans-serif, system-ui, sans-serif";
const SERIF = "var(--font-source-serif), 'Source Serif 4', Georgia, serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChartData {
  type?: 'bar' | 'line';
  title?: string;
  data: Array<{ name: string; value: number; fill?: string }>;
}

interface MapData {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; label?: string; title?: string; price?: string }>;
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'chart'; content: string }
  | { type: 'map'; content: string };

// ── Segment parser ────────────────────────────────────────────────────────────
function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /```(chart|map)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) });
    segs.push({ type: m[1] as 'chart' | 'map', content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) });
  return segs;
}

// ── Inline formatting ─────────────────────────────────────────────────────────
function inlineFmt(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${A.ink};font-weight:600">$1</strong>`)
    .replace(/_(.+?)_/g, `<em style="color:${A.mute}">$1</em>`);
}

// ── Table renderer ────────────────────────────────────────────────────────────
function isTableLine(line: string): boolean {
  return line.trim().startsWith('|');
}
function isSeparatorLine(line: string): boolean {
  return /^\|[\s\-:|]+$/.test(line.trim());
}

function TableBlock({ lines }: { lines: string[] }) {
  const rows = lines
    .filter(l => isTableLine(l) && !isSeparatorLine(l))
    .map(l =>
      l.split('|')
        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
        .map(c => c.trim())
    );
  if (rows.length < 1) return null;
  const [header, ...body] = rows;
  return (
    <div style={{ overflowX: 'auto', marginBottom: 14, borderRadius: 10, border: `1px solid ${A.hair}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{
                padding: '9px 14px', textAlign: 'left',
                borderBottom: `2px solid ${A.hair}`,
                color: A.ink, fontWeight: 600,
                background: A.hairSoft, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(235,231,220,.3)' : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 14px', borderBottom: `1px solid ${A.hairSoft}`, color: A.ink2 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Prose renderer ────────────────────────────────────────────────────────────
function ProseLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return (
            <div key={i} style={{
              fontFamily: SERIF, fontWeight: 500, fontSize: 20,
              color: A.ink, lineHeight: 1.35, letterSpacing: '-0.02em',
              marginTop: 12, marginBottom: 6,
            }}>{line.slice(3)}</div>
          );
        if (line.startsWith('### '))
          return (
            <div key={i} style={{
              fontWeight: 600, fontSize: 13, color: A.ink,
              marginTop: 10, marginBottom: 4, fontFamily: FONT,
            }}>{line.slice(4)}</div>
          );
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{ color: A.brand, marginTop: 3, flexShrink: 0, fontSize: 16, lineHeight: 1 }}>·</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.65, color: A.ink2, fontFamily: FONT }}
                dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(2)) }} />
            </div>
          );
        if (line === '') return <div key={i} style={{ height: 8 }} />;
        return (
          <div key={i} style={{ marginBottom: 5, fontSize: 14.5, lineHeight: 1.65, color: A.ink2, fontFamily: FONT }}
            dangerouslySetInnerHTML={{ __html: inlineFmt(line) }} />
        );
      })}
    </>
  );
}

// ── Text segment ──────────────────────────────────────────────────────────────
type TextBlock = { type: 'prose'; lines: string[] } | { type: 'table'; lines: string[] };

function splitTextBlocks(text: string): TextBlock[] {
  const lines = text.split('\n');
  const blocks: TextBlock[] = [];
  let current: TextBlock | null = null;
  for (const line of lines) {
    if (isTableLine(line)) {
      if (current?.type === 'table') { current.lines.push(line); }
      else { if (current) blocks.push(current); current = { type: 'table', lines: [line] }; }
    } else {
      if (current?.type === 'prose') { current.lines.push(line); }
      else { if (current) blocks.push(current); current = { type: 'prose', lines: [line] }; }
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function TextSegment({ content }: { content: string }) {
  return (
    <>
      {splitTextBlocks(content).map((b, i) =>
        b.type === 'table'
          ? <TableBlock key={i} lines={b.lines} />
          : <ProseLines key={i} lines={b.lines} />
      )}
    </>
  );
}

// ── Chart block ───────────────────────────────────────────────────────────────
function ChartBlock({ content }: { content: string }) {
  let d: ChartData;
  try { d = JSON.parse(content); }
  catch { return <pre style={{ fontSize: 12, opacity: 0.5 }}>{content}</pre>; }

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, background: A.hairSoft, padding: '14px 12px 8px', border: `1px solid ${A.hair}` }}>
      {d.title && (
        <div style={{ fontSize: 13, fontWeight: 600, color: A.ink, marginBottom: 10, fontFamily: FONT }}>
          {d.title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={210}>
        {d.type === 'line' ? (
          <LineChart data={d.data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={A.hair} strokeDasharray="4 4" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: A.mute, fontFamily: FONT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: A.mute, fontFamily: FONT }} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${A.hair}`, borderRadius: 8, fontSize: 12, fontFamily: FONT }} />
            <Line type="monotone" dataKey="value" stroke={A.brand} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: A.brand }} />
          </LineChart>
        ) : (
          <BarChart data={d.data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={A.hair} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: A.mute, fontFamily: FONT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: A.mute, fontFamily: FONT }} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${A.hair}`, borderRadius: 8, fontSize: 12, fontFamily: FONT }} />
            <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={52}>
              {d.data.map((entry, i) => (
                <Cell key={i} fill={entry.fill ?? A.brand} fillOpacity={0.88} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ── Map block ─────────────────────────────────────────────────────────────────
function MapBlock({ content }: { content: string }) {
  let d: MapData;
  try { d = JSON.parse(content); }
  catch { return null; }

  if (!MAPS_KEY) return (
    <div style={{ padding: 14, background: A.hairSoft, borderRadius: 12, fontSize: 13, color: A.mute, marginBottom: 16, border: `1px solid ${A.hair}` }}>
      Map unavailable — no API key configured.
    </div>
  );

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 280, border: `1px solid ${A.hair}` }}>
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          defaultCenter={d.center}
          defaultZoom={d.zoom ?? 14}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="cooperative"
          disableDefaultUI
        >
          {d.markers?.map((m, i) => (
            <Marker
              key={i}
              position={{ lat: m.lat, lng: m.lng }}
              label={m.label ?? String.fromCharCode(65 + i)}
              title={[m.title, m.price].filter(Boolean).join(' — ')}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function RichMarkdown({ text }: { text: string }) {
  const segments = parseSegments(text);
  return (
    <div>
      {segments.map((seg, i) => {
        if (seg.type === 'chart') return <ChartBlock key={i} content={seg.content} />;
        if (seg.type === 'map')   return <MapBlock   key={i} content={seg.content} />;
        return <TextSegment key={i} content={seg.content} />;
      })}
    </div>
  );
}
