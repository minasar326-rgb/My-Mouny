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
} from "lucide-react";
import { useLedger } from "@/lib/ledger/store";
import { checkLockout } from "@/lib/storage/idb";
import { useModalBackHandler, useRootBackHandler } from "@/lib/use-back-handler";
import { LANGUAGES, t, type Language } from "@/lib/i18n";
import { convertArabicDigits } from "@/lib/ledger/model";

function getVaultDisplayName(name?: string, lang: Language = "ar"): string {
  if (
    !name ||
    name === "خزينتي الرئيسية" ||
    name === "خزينتي الأساسية" ||
    name === "خزنة My Mouny" ||
    name === "ماي موني" ||
    name === "My Mouny" ||
    name === "My Main Vault" ||
    name === "My Mouny Vault" ||
    name === "Το Κύριο Ταμείο μου" ||
    name === "Το Ταμείο μου (My Mouny)" ||
    name === "Μάι Μούνι (My Mouny)"
  ) {
    return "My Mouny";
  }
  return name;
}

export function VaultAuthScreen() {
  const vaults = useLedger((s) => s.vaults);
  const unlock = useLedger((s) => s.unlock);
  const createVault = useLedger((s) => s.createVault);
  const importBackup = useLedger((s) => s.importBackup);
  const skipOrOpenDefault = useLedger((s) => s.skipOrOpenDefault);
  const lang = useLedger((s) => s.lang);
  const setLang = useLedger((s) => s.setLang);

  const { showExitToast } = useRootBackHandler();

  const [mode, setMode] = useState<"unlock" | "create" | "import">(
    vaults.some((v) => v.hasPin) ? "unlock" : "create"
  );

  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    vaults[0]?.id || ""
  );

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

  // Back button handling: ALWAYS returns to the main ledger screen or previous mode!
  useModalBackHandler(true, () => {
    if (mode === "create" || mode === "import") {
      if (vaults.length > 0) {
        setMode("unlock");
      } else {
        skipOrOpenDefault();
      }
    } else {
      // In unlock mode, if user wants to enter without password
      skipOrOpenDefault();
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
    const res = await unlock(selectedVaultId, pin);
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
      {/* Top Navigation Back to Home Button & Language selector */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => skipOrOpenDefault()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:border-ink hover:bg-surface-alt"
          title={t("returnToDashboard", lang)}
        >
          <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
          {t("btnSkipToMain", lang)}
        </button>

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

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <header className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Lock className="size-7" />
          </div>
          <p className="text-sm font-medium text-muted">{t("appName", lang)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {mode === "unlock" && t("unlockVaultTitle", lang)}
            {mode === "create" && t("createVaultTitle", lang)}
            {mode === "import" && t("importBackupTitle", lang)}
          </h1>
          <p className="mt-2 text-xs text-muted sm:text-sm">
            {t("appSubtitle", lang)}
          </p>
        </header>

        {lockoutSec > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-debt/30 bg-debt/10 p-3 text-sm text-debt">
            <ShieldAlert className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">{t("bruteForceProtectionActive", lang)}</p>
              <p className="text-xs mt-0.5">
                {t("waitPrefix", lang)}{" "}
                <span className="font-bold text-base tabular-nums">{lockoutSec}</span>{" "}
                {t("waitSuffix", lang)}
              </p>
            </div>
          </div>
        )}

        {error && lockoutSec === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-debt/30 bg-debt/5 p-3 text-sm text-debt">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* UNLOCK MODE */}
        {mode === "unlock" && (
          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            {vaults.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t("selectVaultLabel", lang)}
                </label>
                <select
                  value={selectedVaultId}
                  onChange={(e) => setSelectedVaultId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
                >
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getVaultDisplayName(v.name, lang)} {v.hasPin ? "🔒" : "🔓"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
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
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 pl-11 text-base text-ink outline-none transition focus:border-ink disabled:opacity-50 rtl:pl-11 rtl:pr-4 ltr:pr-11 ltr:pl-4"
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

            <button
              type="submit"
              disabled={loading || !pin || lockoutSec > 0}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              <KeyRound className="size-4" />
              {loading ? t("verifyingPin", lang) : t("openVaultBtn", lang)}
            </button>

            {/* Quick Access to Main Screen Without Password */}
            <button
              type="button"
              onClick={() => skipOrOpenDefault()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-ink hover:bg-surface-alt"
            >
              {t("btnSkipToMain", lang)}
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

            {/* Direct Skip to Main Screen */}
            <button
              type="button"
              onClick={() => skipOrOpenDefault()}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-alt"
            >
              {t("returnToHomeImmediate", lang)}
            </button>

            {vaults.length > 0 && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("unlock");
                    setError(null);
                  }}
                  className="text-xs text-muted hover:text-ink underline"
                >
                  {t("returnToVaultList", lang)}
                </button>
              </div>
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
              onClick={() => skipOrOpenDefault()}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-alt"
            >
              {t("cancelAndReturnHome", lang)}
            </button>
          </form>
        )}
      </div>

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Lock className="size-5 text-accent" />
            {currentVault?.hasPin ? t("editVaultSecurityTitle", lang) : t("setVaultSecurityTitle", lang)}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            {t("returnToHomeBtn", lang)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <FolderArchive className="size-5 text-accent" />
            {t("backupAndRestoreTitle", lang)}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            {t("returnToHomeBtn", lang)}
          </button>
        </div>

        <div className="mt-4 flex rounded-xl bg-surface-alt/50 p-1">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === "export" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t("exportBackupTab", lang)}
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === "import" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
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
            currentVault.name === "ماي موني" ||
            currentVault.name === "My Mouny" ||
            currentVault.name === "My Main Vault" ||
            currentVault.name === "My Mouny Vault" ||
            currentVault.name === "Το Κύριο Ταμείο μου" ||
            currentVault.name === "Το Ταμείο μου (My Mouny)" ||
            currentVault.name === "Μάι Μούνι (My Mouny)";
          const displayedVaultName = isDefaultVault
            ? "My Mouny"
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
