'use client';

import { Area } from '@/lib/types';

interface SidebarProps {
  areas: Area[];
  activeAreaId: string | null;
  onSelectArea: (id: string) => void;
  onNewArea: () => void;
}

export default function Sidebar({
  areas,
  activeAreaId,
  onSelectArea,
  onNewArea,
}: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 bg-[#F7F5F1] border-r border-[#E8E4DC] flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#D4622A] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"
                fill="white"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <span className="text-[15px] font-semibold text-[#1A1A1A] tracking-tight">
              RentAI
            </span>
            <span className="block text-[10px] text-[#9B8F84] leading-none mt-0.5">
              by AppraiseRent
            </span>
          </div>
        </div>
      </div>

      {/* New search button */}
      <div className="px-3 py-3">
        <button
          onClick={onNewArea}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#1A1A1A] hover:bg-[#EDE9E3] transition-colors font-medium"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-[#9B8F84]"
          >
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Area Search
        </button>
      </div>

      {/* Area list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {areas.length > 0 && (
          <>
            <p className="px-2 pt-2 pb-1.5 text-[10px] font-semibold text-[#9B8F84] uppercase tracking-widest">
              Saved Areas
            </p>
            <div className="space-y-0.5">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => onSelectArea(area.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                    activeAreaId === area.id
                      ? 'bg-[#EDE9E3] text-[#1A1A1A]'
                      : 'text-[#4A4A4A] hover:bg-[#EDE9E3] hover:text-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                      className="mt-0.5 flex-shrink-0 text-[#9B8F84]"
                    >
                      <circle
                        cx="6.5"
                        cy="5.5"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M6.5 1C4.015 1 2 3.015 2 5.5c0 3.5 4.5 6.5 4.5 6.5s4.5-3 4.5-6.5C11 3.015 8.985 1 6.5 1z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-tight truncate">
                        {area.name}
                      </p>
                      <p className="text-[11px] text-[#9B8F84] truncate mt-0.5">
                        {area.city}, {area.state}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Freemium footer */}
      <div className="px-3 py-3 border-t border-[#E8E4DC]">
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-3">
          <p className="text-[12px] font-semibold text-[#1A1A1A]">
            Free plan · 5 searches
          </p>
          <p className="text-[11px] text-[#9B8F84] mt-0.5 mb-2">
            Upgrade for unlimited deep-dives
          </p>
          <button className="w-full bg-[#D4622A] text-white text-[12px] font-semibold py-1.5 rounded-lg hover:bg-[#C0561F] transition-colors">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </aside>
  );
}
