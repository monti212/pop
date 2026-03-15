import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Map, Check, Search, X } from 'lucide-react';
import { REGIONS, getGroupedRegions } from '../utils/constants';

interface RegionSelectorProps {
  selectedRegion: string;
  onChange: (region: string) => void;
  darkMode?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
  open?: boolean;
  onClose?: () => void;
  anchorEl?: HTMLElement | null;
}

type Side = 'left' | 'right' | 'top' | 'bottom';

const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedRegion,
  onChange,
  darkMode: _darkMode = false,
  collapsed = false,
  disabled = false,
  open = false,
  onClose,
  anchorEl
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = anchorEl ? open : internalOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    side: Side;
    arrowTop?: number;
    arrowLeft?: number;
    isMobile?: boolean;
  }>({
    top: 0,
    left: 0,
    side: 'top',
    arrowTop: 0,
    arrowLeft: 0,
    isMobile: false,
  });

  const internalBtnRef = useRef<HTMLButtonElement>(null);
  const btn = anchorEl || internalBtnRef.current;
  const popRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const groupedRegions = useMemo(() => getGroupedRegions(), []);
  
  const selectedRegionObject = useMemo(
    () => REGIONS.find(region => region.code === selectedRegion) || REGIONS[0],
    [selectedRegion]
  );

   // Filter regions based on search query
   const filteredGroupedRegions = useMemo(() => {
     if (!searchQuery.trim()) return groupedRegions;
     
     const query = searchQuery.toLowerCase().trim();
     const filtered: { [key: string]: typeof REGIONS } = {};
     
     Object.entries(groupedRegions).forEach(([groupName, regions]) => {
       const matchingRegions = regions.filter(region =>
         region.name.toLowerCase().includes(query) ||
         region.code.toLowerCase().includes(query) ||
         (region.group && region.group.toLowerCase().includes(query))
       );
       
       if (matchingRegions.length > 0) {
         filtered[groupName] = matchingRegions;
       }
     });
     
     return filtered;
   }, [groupedRegions, searchQuery]);
  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Compute and store floating position
  const recompute = useMemo(() => {
    let rafId: number | null = null;

    return () => {
      if (rafId) return; // throttle
      rafId = requestAnimationFrame(() => {
        rafId = null;
        performRecompute();
      });
    };
  }, []);

  const performRecompute = () => {
    const pop = popRef.current;
    if (!btn || !pop) return;

    // Mobile = bottom sheet
    if (isMobile) {
      setCoords({
        top: 0,
        left: 0,
        side: "bottom",
        isMobile: true,
      });
      return;
    }

    const GAP = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Measure current panel size (fallbacks for first paint)
    const popRect = pop.getBoundingClientRect();
    const bubbleW = Math.min(280, Math.max(220, vw * 0.28));
    const bubbleH = popRect.height || 260;

    const b = btn.getBoundingClientRect();

    // Always place ABOVE the button (just above ChatInput)
    const side: Side = "top";

    let top = b.top - bubbleH - GAP - 38; // Move up by 38px (approximately 1cm)
    let left = b.right - bubbleW; // right-align to trigger
    left = Math.max(GAP, Math.min(left, vw - bubbleW - GAP));

    // Clamp to viewport just in case
    top = Math.max(GAP, Math.min(top, vh - bubbleH - GAP));

    // Arrow: sit near bottom-right when above
    const arrowTop = bubbleH - 6;
    const arrowLeft = bubbleW - 16;

    setCoords({
      top,
      left,
      side,
      arrowTop,
      arrowLeft,
      isMobile: false
    });
  };

  // Close on outside click / ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isOpen) return;
      const target = e.target as Node;
      if (popRef.current?.contains(target) || btn?.contains(target)) return;
      if (anchorEl && onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (anchorEl && onClose) {
          onClose();
        } else {
          setInternalOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [isOpen, anchorEl, onClose, btn]);

  // Reposition on open/resize/scroll
  useLayoutEffect(() => {
    if (!isOpen) return;
    recompute();
    const ro = new ResizeObserver(recompute);
    if (btn) ro.observe(btn);
    if (popRef.current) ro.observe(popRef.current); // Watch panel size changes
    const onScroll = () => recompute();
    const onResize = () => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, btn]);

  // Recompute position when search query changes (affects panel height)
  useLayoutEffect(() => {
    if (isOpen) {
      recompute();
    }
  }, [searchQuery, isOpen, recompute]);

  const handleSelect = (regionCode: string) => {
    onChange(regionCode);
    if (anchorEl && onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
    requestAnimationFrame(() => btn?.focus());
  };

  return (
    <>
      {/* Trigger button - Only render if no anchorEl provided */}
      {!anchorEl && (
        <button
          ref={internalBtnRef}
          disabled={disabled}
          onClick={() => setInternalOpen((o) => !o)}
          className={`group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm hover:shadow transition ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${selectedRegion !== 'global' ? 'ring-2 ring-teal/20' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
        <span className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium bg-teal/10 text-teal">
          {collapsed ? (
            <span className="text-sm">{selectedRegionObject.flag}</span>
          ) : (
            <>
              <Map className="w-4 h-4" />
              <span className="text-lg">{selectedRegionObject.flag}</span>
              {selectedRegionObject.name}
            </>
          )}
        </span>
        {!collapsed && <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition" />}
        </button>
      )}

      {/* Floating bubble via portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={popRef}
                role="dialog"
                aria-modal="true"
                aria-label="Select region"
                initial={{ opacity: 0, scale: 0.98, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="fixed z-[1100] pointer-events-auto"
                style={{
                  ...(coords.isMobile ? {
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 'min(60vh, 280px)',
                    width: '100%',
                  } : {
                    top: coords.top,
                    left: coords.left,
                    width: 'min(280px, 28vw)',
                    height: 'clamp(180px,50vh,240px)',
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: 'calc(100vh - 24px)',
                  }),
                }}
              >
                <div className="relative">
                  {/* Main panel */}
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="text-[13px] font-semibold text-gray-900">Region</div>
                    </div>

                     {/* Search Input */}
                     <div className="px-3 py-2 border-b border-gray-100">
                       <div className="relative">
                         <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                         <input
                           ref={searchInputRef}
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Search regions..."
                           className="w-full pl-8 pr-7 py-1.5 text-[11px] border border-gray-200 rounded-md focus:ring-2 focus:ring-teal focus:border-teal bg-white text-gray-900 placeholder-gray-500"
                         />
                         {searchQuery && (
                           <button
                             onClick={() => setSearchQuery('')}
                             className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         )}
                       </div>
                       {searchQuery && (
                         <div className="text-[10px] text-gray-500 mt-1">
                           {Object.values(filteredGroupedRegions).flat().length} result{Object.values(filteredGroupedRegions).flat().length !== 1 ? 's' : ''}
                         </div>
                       )}
                     </div>
                    <div className="max-h-[180px] overflow-auto py-1">
                       {searchQuery && Object.keys(filteredGroupedRegions).length === 0 ? (
                         <div className="px-3 py-6 text-center">
                           <div className="text-gray-400 mb-1">
                             <Search className="w-6 h-6 mx-auto" />
                           </div>
                           <div className="text-[11px] text-gray-600">No regions found</div>
                           <div className="text-[10px] text-gray-500 mt-0.5">Try a different search</div>
                         </div>
                       ) : (
                         <div role="radiogroup" className="space-y-0.5 px-2">
                         {Object.entries(filteredGroupedRegions).map(([groupName, regions]) => (
                        <div key={groupName}>
                          {groupName !== 'General' && (
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/80 uppercase tracking-wide">
                              {groupName}
                            </div>
                          )}
                          {regions.map((region) => {
                            const active = region.code === selectedRegion;
                            return (
                              <button
                                key={region.code}
                                role="radio"
                                aria-checked={active}
                                onClick={() => handleSelect(region.code)}
                                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition flex items-center gap-2.5 ${
                                  active ? 'bg-gray-50 ring-1 ring-teal/20' : ''
                                }`}
                              >
                                <span className="text-base flex-shrink-0">{region.flag}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[13px] font-medium text-gray-900 truncate">
                                      {region.name}
                                    </span>
                                    {active && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                  {region.group && (
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {region.group}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                         ))}
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Arrow pointing to trigger */}
                  {!coords.isMobile && (
                    <span
                      className="absolute block w-2.5 h-2.5 bg-white border border-gray-200 rotate-45 shadow-sm"
                      style={{
                        top: coords.side === 'bottom' ? coords.arrowTop : undefined,
                        bottom: coords.side === 'top' ? -5 : undefined,
                        left: coords.arrowLeft
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default RegionSelector;