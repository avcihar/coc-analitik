"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  PenTool,
  Download,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Info,
  Copy,
  Check,
  Move,
  Crosshair,
  RotateCcw,
  Image as ImageIcon,
  ChevronDown,
  Plus,
  Minus,
  ListOrdered,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  MIN_BITMAP_SCALE,
  MAX_BITMAP_SCALE,
  SCALE_STEP,
  computeWallArt,
  exportPlanPng,
  resolveChar,
} from "@/lib/wallArtEngine";
import { getAllBitmapFonts, getBitmapFont, BitmapFont } from "@/lib/bitmapFonts";
import {
  GameButton,
  GameTabBar,
  GameTab,
} from "@/components/game";
import {
  ASSETS_CONFIG,
  getSceneryConfig,
  getSceneryDisplayName,
  SceneryAssetConfig,
  mapGridToScenery,
  mapSceneryToGrid,
} from "@/lib/assetsConfig";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Renders a crisp miniature bitmap canvas preview of the text for font cards.
 * - Dynamic height to match glyph height + padding (NEVER vertically cropped).
 * - Only renders the first line of multi-line text.
 * - Sharp pixelated rendering with devicePixelRatio.
 * - Largest integer scale that fits height & width, with smooth right fade if overflowing width.
 */
function BitmapFontPreview({
  font,
  text,
  convertTurkish = true,
  className,
}: {
  font: BitmapFont;
  text: string;
  convertTurkish?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use only the first line of text
    const sample = (text.split("\n")[0] || "").trim() || "COC";

    // Layout characters in a single line for card preview
    const glyphsToDraw: { glyph: number[][]; width: number }[] = [];
    for (const ch of sample) {
      const res = resolveChar(ch, font, convertTurkish);
      if (res.glyph && res.glyph.length > 0) {
        glyphsToDraw.push({ glyph: res.glyph, width: res.width });
      } else if (res.isSpace) {
        glyphsToDraw.push({ glyph: [], width: Math.max(2, Math.round(font.height * 0.25)) });
      }
    }

    if (glyphsToDraw.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const totalW = glyphsToDraw.reduce(
      (acc, g, idx) => acc + g.width + (idx > 0 ? 1 : 0),
      0
    );

    // Available width from container
    const contW = Math.max(80, container.clientWidth || 160);

    // Scale calculation: Largest integer scale that comfortably fits height and width
    let s = Math.max(1, Math.floor(34 / font.height));
    while (s > 1 && totalW * s > contW - 16) {
      s--;
    }

    // Exact height determined by font.height and scale, guaranteeing ZERO vertical clipping
    const displayH = font.height * s + 8;
    const displayW = contW;

    // DPR setup
    const dpr = typeof window !== "undefined" ? Math.min(3, window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Dark well background matching Meta's slot well
    ctx.fillStyle = "#1E110A";
    ctx.fillRect(0, 0, displayW, displayH);

    const scaledW = totalW * s;
    const startX = scaledW <= displayW - 16 ? Math.floor((displayW - scaledW) / 2) : 6;
    const startY = 4; // exact 4px top padding

    ctx.fillStyle = "#FFEB75"; // Gold font color
    let curX = startX;

    for (let i = 0; i < glyphsToDraw.length; i++) {
      if (i > 0) curX += 1 * s;
      const item = glyphsToDraw[i];

      if (item.glyph && item.glyph.length > 0) {
        for (let r = 0; r < item.glyph.length; r++) {
          for (let c = 0; c < item.glyph[r].length; c++) {
            if (item.glyph[r][c] === 1) {
              ctx.fillRect(curX + c * s, startY + r * s, s, s);
            }
          }
        }
      }
      curX += item.width * s;
    }

    // Right fade if text overflows width
    if (scaledW > displayW - 16) {
      const fadeW = 28;
      const fadeGrad = ctx.createLinearGradient(displayW - fadeW, 0, displayW, 0);
      fadeGrad.addColorStop(0, "rgba(30, 17, 10, 0)");
      fadeGrad.addColorStop(1, "rgba(30, 17, 10, 1)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(displayW - fadeW, 0, fadeW, displayH);
    }
  }, [font, text, convertTurkish]);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        style={{ imageRendering: "pixelated" }}
        className="rounded border border-[#3A2317]"
      />
    </div>
  );
}

function useHoldAction(action: () => void, disabled?: boolean, initialDelay = 300, repeatInterval = 75) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (e.button !== 0 && e.pointerType === "mouse")) return;
      actionRef.current();
      stop();
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          actionRef.current();
        }, repeatInterval);
      }, initialDelay);
    },
    [disabled, initialDelay, repeatInterval, stop]
  );

  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}

export default function WallArtView() {
  const { locale, isTr, t, fmtNum, fmtTemplate } = useLanguage();
  const allFonts = useMemo(() => getAllBitmapFonts(), []);

  // Controls State
  const [text, setText] = useState<string>("COC");
  const [selectedFontId, setSelectedFontId] = useState<string>(
    allFonts[0]?.id || "cross_stitch"
  );
  const [scale, setScale] = useState<number>(1);
  const [letterSpacing, setLetterSpacing] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(-45); // Default -45° (in-game horizontal on screen)
  const [maxWalls, setMaxWalls] = useState<number>(DEFAULT_MAX_WALLS);
  const [wallInputText, setWallInputText] = useState<string>(String(DEFAULT_MAX_WALLS));
  const [convertTurkish, setConvertTurkish] = useState<boolean>(true);
  const [preserveThinLines, setPreserveThinLines] = useState<boolean>(false);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);
  const [show2dSceneryBg, setShow2dSceneryBg] = useState<boolean>(false);
  const [fontPickerOpen, setFontPickerOpen] = useState<boolean>(false);
  const [isSceneryOpen, setIsSceneryOpen] = useState<boolean>(false);
  const [isOtherSettingsOpen, setIsOtherSettingsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Viewport Zoom & Pan Engine State
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [cursorMode, setCursorMode] = useState<"grab" | "move">("grab");
  const [isExportingViewport, setIsExportingViewport] = useState<boolean>(false);

  const dragInfoRef = useRef<{
    type: "text" | "pan";
    startX: number;
    startY: number;
    initOffsetX: number;
    initOffsetY: number;
    initPanX: number;
    initPanY: number;
    startGridCol: number;
    startGridRow: number;
  } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Scenery Selector State
  const availableSceneries = useMemo(() => {
    return ASSETS_CONFIG.sceneries.filter((s) => s.verified !== false);
  }, []);

  const [selectedSceneryId, setSelectedSceneryId] = useState<string>("winter");
  const [sceneryLoading, setSceneryLoading] = useState<boolean>(false);
  const [sceneryImg, setSceneryImg] = useState<HTMLImageElement | null>(null);
  const [wallImg, setWallImg] = useState<HTMLImageElement | null>(null);

  // Restore selected scenery from localStorage or URL query on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryScenery = urlParams.get("scenery");
      if (queryScenery && availableSceneries.some((s) => s.id === queryScenery)) {
        setSelectedSceneryId(queryScenery);
      }
      if (urlParams.get("open") === "all") {
        setFontPickerOpen(true);
        setIsSceneryOpen(true);
        setIsOtherSettingsOpen(true);
      }
      const saved = localStorage.getItem("wallart.scenery");
      if (saved && availableSceneries.some((s) => s.id === saved)) {
        setSelectedSceneryId(saved);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, [availableSceneries]);

  // Debounce wall input text to maxWalls (1 - 2000, default 325)
  useEffect(() => {
    const handler = setTimeout(() => {
      const val = parseInt(wallInputText, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(1, Math.min(2000, val));
        setMaxWalls(clamped);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [wallInputText]);

  const handleSelectScenery = useCallback((id: string) => {
    if (!availableSceneries.some((s) => s.id === id)) return;
    setSelectedSceneryId(id);
    try {
      localStorage.setItem("wallart.scenery", id);
    } catch {
      // LocalStorage access fallback
    }
  }, [availableSceneries]);

  const currentScenery: SceneryAssetConfig = useMemo(() => {
    return getSceneryConfig(selectedSceneryId);
  }, [selectedSceneryId]);

  const localizedSceneryName = useMemo(() => {
    return getSceneryDisplayName(currentScenery.id, currentScenery.name, locale);
  }, [currentScenery, locale]);

  // Load real scenery background dynamically when selected scenery changes
  useEffect(() => {
    setSceneryLoading(true);
    const s = new Image();
    s.src = currentScenery.src;
    s.onload = () => {
      setSceneryImg(s);
      setSceneryLoading(false);
    };
    s.onerror = () => {
      setSceneryLoading(false);
    };
  }, [currentScenery.src]);

  // Preload wall texture once
  useEffect(() => {
    const w = new Image();
    w.src = ASSETS_CONFIG.wall.src;
    w.onload = () => setWallImg(w);
  }, []);

  // Interaction State
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Canvas Refs
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);

  // Selected Font Object
  const currentFont = useMemo(() => {
    return getBitmapFont(selectedFontId) || allFonts[0];
  }, [selectedFontId, allFonts]);

  // Compute Wall Art Result
  const result = useMemo(() => {
    if (!currentFont) {
      return {
        grid: Array.from({ length: COC_GRID_SIZE }, () => new Array(COC_GRID_SIZE).fill(0)),
        wallCount: 0,
        maxWalls,
        isOverBudget: false,
        maxFittingChars: 0,
        effectiveScale: 1,
        originalScale: scale,
        wasScaledDown: false,
        lineCount: 0,
        linesInfo: t.wall.noFontTitle,
        warnings: [t.wall.noFontDesc],
        convertedChars: [],
        missingChars: [],
        buildGuide: [],
        minRow: 0,
        maxRow: 0,
        minCol: 0,
        maxCol: 0,
        capHeight: 0,
        isCleanScale: true,
        isReadabilityLow: false,
        preserveThinLines,
        spanReq: 0,
        fitsInGrid: true,
        isLattice45: false,
        isHorizontalOnScreen: false,
        thickenedChars: [],
        autoFit,
        offsetX,
        offsetY,
      };
    }

    return computeWallArt(
      text,
      currentFont,
      scale,
      rotation,
      maxWalls,
      letterSpacing,
      convertTurkish,
      autoFit,
      preserveThinLines,
      offsetX,
      offsetY
    );
  }, [text, currentFont, scale, rotation, maxWalls, letterSpacing, convertTurkish, autoFit, preserveThinLines, offsetX, offsetY, t.wall.noFontTitle, t.wall.noFontDesc]);

  // ── Render 2D Grid Canvas ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 528; // 12px per cell for 44 cells
    canvas.width = size;
    canvas.height = size;
    const cellSize = size / COC_GRID_SIZE;

    // Background (Warm Clash dark wood / espresso)
    if (show2dSceneryBg && sceneryImg && sceneryImg.complete) {
      ctx.drawImage(sceneryImg, 0, 0, size, size);
      ctx.fillStyle = "rgba(26, 18, 12, 0.78)";
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.fillStyle = "#1A120C";
      ctx.fillRect(0, 0, size, size);
    }

    // Draw Floor Grid
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const isWall = result.grid[r][c] === 1;

        if (isWall) {
          // Wall Cell
          ctx.fillStyle = "#F59E0B"; // Amber 500
          ctx.fillRect(x, y, cellSize, cellSize);

          // Wall bevel
          ctx.strokeStyle = "#FDE68A"; // Amber 200
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        } else {
          // Warm hearth tile checkerboard
          ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(38, 26, 18, 0.94)" : "rgba(29, 20, 14, 0.94)";
          ctx.fillRect(x, y, cellSize, cellSize);

          ctx.strokeStyle = "rgba(255, 224, 178, 0.06)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Center Crosslines (between cell 22 and 23)
    const mid = 22 * cellSize;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(size, mid);
    ctx.stroke();

    ctx.setLineDash([]);
  }, [result, show2dSceneryBg, sceneryImg]);

  // ── Render 3D Isometric Canvas (Real Village Scenery + Wall 19 Textures) ─────
  useEffect(() => {
    if (viewMode !== "3d") return;
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use natural image dimensions for 1:1 pixel precision
    const width = currentScenery.naturalWidth;
    const height = currentScenery.naturalHeight;
    canvas.width = width;
    canvas.height = height;

    const buildArea = currentScenery.buildArea;

    // 1. Draw Real In-Game Village Scenery
    if (sceneryImg && sceneryImg.complete) {
      ctx.drawImage(sceneryImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1A120C";
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Debug Alignment Overlay (when toggled on)
    if (showDebugGrid) {
      // 44x44 grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      for (let c = 0; c <= COC_GRID_SIZE; c++) {
        const p0 = mapGridToScenery(c, 0, buildArea);
        const p1 = mapGridToScenery(c, COC_GRID_SIZE, buildArea);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      for (let r = 0; r <= COC_GRID_SIZE; r++) {
        const p0 = mapGridToScenery(0, r, buildArea);
        const p1 = mapGridToScenery(COC_GRID_SIZE, r, buildArea);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Red outer boundary frame
      ctx.strokeStyle = "#EF4444"; // Red 500
      ctx.lineWidth = 6;
      ctx.beginPath();
      const ptTop = mapGridToScenery(0, 0, buildArea);
      const ptRight = mapGridToScenery(COC_GRID_SIZE, 0, buildArea);
      const ptBottom = mapGridToScenery(COC_GRID_SIZE, COC_GRID_SIZE, buildArea);
      const ptLeft = mapGridToScenery(0, COC_GRID_SIZE, buildArea);
      ctx.moveTo(ptTop.x, ptTop.y);
      ctx.lineTo(ptRight.x, ptRight.y);
      ctx.lineTo(ptBottom.x, ptBottom.y);
      ctx.lineTo(ptLeft.x, ptLeft.y);
      ctx.closePath();
      ctx.stroke();

      // Highlight the 4 corner cells in amber: (0,0), (43,0), (43,43), (0,43)
      const drawCorner = (c: number, r: number, label: string) => {
        const p0 = mapGridToScenery(c, r, buildArea);
        const p1 = mapGridToScenery(c + 1, r, buildArea);
        const p2 = mapGridToScenery(c + 1, r + 1, buildArea);
        const p3 = mapGridToScenery(c, r + 1, buildArea);

        ctx.fillStyle = "rgba(245, 158, 11, 0.45)"; // amber fill
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 3;
        ctx.stroke();

        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, center.x, center.y);
      };

      drawCorner(0, 0, "(0,0)");
      drawCorner(43, 0, "(43,0)");
      drawCorner(43, 43, "(43,43)");
      drawCorner(0, 43, "(0,43)");
    }

    // 3. Draw Real Wall 19 Textures in Depth Order (row + col ascending)
    const filledCells: { r: number; c: number }[] = [];
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        if (result.grid[r][c] === 1) {
          filledCells.push({ r, c });
        }
      }
    }

    // Isometric painter's depth sorting (back to front)
    filledCells.sort((a, b) => a.r + a.c - (b.r + b.c) || a.r - b.r);

    // Compute cell width to scale wall sprite accurately
    const pL = mapGridToScenery(0, 1, buildArea);
    const pR = mapGridToScenery(1, 0, buildArea);
    const cellW = Math.hypot(pR.x - pL.x, pR.y - pL.y);

    if (wallImg && wallImg.complete) {
      const naturalW = wallImg.naturalWidth || ASSETS_CONFIG.wall.naturalWidth;
      const naturalH = wallImg.naturalHeight || ASSETS_CONFIG.wall.naturalHeight;
      const wallScale = (cellW * 1.02) / 54.0;
      const wallW = naturalW * wallScale;
      const wallH = naturalH * wallScale;

      const anchorX = wallW / 2.0;
      const anchorY = wallH * (60.0 / 73.0);

      for (const { r, c } of filledCells) {
        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.drawImage(
          wallImg,
          center.x - anchorX,
          center.y - anchorY,
          wallW,
          wallH
        );
      }
    } else {
      // Fallback cube renderer while image is loading
      for (const { r, c } of filledCells) {
        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(center.x - 12, center.y - 12, 24, 24);
      }
    }
  }, [viewMode, result, sceneryImg, wallImg, showDebugGrid, currentScenery]);

  // ── Viewport Geometry & Pan/Zoom Handlers ────────────────────────────────
  const clampPan = useCallback(
    (rawX: number, rawY: number, z: number, vw?: number, vh?: number) => {
      const width = vw ?? viewportSize.width;
      const height = vh ?? viewportSize.height;
      if (width <= 0 || height <= 0) return { panX: 0, panY: 0, scale: 1 };

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(width / natW, height / natH);
      const s = baseScale * z;
      const scaledW = natW * s;
      const scaledH = natH * s;

      const minX = width - scaledW;
      const minY = height - scaledH;
      const clampedX = Math.min(0, Math.max(minX, rawX));
      const clampedY = Math.min(0, Math.max(minY, rawY));

      return { panX: clampedX, panY: clampedY, scale: s };
    },
    [viewportSize, currentScenery]
  );

  const centerViewOnDiamond = useCallback(
    (z: number = 1.0, vw?: number, vh?: number) => {
      const width = vw ?? viewportSize.width;
      const height = vh ?? viewportSize.height;
      if (width <= 0 || height <= 0) return;

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(width / natW, height / natH);
      const s = baseScale * z;

      const b = currentScenery.buildArea;
      const centerX = (b.left.x + b.right.x) / 2;
      const centerY = (b.top.y + b.bottom.y) / 2;

      const targetX = width / 2 - centerX * s;
      const targetY = height / 2 - centerY * s;

      const { panX: cx, panY: cy } = clampPan(targetX, targetY, z, width, height);
      setZoom(z);
      setPanX(cx);
      setPanY(cy);
    },
    [viewportSize, currentScenery, clampPan]
  );

  // ResizeObserver for Viewport Container
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportSize({ width, height });
        }
      }
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // Prevent page scroll when mouse wheel scrolls over scene viewport
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const preventPageScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    vp.addEventListener("wheel", preventPageScroll, { passive: false });
    return () => vp.removeEventListener("wheel", preventPageScroll);
  }, []);

  // When scenery changes, smoothly center on village diamond
  useEffect(() => {
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      centerViewOnDiamond(1.0);
    }
  }, [selectedSceneryId, viewportSize.width, viewportSize.height, centerViewOnDiamond]);

  // 4 Corner Nudge Actions
  // NW: Col - 1 (offsetX - 1)
  const canNudgeNW = offsetX > -20 && (result.wallCount === 0 || result.minCol > 0);
  const nudgeNW = useCallback(() => {
    setOffsetX((prev) => Math.max(-20, prev - 1));
  }, []);
  const nwHold = useHoldAction(nudgeNW, !canNudgeNW);

  // SE: Col + 1 (offsetX + 1)
  const canNudgeSE = offsetX < 20 && (result.wallCount === 0 || result.maxCol < COC_GRID_SIZE - 1);
  const nudgeSE = useCallback(() => {
    setOffsetX((prev) => Math.min(20, prev + 1));
  }, []);
  const seHold = useHoldAction(nudgeSE, !canNudgeSE);

  // NE: Row - 1 (offsetY - 1)
  const canNudgeNE = offsetY > -20 && (result.wallCount === 0 || result.minRow > 0);
  const nudgeNE = useCallback(() => {
    setOffsetY((prev) => Math.max(-20, prev - 1));
  }, []);
  const neHold = useHoldAction(nudgeNE, !canNudgeNE);

  // SW: Row + 1 (offsetY + 1)
  const canNudgeSW = offsetY < 20 && (result.wallCount === 0 || result.maxRow < COC_GRID_SIZE - 1);
  const nudgeSW = useCallback(() => {
    setOffsetY((prev) => Math.min(20, prev + 1));
  }, []);
  const swHold = useHoldAction(nudgeSW, !canNudgeSW);

  // Rotation Actions
  const rotateCCW = useCallback(() => {
    setRotation((prev) => {
      let next = prev - 15;
      if (next < -180) next += 360;
      return next;
    });
  }, []);
  const ccwHold = useHoldAction(rotateCCW);

  const rotateCW = useCallback(() => {
    setRotation((prev) => {
      let next = prev + 15;
      if (next > 180) next -= 360;
      return next;
    });
  }, []);
  const cwHold = useHoldAction(rotateCW);

  const resetRotation = useCallback(() => {
    setRotation(-45);
  }, []);

  // Zoom by Wheel (Centered on cursor)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(4.0, Math.max(1.0, zoom * factor));
    if (Math.abs(newZoom - zoom) < 0.001) return;

    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    const ratio = newScale / oldScale;

    const rawX = cursorX - (cursorX - panX) * ratio;
    const rawY = cursorY - (cursorY - panY) * ratio;

    const { panX: cx, panY: cy } = clampPan(rawX, rawY, newZoom, rect.width, rect.height);
    setZoom(newZoom);
    setPanX(cx);
    setPanY(cy);
  };

  const handleZoomStep = (multiplier: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newZoom = Math.min(4.0, Math.max(1.0, zoom * multiplier));
    if (Math.abs(newZoom - zoom) < 0.001) return;

    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    const ratio = newScale / oldScale;

    const rawX = centerX - (centerX - panX) * ratio;
    const rawY = centerY - (centerY - panY) * ratio;

    const { panX: cx, panY: cy } = clampPan(rawX, rawY, newZoom, rect.width, rect.height);
    setZoom(newZoom);
    setPanX(cx);
    setPanY(cy);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const panStep = 35;
    if (e.key === "ArrowLeft") {
      setPanX((prev) => clampPan(prev + panStep, panY, zoom).panX);
    } else if (e.key === "ArrowRight") {
      setPanX((prev) => clampPan(prev - panStep, panY, zoom).panX);
    } else if (e.key === "ArrowUp") {
      setPanY((prev) => clampPan(panX, prev + panStep, zoom).panY);
    } else if (e.key === "ArrowDown") {
      setPanY((prev) => clampPan(panX, prev - panStep, zoom).panY);
    }
  };

  // Viewport Pointer Handlers (Distinguishes dragging text vs panning scenery)
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const vp = viewportRef.current;
    if (!vp) return;

    try {
      vp.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      pinchStartDistRef.current = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      pinchStartZoomRef.current = zoom;
      dragInfoRef.current = null;
      return;
    }

    const rect = vp.getBoundingClientRect();
    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const s = baseScale * zoom;

    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const scX = (vx - panX) / s;
    const scY = (vy - panY) / s;

    const gridPt = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
    const r = Math.floor(gridPt.row);
    const c = Math.floor(gridPt.col);

    let clickedOnWall = false;
    if (r >= 0 && r < COC_GRID_SIZE && c >= 0 && c < COC_GRID_SIZE) {
      if (result.grid[r][c] === 1) {
        clickedOnWall = true;
      } else {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < COC_GRID_SIZE && nc >= 0 && nc < COC_GRID_SIZE && result.grid[nr][nc] === 1) {
              clickedOnWall = true;
              break;
            }
          }
          if (clickedOnWall) break;
        }
      }
    }

    dragInfoRef.current = {
      type: clickedOnWall ? "text" : "pan",
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: offsetX,
      initOffsetY: offsetY,
      initPanX: panX,
      initPanY: panY,
      startGridCol: gridPt.col,
      startGridRow: gridPt.row,
    };
    setIsDragging(true);
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom handling for multi-touch
    if (activeTouchesRef.current.size === 2 && pinchStartDistRef.current && viewportRef.current) {
      const touches = Array.from(activeTouchesRef.current.values());
      const curDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      const scaleFactor = curDist / (pinchStartDistRef.current || 1);
      const targetZoom = Math.min(4.0, Math.max(1.0, pinchStartZoomRef.current * scaleFactor));
      const rect = viewportRef.current.getBoundingClientRect();
      const midX = (touches[0].x + touches[1].x) / 2 - rect.left;
      const midY = (touches[0].y + touches[1].y) / 2 - rect.top;

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(rect.width / natW, rect.height / natH);
      const oldScale = baseScale * zoom;
      const newScale = baseScale * targetZoom;
      const ratio = newScale / oldScale;

      const rawX = midX - (midX - panX) * ratio;
      const rawY = midY - (midY - panY) * ratio;

      const { panX: cx, panY: cy } = clampPan(rawX, rawY, targetZoom, rect.width, rect.height);
      setZoom(targetZoom);
      setPanX(cx);
      setPanY(cy);
      return;
    }

    const drag = dragInfoRef.current;
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const s = baseScale * zoom;

    if (drag) {
      if (drag.type === "pan") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const { panX: cx, panY: cy } = clampPan(drag.initPanX + dx, drag.initPanY + dy, zoom, rect.width, rect.height);
        setPanX(cx);
        setPanY(cy);
      } else if (drag.type === "text") {
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const scX = (vx - panX) / s;
        const scY = (vy - panY) / s;
        const currentGrid = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
        const deltaC = Math.round(currentGrid.col - drag.startGridCol);
        const deltaR = Math.round(currentGrid.row - drag.startGridRow);

        const newX = Math.max(-20, Math.min(20, drag.initOffsetX + deltaC));
        const newY = Math.max(-20, Math.min(20, drag.initOffsetY + deltaR));
        if (newX !== offsetX) setOffsetX(newX);
        if (newY !== offsetY) setOffsetY(newY);
      }
      return;
    }

    // Hover inspector when not dragging
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const scX = (vx - panX) / s;
    const scY = (vy - panY) / s;
    const gridPt = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
    const r = Math.floor(gridPt.row);
    const c = Math.floor(gridPt.col);

    if (r >= 0 && r < COC_GRID_SIZE && c >= 0 && c < COC_GRID_SIZE) {
      setHoveredCell({ r, c });
      if (result.grid[r][c] === 1) {
        setCursorMode("move");
      } else {
        setCursorMode("grab");
      }
    } else {
      setHoveredCell(null);
      setCursorMode("grab");
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (dragInfoRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      dragInfoRef.current = null;
      setIsDragging(false);
    }
  };

  // Download Viewport Preview PNG at 2x resolution
  const handleExportViewport2x = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    if (vw <= 0 || vh <= 0) return;

    setIsExportingViewport(true);
    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(vw * 2);
      exportCanvas.height = Math.round(vh * 2);
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (viewMode === "3d" && canvas3dRef.current) {
        const canvas = canvas3dRef.current;
        const natW = currentScenery.naturalWidth;
        const natH = currentScenery.naturalHeight;
        const baseScale = Math.max(vw / natW, vh / natH);
        const s = baseScale * zoom;

        const srcX = -panX / s;
        const srcY = -panY / s;
        const srcW = vw / s;
        const srcH = vh / s;

        ctx.drawImage(
          canvas,
          srcX, srcY, srcW, srcH,
          0, 0, exportCanvas.width, exportCanvas.height
        );
      } else if (canvas2dRef.current) {
        const canvas = canvas2dRef.current;
        ctx.fillStyle = "#1A120C";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        const pad = Math.round(exportCanvas.height * 0.05);
        const size = exportCanvas.height - pad * 2;
        const startX = Math.round((exportCanvas.width - size) / 2);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, startX, pad, size, size);
      }

      // Localized preview caption pill at bottom-left
      const caption = isTr
        ? `CoC Analitik • "${text || "-"}" • ${result.wallCount}/${maxWalls} Duvar • ${localizedSceneryName}`
        : `CoC Analytics • "${text || "-"}" • ${result.wallCount}/${maxWalls} Walls • ${localizedSceneryName}`;
      ctx.font = "bold 20px -apple-system, sans-serif";
      const metrics = ctx.measureText(caption);
      const pillPadX = 16;
      const pillH = 34;
      const pillW = Math.min(exportCanvas.width - 32, metrics.width + pillPadX * 2);
      const pillX = 16;
      const pillY = exportCanvas.height - pillH - 16;

      ctx.fillStyle = "rgba(26, 18, 12, 0.85)";
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pillX, pillY, pillW, pillH);
      ctx.fillStyle = "#FFEB75";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(caption, pillX + pillPadX, pillY + pillH / 2, pillW - pillPadX * 2);

      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeText = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]/g, "-") : isTr ? "koy" : "village";
      link.download = isTr ? `coc-duvar-onizleme-${safeText}.png` : `coc-wall-preview-${safeText}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExportingViewport(false);
    }
  }, [viewMode, zoom, panX, panY, currentScenery, text, result.wallCount, maxWalls, localizedSceneryName, isTr]);

  // Download Blueprint PNG
  const handleDownloadPng = useCallback(() => {
    if (!currentFont) return;
    setIsExporting(true);
    try {
      const dataUrl = exportPlanPng(result.grid, {
        text,
        fontName: currentFont.name,
        wallCount: result.wallCount,
        maxWalls: result.maxWalls,
        scale: result.effectiveScale,
        rotation,
        offsetX,
        offsetY,
        locale,
      });

      if (!dataUrl) return;

      const link = document.createElement("a");
      const safeText = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]/g, "-") : isTr ? "plan" : "blueprint";
      link.download = isTr ? `coc-duvar-yazisi-${safeText}.png` : `coc-wall-art-${safeText}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [result, text, currentFont, rotation, offsetX, offsetY, locale, isTr]);

  // Copy Build Guide text
  const handleCopyGuide = async () => {
    const lines = result.buildGuide.map((g) => {
      if (isTr) {
        return `Satır ${g.row}: ${g.wallCount} duvar [${g.segments
          .map((s) => (s.fromCol === s.toCol ? `Sütun ${s.fromCol}` : `Sütun ${s.fromCol}–${s.toCol} (${s.count} adet)`))
          .join(", ")}]`;
      }
      return `Row ${g.row}: ${g.wallCount} walls [${g.segments
        .map((s) => (s.fromCol === s.toCol ? `Col ${s.fromCol}` : `Col ${s.fromCol}–${s.toCol} (${s.count})`))
        .join(", ")}]`;
    });

    const fullText = isTr
      ? [
          `=== CoC Duvar Yazısı İnşa Rehberi ===`,
          `Metin: "${text}"`,
          `Font: ${currentFont?.name || "Bilinmiyor"} (Ölçek: ${result.effectiveScale}x, Açı: ${rotation}°)`,
          `Toplam Duvar: ${result.wallCount} / ${result.maxWalls}`,
          `Izgara: 44x44 Ana Köy`,
          `------------------------------------`,
          ...lines,
        ].join("\n")
      : [
          `=== CoC Wall Art Build Guide ===`,
          `Text: "${text}"`,
          `Font: ${currentFont?.name || "Unknown"} (Scale: ${result.effectiveScale}x, Angle: ${rotation}°)`,
          `Total Walls: ${result.wallCount} / ${result.maxWalls}`,
          `Grid: 44x44 Home Village`,
          `------------------------------------`,
          ...lines,
        ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2000);
    } catch {
      // Clipboard fallback failed silently
    }
  };

  const usagePct = Math.min(100, Math.round((result.wallCount / Math.max(1, maxWalls)) * 100));

  // Localized non-duplicate supplementary notices
  const localizedNotices = useMemo(() => {
    const items: string[] = [];
    if (result.isReadabilityLow) {
      items.push(
        isTr
          ? `Bu boyutta harfler zor okunabilir (Harf yüksekliği: ${result.capHeight} hücre)`
          : `Letters may be hard to read at this scale (Cap height: ${result.capHeight} cells)`
      );
    }
    if (result.thickenedChars.length > 0) {
      items.push(
        isTr
          ? `Bazı harflerde ince çizgiler korundu (${result.thickenedChars.join(", ")})`
          : `Thin strokes reinforced on: ${result.thickenedChars.join(", ")}`
      );
    }
    if ((offsetX !== 0 || offsetY !== 0) && result.warnings.some((w) => w.includes("kaydırma"))) {
      items.push(
        isTr
          ? "Yazı kaydırma nedeniyle ızgara dışına taşıyor ve kırpılıyor."
          : "Text extends outside the 44×44 grid due to offset and is clipped."
      );
    }
    if (rotation % 45 !== 0 && result.warnings.some((w) => w.includes("Piksel harfleri"))) {
      items.push(
        isTr
          ? "Ara açılar piksel harfleri bozabilir; 45° katlarını kullanın."
          : "Intermediate angles may distort pixel glyphs; multiples of 45° are recommended."
      );
    }
    if (!result.isCleanScale) {
      items.push(
        isTr
          ? "Bu ölçekte harf kalınlıkları eşit olmayabilir."
          : "Stroke thickness may be uneven at this fractional scale."
      );
    }
    return items;
  }, [result, isTr, offsetX, offsetY, rotation]);

  return (
    <div className="game-theme w-full max-w-7xl mx-auto px-0 sm:px-2 py-1 sm:py-4 flex flex-col animate-fadeIn pb-12">
      {/* Main Wooden Window Frame */}
      <div className="game-window-frame flex flex-col">
        {/* Window Top Edge: Tab Bar Strip */}
        <div className="game-tab-strip shrink-0 justify-between items-end flex-wrap gap-2 px-3 sm:px-6">
          <GameTabBar>
            <GameTab active={true} icon={<PenTool size={18} />} className="font-game">
              {t.nav.wall}
            </GameTab>
          </GameTabBar>

          <div className="mb-1.5 sm:mb-2 shrink-0">
            <GameButton
              variant="green"
              size="sm"
              onClick={handleDownloadPng}
              disabled={isExporting || result.wallCount === 0}
              icon={<Download size={15} />}
              className="min-h-[44px] text-xs sm:text-sm px-3 py-2 whitespace-nowrap font-game"
              title={
                isTr
                  ? "Koordinatlı 44×44 ızgara ve inşa planını PNG olarak indir"
                  : "Download coordinate 44×44 grid blueprint as PNG"
              }
            >
              {t.wall.downloadPlan}
            </GameButton>
          </div>
        </div>

        {/* Window Content Body */}
        <div className="px-2.5 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-0.5">
            <div>
              <h1 className="font-game text-base sm:text-xl text-white game-text-stroke leading-tight">
                {t.wall.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#D8AF86] mt-0.5">{t.wall.subtitle}</p>
            </div>
          </div>

          {/* Row 1: Text Input + Wall Budget Input (>=16px font size to prevent iOS Safari auto-zoom) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0 h-12">
              <input
                type="text"
                value={text}
                maxLength={35}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.wall.textPlaceholder}
                aria-label={t.wall.title}
                className="w-full h-full px-3.5 pr-16 rounded-xl bg-[#1A120C] border-2 border-[#4E3120] text-base font-bold text-white placeholder-[#9E8069] focus:outline-none focus:border-amber-400 shadow-inner tracking-wide"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D8AF86] pointer-events-none select-none tabular-nums">
                {fmtNum(text.length)}/35
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 h-12 min-w-[118px] sm:min-w-[136px] rounded-xl bg-[#1A120C] border-2 border-[#4E3120] shrink-0">
              <label htmlFor="wall-budget-input" className="text-xs sm:text-sm font-bold text-[#FFEB75] whitespace-nowrap">
                {t.wall.wallsLabel}
              </label>
              <input
                id="wall-budget-input"
                type="number"
                min={1}
                max={2000}
                value={wallInputText}
                onChange={(e) => setWallInputText(e.target.value)}
                onBlur={() => {
                  const val = parseInt(wallInputText, 10);
                  if (isNaN(val) || val < 1) setWallInputText("1");
                  else if (val > 2000) setWallInputText("2000");
                  else setWallInputText(String(val));
                }}
                className="w-14 sm:w-16 bg-transparent text-base font-mono font-black text-white text-right tabular-nums focus:outline-none"
              />
            </div>
          </div>

          {/* Turkish Character Normalization Notice */}
          {result.convertedChars && result.convertedChars.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-200 font-medium">
              <Info size={15} className="shrink-0 text-amber-400" />
              <span>
                {t.wall.turkishAdapted}{" "}
                <strong className="text-amber-100">{result.convertedChars.join(", ")}</strong>
              </span>
            </div>
          )}

          {/* Missing Fonts State */}
          {!currentFont && (
            <div className="p-4 rounded-xl bg-[#1A120C] border-2 border-red-800/70 flex items-center gap-3 text-sm text-red-200">
              <AlertTriangle size={18} className="text-red-400 shrink-0" />
              <div>
                <div className="font-game text-white">{t.wall.noFontTitle}</div>
                <div className="text-xs text-red-200/90">{t.wall.noFontDesc}</div>
              </div>
            </div>
          )}

          {/* Row 2: Bitmap Font Selector */}
          {currentFont && (
            <div className="border-2 border-[#4E3120] rounded-xl overflow-hidden bg-[#1A120C]">
              <button
                type="button"
                onClick={() => setFontPickerOpen((prev) => !prev)}
                aria-expanded={fontPickerOpen}
                className="w-full min-h-[48px] flex items-center justify-between px-3 sm:px-4 py-1.5 hover:bg-[#261A12] transition-colors cursor-pointer select-none text-left"
              >
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 min-w-0 mr-2">
                  <span className="text-xs sm:text-sm font-bold text-[#FFEB75] shrink-0 whitespace-nowrap">
                    {t.wall.fontLabel}{" "}
                    <strong className="font-game text-white">{currentFont.name}</strong>
                  </span>
                  <div className="flex-1 max-w-[160px] sm:max-w-[260px] shrink overflow-hidden">
                    <BitmapFontPreview font={currentFont} text={text} convertTurkish={convertTurkish} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#D8AF86] font-bold shrink-0">
                  <span>{fontPickerOpen ? t.wall.closeBtn : t.wall.changeBtn}</span>
                  <ChevronDown
                    size={16}
                    className={cn("transition-transform duration-200 text-amber-400", fontPickerOpen && "rotate-180")}
                  />
                </div>
              </button>

              {fontPickerOpen && (
                <div className="p-3 border-t-2 border-[#4E3120] bg-[#140D08] space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {allFonts.map((font) => {
                      const isSelected = selectedFontId === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            setSelectedFontId(font.id);
                            setFontPickerOpen(false);
                          }}
                          className={cn(
                            "min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/70 shadow-sm"
                              : "bg-[#261A12] border-[#4E3120] hover:border-amber-500/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-game text-xs sm:text-sm text-white truncate">{font.name}</span>
                            {isSelected && <CheckCircle2 size={15} className="text-amber-400 shrink-0" />}
                          </div>
                          <div className="w-full flex items-center justify-center my-0.5">
                            <BitmapFontPreview font={font} text={text} convertTurkish={convertTurkish} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#D8AF86] font-semibold pt-1.5 border-t border-[#3D2517] tabular-nums">
                            <span>{fmtTemplate(t.wall.glyphHeight, { height: fmtNum(font.height) })}</span>
                            <span>
                              {fmtNum(font.supportedChars.length)} {isTr ? "Glif" : "Glyphs"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 3: Settings Bar (Text Scale, Letter Spacing, Auto-fit, Advanced Drawer) */}
          <div className="bg-[#1A120C] border-2 border-[#4E3120] rounded-xl px-3 sm:px-4 py-2 space-y-2.5 text-xs sm:text-sm font-bold text-[#EAD5BA]">
            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
              {/* Text Scale Slider */}
              <div className="flex items-center gap-2 min-h-[44px] shrink-0">
                <label htmlFor="wall-scale-slider" className="text-xs sm:text-sm text-[#FFEB75] shrink-0">
                  {t.wall.fontSizeLabel}
                </label>
                <input
                  id="wall-scale-slider"
                  type="range"
                  min={MIN_BITMAP_SCALE}
                  max={MAX_BITMAP_SCALE}
                  step={SCALE_STEP}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="game-slider !w-24 sm:!w-28"
                />
                <span className="text-white font-mono text-xs sm:text-sm shrink-0 tabular-nums">
                  {scale}x
                  {result.wasScaledDown && (
                    <span className="text-amber-400 text-xs ml-1 font-bold">
                      ({result.effectiveScale}x)
                    </span>
                  )}
                </span>
              </div>

              {/* Letter Spacing Slider */}
              <div className="flex items-center gap-2 min-h-[44px] shrink-0">
                <label htmlFor="wall-spacing-slider" className="text-xs sm:text-sm text-[#FFEB75] shrink-0">
                  {t.wall.letterSpacingLabel}
                </label>
                <input
                  id="wall-spacing-slider"
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  className="game-slider !w-20 sm:!w-24"
                />
                <span className="text-white font-mono text-xs sm:text-sm shrink-0 tabular-nums">
                  {letterSpacing}
                </span>
              </div>

              {/* Auto-fit Checkbox */}
              <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none shrink-0 hover:text-white">
                <input
                  type="checkbox"
                  checked={autoFit}
                  onChange={(e) => setAutoFit(e.target.checked)}
                  className="game-checkbox"
                />
                <span className="text-xs sm:text-sm">{t.wall.autoFitLabel}</span>
              </label>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setIsOtherSettingsOpen((prev) => !prev)}
                aria-expanded={isOtherSettingsOpen}
                className="min-h-[44px] px-3 rounded-xl bg-[#261A12] border border-[#4E3120] hover:border-amber-400/60 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FFEB75] cursor-pointer transition-colors"
              >
                <Sliders size={15} className="text-amber-400 shrink-0" />
                <span>{isTr ? "Gelişmiş" : "Advanced"}</span>
                <ChevronDown
                  size={15}
                  className={cn("transition-transform duration-200 text-amber-400", isOtherSettingsOpen && "rotate-180")}
                />
              </button>
            </div>

            {isOtherSettingsOpen && (
              <div className="pt-2.5 border-t border-[#3A2317] flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={convertTurkish}
                    onChange={(e) => setConvertTurkish(e.target.checked)}
                    className="game-checkbox"
                  />
                  <span className="text-xs sm:text-sm">
                    {isTr ? "Türkçe harfleri ASCII'ye uyarla (Ç→C, Ş→S)" : "Normalize Turkish chars (Ç→C, Ş→S)"}
                  </span>
                </label>

                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={preserveThinLines}
                    onChange={(e) => setPreserveThinLines(e.target.checked)}
                    className="game-checkbox"
                  />
                  <span className="text-xs sm:text-sm">
                    {isTr ? "0.5x ölçekte ince çizgileri koru" : "Preserve thin strokes at 0.5x"}
                  </span>
                </label>

                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={showDebugGrid}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setShowDebugGrid(next);
                      if (next && viewMode !== "3d") setViewMode("3d");
                    }}
                    className="game-checkbox"
                  />
                  <span className="text-xs sm:text-sm">
                    {isTr ? "3D Sahne 44×44 Hizalama Izgarası" : "3D Scenery 44×44 Alignment Grid"}
                  </span>
                </label>

                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={show2dSceneryBg}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setShow2dSceneryBg(next);
                      if (next && viewMode !== "2d") setViewMode("2d");
                    }}
                    className="game-checkbox"
                  />
                  <span className="text-xs sm:text-sm">
                    {isTr ? "2D Izgarada Sahne Arka Planı" : "2D Grid Scenery Backdrop"}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  disabled={offsetX === 0 && offsetY === 0}
                  className="min-h-[44px] px-3 rounded-xl bg-[#261A12] border border-[#4E3120] hover:border-amber-400/60 disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-bold text-amber-200 cursor-pointer tabular-nums transition-colors"
                >
                  <RotateCcw size={14} className="text-amber-400" />
                  <span>
                    {isTr ? "Konumu Sıfırla" : "Reset Offset"} ({offsetX >= 0 ? `+${offsetX}` : offsetX}, {offsetY >= 0 ? `+${offsetY}` : offsetY})
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Wall Budget Meter (ALWAYS visible on 390px Mobile & Desktop) */}
          <div className="rounded-xl bg-[#1A120C] border-2 border-[#4E3120] px-3 sm:px-4 py-2.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    result.isOverBudget
                      ? "bg-red-500 animate-pulse"
                      : usagePct >= 85
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                />
                <span className="font-game text-xs sm:text-sm text-[#FFEB75]">
                  {isTr ? "Duvar Bütçesi" : "Wall Budget"}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "font-mono text-sm sm:text-base font-black tabular-nums",
                    result.isOverBudget ? "text-red-400" : "text-white"
                  )}
                >
                  {fmtNum(result.wallCount)} / {fmtNum(maxWalls)}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border",
                    result.isOverBudget
                      ? "bg-red-950/70 border-red-500/60 text-red-300"
                      : usagePct >= 85
                      ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                      : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  )}
                >
                  {usagePct}%
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-[#110A06] border border-[#3A2317] overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  result.isOverBudget
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                    : usagePct >= 85
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-amber-400"
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>

            {result.isOverBudget && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-300 pt-0.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span>
                  {fmtTemplate(t.wall.budgetExceeded, {
                    excess: fmtNum(result.wallCount - maxWalls),
                  })}
                </span>
              </div>
            )}
          </div>

          {/* ── CANVAS VIEWPORT (100% Unobstructed on <sm Mobile; Only outer-corner nudges on >=sm) ── */}
          <div className="space-y-2.5 max-w-[1100px] mx-auto w-full">
            <div
              ref={viewportRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onWheel={handleWheel}
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerCancel={handleViewportPointerUp}
              className={cn(
                "relative w-full overflow-hidden select-none touch-none rounded-xl border-2 border-[#4E3120] shadow-2xl bg-[#1A120C] aspect-[16/10] sm:aspect-[19.5/9] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow",
                isDragging
                  ? dragInfoRef.current?.type === "pan"
                    ? "cursor-grabbing"
                    : "cursor-move"
                  : cursorMode === "move"
                  ? "cursor-move"
                  : "cursor-grab"
              )}
              style={{
                maxHeight: "78vh",
              }}
            >
              {/* Canvas Rendering (3D Scenery + Walls OR 2D Grid) */}
              {viewMode === "3d" ? (
                <div
                  className="absolute top-0 left-0 will-change-transform"
                  style={{
                    width: `${currentScenery.naturalWidth}px`,
                    height: `${currentScenery.naturalHeight}px`,
                    transform: `translate3d(${panX}px, ${panY}px, 0px) scale(${
                      viewportSize.width > 0
                        ? Math.max(viewportSize.width / currentScenery.naturalWidth, viewportSize.height / currentScenery.naturalHeight) * zoom
                        : 1
                    })`,
                    transformOrigin: "0 0",
                  }}
                >
                  <canvas
                    ref={canvas3dRef}
                    style={{
                      width: `${currentScenery.naturalWidth}px`,
                      height: `${currentScenery.naturalHeight}px`,
                    }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 bg-[#1A120C]">
                  <canvas
                    ref={canvas2dRef}
                    className="max-h-full max-w-full rounded-xl shadow-xl border border-amber-500/35"
                    style={{ aspectRatio: "1 / 1" }}
                  />
                </div>
              )}

              {/* Scenery Loading Overlay */}
              {sceneryLoading && (
                <div className="absolute inset-0 bg-[#1A120C]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-40 rounded-xl pointer-events-none">
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs sm:text-sm text-amber-300 font-bold">{t.wall.loadingScene}</span>
                </div>
              )}

              {/* Floating Drag Indicator (Non-interactive, active only while dragging) */}
              {isDragging && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1A120C]/95 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/60 shadow-xl pointer-events-none flex items-center gap-2 z-30 whitespace-nowrap tabular-nums">
                  <Move size={14} className="text-amber-400 shrink-0" />
                  <span>
                    {dragInfoRef.current?.type === "text"
                      ? fmtTemplate(t.wall.draggingText, {
                          x: offsetX > 0 ? `+${offsetX}` : offsetX,
                          y: offsetY > 0 ? `+${offsetY}` : offsetY,
                        })
                      : fmtTemplate(t.wall.panningScene, { zoom: zoom.toFixed(1) })}
                  </span>
                </div>
              )}

              {/* DESKTOP ONLY (>= sm): 4 Outer-Corner Directional Nudge Buttons (Never overlap each other or center) */}
              <div className="hidden sm:block">
                <button
                  type="button"
                  {...nwHold}
                  disabled={!canNudgeNW}
                  className="absolute top-3 left-3 z-20 game-btn-panel-green rounded-xl w-11 h-11"
                  aria-label={isTr ? "Yukarı-Sola Kaydır (Sütun -1)" : "Nudge North-West (Col -1)"}
                  title={isTr ? "Yazıyı Sütun Boyunca Yukarı-Sola Kaydır (Sütun -1)" : "Nudge North-West (Col -1)"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18L18 6M6 6h10M6 6v10" />
                  </svg>
                </button>

                <button
                  type="button"
                  {...neHold}
                  disabled={!canNudgeNE}
                  className="absolute top-3 right-3 z-20 game-btn-panel-green rounded-xl w-11 h-11"
                  aria-label={isTr ? "Yukarı-Sağa Kaydır (Satır -1)" : "Nudge North-East (Row -1)"}
                  title={isTr ? "Yazıyı Satır Boyunca Yukarı-Sağa Kaydır (Satır -1)" : "Nudge North-East (Row -1)"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18L18 6M8 6h10M18 6v10" />
                  </svg>
                </button>

                <button
                  type="button"
                  {...swHold}
                  disabled={!canNudgeSW}
                  className="absolute bottom-3 left-3 z-20 game-btn-panel-green rounded-xl w-11 h-11"
                  aria-label={isTr ? "Aşağı-Sola Kaydır (Satır +1)" : "Nudge South-West (Row +1)"}
                  title={isTr ? "Yazıyı Satır Boyunca Aşağı-Sola Kaydır (Satır +1)" : "Nudge South-West (Row +1)"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 18h10M6 18V8" />
                  </svg>
                </button>

                <button
                  type="button"
                  {...seHold}
                  disabled={!canNudgeSE}
                  className="absolute bottom-3 right-3 z-20 game-btn-panel-green rounded-xl w-11 h-11"
                  aria-label={isTr ? "Aşağı-Sağa Kaydır (Sütun +1)" : "Nudge South-East (Col +1)"}
                  title={isTr ? "Yazıyı Sütun Boyunca Aşağı-Sağa Kaydır (Sütun +1)" : "Nudge South-East (Col +1)"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6L18 18M8 18h10M18 8v10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── DOCKED CANVAS CONTROL BAR (Outside Canvas: Zero Overlap on Mobile 390px & Desktop) ── */}
            <div className="rounded-xl bg-[#261A12] border-2 border-[#4E3120] p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 shadow-inner">
              {/* Transform & Viewport Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Rotate Group (-15° / Reset -45° / +15°) */}
                <div className="flex items-center gap-1" role="group" aria-label={isTr ? "Döndürme kontrolleri" : "Rotation controls"}>
                  <button
                    type="button"
                    {...ccwHold}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Saat yönünün tersi döndür (-15°)" : "Rotate counter-clockwise (-15°)"}
                    title={isTr ? "Saat Yönünün Tersi Döndür (-15°)" : "Rotate Counter-Clockwise (-15°)"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={resetRotation}
                    className="min-h-[44px] min-w-[64px] px-2.5 rounded-xl bg-[#1A120C] border-2 border-[#4E3120] hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-inner active:scale-95"
                    title={isTr ? "Açıyı varsayılana (-45°) sıfırla" : "Reset angle to default (-45°)"}
                  >
                    <span className="font-game text-sm sm:text-base text-white tabular-nums">
                      {rotation}°
                    </span>
                    {rotation % 45 !== 0 && (
                      <AlertTriangle
                        size={14}
                        className="text-amber-400 shrink-0"
                        aria-label={isTr ? "45° katları önerilir" : "Multiples of 45° recommended"}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    {...cwHold}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Saat yönünde döndür (+15°)" : "Rotate clockwise (+15°)"}
                    title={isTr ? "Saat Yönünde Döndür (+15°)" : "Rotate Clockwise (+15°)"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </button>
                </div>

                {/* Zoom Group (- / 100% Reset / +) */}
                <div className="flex items-center gap-1" role="group" aria-label={isTr ? "Yakınlaştırma kontrolleri" : "Zoom controls"}>
                  <button
                    type="button"
                    onClick={() => handleZoomStep(1 / 1.25)}
                    disabled={zoom <= 1.0}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Uzaklaştır (-)" : "Zoom out (-)"}
                    title={isTr ? "Uzaklaştır (−)" : "Zoom Out (−)"}
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>

                  <button
                    type="button"
                    onClick={() => centerViewOnDiamond(1.0)}
                    className="min-h-[44px] min-w-[68px] px-2.5 rounded-xl bg-[#1A120C] border-2 border-[#4E3120] hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs sm:text-sm font-game text-[#FFEB75] tabular-nums active:scale-95"
                    title={isTr ? "Görünümü %100 sıfırla ve ortala" : "Reset zoom to 100% and center view"}
                  >
                    <Crosshair size={13} className="text-amber-400 shrink-0" />
                    <span>{Math.round(zoom * 100)}%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleZoomStep(1.25)}
                    disabled={zoom >= 4.0}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Yakınlaştır (+)" : "Zoom in (+)"}
                    title={isTr ? "Yakınlaştır (+)" : "Zoom In (+)"}
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>

                {/* 2D / 3D Switch */}
                <div
                  className="flex items-center p-0.5 rounded-xl bg-[#1A120C] border-2 border-[#4E3120]"
                  role="group"
                  aria-label={isTr ? "Görünüm modu" : "View mode"}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("2d")}
                    className={cn(
                      "min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs sm:text-sm font-game transition-all cursor-pointer",
                      viewMode === "2d" ? "bg-amber-500 text-[#1A120C] shadow" : "text-amber-200/80 hover:text-white"
                    )}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("3d")}
                    className={cn(
                      "min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs sm:text-sm font-game transition-all cursor-pointer",
                      viewMode === "3d" ? "bg-amber-500 text-[#1A120C] shadow" : "text-amber-200/80 hover:text-white"
                    )}
                  >
                    3D
                  </button>
                </div>

                {/* Mobile-only Directional Nudge Arrows (< sm) */}
                <div
                  className="flex sm:hidden items-center gap-1"
                  role="group"
                  aria-label={isTr ? "Konum kaydırma okları" : "Position nudge controls"}
                >
                  <button
                    type="button"
                    {...nwHold}
                    disabled={!canNudgeNW}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Yukarı-Sola Kaydır" : "Nudge North-West"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M6 6h10M6 6v10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    {...neHold}
                    disabled={!canNudgeNE}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Yukarı-Sağa Kaydır" : "Nudge North-East"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M8 6h10M18 6v10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    {...swHold}
                    disabled={!canNudgeSW}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Aşağı-Sola Kaydır" : "Nudge South-West"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 18h10M6 18V8" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    {...seHold}
                    disabled={!canNudgeSE}
                    className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                    aria-label={isTr ? "Aşağı-Sağa Kaydır" : "Nudge South-East"}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 6L18 18M8 18h10M18 8v10" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Export & Build Guide Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <GameButton
                  variant="gold"
                  size="sm"
                  onClick={handleExportViewport2x}
                  disabled={isExportingViewport || (viewMode === "3d" && sceneryLoading)}
                  icon={
                    isExportingViewport ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )
                  }
                  className="min-h-[44px] px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-game"
                  title={
                    isTr
                      ? "Mevcut köy görünümünü 2 kat çözünürlükte önizleme PNG olarak indir"
                      : "Save current village preview as 2x PNG image"
                  }
                >
                  {t.wall.downloadPreview}
                </GameButton>

                <GameButton
                  variant="blue"
                  size="sm"
                  onClick={handleCopyGuide}
                  disabled={result.wallCount === 0}
                  icon={copiedGuide ? <Check size={16} /> : <Copy size={16} />}
                  className="min-h-[44px] px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-game"
                  title={
                    isTr
                      ? "Satır satır koordinatlı inşa rehberini panoya kopyala"
                      : "Copy row-by-row coordinate build guide to clipboard"
                  }
                >
                  {copiedGuide ? t.wall.copiedGuide : t.wall.copyGuide}
                </GameButton>

                <button
                  type="button"
                  onClick={() => setIsGuideOpen((prev) => !prev)}
                  disabled={result.buildGuide.length === 0}
                  aria-expanded={isGuideOpen}
                  className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#1A120C] border-2 border-[#4E3120] hover:border-amber-400/60 disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FFEB75] cursor-pointer transition-colors"
                  title={isTr ? "Satır bazlı koordinat listesini göster/gizle" : "Toggle row-by-row coordinate list"}
                >
                  <ListOrdered size={16} className="text-amber-400 shrink-0" />
                  <span className="tabular-nums">{fmtNum(result.buildGuide.length)}</span>
                  <ChevronDown
                    size={15}
                    className={cn("transition-transform duration-200 text-amber-400", isGuideOpen && "rotate-180")}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Row-by-Row Build Guide Drawer */}
          {isGuideOpen && result.buildGuide.length > 0 && (
            <div className="rounded-xl bg-[#1A120C] border-2 border-[#4E3120] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-game text-xs sm:text-sm text-[#FFEB75]">
                  {isTr ? "Satır Bazlı Koordinat Rehberi (1–44)" : "Row-by-Row Build Guide (1–44)"}
                </span>
                <span className="text-xs text-[#D8AF86] tabular-nums">
                  {fmtTemplate(t.wall.filledRows, { filled: fmtNum(result.buildGuide.length) })}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
                {result.buildGuide.map((g) => (
                  <div
                    key={g.row}
                    className="rounded-lg bg-[#261A12] border border-[#4E3120] px-2.5 py-2 text-xs text-[#EAD5BA] flex flex-col gap-1 tabular-nums"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#FFEB75]">
                        {isTr ? `Satır ${g.row}` : `Row ${g.row}`}
                      </span>
                      <span className="text-amber-300">
                        {fmtNum(g.wallCount)} {isTr ? "duvar" : "walls"}
                      </span>
                    </div>
                    <div className="text-xs text-[#D8AF86] font-mono">
                      {g.segments
                        .map((s) =>
                          s.fromCol === s.toCol
                            ? `${isTr ? "Süt" : "C"}${s.fromCol}`
                            : `${isTr ? "Süt" : "C"}${s.fromCol}–${s.toCol}(${s.count})`
                        )
                        .join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Scenery Selector Panel */}
          <div className="rounded-xl overflow-hidden border-2 border-[#673E26] shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_1.5px_0_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#563421] via-[#462A1B] to-[#361F12] transition-all">
            <button
              type="button"
              onClick={() => setIsSceneryOpen((prev) => !prev)}
              aria-expanded={isSceneryOpen}
              className="w-full min-h-[48px] flex items-center justify-between px-3.5 sm:px-4 py-1.5 hover:brightness-110 active:brightness-95 transition-all cursor-pointer select-none text-left group"
            >
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#FFEB75] min-w-0 truncate">
                <div className="p-1.5 rounded-lg bg-[#261A12] border border-[#673E26] text-amber-400 shrink-0 shadow-inner">
                  <ImageIcon size={15} />
                </div>
                <span className="shrink-0 text-[#FFEB75]">{t.wall.sceneryLabel}</span>
                <span className="font-game text-white truncate">{localizedSceneryName}</span>
                <span className="hidden sm:inline text-xs text-[#D8AF86] font-mono shrink-0 tabular-nums">
                  ({fmtNum(availableSceneries.length)})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#EAD5BA] font-bold shrink-0 ml-2 group-hover:text-white transition-colors">
                <span>{isSceneryOpen ? t.wall.closeBtn : t.wall.changeBtn}</span>
                <ChevronDown
                  size={16}
                  className={cn("transition-transform duration-200 text-amber-400", isSceneryOpen && "rotate-180")}
                />
              </div>
            </button>

            {isSceneryOpen && (
              <div className="p-3 sm:p-3.5 border-t-2 border-[#261A12] bg-[#160E09] space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {availableSceneries.map((sc) => {
                    const isSelected = sc.id === selectedSceneryId;
                    const displayName = getSceneryDisplayName(sc.id, sc.name, locale);
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          handleSelectScenery(sc.id);
                          centerViewOnDiamond(1.0);
                        }}
                        className={cn(
                          "relative min-h-[44px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-square group",
                          isSelected
                            ? "border-amber-400 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/30 z-10"
                            : "border-[#4E3120] hover:border-amber-400/60 opacity-85 hover:opacity-100"
                        )}
                        title={`${displayName} (${sc.naturalWidth}×${sc.naturalHeight})`}
                      >
                        <img
                          src={sc.thumb}
                          alt={displayName}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-1.5 py-1 text-center">
                          <span className="text-xs font-bold text-white truncate block leading-tight">
                            {displayName}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-amber-400 text-[#1A120C] p-0.5 rounded-full shadow">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats Strip */}
          <div className="bg-[#1A120C] border-2 border-[#4E3120] rounded-xl px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-[#EAD5BA] font-medium">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>
                {t.wall.totalWalls}{" "}
                <strong className={cn("font-bold tabular-nums", result.isOverBudget ? "text-red-400" : "text-amber-300")}>
                  {fmtNum(result.wallCount)} / {fmtNum(maxWalls)}
                </strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                {t.wall.remainingWalls}{" "}
                <strong className="text-amber-300 font-bold tabular-nums">
                  {fmtNum(Math.max(0, maxWalls - result.wallCount))}
                </strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                {t.wall.boundsLabel}{" "}
                <strong className="text-amber-300 font-bold tabular-nums">
                  {result.maxCol > 0 ? `${result.maxCol - result.minCol + 1}×${result.maxRow - result.minRow + 1}` : "0×0"}
                </strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                {t.wall.letterHeightLabel}{" "}
                <strong className={cn("font-bold tabular-nums", result.isReadabilityLow ? "text-amber-400" : "text-emerald-400")}>
                  {fmtNum(result.capHeight)} {t.wall.cellsUnit}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#D8AF86] font-mono shrink-0 tabular-nums">
              {hoveredCell && viewMode === "3d" && !isDragging && (
                <span className="text-amber-300">
                  {isTr ? "Sat" : "R"}
                  {hoveredCell.r + 1} · {isTr ? "Süt" : "C"}
                  {hoveredCell.c + 1}
                </span>
              )}
              <span>{fmtTemplate(t.wall.filledRows, { filled: fmtNum(result.buildGuide.length) })}</span>
            </div>
          </div>

          {/* Alerts Banner (Budget Exceeded / Grid Overflow / Missing Chars / Localized Notices) */}
          {(result.isOverBudget || !result.fitsInGrid || result.missingChars.length > 0 || localizedNotices.length > 0) && (
            <div className="rounded-xl bg-[#2B120E] border-2 border-red-800/80 p-3 text-xs sm:text-sm text-red-200 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                {result.isOverBudget && (
                  <span className="font-bold text-red-100">
                    {fmtTemplate(t.wall.budgetExceeded, { excess: fmtNum(result.wallCount - maxWalls) })}
                  </span>
                )}
                {!result.fitsInGrid && (
                  <span className="font-bold text-red-100">{t.wall.gridOverflow}</span>
                )}
                {result.missingChars.length > 0 && (
                  <span>
                    {isTr ? "Desteklenmeyen karakterler:" : "Unsupported characters:"}{" "}
                    <strong className="text-amber-200">{result.missingChars.join(", ")}</strong>
                  </span>
                )}
                {localizedNotices.map((msg, idx) => (
                  <span key={idx} className="text-amber-200/95">
                    {msg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
