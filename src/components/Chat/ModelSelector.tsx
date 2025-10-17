import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Sparkles, Zap, ChevronDown, Check, Map, X } from "lucide-react";

type ModelVer = "2.0";
type Verbosity = "low" | "medium"; // low=Default, medium=Extra Long

interface Props {
  modelVersion: ModelVer;
  setModelVersion: (v: ModelVer) => void;
  deepThinkMap: Record<ModelVer, Verbosity>;
  setDeepThinkMap: (m: Record<ModelVer, Verbosity>) => void;
  isAdmin?: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  open?: boolean;
  onClose?: () => void;
  anchorEl?: HTMLElement | null;
}

interface MobileProps {
  isMobile: boolean;
}

const MODELS = [
  { id: "2.0", name: "Uhuru 2.0", tagline: "Advanced Reasoning", icon: <Brain className="w-4 h-4" />, accent: "indigo" },
] as const;

const accents = {
  indigo: { ring: "ring-indigo-200", dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-700" },
  violet: { ring: "ring-violet-200", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700" },
  teal: { ring: "ring-orange-200", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700" },
};

// Get verbosity labels based on model version
const getVerbosityLabels = (modelVersion: ModelVer) => {
  return {
    low: "Default",
    medium: "Extra Long"
  };
};

// Get mode label based on model version
const getModeLabel = (modelVersion: ModelVer) => {
  return "Response Length";
};

type Side = "left" | "right" | "top" | "bottom";

export default function ModelSelector({ 
  modelVersion, 
  setModelVersion, 
  deepThinkMap, 
  setDeepThinkMap, 
  isAdmin = false, 
  disabled = false, 
  collapsed = false,
  open = false,
  onClose,
  anchorEl
}: Props) {
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
    side: "left",
    arrowTop: 0,
    arrowLeft: 0,
    isMobile: false,
  });

  const popRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedObj = useMemo(
    () => MODELS.find((m) => m.id === modelVersion) ?? MODELS[0], // Default to 2.0
    [modelVersion]
  );

  const currentVerbosity = deepThinkMap[modelVersion] ?? "low";
  const verbosityLabels = getVerbosityLabels(modelVersion);
  const modeLabel = getModeLabel(modelVersion);

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
    const btn = anchorEl;
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

    const btnRect = btn.getBoundingClientRect();

    let top: number;
    let left: number;
    let side: Side;
    let arrowTop: number | undefined;
    let arrowLeft: number;

    // Check if there's enough space above the button
    const spaceAbove = btnRect.top;
    const spaceBelow = vh - btnRect.bottom;
    const preferAbove = spaceAbove >= bubbleH + GAP || spaceAbove > spaceBelow;

    if (preferAbove) {
      // Position above the button
      top = btnRect.top - bubbleH - GAP;
      side = "bottom"; // Arrow points down to button
      arrowTop = bubbleH - 2; // Arrow at bottom of selector
    } else {
      // Position below the button
      top = btnRect.bottom + GAP;
      side = "top"; // Arrow points up to button
      arrowTop = -5; // Arrow at top of selector
    }

    // Align horizontally - try to center on button first, then adjust for viewport
    const btnCenter = btnRect.left + btnRect.width / 2;
    left = btnCenter - bubbleW / 2;

    // Ensure it stays within viewport bounds
    if (left < GAP) {
      left = GAP;
    } else if (left + bubbleW > vw - GAP) {
      left = vw - bubbleW - GAP;
    }

    // Clamp top position to viewport
    top = Math.max(GAP, Math.min(top, vh - bubbleH - GAP));

    // Calculate arrow position to point at button center
    arrowLeft = btnCenter - left - 5; // 5 = half of arrow width (10px)

    // Clamp arrow position to stay within selector bounds (with margins)
    arrowLeft = Math.max(16, Math.min(arrowLeft, bubbleW - 16));

    setCoords({
      top,
      left,
      side,
      arrowTop,
      arrowLeft,
      isMobile: false
    });
  };

  // Focus trap implementation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = popRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftTab) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };
  // Close on outside click / ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (popRef.current?.contains(target) || anchorEl?.contains(target)) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, anchorEl, onClose]);

  // Auto-focus first element when opened
  useEffect(() => {
    if (open && popRef.current) {
      const firstFocusable = popRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [open]);
  // Reposition on open/resize/scroll
  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    const ro = new ResizeObserver(recompute);
    if (anchorEl) ro.observe(anchorEl);
    const onScroll = () => recompute();
    const onResize = () => recompute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, anchorEl, recompute]);

  const handleModelChange = (newModelVersion: ModelVer) => {
    // Set default verbosity based on model version
    const nextMap = { ...deepThinkMap };
    if (!nextMap[newModelVersion]) {
      // Uhuru 2.0 defaults to "low"
      nextMap[newModelVersion] = "low";
    }

    setModelVersion(newModelVersion);
    setDeepThinkMap(nextMap);
    // Don't close automatically - let user choose response style first

    // Persist to localStorage
    try {
      localStorage.setItem("uhuru-deepthink-map", JSON.stringify(nextMap));
      localStorage.setItem("uhuru-last-model", newModelVersion);
    } catch {}
  };

  const handleVerbosityChange = (newVerbosity: Verbosity) => {
    const nextMap = { ...deepThinkMap, [modelVersion]: newVerbosity };
    setDeepThinkMap(nextMap);
    
    // Persist to localStorage
    try { 
      localStorage.setItem("uhuru-deepthink-map", JSON.stringify(nextMap)); 
    } catch {}
    
    // Close the selector after response style is chosen
    onClose?.();
  };

  const accent = accents[selectedObj.accent as keyof typeof accents];

  // Generate tooltip text
  const tooltipText = `${selectedObj.name} · ${verbosityLabels[currentVerbosity]}`;

  return (
    <>
      {/* Tooltip */}
      {showTooltip && !open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed z-[900] pointer-events-none"
          style={{
            top: anchorEl ? anchorEl.getBoundingClientRect().bottom + 8 : 0,
            left: anchorEl ? anchorEl.getBoundingClientRect().left : 0,
          }}
        >
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg">
            {tooltipText}
          </div>
        </motion.div>
      )}

      {/* Floating panel via portal */}
      {typeof document !== "undefined" && open && anchorEl &&
        createPortal(
          <motion.div
            ref={popRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select model and verbosity"
            onKeyDown={handleKeyDown}
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
                height: 'min(60vh, 350px)',
                width: '100%',
              } : {
                top: coords.top,
                left: coords.left,
                width: 'min(280px, 28vw)',
                height: 'clamp(200px,62vh,300px)',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
              }),
            }}
          >
            <div className="relative">
              {/* Main panel */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-[13px] font-semibold text-gray-900">Model</div>
                </div>

                <div className="max-h-[320px] overflow-auto py-1">
                  <div role="radiogroup" className="space-y-0.5 px-2">
                    {MODELS.map((model) => {
                      const active = model.id === modelVersion;
                      const modelAccent = accents[model.accent as keyof typeof accents];
                      return (
                        <button
                          ref={model.id === MODELS[0].id ? firstFocusableRef : undefined}
                          key={model.id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleModelChange(model.id as ModelVer)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition flex items-center gap-2.5 ${
                            active ? "bg-gray-50 ring-1 ring-orange/20" : ""
                          }`}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${modelAccent.ring} ring-2 flex-shrink-0`}>
                            <span className={`h-2 w-2 rounded-full ${modelAccent.dot}`} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-medium text-gray-900 truncate">{model.name}</span>
                              {active && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate">{model.tagline}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {modelVersion === "2.0" && (
                  <div className="px-3 py-2 border-t border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                      {modeLabel}
                    </div>
                    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
                      {["low", "medium"].map((v) => {
                        const active = v === currentVerbosity;
                        return (
                          <button
                            ref={v === "medium" ? lastFocusableRef : undefined}
                            key={v}
                            role="radio"
                            aria-checked={active}
                            onClick={() => handleVerbosityChange(v as Verbosity)}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              active
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            {verbosityLabels[v as Verbosity]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow pointing to trigger */}
              {!coords.isMobile && (
                <span
                  className="absolute block w-2.5 h-2.5 bg-white rotate-45 shadow-sm"
                  style={{
                    top: coords.side === 'bottom' ? coords.arrowTop : (coords.side === 'top' ? coords.arrowTop : undefined),
                    left: coords.arrowLeft,
                    borderRight: coords.side === 'bottom' ? '1px solid rgb(229, 231, 235)' : 'none',
                    borderBottom: coords.side === 'bottom' ? '1px solid rgb(229, 231, 235)' : 'none',
                    borderTop: coords.side === 'top' ? '1px solid rgb(229, 231, 235)' : 'none',
                    borderLeft: coords.side === 'top' ? '1px solid rgb(229, 231, 235)' : 'none'
                  }}
                />
              )}
            </div>
          </motion.div>,
          document.body
        )}
    </>
  );
}