import {
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Mail,
  Palette,
  Phone,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useExamImporterStore } from "@/features/exams/stores/exam-importer.store";
import { useToggleTheme } from "@/features/profile/hooks/useProfile";
import { useProfileStore } from "@/features/profile/stores/profile.store";
import { preloadRoute } from "@/routes/lazyPages";
import { useToastStore } from "@/stores/toast.store";

/**
 * Thông tin tác giả hiển thị trên Footer — chỉnh trực tiếp tại đây khi cần cập nhật SĐT / liên kết.
 */
const AUTHOR_INFO = {
  name: "Võ Duy Hậu",
  initials: "VH",
  handle: "@DuyHauVo",
  role: "Tác giả & Thiết kế HSK (QUEST) 3.0",
  email: "voduyhau272@gmail.com",
  phone: "0xxx xxx xxx",
  phoneHref: "", // Ví dụ: 'tel:+84912345678'
  facebookLabel: "fb.com/duy.hau.2702",
  facebookUrl: "https://www.facebook.com/duy.hau.2702",
} as const;

const QUICK_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: "/", label: "Trang chủ" },
  { to: "/courses", label: "Khóa học" },
  { to: "/flashcard", label: "Flashcard" },
  { to: "/writing", label: "Luyện viết" },
  { to: "/game", label: "Mini-Game" },
  { to: "/vocab", label: "Kho từ" },
  { to: "/notes", label: "MindNotes" },
];

export const Footer: React.FC = React.memo(() => {
  const theme = useProfileStore((s) => s.profile.theme);
  const toggleTheme = useToggleTheme();
  const isUploading = useExamImporterStore((s) => s.busyStage !== "idle");
  const showToast = useToastStore((s) => s.showToast);
  const [copiedKey, setCopiedKey] = useState<"email" | "phone" | null>(null);

  const isDiary = theme === "diary";
  const currentYear = new Date().getFullYear();

  const handleCopy = async (
    key: "email" | "phone",
    value: string,
    label: string,
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      showToast(`Đã sao chép ${label}!`, "pink");
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      showToast(`Không thể tự sao chép ${label}`, "yellow");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full max-w-6xl mx-auto px-3 sm:px-6 pt-6 pb-28 xl:pb-8">
      <div className="t-card overflow-hidden">
        {/* Decorative 4-accent editorial / pastel top bar */}
        {isDiary ? (
          <div
            aria-hidden="true"
            className="h-1.5 w-full"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #F7CBE0 0%, #F9EB9B 35%, #D4F0E2 68%, #E4D7FA 100%)",
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid grid-cols-4 h-1.5 w-full border-b-[1.5px] border-[#141414]"
          >
            <span className="bg-[#F4C2D7]" />
            <span className="bg-[#EFE078]" />
            <span className="bg-[#CBEAD8]" />
            <span className="bg-[#DCD2F5]" />
          </div>
        )}

        {/* Main 3-column colophon body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6">
          {/* Column 1: Brand & Editorial Colophon */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`t-badge px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                    isDiary
                      ? "bg-[#F7CBE0]/75 text-[#2A1F2D]"
                      : "bg-[#111111] text-[#F8F6F1]"
                  }`}
                >
                  COLOPHON // ISSUE #3.0
                </span>
                <span
                  className={`t-badge px-2 py-0.5 text-[11px] font-semibold ${
                    isDiary
                      ? "bg-[#E4D7FA]/75 text-[#2A1F2D]"
                      : "bg-[#F4C2D7] text-[#111111]"
                  }`}
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  汉语 · 学无止境
                </span>
              </div>

              <div>
                <h2 className="font-serif italic font-bold text-xl sm:text-2xl tracking-tight text-[var(--text-main)]">
                  HSK <span className="not-italic">(QUEST)</span>{" "}
                  <span className="font-mono text-sm not-italic opacity-75">
                    3.0
                  </span>
                </h2>
                <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)] mt-0.5">
                  Personal Mandarin Zine &amp; Study Studio
                </p>
              </div>

              <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-muted)] max-w-md">
                Không gian tự học tiếng Trung chuẩn HSK 3.0 (Sơ cấp 1–3 &amp;
                Trung cấp 4–6): tách giáo trình thông minh, Flashcard SRS, luyện
                viết nét Hán tự và phòng thi thử.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-[#EFE078]/55 border border-[var(--border-color)]/30 text-[11px] font-medium text-[var(--text-main)]">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#141414]" />
              <span style={{ fontFamily: "'Noto Serif SC', serif" }}>
                每天进步一点点
              </span>
              <span className="opacity-50">·</span>
              <span>Mỗi ngày tiến bộ một chút</span>
            </div>
          </div>

          {/* Column 2: Quick Module Navigation */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Điều hướng // Modules
            </h3>
            <nav
              aria-label="Liên kết chân trang"
              className="grid grid-cols-2 gap-x-3 gap-y-2"
            >
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-disabled={isUploading}
                  onClick={(e) => {
                    if (isUploading) e.preventDefault();
                  }}
                  onMouseEnter={() => {
                    if (!isUploading) preloadRoute(item.to);
                  }}
                  className={`group inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-[var(--text-main)] hover:text-[#111111] transition ${
                    isUploading ? "opacity-45 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4C2D7] border border-[var(--border-color)]/40 group-hover:scale-125 group-hover:bg-[#EFE078] transition-transform" />
                  <span className="group-hover:underline underline-offset-4 decoration-[#141414]/40">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Author & Contact Card */}
          <div className="lg:col-span-4">
            <div
              className={`h-full p-4 space-y-3 border-[1.5px] ${
                isDiary
                  ? "rounded-2xl bg-[#F3E5F0]/70 border-[#D8BED5]"
                  : "rounded-lg bg-[#EFECE4]/75 border-[#141414]"
              }`}
            >
              {/* Author Identity */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-serif italic font-bold text-sm border-[1.5px] ${
                    isDiary
                      ? "bg-[#F7CBE0] text-[#2A1F2D] border-[#D8BED5]"
                      : "bg-[#F4C2D7] text-[#111111] border-[#141414] shadow-[2px_2px_0px_#141414]"
                  }`}
                >
                  {AUTHOR_INFO.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-[var(--text-main)] truncate">
                      {AUTHOR_INFO.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                      {AUTHOR_INFO.handle}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {AUTHOR_INFO.role}
                  </p>
                </div>
              </div>

              {/* Contact Items */}
              <div className="space-y-2 pt-1">
                {/* Email */}
                <div
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border ${
                    isDiary
                      ? "rounded-xl bg-[#FFFDFE]/90 border-[#D8BED5]/80"
                      : "rounded-md bg-white border-[#141414]/25"
                  }`}
                >
                  <a
                    href={`mailto:${AUTHOR_INFO.email}`}
                    className="flex items-center gap-2 min-w-0 text-xs text-[var(--text-main)] hover:underline underline-offset-2"
                    title={`Gửi email tới ${AUTHOR_INFO.email}`}
                  >
                    <span className="w-6 h-6 shrink-0 rounded-md bg-[#EFE078] text-[#111111] border border-[#141414]/30 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-mono text-[11px] sm:text-xs truncate">
                      {AUTHOR_INFO.email}
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("email", AUTHOR_INFO.email, "email")
                    }
                    aria-label="Sao chép email"
                    title="Sao chép email"
                    className="shrink-0 p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                  >
                    {copiedKey === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Phone */}
                <div
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border ${
                    isDiary
                      ? "rounded-xl bg-[#FFFDFE]/90 border-[#D8BED5]/80"
                      : "rounded-md bg-white border-[#141414]/25"
                  }`}
                >
                  {AUTHOR_INFO.phoneHref ? (
                    <a
                      href={AUTHOR_INFO.phoneHref}
                      className="flex items-center gap-2 min-w-0 text-xs text-[var(--text-main)] hover:underline underline-offset-2"
                      title={`Gọi ${AUTHOR_INFO.phone}`}
                    >
                      <span className="w-6 h-6 shrink-0 rounded-md bg-[#CBEAD8] text-[#111111] border border-[#141414]/30 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-mono text-[11px] sm:text-xs truncate">
                        {AUTHOR_INFO.phone}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 text-xs text-[var(--text-main)]">
                      <span className="w-6 h-6 shrink-0 rounded-md bg-[#CBEAD8] text-[#111111] border border-[#141414]/30 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-mono text-[11px] sm:text-xs truncate">
                        {AUTHOR_INFO.phone}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("phone", AUTHOR_INFO.phone, "số điện thoại")
                    }
                    aria-label="Sao chép số điện thoại"
                    title="Sao chép số điện thoại"
                    className="shrink-0 p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                  >
                    {copiedKey === "phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Facebook */}
                <a
                  href={AUTHOR_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border transition hover:-translate-y-0.5 ${
                    isDiary
                      ? "rounded-xl bg-[#FFFDFE]/90 border-[#D8BED5]/80 hover:bg-[#E4D7FA]/35"
                      : "rounded-md bg-white border-[#141414]/25 hover:bg-[#DCD2F5]/40"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 text-xs text-[var(--text-main)]">
                    <span className="w-6 h-6 shrink-0 rounded-md bg-[#DCD2F5] text-[#111111] border border-[#141414]/30 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
                      </svg>
                    </span>
                    <span className="font-mono text-[11px] sm:text-xs truncate">
                      {AUTHOR_INFO.facebookLabel}
                    </span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Utility Strip */}
        <div
          className={`px-5 sm:px-6 py-3 border-t border-dashed flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] font-mono ${
            isDiary
              ? "border-[#D8BED5] bg-[#F3E5F0]/45 text-[#6E5D73]"
              : "border-[#141414]/25 bg-[#EFECE4]/50 text-[#57534E]"
          }`}
        >
          <p className="flex flex-wrap items-center justify-center sm:justify-start gap-1 text-center sm:text-left">
            <span>
              © {currentYear} {AUTHOR_INFO.name}
            </span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1">
              Made with
              <Heart className="w-3 h-3 fill-[#F4C2D7] text-[#E06D9D]" />
              for HSK 3.0 learners
            </span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="t-btn inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-surface)] text-[var(--text-main)] text-[11px] font-semibold"
              title="Chuyển đổi giao diện Zine / Pastel"
            >
              <Palette className="w-3 h-3" />
              <span>{isDiary ? "Pastel Diary" : "Editorial Zine"}</span>
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Cuộn lên đầu trang"
              title="Cuộn lên đầu trang"
              className="t-btn inline-flex items-center gap-1 px-2.5 py-1 bg-[#EFE078] text-[#111111] text-[11px] font-bold hover:bg-[#F4C2D7]"
            >
              <ArrowUp className="w-3 h-3" />
              <span>Lên đầu</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
