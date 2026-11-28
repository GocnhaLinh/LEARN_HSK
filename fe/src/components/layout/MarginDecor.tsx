import React, { useState } from "react";
import { useProfileStore } from "@/features/profile/stores/profile.store";

interface PetalSpec {
  id: string;
  side: "left" | "right";
  offsetPct: number;
  size: number;
  durationSec: number;
  delaySec: number;
  opacity: number;
  tone: "sakuraA" | "sakuraB" | "ivoryA" | "ivoryB";
}

interface SparkleSpec {
  id: string;
  side: "left" | "right";
  topPct: number;
  offsetPct: number;
  size: number;
  delaySec: number;
  color: string;
}

interface ZineScrollAsset {
  id: string;
  src: string;
}

interface PastelArtAsset {
  id: string;
  src: string;
  align: "top-flush" | "top" | "center";
  animClass: string;
  originClass: string;
  maxWidthClass: string;
  mirrorOnSide?: "left" | "right";
  warmGlow?: boolean;
}

/**
 * 12 traditional Chinese silk hanging scrolls (挂轴) for Editorial Zine — randomized per page load:
 * 6 Gongbi watercolor paintings + 6 Chinese brush calligraphy scrolls (书法挂轴).
 */
const ZINE_SCROLL_POOL: ReadonlyArray<ZineScrollAsset> = [
  // Tranh cuộn Công bút cổ phong (6 mẫu)
  { id: "scroll-plum", src: "/decor/scroll-plum.webp" },
  { id: "scroll-lotus", src: "/decor/scroll-lotus.webp" },
  { id: "scroll-bamboo", src: "/decor/scroll-bamboo.webp" },
  { id: "scroll-wisteria", src: "/decor/scroll-wisteria.webp" },
  { id: "scroll-peony", src: "/decor/scroll-peony.webp" },
  { id: "scroll-jiangnan", src: "/decor/scroll-jiangnan.webp" },
  // Tranh cuộn Thư pháp chữ Hán (6 mẫu)
  { id: "scroll-calli-xuehai", src: "/decor/scroll-calli-xuehai.webp" },
  { id: "scroll-calli-jingqi", src: "/decor/scroll-calli-jingqi.webp" },
  { id: "scroll-calli-chunfeng", src: "/decor/scroll-calli-chunfeng.webp" },
  { id: "scroll-calli-xinyuan", src: "/decor/scroll-calli-xinyuan.webp" },
  { id: "scroll-calli-tianchou", src: "/decor/scroll-calli-tianchou.webp" },
  { id: "scroll-calli-suiyue", src: "/decor/scroll-calli-suiyue.webp" },
];

/** 5 watercolor coquette / floral / palace lantern illustrations for Pastel Diary — randomized per page load. */
const PASTEL_ART_POOL: ReadonlyArray<PastelArtAsset> = [
  {
    id: "pastel-sakura",
    src: "/decor/pastel-sakura.webp",
    align: "top",
    animClass: "art-sway-branch",
    originClass: "origin-top-left",
    maxWidthClass: "max-w-[235px]",
    mirrorOnSide: "right",
  },
  {
    id: "pastel-teacup",
    src: "/decor/pastel-teacup.webp",
    align: "center",
    animClass: "art-float-dreamy",
    originClass: "origin-center",
    maxWidthClass: "max-w-[225px]",
  },
  {
    id: "pastel-magnolia",
    src: "/decor/pastel-magnolia.webp",
    align: "center",
    animClass: "art-sway-stem",
    originClass: "origin-bottom",
    maxWidthClass: "max-w-[230px]",
    mirrorOnSide: "right",
  },
  {
    id: "pastel-lantern",
    src: "/decor/pastel-lantern.webp",
    align: "top-flush",
    animClass: "lantern-sway",
    originClass: "origin-top",
    maxWidthClass: "max-w-[230px]",
    mirrorOnSide: "left",
    warmGlow: true,
  },
  {
    id: "pastel-moon-roses",
    src: "/decor/pastel-moon-roses.webp",
    align: "center",
    animClass: "art-float-dreamy",
    originClass: "origin-top",
    maxWidthClass: "max-w-[228px]",
    mirrorOnSide: "right",
  },
];

const PASTEL_PETALS: ReadonlyArray<PetalSpec> = [
  {
    id: "pl1",
    side: "left",
    offsetPct: 18,
    size: 14,
    durationSec: 12.5,
    delaySec: 0,
    opacity: 0.82,
    tone: "sakuraA",
  },
  {
    id: "pl2",
    side: "left",
    offsetPct: 62,
    size: 11,
    durationSec: 15,
    delaySec: -5.2,
    opacity: 0.7,
    tone: "sakuraB",
  },
  {
    id: "pl3",
    side: "left",
    offsetPct: 40,
    size: 13,
    durationSec: 13.5,
    delaySec: -9.1,
    opacity: 0.76,
    tone: "sakuraA",
  },
  {
    id: "pl4",
    side: "left",
    offsetPct: 76,
    size: 10,
    durationSec: 16.2,
    delaySec: -2.6,
    opacity: 0.65,
    tone: "sakuraB",
  },
  {
    id: "pr1",
    side: "right",
    offsetPct: 22,
    size: 14,
    durationSec: 13.2,
    delaySec: -1.8,
    opacity: 0.8,
    tone: "sakuraA",
  },
  {
    id: "pr2",
    side: "right",
    offsetPct: 66,
    size: 11,
    durationSec: 15.6,
    delaySec: -6.4,
    opacity: 0.68,
    tone: "sakuraB",
  },
  {
    id: "pr3",
    side: "right",
    offsetPct: 44,
    size: 13,
    durationSec: 12.2,
    delaySec: -10.3,
    opacity: 0.78,
    tone: "sakuraA",
  },
  {
    id: "pr4",
    side: "right",
    offsetPct: 78,
    size: 10,
    durationSec: 16.8,
    delaySec: -4.1,
    opacity: 0.65,
    tone: "sakuraB",
  },
];

const ZINE_PETALS: ReadonlyArray<PetalSpec> = [
  {
    id: "zl1",
    side: "left",
    offsetPct: 20,
    size: 12,
    durationSec: 16,
    delaySec: -1.5,
    opacity: 0.72,
    tone: "ivoryA",
  },
  {
    id: "zl2",
    side: "left",
    offsetPct: 72,
    size: 10,
    durationSec: 18.5,
    delaySec: -8.4,
    opacity: 0.65,
    tone: "ivoryB",
  },
  {
    id: "zr1",
    side: "right",
    offsetPct: 22,
    size: 12,
    durationSec: 16.6,
    delaySec: -3.8,
    opacity: 0.72,
    tone: "ivoryA",
  },
  {
    id: "zr2",
    side: "right",
    offsetPct: 74,
    size: 10,
    durationSec: 19,
    delaySec: -11.2,
    opacity: 0.64,
    tone: "ivoryB",
  },
];

const PASTEL_SPARKLES: ReadonlyArray<SparkleSpec> = [
  {
    id: "psl1",
    side: "left",
    topPct: 20,
    offsetPct: 22,
    size: 11,
    delaySec: 0,
    color: "#E8A2BE",
  },
  {
    id: "psl2",
    side: "left",
    topPct: 54,
    offsetPct: 76,
    size: 9,
    delaySec: 1.5,
    color: "#E4C678",
  },
  {
    id: "psl3",
    side: "left",
    topPct: 78,
    offsetPct: 30,
    size: 10,
    delaySec: 2.7,
    color: "#E8A2BE",
  },
  {
    id: "psr1",
    side: "right",
    topPct: 24,
    offsetPct: 24,
    size: 11,
    delaySec: 0.8,
    color: "#E4C678",
  },
  {
    id: "psr2",
    side: "right",
    topPct: 50,
    offsetPct: 78,
    size: 9,
    delaySec: 2.1,
    color: "#E8A2BE",
  },
  {
    id: "psr3",
    side: "right",
    topPct: 72,
    offsetPct: 30,
    size: 10,
    delaySec: 3.2,
    color: "#E4C678",
  },
];

const ZINE_SPARKLES: ReadonlyArray<SparkleSpec> = [
  {
    id: "zsl1",
    side: "left",
    topPct: 18,
    offsetPct: 16,
    size: 10,
    delaySec: 0.3,
    color: "#DEC15B",
  },
  {
    id: "zsl2",
    side: "left",
    topPct: 52,
    offsetPct: 82,
    size: 9,
    delaySec: 1.7,
    color: "#E6A0BE",
  },
  {
    id: "zsl3",
    side: "left",
    topPct: 80,
    offsetPct: 22,
    size: 10,
    delaySec: 2.9,
    color: "#DEC15B",
  },
  {
    id: "zsr1",
    side: "right",
    topPct: 20,
    offsetPct: 18,
    size: 10,
    delaySec: 0.9,
    color: "#DEC15B",
  },
  {
    id: "zsr2",
    side: "right",
    topPct: 50,
    offsetPct: 82,
    size: 9,
    delaySec: 2.2,
    color: "#E6A0BE",
  },
  {
    id: "zsr3",
    side: "right",
    topPct: 72,
    offsetPct: 20,
    size: 10,
    delaySec: 3.4,
    color: "#DEC15B",
  },
];

const PETAL_GRADIENTS: Record<PetalSpec["tone"], [string, string]> = {
  sakuraA: ["#FBE4EE", "#F2A9C7"],
  sakuraB: ["#F8D3E4", "#E88EB3"],
  ivoryA: ["#FFF9F5", "#F4C8DA"],
  ivoryB: ["#FCF4DE", "#F0CEDC"],
};

/**
 * Picks a distinct [left, right] random pair on each page load (F5/reload),
 * avoiding immediate repeats of either side from the previous reload via sessionStorage.
 */
function pickFreshPair<T extends { id: string }>(
  pool: ReadonlyArray<T>,
  storageKey: string,
): [T, T] {
  let prevLeft = "";
  let prevRight = "";
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw) {
      const [l, r] = raw.split("|");
      prevLeft = l || "";
      prevRight = r || "";
    }
  } catch {
    // Ignore storage restriction errors in sandboxed/private browsers
  }

  const allDistinct: Array<[T, T]> = [];
  for (let i = 0; i < pool.length; i += 1) {
    for (let j = 0; j < pool.length; j += 1) {
      if (i !== j) allDistinct.push([pool[i], pool[j]]);
    }
  }

  const completelyFresh = allDistinct.filter(
    ([l, r]) => l.id !== prevLeft && r.id !== prevRight,
  );
  const candidates =
    completelyFresh.length > 0
      ? completelyFresh
      : allDistinct.filter(
          ([l, r]) => `${l.id}|${r.id}` !== `${prevLeft}|${prevRight}`,
        );

  const source = candidates.length > 0 ? candidates : allDistinct;
  const chosen = source[Math.floor(Math.random() * source.length)] ?? [
    pool[0],
    pool[1] ?? pool[0],
  ];

  try {
    window.sessionStorage.setItem(
      storageKey,
      `${chosen[0].id}|${chosen[1].id}`,
    );
  } catch {
    // Ignore storage write errors
  }
  return chosen;
}

const DriftingPetalSvg: React.FC<{ tone: PetalSpec["tone"]; uid: string }> = ({
  tone,
  uid,
}) => {
  const [c1, c2] = PETAL_GRADIENTS[tone];
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-full h-full drop-shadow-[0_2px_4px_rgba(232,142,179,0.24)]"
    >
      <defs>
        <linearGradient id={`petal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5C15.8 5.2 19 9.5 18.2 14.8C17.6 18.6 14.8 21 12 21.5C9.2 21 6.4 18.6 5.8 14.8C5 9.5 8.2 5.2 12 2.5ZM12 2.5L12 7.2"
        fill={`url(#petal-${uid})`}
      />
    </svg>
  );
};

const MarginAmbientLayer: React.FC<{
  side: "left" | "right";
  petals: ReadonlyArray<PetalSpec>;
  sparkles: ReadonlyArray<SparkleSpec>;
}> = ({ side, petals, sparkles }) => {
  const isLeft = side === "left";
  return (
    <div
      className={`fixed inset-y-0 ${
        isLeft ? "left-0" : "right-0"
      } w-[calc((100vw-1112px)/2)] overflow-hidden z-10`}
    >
      {petals
        .filter((p) => p.side === side)
        .map((p) => (
          <div
            key={p.id}
            className={`${isLeft ? "sakura-petal" : "sakura-petal-alt"} absolute -top-6`}
            style={{
              [isLeft ? "left" : "right"]: `${p.offsetPct}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${p.durationSec}s`,
              animationDelay: `${p.delaySec}s`,
            }}
          >
            <DriftingPetalSvg tone={p.tone} uid={p.id} />
          </div>
        ))}

      {sparkles
        .filter((s) => s.side === side)
        .map((s) => (
          <svg
            key={s.id}
            viewBox="0 0 16 16"
            className="twinkle-star absolute"
            style={{
              top: `${s.topPct}%`,
              [isLeft ? "left" : "right"]: `${s.offsetPct}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delaySec}s`,
            }}
          >
            <path
              d="M8 0L9.6 6.4L16 8L9.6 9.6L8 16L6.4 9.6L0 8L6.4 6.4Z"
              fill={s.color}
            />
          </svg>
        ))}
    </div>
  );
};

const PastelArtSlot: React.FC<{
  side: "left" | "right";
  art: PastelArtAsset;
}> = ({ side, art }) => {
  const isLeft = side === "left";
  const shouldMirror = art.mirrorOnSide === side;
  const alignClass =
    art.align === "top-flush"
      ? "items-start"
      : art.align === "top"
        ? "items-start pt-2"
        : "items-center py-2";
  const maxHeightClass = isLeft
    ? art.align === "top-flush"
      ? "max-h-[calc(100vh-108px)]"
      : "max-h-[calc(100vh-116px)]"
    : art.align === "top-flush"
      ? "max-h-[calc(100vh-140px)]"
      : "max-h-[calc(100vh-152px)]";

  return (
    <div
      className={`fixed top-16 ${isLeft ? "bottom-6 left-0" : "bottom-16 right-0"} w-[calc((100vw-1112px)/2)] flex ${alignClass} justify-center px-2 z-10`}
    >
      <div
        className={`relative flex justify-center w-full ${art.maxWidthClass} ${
          shouldMirror ? "-scale-x-100" : ""
        }`}
      >
        {art.warmGlow && (
          <div
            className="lantern-glow absolute top-[18%] w-20 h-32 rounded-full bg-[#EFE078]/40 blur-2xl"
            aria-hidden="true"
          />
        )}
        <img
          src={art.src}
          alt=""
          draggable={false}
          decoding="async"
          className={`relative w-full ${maxHeightClass} object-contain ${
            art.align !== "center" ? "object-top" : ""
          } ${art.originClass} ${art.animClass} drop-shadow-[0_6px_16px_rgba(196,132,162,0.14)]`}
        />
      </div>
    </div>
  );
};

/**
 * Pastel Diary (`diary`): Randomly pairs 2 of the 5 watercolor illustrations on every reload or page transition.
 */
const PastelWatercolorMargin: React.FC<{
  pageKey: string;
  pair: [PastelArtAsset, PastelArtAsset];
}> = ({ pageKey, pair }) => (
  <>
    <PastelArtSlot key={`${pageKey}-l-${pair[0].id}`} side="left" art={pair[0]} />
    <PastelArtSlot key={`${pageKey}-r-${pair[1].id}`} side="right" art={pair[1]} />
    <MarginAmbientLayer
      side="left"
      petals={PASTEL_PETALS}
      sparkles={PASTEL_SPARKLES}
    />
    <MarginAmbientLayer
      side="right"
      petals={PASTEL_PETALS}
      sparkles={PASTEL_SPARKLES}
    />
  </>
);

/**
 * Editorial Zine (`zine`): Randomly hangs 2 of the 12 traditional Chinese silk scrolls (挂轴)
 * suspended directly from the navbar with a gentle unroll + pendulum breeze sway.
 */
const ZineHangingScrollsMargin: React.FC<{
  pageKey: string;
  pair: [ZineScrollAsset, ZineScrollAsset];
}> = ({ pageKey, pair }) => (
  <>
    <div className="fixed top-16 bottom-6 left-0 w-[calc((100vw-1112px)/2)] flex items-start justify-center px-2 z-10">
      <div
        key={`${pageKey}-l-${pair[0].id}`}
        className="scroll-unroll w-full max-w-[186px] flex justify-center"
      >
        <img
          src={pair[0].src}
          alt=""
          draggable={false}
          decoding="async"
          className="w-full max-h-[calc(100vh-104px)] object-contain object-top origin-top scroll-sway-left drop-shadow-[0_10px_18px_rgba(20,20,20,0.10)]"
        />
      </div>
    </div>

    <div className="fixed top-16 bottom-16 right-0 w-[calc((100vw-1112px)/2)] flex items-start justify-center px-2 z-10">
      <div
        key={`${pageKey}-r-${pair[1].id}`}
        className="scroll-unroll-delay w-full max-w-[186px] flex justify-center"
      >
        <img
          src={pair[1].src}
          alt=""
          draggable={false}
          decoding="async"
          className="w-full max-h-[calc(100vh-142px)] object-contain object-top origin-top scroll-sway-right drop-shadow-[0_10px_18px_rgba(20,20,20,0.10)]"
        />
      </div>
    </div>

    <MarginAmbientLayer
      side="left"
      petals={ZINE_PETALS}
      sparkles={ZINE_SPARKLES}
    />
    <MarginAmbientLayer
      side="right"
      petals={ZINE_PETALS}
      sparkles={ZINE_SPARKLES}
    />
  </>
);

/**
 * Theme-aware bespoke outer-margin gallery (>= 1360px), randomized on every page reload (F5) & route switch:
 * - Editorial Zine (`zine`): 12 Chinese silk hanging scrolls (6 Gongbi paintings + 6 calligraphy scrolls)
 * - Pastel Diary (`diary`): 5 watercolor coquette / floral / palace lantern illustrations
 */
export const MarginDecor: React.FC<{ pageKey: string }> = React.memo(
  ({ pageKey }) => {
    const theme = useProfileStore((s) => s.profile.theme);
    const [selection, setSelection] = useState<{
      key: string;
      zinePair: [ZineScrollAsset, ZineScrollAsset];
      pastelPair: [PastelArtAsset, PastelArtAsset];
    }>(() => ({
      key: pageKey,
      zinePair: pickFreshPair(ZINE_SCROLL_POOL, "hsk_margin_zine_pair"),
      pastelPair: pickFreshPair(PASTEL_ART_POOL, "hsk_margin_pastel_pair"),
    }));

    if (selection.key !== pageKey) {
      setSelection({
        key: pageKey,
        zinePair: pickFreshPair(ZINE_SCROLL_POOL, "hsk_margin_zine_pair"),
        pastelPair: pickFreshPair(PASTEL_ART_POOL, "hsk_margin_pastel_pair"),
      });
    }

    return (
      <div
        aria-hidden="true"
        className="hidden min-[1360px]:block pointer-events-none select-none"
      >
        {theme === "diary" ? (
          <PastelWatercolorMargin
            pageKey={pageKey}
            pair={selection.pastelPair}
          />
        ) : (
          <ZineHangingScrollsMargin
            pageKey={pageKey}
            pair={selection.zinePair}
          />
        )}
      </div>
    );
  },
);

MarginDecor.displayName = "MarginDecor";
