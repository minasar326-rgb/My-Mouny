import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  Lock,
  KeyRound,
  Plus,
  ShieldCheck,
  Download,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  FolderArchive,
  ArrowRight,
  ShieldAlert,
  Globe,
  Trash2,
} from "lucide-react";
import { useLedger } from "@/lib/ledger/store";
import { checkLockout } from "@/lib/storage/idb";
import { useModalBackHandler, useRootBackHandler } from "@/lib/use-back-handler";
import { LANGUAGES, t, type Language } from "@/lib/i18n";
import { convertArabicDigits } from "@/lib/ledger/model";
import { DeveloperFooter } from "./developer-footer";

export function getVaultDisplayName(name?: string, lang: Language = "ar"): string {
  if (
    !name ||
    name === "خزينتي الرئيسية" ||
    name === "خزينتي الأساسية" ||
    name === "خزنة My Mouny" ||
    name === "خزنة my Mouny" ||
    name === "ماي موني" ||
    name === "My Mouny" ||
    name === "my Mouny" ||
    name === "My Main Vault" ||
    name === "My Mouny Vault" ||
    name === "my Mouny Vault" ||
    name === "Το Κύριο Ταμείο μου" ||
    name === "Το Ταμείο μου (My Mouny)" ||
    name === "Το Ταμείο μου (my Mouny)" ||
    name === "Μάι Μούνι (My Mouny)"
  ) {
    return t("appName", lang);
  }
  return name;
}

export function VaultAuthScreen() {
  const vaults = useLedger((s) => s.vaults);
  const unlock = useLedger((s) => s.unlock);
  const createVault = useLedger((s) => s.createVault);
  const importBackup = useLedger((s) => s.importBackup);
  const lang = useLedger((s) => s.lang);
  const setLang = useLedger((s) => s.setLang);

  const { showExitToast } = useRootBackHandler();

  const [mode, setMode] = useState<"unlock" | "create" | "import">(
    vaults.some((v) => v.hasPin) ? "unlock" : "create"
  );

  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    vaults[0]?.id || ""
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (vaults.length > 0 && !vaults.some((v) => v.id === selectedVaultId)) {
      setSelectedVaultId(vaults[0]?.id || "");
    }
  }, [vaults, selectedVaultId]);

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) || vaults[0];

  // Form states
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [vaultName, setVaultName] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lockout countdown state
  const [lockoutSec, setLockoutSec] = useState(0);

  // Check lockout on mount and timer
  useEffect(() => {
    if (!selectedVaultId) return;
    const updateLockout = () => {
      const status = checkLockout(selectedVaultId);
      setLockoutSec(status.remainingSeconds);
    };
    updateLockout();
    const interval = setInterval(updateLockout, 1000);
    return () => clearInterval(interval);
  }, [selectedVaultId]);

  // Back button handling: when in create or import mode, return to unlock screen
  useModalBackHandler(true, () => {
    if (mode === "create" || mode === "import") {
      setMode("unlock");
      setError(null);
    }
  });

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPin, setImportPin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !selectedVaultId) return;
    setError(null);
    setLoading(true);
    const res = await unlock(selectedVaultId, selectedVault?.hasPin ? pin : undefined);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      const status = checkLockout(selectedVaultId);
      setLockoutSec(status.remainingSeconds);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const name = vaultName.trim() || t("defaultVaultName", lang);

    // If user left PIN empty, allow open vault without password!
    if (!pin) {
      setLoading(true);
      const res = await createVault(name, undefined);
      setLoading(false);
      if (!res.ok) setError(res.error);
      return;
    }

    if (pin.length < 4) {
      setError(t("pinMinLengthError", lang));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("pinsDoNotMatchError", lang));
      return;
    }

    setLoading(true);
    const res = await createVault(name, pin);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!importFile) {
      setError(t("chooseBackupFileError", lang));
      return;
    }

    setLoading(true);
    try {
      const text = await importFile.text();
      const res = await importBackup(text, importPin || undefined);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
      }
    } catch {
      setLoading(false);
      setError(t("failedToReadBackupError", lang));
    }
  };

  return (
    <main className="mx-auto flex min-h-[90vh] w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
      {/* Top Navigation Back Button in Create/Import Mode & Language selector */}
      <div className="mb-4 flex items-center justify-between gap-2">
        {mode !== "unlock" ? (
          <button
            type="button"
            onClick={() => {
              setMode("unlock");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:border-ink hover:bg-surface-alt"
            title={t("returnToVaultList", lang)}
          >
            <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            {t("returnToVaultList", lang)}
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-line/60 bg-surface/50 px-3 py-1 text-xs font-semibold text-muted">
            <Lock className="size-3 text-accent" />
            <span>{t("vaultEncrypted", lang)}</span>
          </div>
        )}

        {/* Language selector in VaultAuth */}
        <div className="flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs">
          <Globe className="size-3.5 text-accent mx-1" />
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold transition ${
                lang === l.id
                  ? "bg-accent text-accent-fg shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.code}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bento-card rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-48 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/5 blur-3xl pointer-events-none" />
        <header className="text-center relative">
          <div className="mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/25 to-yellow-400/20 text-amber-400 border border-amber-500/40 shadow-md">
            <Lock className="size-7" />
          </div>
          <div className="inline-block mb-1">
            <span className="pill-badge bg-surface-alt/70 text-amber-300 border border-white/10 text-xs">
              {t("appName", lang)}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {mode === "unlock" && t("unlockVaultTitle", lang)}
            {mode === "create" && t("createVaultTitle", lang)}
            {mode === "import" && t("importBackupTitle", lang)}
          </h1>
          <p className="mt-2 text-xs text-muted/80 sm:text-sm">
            {t("appSubtitle", lang)}
          </p>
        </header>

        {lockoutSec > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-300">
            <ShieldAlert className="size-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-bold">{t("bruteForceProtectionActive", lang)}</p>
              <p className="text-xs mt-0.5">
                {t("waitPrefix", lang)}{" "}
                <span className="font-extrabold text-base tabular-nums">{lockoutSec}</span>{" "}
                {t("waitSuffix", lang)}
              </p>
            </div>
          </div>
        )}

        {error && lockoutSec === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-300">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* UNLOCK MODE */}
        {mode === "unlock" && (
          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            {vaults.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  {t("selectVaultLabel", lang)}
                </label>
                <select
                  value={selectedVaultId}
                  onChange={(e) => setSelectedVaultId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-surface/80 px-4 py-2.5 text-sm text-ink outline-none focus:border-amber-400"
                >
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getVaultDisplayName(v.name, lang)} {v.hasPin ? "🔒" : "🔓"}
                    </option>
                  ))}
                </select>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-xs text-muted">
                    {vaults.length} {lang === "ar" ? "خزائن محفوظة" : lang === "el" ? "ταμεία" : "vaults saved"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{t("deleteVaultBtn", lang)}</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                {t("vaultPinLabel", lang)} {vaults.length === 1 && `(${getVaultDisplayName(vaults[0]?.name, lang)})`}
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(convertArabicDigits(e.target.value))}
                  placeholder={t("enterPinPlaceholder", lang)}
                  autoFocus
                  disabled={lockoutSec > 0}
                  className="w-full rounded-2xl border border-white/10 bg-surface/80 px-4 py-3 pl-11 text-base text-ink outline-none transition focus:border-amber-400 disabled:opacity-50 rtl:pl-11 rtl:pr-4 ltr:pr-11 ltr:pl-4"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink rtl:left-3.5 rtl:right-auto ltr:right-3.5 ltr:left-auto"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !pin || lockoutSec > 0}
              className="btn-3d inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 text-base font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <KeyRound className="size-4" />
              <span>{loading ? t("verifyingPin", lang) : t("openVaultBtn", lang)}</span>
            </button>

            <div className="pt-2 flex flex-col gap-2 text-center text-xs text-muted sm:text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setError(null);
                  setPin("");
                }}
                className="hover:text-ink underline"
              >
                + {t("createNewVaultBtn", lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("import");
                  setError(null);
                  setPin("");
                }}
                className="hover:text-ink underline"
              >
                {t("importVaultFromBackupBtn", lang)}
              </button>
            </div>
          </form>
        )}

        {/* CREATE MODE */}
        {mode === "create" && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t("vaultNameLabel", lang)}</label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder={t("vaultNamePlaceholder", lang)}
                autoFocus
                className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-base text-ink outline-none transition focus:border-ink"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-sm font-medium text-ink">{t("vaultPinOptionalLabel", lang)}</label>
                <span className="text-xs text-muted">{t("optionalBadge", lang)}</span>
              </div>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(convertArabicDigits(e.target.value))}
                  placeholder={t("pinOptionalPlaceholder", lang)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 pl-11 text-base text-ink outline-none transition focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {pin.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">{t("confirmPinLabel", lang)}</label>
                <input
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(convertArabicDigits(e.target.value))}
                  placeholder={t("reenterPinPlaceholder", lang)}
                  required
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-base text-ink outline-none transition focus:border-ink"
                />
              </div>
            )}

            <div className="rounded-xl bg-surface-alt/40 p-3 text-xs text-muted space-y-1">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-accent" />
                {t("highSecurityAssuranceTitle", lang)}
              </p>
              <p>
                {t("highSecurityAssuranceDesc", lang)}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (pin.length > 0 && pin.length < 4)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {loading ? t("creatingVaultBtn", lang) : pin ? t("createAndProtectVaultBtn", lang) : t("enterVaultNowBtn", lang)}
            </button>

            {vaults.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMode("unlock");
                  setError(null);
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-alt"
              >
                {t("returnToVaultList", lang)}
              </button>
            )}
          </form>
        )}

        {/* IMPORT MODE */}
        {mode === "import" && (
          <form onSubmit={handleImport} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">{t("chooseBackupFileLabel", lang)}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-surface-alt file:px-3 file:py-1 file:text-xs file:font-semibold hover:border-ink cursor-pointer"
              />
              {importFile && (
                <p className="mt-1 text-xs text-accent">{t("selectedFilePrefix", lang)} {importFile.name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                {t("newPinForImportOptional", lang)}
              </label>
              <input
                type="password"
                value={importPin}
                onChange={(e) => setImportPin(e.target.value)}
                placeholder={t("newPinImportPlaceholder", lang)}
                className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-base text-ink outline-none transition focus:border-ink"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !importFile}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              <Upload className="size-4" />
              {loading ? t("importingBtn", lang) : t("restoreVaultAndActivateBtn", lang)}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("unlock");
                setError(null);
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-alt"
            >
              {t("cancelAndReturnHome", lang)}
            </button>
          </form>
        )}
      </div>

      <div className="w-full max-w-md mt-2">
        <DeveloperFooter />
      </div>

      {showDeleteModal && selectedVault && (
        <DeleteVaultModal
          vaultId={selectedVault.id}
          vaultName={getVaultDisplayName(selectedVault.name, lang)}
          hasPin={Boolean(selectedVault.hasPin)}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            const remaining = vaults.filter((v) => v.id !== selectedVault.id);
            if (remaining[0]) {
              setSelectedVaultId(remaining[0].id);
            }
          }}
        />
      )}

      {showExitToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-surface shadow-lg">
          {t("pressBackAgainToExit", lang)}
        </div>
      )}
    </main>
  );
}

/**
 * Modal to set, update, or remove PIN protection from inside the main ledger screen.
 */
export function SetPinModal({ onClose }: { onClose: () => void }) {
  const currentVault = useLedger((s) => s.currentVault);
  const setPinForCurrentVault = useLedger((s) => s.setPinForCurrentVault);
  const removePinForCurrentVault = useLedger((s) => s.removePinForCurrentVault);
  const lang = useLedger((s) => s.lang);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (newPin.length < 4) {
      setError(t("pinMinLengthError", lang));
      return;
    }
    if (newPin !== confirmPin) {
      setError(t("pinsDoNotMatchError", lang));
      return;
    }

    setLoading(true);
    const res = await setPinForCurrentVault(newPin);
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } else {
      setError(res.error);
    }
  };

  const handleRemove = async () => {
    if (loading) return;
    if (currentVault?.hasPin && !currentPin) {
      setError(t("enterCurrentPinToUnlockError", lang));
      return;
    }
    setLoading(true);
    const res = await removePinForCurrentVault(currentPin);
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" className="bento-card w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="pill-badge bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/35">
            <Lock className="size-4 text-amber-400" />
            <span className="text-sm">{currentVault?.hasPin ? t("editVaultSecurityTitle", lang) : t("setVaultSecurityTitle", lang)}</span>
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-surface-alt/40 px-2.5 py-1 text-xs font-bold text-muted hover:text-ink hover:bg-surface-alt transition-all"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            <span>{t("returnToHomeBtn", lang)}</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-debt/30 bg-debt/5 p-3 text-xs text-debt">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
            <ShieldCheck className="size-4 shrink-0" />
            <span>{t("securitySettingsSaved", lang)}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">
              {t("newPinLabel", lang)}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={newPin}
                onChange={(e) => setNewPin(convertArabicDigits(e.target.value))}
                placeholder={t("newPinPlaceholder", lang)}
                autoFocus
                required
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-10 text-sm text-ink outline-none focus:border-ink rtl:pl-10 rtl:pr-3 ltr:pr-10 ltr:pl-3"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto"
              >
                {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">{t("confirmPinLabel", lang)}</label>
            <input
              type={showPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) => setConfirmPin(convertArabicDigits(e.target.value))}
              placeholder={t("reenterPinPlaceholder", lang)}
              required
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {t("pinExplanation", lang)}
          </p>

          <button
            type="submit"
            disabled={loading || newPin.length < 4}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            <ShieldCheck className="size-4" />
            {loading ? t("encryptingAndSaving", lang) : t("saveAndActivatePin", lang)}
          </button>

          {currentVault?.hasPin && (
            <div className="pt-2 border-t border-line">
              <label className="mb-1 block text-xs font-medium text-muted">{t("removePinLabel", lang)}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={t("enterCurrentPinPlaceholder", lang)}
                  className="flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-ink"
                />
                <button
                  type="button"
                  onClick={handleRemove}
                  className="rounded-xl border border-debt/30 bg-debt/5 px-3 py-1.5 text-xs font-medium text-debt hover:bg-debt/10"
                >
                  {t("removePinBtn", lang)}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-alt"
          >
            {t("cancelAndReturnHome", lang)}
          </button>
        </form>
      </div>
    </div>
  );
}

export function BackupModal({ onClose }: { onClose: () => void }) {
  const currentVault = useLedger((s) => s.currentVault);
  const exportBackup = useLedger((s) => s.exportBackup);
  const importBackup = useLedger((s) => s.importBackup);
  const lang = useLedger((s) => s.lang);

  const [tab, setTab] = useState<"export" | "import">("export");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [importPin, setImportPin] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const fileName = `My_Mouny_${currentVault?.name || "backup"}_${new Date().toISOString().slice(0, 10)}.json`;
      setDownloadUrl(url);
      setDownloadFileName(fileName);
      setStatusMsg(t("backupReadySuccess", lang));
    } catch {
      setStatusMsg(t("backupReadyFailed", lang));
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setLoading(true);
    try {
      const text = await importFile.text();
      const res = await importBackup(text, importPin || undefined);
      setLoading(false);
      if (res.ok) {
        setStatusMsg(t("backupImportSuccess", lang));
        setTimeout(() => onClose(), 1500);
      } else {
        setStatusMsg(`${t("backupImportError", lang)} ${res.error}`);
      }
    } catch {
      setLoading(false);
      setStatusMsg(t("fileReadError", lang));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" className="bento-card w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="pill-badge bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/35">
            <FolderArchive className="size-4 text-amber-400" />
            <span className="text-sm">{t("backupAndRestoreTitle", lang)}</span>
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-surface-alt/40 px-2.5 py-1 text-xs font-bold text-muted hover:text-ink hover:bg-surface-alt transition-all"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            <span>{t("returnToHomeBtn", lang)}</span>
          </button>
        </div>

        <div className="mt-4 flex rounded-2xl bg-surface-alt/50 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              tab === "export" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t("exportBackupTab", lang)}
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              tab === "import" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t("importBackupTab", lang)}
          </button>
        </div>

        {statusMsg && (
          <p className="mt-4 rounded-xl bg-accent/10 p-3 text-xs text-accent-fg font-medium">
            {statusMsg}
          </p>
        )}

        {tab === "export" && (() => {
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
            ? t("appName", lang)
            : currentVault.name;
          return (
            <div className="mt-5 space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                {t("exportBackupDescPrefix", lang)}
                <span className="font-bold text-ink">{displayedVaultName}</span>
                {t("exportBackupDescSuffix", lang)}
              </p>

              {!downloadUrl ? (
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:opacity-90"
                >
                  {t("prepareBackupBtn", lang)}
                </button>
              ) : (
                <a
                  href={downloadUrl}
                  download={downloadFileName}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-surface hover:opacity-90"
                >
                  <Download className="size-4" />
                  {t("downloadBackupFileBtn", lang)} ({downloadFileName})
                </a>
              )}
            </div>
          );
        })()}

        {tab === "import" && (
          <form onSubmit={handleImport} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink">{t("backupJsonFileLabel", lang)}</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink">
                {t("pinForImportedVaultOptional", lang)}
              </label>
              <input
                type="password"
                value={importPin}
                onChange={(e) => setImportPin(e.target.value)}
                placeholder={t("newPinImportPlaceholder", lang)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !importFile}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
            >
              <Upload className="size-4" />
              {loading ? t("importingBtn", lang) : t("confirmImportBtn", lang)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Modal to securely delete a vault after strictly verifying its password/PIN.
 */
export function DeleteVaultModal({
  vaultId,
  vaultName,
  hasPin,
  onClose,
  onDeleted,
}: {
  vaultId: string;
  vaultName: string;
  hasPin: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const deleteVaultWithVerification = useLedger((s) => s.deleteVaultWithVerification);
  const lang = useLedger((s) => s.lang);

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (hasPin && !pin) {
      setError(t("deleteVaultPrompt", lang));
      return;
    }

    setLoading(true);
    const res = await deleteVaultWithVerification(vaultId, hasPin ? pin : undefined);
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => {
        onDeleted?.();
        onClose();
      }, 900);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        className="bento-card w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-rose-500/30"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="pill-badge bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Trash2 className="size-4 text-rose-400" />
            <span className="text-sm font-bold">{t("deleteVaultTitle", lang)}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-surface-alt/40 px-2.5 py-1 text-xs font-bold text-muted hover:text-ink hover:bg-surface-alt transition-all"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            <span>{t("btnCancel", lang)}</span>
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-300">
                {t("deleteVaultBtn", lang)}: <span className="underline font-black">{vaultName}</span>
              </p>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                {t("deleteVaultWarning", lang)}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/20 p-3.5 text-xs font-bold text-rose-300">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-300">
            <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
            <span>{t("deleteVaultSuccess", lang)}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="mt-4 space-y-4">
          {hasPin && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink">
                {t("deleteVaultPrompt", lang)}
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(convertArabicDigits(e.target.value))}
                  placeholder={t("enterPinPlaceholder", lang)}
                  autoFocus
                  required
                  className="w-full rounded-2xl border border-white/10 bg-surface/80 px-4 py-3 pl-11 text-base text-ink outline-none transition focus:border-rose-500 rtl:pl-11 rtl:pr-4 ltr:pr-11 ltr:pl-4"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink rtl:left-3.5 rtl:right-auto ltr:right-3.5 ltr:left-auto"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-2xl border border-white/10 bg-surface px-4 py-3 text-xs font-bold text-muted hover:text-ink hover:bg-surface-alt transition-all"
            >
              {t("btnCancel", lang)}
            </button>
            <button
              type="submit"
              disabled={loading || (hasPin && !pin)}
              className="btn-3d flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-rose-600/30 hover:opacity-95 transition-all disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              <span>{loading ? "..." : t("confirmDeleteVault", lang)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
