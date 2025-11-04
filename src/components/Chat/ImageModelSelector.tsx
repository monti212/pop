import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Image, Check } from "lucide-react";

type ImageModel = "craft-1" | "craft-2";

interface Props {
  selectedModel: ImageModel;
  onModelChange: (model: ImageModel) => void;
  open?: boolean;
  onClose?: () => void;
  anchorEl?: HTMLElement | null;
}

const IMAGE_MODELS = [
  {
    id: "craft-1",
    name: "Craft-1",
    tagline: "Fast Generation",
    icon: <Image className="w-4 h-4" />,
    accent: "yellow",
    backendId: "uhuru-craft-1"
  },
  {
    id: "craft-2",
    name: "Craft-2",
    tagline: "Advanced Quality",
    icon: <Sparkles className="w-4 h-4" />,
    accent: "blue",
    backendId: "uhuru-craft-2"
  },
] as const;

const accents = {
  yellow: { ring: "ring-[#f5b233]/30", dot: "bg-[#f5b233]", pill: "bg-[#FEF7E8] text-[#0170b9]" },
  blue: { ring: "ring-[#0170b9]/30", dot: "bg-[#0170b9]", pill: "bg-blue-50 text-blue-700" },
};

type Side = "left" | "right" | "top" | "bottom";

export default function ImageModelSelector({
  selectedModel,
  onModelChange,
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

  const selectedObj = useMemo(
    () => IMAGE_MODELS.find((m) => m.id === selectedModel) ?? IMAGE_MODELS[0],
    [selectedModel]
  );

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Compute and store floating position
  const recompute = useMemo(() => {
    let rafId: number | null = null;

    return () => {
      if (rafId) return;
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

    const popRect = pop.getBoundingClientRect();
    const bubbleW = Math.min(280, Math.max(220, vw * 0.28));
    const bubbleH = popRect.height || 200;

    const btnRect = btn.getBoundingClientRect();

    let top: number;
    let left: number;
    let side: Side;
    let arrowTop: number | undefined;
    let arrowLeft: number;

    const spaceAbove = btnRect.top;
    const spaceBelow = vh - btnRect.bottom;
    const preferAbove = spaceAbove >= bubbleH + GAP || spaceAbove > spaceBelow;

    if (preferAbove) {
      top = btnRect.top - bubbleH - GAP;
      side = "bottom";
      arrowTop = bubbleH - 2;
    } else {
      top = btnRect.bottom + GAP;
      side = "top";
      arrowTop = -5;
    }

    const btnCenter = btnRect.left + btnRect.width / 2;
    left = btnCenter - bubbleW / 2;

    if (left < GAP) {
      left = GAP;
    } else if (left + bubbleW > vw - GAP) {
      left = vw - bubbleW - GAP;
    }

    top = Math.max(GAP, Math.min(top, vh - bubbleH - GAP));

    arrowLeft = btnCenter - left - 5;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

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

  useEffect(() => {
    if (open && popRef.current) {
      const firstFocusable = popRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [open]);

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

  const handleModelSelect = (model: ImageModel) => {
    onModelChange(model);

    try {
      localStorage.setItem("uhuru-image-model", model);
    } catch {}

    onClose?.();
  };

  const accent = accents[selectedObj.accent as keyof typeof accents];

  return (
    <>
      {typeof document !== "undefined" && open && anchorEl &&
        createPortal(
          <motion.div
            ref={popRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select image model"
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
                height: 'min(40vh, 250px)',
                width: '100%',
              } : {
                top: coords.top,
                left: coords.left,
                width: 'min(280px, 28vw)',
                height: 'auto',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
              }),
            }}
          >
            <div className="relative">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-[13px] font-semibold text-gray-900">Image Model</div>
                </div>

                <div className="py-1">
                  <div role="radiogroup" className="space-y-0.5 px-2">
                    {IMAGE_MODELS.map((model) => {
                      const active = model.id === selectedModel;
                      const modelAccent = accents[model.accent as keyof typeof accents];
                      return (
                        <button
                          key={model.id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleModelSelect(model.id as ImageModel)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition flex items-center gap-2.5 ${
                            active ? "bg-gray-50 ring-1 ring-[#f5b233]/20" : ""
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
              </div>

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

export { IMAGE_MODELS };
export type { ImageModel };
