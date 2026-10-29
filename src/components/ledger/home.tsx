import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Landmark,
  Plus,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
  Lock,
  LogOut,
  Smartphone,
  Tablet,
  Laptop,
  Download,
  Wifi,
  WifiOff,
  ShieldCheck,
  FolderArchive,
  KeyRound,
  BookOpen,
  Users,
  Coins,
  Pencil,
  Search,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  Globe,
} from "lucide-react";
import {
  centsToInput,
  convertArabicDigits,
  dayLabel,
  derive,
  describe,
  formatEuro,
  formatMoney,
  monthFlow,
  monthName,
  parseEuro,
  pocketLabel,
  timeLabel,
  CURRENCIES,
  getCurrencySymbol,
  getCurrencyLabel,
  categoryBreakdown,
  getCategoryLabel,
  PREDEFINED_CATEGORIES,
  type Pocket,
  type Tx,
  type Currency,
} from "@/lib/ledger/model";
import { openingAdjust, useLedger, type Draft } from "@/lib/ledger/store";
import { VaultAuthScreen, BackupModal, SetPinModal } from "./vault-auth";
import { DeveloperFooter } from "./developer-footer";
import { useModalBackHandler, useRootBackHandler } from "@/lib/use-back-handler";
import {
  LANGUAGES,
  t,
  describeLocalized,
  formatDayLocalized,
  formatMonthLocalized,
  formatPocketName,
  formatTimeLocalized,
  type Language,
} from "@/lib/i18n";

type Sheet =
  | { kind: "purchase" }
  | { kind: "income" }
  | { kind: "transfer" }
  | { kind: "receivable" }
  | { kind: "payable" }
  | { kind: "collect"; name: string; max: number }
  | { kind: "repay"; name: string; max: number }
  | { kind: "waive-in"; name: string; max: number }
  | { kind: "waive-out"; name: string; max: number }
  | { kind: "adjust"; pocket: Pocket }
  | { kind: "edit"; tx: Tx }
  | { kind: "reset" };

type Tab = "overview" | "ledger" | "debts";

function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Check display-mode media queries (PWA standalone, fullscreen, minimal-ui)
  const isStandaloneMedia =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches;

  // 2. Check iOS Safari standalone property
  const isIosStandalone = (window.navigator as any).standalone === true;

  // 3. Check Google Play TWA (Trusted Web Activity) referrer (android-app://<package_name>)
  const isTwa = typeof document !== "undefined" && document.referrer.startsWith("android-app://");

  // 4. Check query params indicating standalone/PWA launch
  const urlParams = new URLSearchParams(window.location.search);
  const isParamPwa =
    urlParams.get("source") === "pwa" ||
    urlParams.get("source") === "twa" ||
    urlParams.get("mode") === "standalone";

  // 5. Check localStorage installation flag
  let isLocalInstalled = false;
  try {
    isLocalInstalled = localStorage.getItem("khazinti_pwa_installed") === "true";
  } catch {}

  return Boolean(isStandaloneMedia || isIosStandalone || isTwa || isParamPwa || isLocalInstalled);
}

function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    setIsStandalone(isRunningStandalone());

    const handleBeforeInstall = (e: Event) => {
      if (isRunningStandalone()) return;
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowInstallGuide(false);
      try {
        localStorage.setItem("mymouny_pwa_installed", "true");
      } catch {}
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowInstallGuide(false);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsStandalone(true);
          setDeferredPrompt(null);
          setShowInstallGuide(false);
          try {
            localStorage.setItem("mymouny_pwa_installed", "true");
          } catch {}
          return;
        }
      } catch {
        setShowInstallGuide(true);
        return;
      }
    }
    setShowInstallGuide(true);
  };

  return {
    isInstallable: !isStandalone,
    installApp,
    isOnline,
    showInstallGuide,
    setShowInstallGuide,
  };
}

function InstallGuideModal({ onClose }: { onClose: () => void }) {
  const lang = useLedger((s) => s.lang);
  const [deviceTab, setDeviceTab] = useState<"android" | "ios" | "desktop">(() => {
    if (typeof navigator === "undefined") return "android";
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/windows|macintosh|linux/.test(ua) && !/android/.test(ua)) return "desktop";
    return "android";
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6 text-ink animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Download className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink leading-tight">
                {lang === "ar"
                  ? "تثبيت my Mouny كـ تطبيق"
                  : lang === "el"
                  ? "Εγκατάσταση my Mouny"
                  : "Install my Mouny as an App"}
              </h2>
              <p className="text-xs text-muted">
                {lang === "ar"
                  ? "يعمل كـ تطبيق أصلي مستقل وبدون إنترنت"
                  : lang === "el"
                  ? "Λειτουργεί αυτόνομα και εκτός σύνδεσης"
                  : "Runs standalone and 100% offline"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-ink transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Device selector tabs */}
        <div className="mt-4 flex rounded-xl bg-surface-alt/70 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDeviceTab("android")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition cursor-pointer ${
              deviceTab === "android"
                ? "bg-surface text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>{lang === "ar" ? "أندرويد / تابلت" : "Android"}</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceTab("ios")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition cursor-pointer ${
              deviceTab === "ios"
                ? "bg-surface text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Tablet className="size-3.5" />
            <span>{lang === "ar" ? "آيفون / آيباد" : "iPhone / iPad"}</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceTab("desktop")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition cursor-pointer ${
              deviceTab === "desktop"
                ? "bg-surface text-ink shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Laptop className="size-3.5" />
            <span>{lang === "ar" ? "كمبيوتر / لابتوب" : "Laptop / PC"}</span>
          </button>
        </div>

        {/* Tab contents */}
        <div className="mt-4 rounded-xl border border-line bg-surface-alt/30 p-4 text-xs leading-relaxed">
          {deviceTab === "android" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  1
                </span>
                <p>
                  {lang === "ar"
                    ? "افتح المتصفح (Chrome أو Edge أو Samsung Internet) على صفحة التطبيق."
                    : "Open your browser on the app page."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  2
                </span>
                <p>
                  {lang === "ar"
                    ? "اضغط على زر القائمة (الثلاث نقاط ⋮) في أعلى أو أسفل المتصفح."
                    : "Tap the browser menu (three dots ⋮) at the top or bottom."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  3
                </span>
                <p className="font-semibold text-accent">
                  {lang === "ar"
                    ? "اختر «تثبيت التطبيق» (Install app) أو «إضافة إلى الشاشة الرئيسية» (Add to Home screen)."
                    : "Select 'Install app' or 'Add to Home screen'."}
                </p>
              </div>
            </div>
          )}

          {deviceTab === "ios" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  1
                </span>
                <p>
                  {lang === "ar"
                    ? "تأكد من فتح الرابط داخل متصفح Safari على الآيفون أو الآيباد."
                    : "Make sure you open the link inside Safari on iPhone or iPad."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  2
                </span>
                <p>
                  {lang === "ar"
                    ? "اضغط على زر «مشاركة» (Share) أسفل الشاشة (أيقونة المربع الذي يخرج منه سهم للأعلى)."
                    : "Tap the 'Share' icon at the bottom of the screen (square with arrow up)."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  3
                </span>
                <p className="font-semibold text-accent">
                  {lang === "ar"
                    ? "مرر لأسفل واختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen) ثم اضغط «إضافة»."
                    : "Scroll down and tap 'Add to Home Screen', then tap 'Add'."}
                </p>
              </div>
            </div>
          )}

          {deviceTab === "desktop" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  1
                </span>
                <p>
                  {lang === "ar"
                    ? "في متصفح Chrome أو Edge، انظر إلى شريط العنوان (Address Bar) بالأعلى بجانب الرابط."
                    : "In Chrome or Edge, look at the address bar near the top right."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  2
                </span>
                <p className="font-semibold text-accent">
                  {lang === "ar"
                    ? "ستجد أيقونة تثبيت صغيرة على شكل كمبيوتر وسهم لأسفل أو زر «تثبيت my Mouny»."
                    : "Click the small install icon (computer with down arrow) or 'Install Zaker'."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  3
                </span>
                <p>
                  {lang === "ar"
                    ? "أو من قائمة المتصفح (⋮) اختر «حفظ ومشاركة» -> «تثبيت my Mouny»، وسيفتح التطبيق فوراً كبرنامج مستقل على سطح المكتب!"
                    : "Or from browser menu (⋮) choose 'Save and share' -> 'Install Zaker' to launch as a standalone desktop app!"}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-10 rounded-xl bg-accent text-xs font-bold text-accent-fg hover:opacity-95 transition cursor-pointer"
        >
          {lang === "ar" ? "فهمت، حسناً" : lang === "el" ? "Εντάξει" : "Got it, Thanks"}
        </button>
      </div>
    </div>
  );
}

export function LedgerPage() {
  const [mounted, setMounted] = useState(false);
  const isInitialized = useLedger((s) => s.isInitialized);
  const isUnlocked = useLedger((s) => s.isUnlocked);
  const initSession = useLedger((s) => s.initSession);

  useEffect(() => {
    setMounted(true);
    initSession();
  }, [initSession]);

  // صمام أمان زمني لضمان عدم تعليق الشاشة في حالة الـ Skeleton أبداً
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !isInitialized) return <Skeleton />;
  if (!isUnlocked) return <VaultAuthScreen />;
  return <Ledger />;
}

export function Skeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-line/60"></div>
          <div>
            <div className="h-4 w-28 bg-line/80 rounded mb-1.5"></div>
            <div className="h-3 w-48 bg-line/50 rounded"></div>
          </div>
        </div>
        <div className="h-8 w-24 bg-line/60 rounded-xl"></div>
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6 h-12 rounded-2xl border border-line bg-surface p-1.5 flex gap-2">
        <div className="h-full flex-1 bg-accent/20 rounded-xl"></div>
        <div className="h-full flex-1 bg-line/30 rounded-xl"></div>
        <div className="h-full flex-1 bg-line/30 rounded-xl"></div>
      </div>

      {/* Net Worth Card skeleton */}
      <div className="rounded-2xl border border-line bg-surface p-5 mb-4">
        <div className="h-3 w-32 bg-line/60 rounded mb-2"></div>
        <div className="h-10 w-44 bg-line/80 rounded mb-2"></div>
        <div className="h-3 w-40 bg-line/50 rounded"></div>
      </div>

      {/* Wallets grid skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-28 rounded-2xl border border-line bg-surface p-4"></div>
        <div className="h-28 rounded-2xl border border-line bg-surface p-4"></div>
      </div>
    </main>
  );
}

function Ledger() {
  const currentVault = useLedger((state) => state.currentVault);
  const lock = useLedger((state) => state.lock);
  const txs = useLedger((state) => state.txs);
  const started = useLedger((state) => state.started);
  const remove = useLedger((state) => state.remove);
  const clearLedgerKeepBalances = useLedger((state) => state.clearLedgerKeepBalances);
  const reset = useLedger((state) => state.reset);
  const currency = useLedger((state) => state.currency);
  const setCurrency = useLedger((state) => state.setCurrency);
  const lang = useLedger((state) => state.lang);
  const setLang = useLedger((state) => state.setLang);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);

  // Search, filter, and sort state for Tab 2 (Ledger)
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "purchase" | "income" | "transfer" | "debt">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ledgerSort, setLedgerSort] = useState<"newest" | "oldest" | "largest">("newest");

  // Inactivity auto-lock (3 minutes) and Military-Grade Privacy Shield
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentVault?.hasPin) return;

    const onUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (isPrivacyBlurred) {
        setIsPrivacyBlurred(false);
      }
    };

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    for (const evt of activityEvents) {
      window.addEventListener(evt, onUserActivity, { passive: true });
    }

    // 3 minutes inactivity check
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= 3 * 60 * 1000) {
        lock();
      }
    }, 10_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPrivacyBlurred(true);
        hiddenAtRef.current = Date.now();
      } else {
        if (hiddenAtRef.current && Date.now() - hiddenAtRef.current >= 60 * 1000) {
          lock();
        } else {
          setIsPrivacyBlurred(false);
        }
        hiddenAtRef.current = null;
      }
    };

    const onWindowBlur = () => {
      setIsPrivacyBlurred(true);
    };

    const onWindowFocus = () => {
      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current >= 60 * 1000) {
        lock();
      } else {
        setIsPrivacyBlurred(false);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, onUserActivity);
      }
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [currentVault?.hasPin, lock, isPrivacyBlurred]);

  const { showExitToast } = useRootBackHandler();

  // Android / browser back button: 1 single step back closes active sheet
  useModalBackHandler(sheet !== null, () => setSheet(null));

  // Android / browser back button: 1 single step back cancels pending delete
  useModalBackHandler(pendingDelete !== null, () => setPendingDelete(null));

  // Android / browser back button: 1 single step back closes backup modal
  useModalBackHandler(showBackupModal, () => setShowBackupModal(false));

  // Android / browser back button: 1 single step back closes set PIN modal (returns to main screen!)
  useModalBackHandler(showSetPinModal, () => setShowSetPinModal(false));

  const { isInstallable, installApp, isOnline, showInstallGuide, setShowInstallGuide } = usePwa();

  // Android / browser back button: 1 single step back closes install guide modal
  useModalBackHandler(showInstallGuide, () => setShowInstallGuide(false));

  const ledger = derive(txs);
  const flow = monthFlow(txs);
  const categoryStats = categoryBreakdown(txs);
  const history = [...txs].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));

  // Filtered & Sorted Ledger history
  const filteredHistory = history
    .filter((tx) => {
      if (ledgerFilter === "purchase" && tx.kind !== "purchase") return false;
      if (ledgerFilter === "income" && tx.kind !== "income") return false;
      if (ledgerFilter === "transfer" && tx.kind !== "transfer") return false;
      if (
        ledgerFilter === "debt" &&
        !["receivable", "payable", "collect", "repay", "waive-in", "waive-out"].includes(tx.kind)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && (tx.category || "other") !== categoryFilter) {
        return false;
      }

      if (ledgerSearch.trim()) {
        const q = ledgerSearch.trim().toLowerCase();
        const view = describeLocalized(tx, lang);
        const matchTitle = (view.title || "").toLowerCase().includes(q);
        const matchDetail = (view.detail || "").toLowerCase().includes(q);
        const matchNote = (tx.note || "").toLowerCase().includes(q);
        const matchPerson = (tx.person || "").toLowerCase().includes(q);
        const matchCategory = tx.category ? getCategoryLabel(tx.category, lang).toLowerCase().includes(q) : false;
        const matchAmount = (tx.amount / 100).toString().includes(q);
        return matchTitle || matchDetail || matchNote || matchPerson || matchCategory || matchAmount;
      }
      return true;
    })
    .sort((a, b) => {
      if (ledgerSort === "oldest") return a.at - b.at;
      if (ledgerSort === "largest") return b.amount - a.amount;
      return b.at - a.at; // newest
    });

  const onDelete = (id: string) => {
    const result = remove(id);
    if (!result.ok) {
      setDeleteError(result.error);
      setPendingDelete(null);
      return;
    }
    setDeleteError(null);
    setPendingDelete(null);
  };

  const isDefaultVault =
    !currentVault?.name ||
    currentVault.name === "خزينتي الرئيسية" ||
    currentVault.name === "خزينتي الأساسية" ||
    currentVault.name === "خزنة My Mouny" ||
    currentVault.name === "خزنة my Mouny" ||
    currentVault.name === "ماي موني" ||
    currentVault.name === "My Mouny" ||
    currentVault.name === "my Mouny" ||
    currentVault.name === "My Main Vault" ||
    currentVault.name === "My Mouny Vault" ||
    currentVault.name === "my Mouny Vault" ||
    currentVault.name === "Το Κύριο Ταμείο μου" ||
    currentVault.name === "Το Ταμείο μου (My Mouny)" ||
    currentVault.name === "Το Ταμείο μου (my Mouny)" ||
    currentVault.name === "Μάι Μούνι (My Mouny)";
  const displayedVaultName = isDefaultVault
    ? t.appName
    : currentVault.name;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      {/* Military-Grade Privacy Shield Overlay */}
      {isPrivacyBlurred && currentVault?.hasPin && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (hiddenAtRef.current && Date.now() - hiddenAtRef.current >= 60 * 1000) {
              lock();
            } else {
              setIsPrivacyBlurred(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsPrivacyBlurred(false);
            }
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl px-6 text-center select-none cursor-pointer"
        >
          <div className="flex size-20 items-center justify-center rounded-3xl bg-accent/20 text-accent mb-6 ring-8 ring-accent/10 animate-pulse">
            <ShieldCheck className="size-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {lang === "en" ? "Privacy Shield Active" : lang === "el" ? "Ενεργή Ασπίδα Απορρήτου" : "درع الخصوصية نشط"}
          </h2>
          <p className="max-w-md text-sm text-white/70 leading-relaxed mb-6">
            {t("privacyShieldActive", lang)}
          </p>
          <button
            type="button"
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-ink hover:opacity-90 shadow-lg"
          >
            {lang === "en" ? "Click to Resume" : lang === "el" ? "Κλικ για συνέχεια" : "انقر للمتابعة"}
          </button>
        </div>
      )}

      {/* Top Header: Vault status & quick controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Lock className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">{displayedVaultName}</span>
              {currentVault?.hasPin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                  <ShieldCheck className="size-3" />
                  {t("vaultEncrypted", lang)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted">
                  {t("vaultOpen", lang)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{t("appSubtitle", lang)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl border border-line bg-surface-alt/40 p-1">
            <Globe className="size-3.5 text-accent mx-1.5 hidden sm:inline" />
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  lang === l.id
                    ? "bg-accent text-accent-fg shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
                title={l.nativeLabel}
              >
                <span>{l.flag}</span>
                <span>{l.code}</span>
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center rounded-xl border border-line bg-surface-alt/40 p-1">
            <Coins className="size-3.5 text-accent mx-1.5 hidden sm:inline" />
            {CURRENCIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrency(c.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  currency === c.id
                    ? "bg-accent text-accent-fg shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
                title={getCurrencyLabel(c.id, lang)}
              >
                {getCurrencySymbol(c.id, lang)}{" "}
                <span className="font-medium text-[11px]">({c.code})</span>
              </button>
            ))}
          </div>

          {/* Online / Offline Status */}
          {isOnline ? (
            <span
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-alt/40 px-2.5 py-1 text-xs text-muted"
              title={t("onlineTooltip", lang)}
            >
              <Wifi className="size-3.5 text-accent" />
              <span className="hidden sm:inline">{t("online", lang)}</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-fg"
              title={t("offlineTooltip", lang)}
            >
              <WifiOff className="size-3.5" />
              <span>{t("offline", lang)}</span>
            </span>
          )}

          {isInstallable && (
            <button
              type="button"
              onClick={installApp}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg shadow-xs hover:opacity-90"
            >
              <Smartphone className="size-3.5" />
              {t("installApp", lang)}
            </button>
          )}

          {/* If vault has no PIN, show button to set PIN */}
          {!currentVault?.hasPin ? (
            <button
              type="button"
              onClick={() => setShowSetPinModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 text-xs font-semibold text-accent hover:bg-accent/20"
              title={t("setPinTooltip", lang)}
            >
              <Lock className="size-3.5" />
              {t("setPin", lang)}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSetPinModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:border-ink"
                title={t("pinSettingsTooltip", lang)}
              >
                <KeyRound className="size-3.5 text-muted" />
                {t("pinSettings", lang)}
              </button>
              <button
                type="button"
                onClick={() => lock()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-debt hover:border-debt hover:bg-debt/5"
                title={t("lockVaultTooltip", lang)}
              >
                <LogOut className="size-3.5" />
                {t("lockVault", lang)}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:border-ink"
            title={t("backupTooltip", lang)}
          >
            <FolderArchive className="size-3.5 text-muted" />
            {t("backup", lang)}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav aria-label={t("navVaultSections", lang)} className="mb-6 flex rounded-2xl border border-line bg-surface p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "overview"
              ? "bg-accent text-accent-fg shadow-xs"
              : "text-muted hover:text-ink hover:bg-surface-alt/50"
          }`}
        >
          <Wallet className="size-4" />
          <span>{t("tabOverview", lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "ledger"
              ? "bg-accent text-accent-fg shadow-xs"
              : "text-muted hover:text-ink hover:bg-surface-alt/50"
          }`}
        >
          <BookOpen className="size-4" />
          <span>{t("tabLedger", lang)}</span>
          {history.length > 0 && (
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "ledger" ? "bg-white/20 text-white" : "bg-surface-alt text-muted"
              }`}
            >
              {history.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("debts")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "debts"
              ? "bg-accent text-accent-fg shadow-xs"
              : "text-muted hover:text-ink hover:bg-surface-alt/50"
          }`}
        >
          <Users className="size-4" />
          <span>{t("tabDebts", lang)}</span>
          {ledger.peopleOweMe.length + ledger.iOwe.length > 0 && (
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "debts" ? "bg-white/20 text-white" : "bg-surface-alt text-muted"
              }`}
            >
              {ledger.peopleOweMe.length + ledger.iOwe.length}
            </span>
          )}
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & BALANCES */}
      {activeTab === "overview" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section className="space-y-4">
            <header>
              <p className="text-xs font-medium text-muted">{t("balancesSummary", lang)}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {displayedVaultName}
              </h1>
            </header>

            {!started && <OpeningCard />}

            {/* Net Worth Card */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
              <p className="text-xs font-medium text-muted">
                {t("netWorth", lang)} · {getCurrencyLabel(currency, lang)}
              </p>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-5xl ${
                  ledger.net < 0 ? "text-debt" : "text-ink"
                }`}
              >
                {formatEuro(ledger.net, currency, lang)}
              </p>
              <p className="mt-2 text-xs text-muted">{t("netWorthFormula", lang)}</p>
            </div>

            {/* Wallets & Balances */}
            <div className="grid grid-cols-2 gap-3">
              <BalanceCard
                icon={<Wallet className="size-4" aria-hidden />}
                label={formatPocketName("cash", lang)}
                cents={ledger.cash}
                onCorrect={() => setSheet({ kind: "adjust", pocket: "cash" })}
              />
              <BalanceCard
                icon={<Landmark className="size-4" aria-hidden />}
                label={formatPocketName("bank", lang)}
                cents={ledger.bank}
                onCorrect={() => setSheet({ kind: "adjust", pocket: "bank" })}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("debts")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab("debts");
                  }
                }}
                className="cursor-pointer rounded-2xl border border-line bg-surface p-4 transition hover:border-accent shadow-xs"
              >
                <div className="text-xs font-medium text-muted flex items-center justify-between">
                  <span>{t("owedToMe", lang)}</span>
                  <span className="text-accent text-[11px] font-bold">{t("viewArrow", lang)}</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-accent">
                  {formatEuro(ledger.receivable, currency, lang)}
                </p>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab("debts")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab("debts");
                  }
                }}
                className="cursor-pointer rounded-2xl border border-line bg-surface p-4 transition hover:border-debt shadow-xs"
              >
                <div className="text-xs font-medium text-muted flex items-center justify-between">
                  <span>{t("owedByMe", lang)}</span>
                  <span className="text-debt text-[11px] font-bold">{t("viewArrow", lang)}</span>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-debt">
                  {formatEuro(ledger.payable, currency, lang)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSheet({ kind: "purchase" })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg shadow-xs transition hover:opacity-90"
              >
                <ShoppingBag className="size-4" aria-hidden />
                {t("btnPurchase", lang)}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <GhostButton onClick={() => setSheet({ kind: "income" })}>
                  <Plus className="size-4" aria-hidden />
                  {t("btnIncome", lang)}
                </GhostButton>
                <GhostButton onClick={() => setSheet({ kind: "transfer" })}>
                  <ArrowLeftRight className="size-4" aria-hidden />
                  {t("btnTransfer", lang)}
                </GhostButton>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {/* Monthly Flow Card */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-ink">
                  {t("monthlyFlowTitle", lang)} ({formatMonthLocalized(undefined, lang)})
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    flow.netFlow >= 0
                      ? "bg-accent/15 text-accent"
                      : "bg-debt/15 text-debt"
                  }`}
                >
                  {flow.netFlow >= 0 ? `+ ${formatEuro(flow.netFlow, currency, lang)}` : `− ${formatEuro(Math.abs(flow.netFlow), currency, lang)}`}
                  <span className="font-medium text-[11px]">
                    ({flow.netFlow >= 0 ? t("monthlySurplus", lang) : t("monthlyDeficit", lang)})
                  </span>
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl bg-surface-alt/40 p-3">
                  <p className="text-xs text-muted">{t("monthlyPurchases", lang)}</p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-debt">
                    {formatEuro(flow.spent, currency, lang)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-alt/40 p-3">
                  <p className="text-xs text-muted">{t("monthlyIncome", lang)}</p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-accent">
                    {formatEuro(flow.earned, currency, lang)}
                  </p>
                </div>
              </div>

              {/* Category Spending Breakdown for current month */}
              {categoryStats.length > 0 && (
                <div className="mt-4 pt-4 border-t border-line/60">
                  <p className="text-xs font-bold text-ink mb-2.5">
                    {t("categoryBreakdownTitle", lang)}
                  </p>
                  <div className="space-y-2">
                    {categoryStats.slice(0, 4).map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-ink flex items-center gap-1.5">
                            <span>{getCategoryLabel(cat.category, lang)}</span>
                          </span>
                          <span className="tabular-nums font-bold text-muted">
                            {formatEuro(cat.cents, currency, lang)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-muted">{t("monthlyFlowNote", lang)}</p>
            </div>

            {/* Quick Recent Activity preview */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <BookOpen className="size-4 text-accent" />
                  {t("recentActivityTitle", lang)}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {t("viewAllCount", lang)} ({history.length}) {lang === "ar" ? "←" : "→"}
                </button>
              </div>
              {history.length === 0 ? (
                <p className="mt-4 text-xs text-muted leading-relaxed">
                  {t("emptyRecentActivity", lang)}
                </p>
              ) : (
                <ol className="mt-2 divide-y divide-line">
                  {history.slice(0, 5).map((tx) => (
                    <li key={tx.id}>
                      <HistoryRow
                        tx={tx}
                        confirming={pendingDelete === tx.id}
                        onEdit={() => setSheet({ kind: "edit", tx })}
                        onAsk={() => {
                          setDeleteError(null);
                          setPendingDelete(tx.id);
                        }}
                        onCancel={() => setPendingDelete(null)}
                        onConfirm={() => onDelete(tx.id)}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: DEDICATED LEDGER / HISTORY (WITH SEARCH, FILTER & SORT) */}
      {activeTab === "ledger" && (
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <BookOpen className="size-5 text-accent" />
                {t("tabLedger", lang)}
              </h2>
              <p className="text-xs text-muted mt-1">
                {t("ledgerFullStatement", lang)} ({history.length})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSheet({ kind: "purchase" })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg shadow-xs hover:opacity-90"
              >
                <ShoppingBag className="size-3.5" />
                {t("btnPurchase", lang)}
              </button>
              <button
                type="button"
                onClick={() => setSheet({ kind: "income" })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink hover:border-ink"
              >
                <Plus className="size-3.5 text-accent" />
                {t("btnIncome", lang)}
              </button>
            </div>
          </div>

          {deleteError && (
            <div className="rounded-xl border border-debt/30 bg-debt/5 p-3 text-xs text-debt font-medium">
              {deleteError}
            </div>
          )}

          {/* Search, Filter & Sort Controls */}
          {history.length > 0 && (
            <div className="space-y-3 rounded-2xl bg-surface-alt/40 p-3.5 border border-line">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted rtl:right-3.5 ltr:left-3.5" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder={t("ledgerSearchPlaceholder", lang)}
                  className="w-full rounded-xl border border-line bg-surface py-2.5 pr-10 pl-16 text-xs text-ink outline-none focus:border-accent rtl:pr-10 rtl:pl-16 ltr:pl-10 ltr:pr-16"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => setLedgerSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs font-semibold rtl:left-3 ltr:right-3"
                  >
                    {t("clearSearch", lang)}
                  </button>
                )}
              </div>

              {/* Filter Chips & Sort Select */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("all")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      ledgerFilter === "all"
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {t("filterAll", lang)} ({history.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("purchase")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      ledgerFilter === "purchase"
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {t("filterPurchases", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("income")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      ledgerFilter === "income"
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {t("filterIncome", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("transfer")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      ledgerFilter === "transfer"
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {t("filterTransfers", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("debt")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      ledgerFilter === "debt"
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {t("filterDebts", lang)}
                  </button>
                </div>

                {/* Category & Sort controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                    title={t("filterCategory", lang)}
                  >
                    <option value="all">{t("allCategories", lang)}</option>
                    {PREDEFINED_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {lang === "en" ? cat.en : lang === "el" ? cat.el : cat.ar}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="size-3.5 text-muted" />
                    <select
                      value={ledgerSort}
                      onChange={(e) => setLedgerSort(e.target.value as any)}
                      className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                    >
                      <option value="newest">{t("sortNewest", lang)}</option>
                      <option value="oldest">{t("sortOldest", lang)}</option>
                      <option value="largest">{t("sortLargest", lang)}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto size-12 text-muted/40" />
              <p className="mt-3 text-sm font-semibold text-ink">{t("emptyLedgerTitle", lang)}</p>
              <p className="mt-1 text-xs text-muted">
                {t("emptyLedgerDesc", lang)}
              </p>
              <button
                type="button"
                onClick={() => setSheet({ kind: "purchase" })}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-accent-fg"
              >
                <ShoppingBag className="size-3.5" />
                {t("btnStartFirstTx", lang)}
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              {t("noSearchResults", lang)}
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {filteredHistory.map((tx, index) => {
                const previous = filteredHistory[index - 1];
                const showDay =
                  ledgerSort === "newest" &&
                  (!previous || formatDayLocalized(previous.at, lang) !== formatDayLocalized(tx.at, lang));
                return (
                  <li key={tx.id}>
                    {showDay && (
                      <div className="sticky top-0 z-10 bg-surface/95 py-2 backdrop-blur-xs">
                        <span className="inline-block rounded-md bg-surface-alt px-2.5 py-1 text-xs font-bold text-muted">
                          {formatDayLocalized(tx.at, lang)}
                        </span>
                      </div>
                    )}
                    <HistoryRow
                      tx={tx}
                      confirming={pendingDelete === tx.id}
                      onEdit={() => setSheet({ kind: "edit", tx })}
                      onAsk={() => {
                        setDeleteError(null);
                        setPendingDelete(tx.id);
                      }}
                      onCancel={() => setPendingDelete(null)}
                      onConfirm={() => onDelete(tx.id)}
                    />
                  </li>
                );
              })}
            </ol>
          )}

          {started && (
            <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSheet({ kind: "reset" })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition"
              >
                <Trash2 className="size-3.5" />
                {t("clearHistoryBtn", lang)}
              </button>
              <p className="text-xs text-muted">
                {t("localDataNotice", lang)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEDICATED RECEIVABLES & PAYABLES (DEBTS) */}
      {activeTab === "debts" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
            <div className="border-b border-line pb-4">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <Users className="size-5 text-accent" />
                {t("debtsTitle", lang)}
              </h2>
              <p className="text-xs text-muted mt-1">
                {t("debtsSubtitle", lang)}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Receivables Card */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent">{t("totalReceivables", lang)}</span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                    {ledger.peopleOweMe.length} {t("peopleCount", lang)}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-accent">
                  {formatEuro(ledger.receivable, currency, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "receivable" })}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg shadow-xs hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  {t("btnAddReceivable", lang)}
                </button>
              </div>

              {/* Payables Card */}
              <div className="rounded-2xl border border-debt/30 bg-debt/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-debt">{t("totalPayables", lang)}</span>
                  <span className="rounded-full bg-debt/15 px-2 py-0.5 text-xs font-bold text-debt">
                    {ledger.iOwe.length} {t("partiesCount", lang)}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-debt">
                  {formatEuro(ledger.payable, currency, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "payable" })}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-debt/30 bg-surface px-3 text-xs font-semibold text-debt hover:bg-debt/10"
                >
                  <Plus className="size-3.5" />
                  {t("btnAddPayable", lang)}
                </button>
              </div>
            </div>
          </div>

          {/* People Owe Me List */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
            <PeopleBlock
              title={t("receivablesListTitle", lang)}
              empty={t("emptyReceivables", lang)}
              people={ledger.peopleOweMe}
              tone="asset"
              primaryLabel={t("btnCollect", lang)}
              onPrimary={(person) =>
                setSheet({ kind: "collect", name: person.name, max: person.cents })
              }
              onWaive={(person) =>
                setSheet({ kind: "waive-in", name: person.name, max: person.cents })
              }
            />
          </div>

          {/* I Owe People List */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
            <PeopleBlock
              title={t("payablesListTitle", lang)}
              empty={t("emptyPayables", lang)}
              people={ledger.iOwe}
              tone="debt"
              primaryLabel={t("btnRepay", lang)}
              onPrimary={(person) => setSheet({ kind: "repay", name: person.name, max: person.cents })}
              onWaive={(person) =>
                setSheet({ kind: "waive-out", name: person.name, max: person.cents })
              }
            />
          </div>
        </div>
      )}

      {showBackupModal && <BackupModal onClose={() => setShowBackupModal(false)} />}

      {showSetPinModal && <SetPinModal onClose={() => setShowSetPinModal(false)} />}

      {showInstallGuide && <InstallGuideModal onClose={() => setShowInstallGuide(false)} />}

      {sheet && (
        <SheetDialog title={sheetTitle(sheet, lang)} onClose={() => setSheet(null)}>
          {sheet.kind === "reset" ? (
            <ResetForm
              onCancel={() => setSheet(null)}
              onClearKeepBalances={() => {
                clearLedgerKeepBalances();
                setSheet(null);
              }}
              onFullReset={() => {
                reset();
                setSheet(null);
              }}
            />
          ) : (
            <ActionForm sheet={sheet} onClose={() => setSheet(null)} />
          )}
        </SheetDialog>
      )}

      {showExitToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-surface shadow-lg">
          {t("pressBackAgainToExit", lang)}
        </div>
      )}

      {/* Footer with Privacy Policy, Local Security assurance, and Developer Contact */}
      <footer className="mt-10 border-t border-line pt-4 flex flex-col gap-4 text-xs text-muted">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>{t("appName", lang)} &copy; 2026</span>
            <span>·</span>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent underline underline-offset-2 flex items-center gap-1 font-medium"
            >
              <FileText className="size-3.5" />
              {t("footerPrivacy", lang)}
            </a>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="size-3.5 text-accent" />
            <span>{t("footerSecurity", lang)}</span>
          </div>
        </div>

        {/* Professional Developer & WhatsApp Contact */}
        <DeveloperFooter />
      </footer>
    </main>
  );
}

function sheetTitle(sheet: Sheet, lang: Language): string {
  switch (sheet.kind) {
    case "purchase":
      return t("btnPurchase", lang);
    case "income":
      return t("btnIncome", lang);
    case "transfer":
      return t("btnTransfer", lang);
    case "receivable":
      return t("btnAddReceivable", lang);
    case "payable":
      return t("btnAddPayable", lang);
    case "collect":
      return `${t("collectedFrom", lang)} ${sheet.name}`;
    case "repay":
      return `${t("repaidTo", lang)} ${sheet.name}`;
    case "waive-in":
      return `${t("waivedReceivableFor", lang)} ${sheet.name}`;
    case "waive-out":
      return `${t("waivedPayableFor", lang)} ${sheet.name}`;
    case "adjust":
      return `${t("correctBalance", lang)} (${formatPocketName(sheet.pocket, lang)})`;
    case "edit":
      return `${t("btnEdit", lang)}: ${describeLocalized(sheet.tx, lang).title}`;
    case "reset":
      return t("safeClearTitle", lang);
  }
}

function BalanceCard({
  icon,
  label,
  cents,
  onCorrect,
}: {
  icon: ReactNode;
  label: string;
  cents: number;
  onCorrect: () => void;
}) {
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-ink">{formatEuro(cents, currency, lang)}</p>
      <button
        type="button"
        onClick={onCorrect}
        className="mt-3 text-xs font-semibold text-accent underline-offset-4 hover:underline"
      >
        {t("correctBalance", lang)}
      </button>
    </div>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs sm:text-sm font-semibold text-ink transition-colors duration-150 hover:border-ink shadow-xs"
    >
      {children}
    </button>
  );
}

function OpeningCard() {
  const setOpening = useLedger((state) => state.setOpening);
  const dismissStart = useLedger((state) => state.dismissStart);
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  const [cash, setCash] = useState("");
  const [bank, setBank] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (submitting) return;
    setSubmitting(true);
    const cashCents = parseEuro(cash || "0", true);
    const bankCents = parseEuro(bank || "0", true);
    if (cashCents === null || bankCents === null) {
      setError(t("validAmountError", lang));
      setSubmitting(false);
      return;
    }
    setOpening(cashCents, bankCents);
  };

  return (
    <form
      className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <h2 className="text-base font-bold text-ink">{t("openingPromptTitle", lang)}</h2>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        {t("openingPromptDesc", lang)}
      </p>
      <div className="mt-4 grid gap-3">
        <Field label={formatPocketName("cash", lang)} value={cash} onChange={setCash} placeholder="0.00" />
        <Field label={formatPocketName("bank", lang)} value={bank} onChange={setBank} placeholder="0.00" />
      </div>
      {error && <p className="mt-3 text-xs text-debt font-medium">{error}</p>}
      <div className="mt-4 grid gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-xl bg-accent text-sm font-semibold text-accent-fg shadow-xs transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {t("btnSetBalances", lang)}
        </button>
        <button
          type="button"
          onClick={dismissStart}
          className="h-10 text-xs text-muted hover:text-ink font-medium"
        >
          {t("btnStartFromZero", lang)}
        </button>
      </div>
    </form>
  );
}

function PeopleBlock({
  title,
  empty,
  people,
  tone,
  primaryLabel,
  onPrimary,
  onWaive,
}: {
  title: string;
  empty: string;
  people: { key: string; name: string; cents: number }[];
  tone: "asset" | "debt";
  primaryLabel: string;
  onPrimary: (person: { name: string; cents: number }) => void;
  onWaive: (person: { name: string; cents: number }) => void;
}) {
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  return (
    <div>
      <h3 className="text-base font-bold text-ink mb-3">{title}</h3>
      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((person) => (
            <li
              key={person.key}
              className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-ink text-sm sm:text-base">{person.name}</p>
                <p
                  className={`mt-0.5 text-base font-bold tabular-nums ${
                    tone === "asset" ? "text-accent" : "text-debt"
                  }`}
                >
                  {formatEuro(person.cents, currency, lang)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPrimary(person)}
                  className="h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg shadow-xs hover:opacity-90"
                >
                  {primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onWaive(person)}
                  className="h-9 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-muted hover:text-ink hover:border-ink"
                >
                  {tone === "asset" ? t("btnWaiveReceivable", lang) : t("btnWaivePayable", lang)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  tx,
  confirming,
  onEdit,
  onAsk,
  onCancel,
  onConfirm,
}: {
  tx: Tx;
  confirming: boolean;
  onEdit?: () => void;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  const view = describeLocalized(tx, lang);
  const sign = view.tone === "out" || view.tone === "debt" ? "−" : view.tone === "neutral" ? "" : "+";
  const color =
    view.tone === "out" || view.tone === "debt"
      ? "text-debt"
      : view.tone === "neutral"
        ? "text-ink"
        : "text-accent";

  return (
    <div className="flex items-start justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-semibold text-ink text-sm sm:text-base">{view.title}</p>
          {tx.category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-1.5 py-0.5 text-[11px] font-semibold text-muted">
              {getCategoryLabel(tx.category, lang)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {formatDayLocalized(tx.at, lang)} {formatTimeLocalized(tx.at, lang)} · {view.detail}
        </p>
        {confirming ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="h-8 rounded-lg bg-debt px-3 text-xs font-semibold text-accent-fg shadow-xs"
            >
              {t("btnConfirmDelete", lang)}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-8 rounded-lg border border-line px-3 text-xs text-muted"
            >
              {t("btnCancel", lang)}
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted hover:text-accent hover:bg-accent/10 transition"
                aria-label={`${t("btnEdit", lang)} ${view.title}`}
              >
                <Pencil className="size-3" aria-hidden />
                {t("btnEdit", lang)}
              </button>
            )}
            <button
              type="button"
              onClick={onAsk}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted hover:text-debt hover:bg-debt/5 transition"
              aria-label={`${t("btnDelete", lang)} ${view.title}`}
            >
              <Trash2 className="size-3" aria-hidden />
              {t("btnDelete", lang)}
            </button>
          </div>
        )}
      </div>
      <p className={`shrink-0 tabular-nums font-bold text-sm sm:text-base ${color}`}>
        {sign}
        {formatEuro(view.cents, currency, lang)}
      </p>
    </div>
  );
}

function SheetDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const lang = useLedger((state) => state.lang);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("closeLabel", lang)}
        className="sheet-backdrop absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-panel safe-pad relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:max-w-md sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <h2 id={titleId} className="text-base font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeWindowLabel", lang)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface-alt"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ActionForm({
  sheet,
  onClose,
}: {
  sheet: Exclude<Sheet, { kind: "reset" }>;
  onClose: () => void;
}) {
  const commit = useLedger((state) => state.commit);
  const updateTx = useLedger((state) => state.updateTx);
  const txs = useLedger((state) => state.txs);
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  const ledger = derive(txs);

  const isEditing = sheet.kind === "edit";
  const targetTx = isEditing ? sheet.tx : null;

  const [amount, setAmount] = useState(() => {
    if (isEditing && targetTx) return centsToInput(targetTx.amount);
    if ("max" in sheet) return centsToInput(sheet.max);
    if (sheet.kind === "adjust") return centsToInput(sheet.pocket === "cash" ? ledger.cash : ledger.bank);
    return "";
  });
  const [note, setNote] = useState(() => (isEditing && targetTx ? targetTx.note : ""));
  const [category, setCategory] = useState(() => (isEditing && targetTx ? targetTx.category || "" : ""));
  const [txDate, setTxDate] = useState(() => {
    const d = isEditing && targetTx ? new Date(targetTx.at) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [person, setPerson] = useState(() => (isEditing && targetTx ? targetTx.person || "" : ""));
  const [pocket, setPocket] = useState<Pocket>(() =>
    isEditing && targetTx?.pocket ? targetTx.pocket : "cash"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveKind = isEditing && targetTx ? targetTx.kind : sheet.kind;

  const needsPocket =
    effectiveKind === "purchase" ||
    effectiveKind === "income" ||
    effectiveKind === "collect" ||
    effectiveKind === "repay" ||
    effectiveKind === "transfer";

  const needsNote =
    effectiveKind === "purchase" ||
    effectiveKind === "income" ||
    effectiveKind === "receivable" ||
    effectiveKind === "payable" ||
    isEditing;

  const needsPerson =
    effectiveKind === "receivable" ||
    effectiveKind === "payable" ||
    (isEditing && Boolean(targetTx?.person));

  const submit = async () => {
    if (submitting) return; // Prevent double click / duplicate submissions
    setSubmitting(true);
    setError(null);

    const allowZero = effectiveKind === "adjust";
    const cents = parseEuro(amount, allowZero);
    if (cents === null) {
      setError(
        `${t("validAmountInCurrency", lang)} (${getCurrencySymbol(currency, lang)}).`
      );
      setSubmitting(false);
      return;
    }

    // Determine timestamp
    let atTimestamp: number | undefined = undefined;
    if (txDate) {
      const [y, m, d] = txDate.split("-").map(Number);
      if (y && m && d) {
        const chosen = new Date();
        chosen.setFullYear(y, m - 1, d);
        atTimestamp = chosen.getTime();
      }
    }

    // Handle Edit Mode
    if (isEditing && targetTx) {
      const updatedFields: Partial<Omit<Tx, "id">> = {
        amount: cents,
        note: note.trim(),
      };
      if (atTimestamp !== undefined) updatedFields.at = atTimestamp;
      if (category.trim()) updatedFields.category = category.trim();
      else updatedFields.category = undefined;
      if (needsPocket) updatedFields.pocket = pocket;
      if (needsPerson) updatedFields.person = person.trim();

      const result = updateTx(targetTx.id, updatedFields);
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      onClose();
      return;
    }

    // Handle Adjust Mode
    if (sheet.kind === "adjust") {
      const current = sheet.pocket === "cash" ? ledger.cash : ledger.bank;
      const draft = openingAdjust(sheet.pocket, cents, current);
      if (!draft) {
        onClose();
        return;
      }
      const result = commit(draft);
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      onClose();
      return;
    }

    if ((sheet.kind === "receivable" || sheet.kind === "payable") && person.trim().length === 0) {
      setError(t("enterPersonNameError", lang));
      setSubmitting(false);
      return;
    }
    if (sheet.kind === "purchase" && note.trim().length === 0) {
      setError(t("enterItemDescError", lang));
      setSubmitting(false);
      return;
    }

    const named = "name" in sheet ? sheet.name : person.trim();
    let draft: Draft | null = null;
    switch (sheet.kind) {
      case "purchase":
        draft = { kind: "purchase" as const, amount: cents, pocket, note: note.trim() };
        break;
      case "income":
        draft = { kind: "income" as const, amount: cents, pocket, note: note.trim() };
        break;
      case "transfer":
        draft = {
          kind: "transfer" as const,
          amount: cents,
          pocket,
          toPocket: pocket === "cash" ? ("bank" as const) : ("cash" as const),
          note: note.trim(),
        };
        break;
      case "receivable":
        draft = { kind: "receivable" as const, amount: cents, person: named, note: note.trim() };
        break;
      case "payable":
        draft = { kind: "payable" as const, amount: cents, person: named, note: note.trim() };
        break;
      case "collect":
        draft = { kind: "collect" as const, amount: cents, pocket, person: named, note: note.trim() };
        break;
      case "repay":
        draft = { kind: "repay" as const, amount: cents, pocket, person: named, note: note.trim() };
        break;
      case "waive-in":
        draft = { kind: "waive-in" as const, amount: cents, person: named, note: note.trim() };
        break;
      case "waive-out":
        draft = { kind: "waive-out" as const, amount: cents, person: named, note: note.trim() };
        break;
    }

    if (!draft) {
      setSubmitting(false);
      return;
    }

    if (atTimestamp !== undefined) draft.at = atTimestamp;
    if (category.trim()) draft.category = category.trim();

    const result = commit(draft);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    onClose();
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {effectiveKind === "purchase" && (
        <p className="text-xs text-muted">{t("modalPurchaseDesc", lang)}</p>
      )}
      {effectiveKind === "receivable" && (
        <p className="text-xs text-muted">{t("modalReceivableDesc", lang)}</p>
      )}
      {effectiveKind === "payable" && (
        <p className="text-xs text-muted">{t("modalPayableDesc", lang)}</p>
      )}
      {(sheet.kind === "collect" ||
        sheet.kind === "repay" ||
        sheet.kind === "waive-in" ||
        sheet.kind === "waive-out") && (
        <p className="text-xs text-muted">{t("remainingDebt", lang)} {formatEuro(sheet.max, currency, lang)}.</p>
      )}
      {(sheet.kind === "waive-in" || sheet.kind === "waive-out") && (
        <p className="text-xs text-muted">
          {t("waiveNotice", lang)}
        </p>
      )}

      {needsPerson && (
        <TextField
          label={t("personFieldLabel", lang)}
          value={person}
          onChange={setPerson}
          placeholder={t("personPlaceholder", lang)}
        />
      )}

      {effectiveKind === "adjust" ? (
        <Field
          label={`${t("correctBalance", lang)} (${formatPocketName(sheet.kind === "adjust" ? sheet.pocket : "cash", lang)})`}
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
        />
      ) : (
        <Field
          label={`${t("amountFieldLabel", lang)} (${getCurrencySymbol(currency, lang)})`}
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          autoFocus
        />
      )}

      {/* Transaction Date Field */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-ink">{t("dateFieldLabel", lang)}</span>
        <input
          type="date"
          value={txDate}
          onChange={(e) => setTxDate(e.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none focus:border-accent shadow-xs"
        />
      </label>

      {/* Category Selection for Purchases & Income */}
      {(effectiveKind === "purchase" || effectiveKind === "income") && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-ink">
            {t("categoryFieldLabel", lang)}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {PREDEFINED_CATEGORIES.filter(
              (c) => c.kind === effectiveKind || c.kind === "all"
            ).map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(isSelected ? "" : cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-accent text-accent-fg shadow-xs"
                      : "bg-surface-alt/60 text-ink hover:bg-surface-alt border border-line"
                  }`}
                >
                  {cat.icon} {lang === "en" ? cat.en : lang === "el" ? cat.el : cat.ar}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {needsNote && (
        <TextField
          label={
            effectiveKind === "purchase"
              ? t("whatDidYouBuy", lang)
              : effectiveKind === "income"
                ? t("incomeSource", lang)
                : t("noteOptional", lang)
          }
          value={note}
          onChange={setNote}
          placeholder={
            effectiveKind === "purchase"
              ? t("purchasePlaceholder", lang)
              : t("incomePlaceholder", lang)
          }
        />
      )}

      {needsPocket && effectiveKind !== "transfer" && (
        <PocketPicker
          label={
            effectiveKind === "income" || effectiveKind === "collect" ? t("pocketAddTo", lang) : t("pocketDeductFrom", lang)
          }
          value={pocket}
          onChange={setPocket}
          cash={ledger.cash}
          bank={ledger.bank}
        />
      )}

      {effectiveKind === "transfer" && (
        <PocketPicker
          label={t("pocketTransferFrom", lang)}
          value={pocket}
          onChange={setPocket}
          cash={ledger.cash}
          bank={ledger.bank}
          hint={pocket === "cash" ? t("transferToBankHint", lang) : t("transferToCashHint", lang)}
        />
      )}

      {error && <p className="text-xs text-debt font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-xl bg-accent text-sm font-semibold text-accent-fg shadow-xs transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? t("saving", lang) : isEditing ? t("btnSaveEdit", lang) : submitLabel(sheet.kind, lang)}
      </button>
    </form>
  );
}

function submitLabel(kind: Exclude<Sheet, { kind: "reset" }>["kind"], lang: Language): string {
  switch (kind) {
    case "purchase":
      return t("submitPurchase", lang);
    case "income":
      return t("submitIncome", lang);
    case "transfer":
      return t("submitTransfer", lang);
    case "receivable":
      return t("submitReceivable", lang);
    case "payable":
      return t("submitPayable", lang);
    case "collect":
      return t("submitCollect", lang);
    case "repay":
      return t("submitRepay", lang);
    case "waive-in":
    case "waive-out":
      return t("submitWaive", lang);
    case "adjust":
      return t("submitAdjust", lang);
    case "edit":
      return t("btnSaveEdit", lang);
  }
}

function ResetForm({
  onCancel,
  onClearKeepBalances,
  onFullReset,
}: {
  onCancel: () => void;
  onClearKeepBalances: () => void;
  onFullReset: () => void;
}) {
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  const txs = useLedger((state) => state.txs);
  const ledger = derive(txs);

  return (
    <div className="grid gap-4">
      {!showFullResetConfirm ? (
        <>
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5">
            <div className="flex items-center gap-2 text-accent font-bold text-sm">
              <ShieldCheck className="size-4" />
              <span>{t("safeClearBadge", lang)}</span>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              {t("safeClearDesc", lang)}
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-surface p-2 border border-line">
                <span className="text-muted block text-[11px]">{t("savedCash", lang)}</span>
                <span className="font-bold text-ink">{formatEuro(ledger.cash, currency, lang)}</span>
              </div>
              <div className="rounded-lg bg-surface p-2 border border-line">
                <span className="text-muted block text-[11px]">{t("savedBank", lang)}</span>
                <span className="font-bold text-ink">{formatEuro(ledger.bank, currency, lang)}</span>
              </div>
              <div className="rounded-lg bg-surface p-2 border border-line">
                <span className="text-muted block text-[11px]">{t("savedReceivables", lang)}</span>
                <span className="font-bold text-accent">{formatEuro(ledger.receivable, currency, lang)}</span>
              </div>
              <div className="rounded-lg bg-surface p-2 border border-line">
                <span className="text-muted block text-[11px]">{t("savedPayables", lang)}</span>
                <span className="font-bold text-debt">{formatEuro(ledger.payable, currency, lang)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClearKeepBalances}
            className="h-11 rounded-xl bg-accent text-sm font-semibold text-accent-fg shadow-xs hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="size-4" />
            {t("btnConfirmSafeClear", lang)}
          </button>

          <div className="border-t border-line/60 pt-2">
            <button
              type="button"
              onClick={() => setShowFullResetConfirm(true)}
              className="text-xs text-muted hover:text-debt block w-full text-center py-1 transition"
            >
              {t("factoryResetPrompt", lang)}
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="h-9 text-xs text-muted font-medium hover:text-ink"
          >
            {t("btnCancelDismiss", lang)}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-debt/30 bg-debt/5 p-3.5">
            <p className="text-xs font-semibold text-debt">
              {t("factoryResetWarning", lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={onFullReset}
            className="h-11 rounded-xl bg-debt text-sm font-semibold text-accent-fg shadow-xs hover:opacity-90"
          >
            {t("btnConfirmFactoryReset", lang)}
          </button>
          <button
            type="button"
            onClick={() => setShowFullResetConfirm(false)}
            className="h-9 text-xs text-muted font-medium hover:text-ink"
          >
            {t("btnReturnToSafe", lang)}
          </button>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 focus-within:border-accent shadow-xs">
        <input
          value={value}
          onChange={(event) => onChange(convertArabicDigits(event.target.value))}
          inputMode="decimal"
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full bg-transparent text-base tabular-nums text-ink outline-none placeholder:text-muted/60"
        />
        <span className="text-xs font-bold text-accent px-1.5 py-0.5 rounded-md bg-accent/10">
          {getCurrencySymbol(currency, lang)}
        </span>
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent shadow-xs"
      />
    </label>
  );
}

function PocketPicker({
  label,
  value,
  onChange,
  cash,
  bank,
  hint,
}: {
  label: string;
  value: Pocket;
  onChange: (pocket: Pocket) => void;
  cash: number;
  bank: number;
  hint?: string;
}) {
  const currency = useLedger((state) => state.currency);
  const lang = useLedger((state) => state.lang);
  const options: { id: Pocket; name: string; cents: number }[] = [
    { id: "cash", name: formatPocketName("cash", lang), cents: cash },
    { id: "bank", name: formatPocketName("bank", lang), cents: bank },
  ];
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-ink">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`h-16 rounded-xl border px-3 text-start transition shadow-xs ${
                selected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface text-muted hover:border-ink/40"
              }`}
            >
              <span className="block text-xs font-bold">{option.name}</span>
              <span className="mt-1 block text-sm font-semibold tabular-nums text-ink">
                {formatEuro(option.cents, currency, lang)}
              </span>
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}
