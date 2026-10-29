import { type Currency, type Pocket, type Tx } from "@/lib/ledger/model";

export type Language = "ar" | "en" | "el";

export type LanguageInfo = {
  id: Language;
  label: string;
  nativeLabel: string;
  code: string;
  dir: "rtl" | "ltr";
  flag: string;
};

export const LANGUAGES: LanguageInfo[] = [
  { id: "ar", label: "العربية", nativeLabel: "العربية", code: "AR", dir: "rtl", flag: "🇪🇬" },
  { id: "en", label: "English", nativeLabel: "English", code: "EN", dir: "ltr", flag: "🇬🇧" },
  { id: "el", label: "Greek", nativeLabel: "Ελληνικά", code: "EL", dir: "ltr", flag: "🇬🇷" },
];

export const translations = {
  ar: {
    // Top Header & Vault
    appName: "My Mouny",
    appSubtitle: "بياناتك محفوظة ومشفرة محلياً في جهازك بدون اتصال خارجي",
    vaultEncrypted: "مشفّرة ومحمية 🔒",
    vaultOpen: "خزنة محلية مفتوحة 🔓",
    online: "أونلاين",
    offline: "أوفلاين (جاهز)",
    installApp: "تثبيت على الهاتف",
    setPin: "عمل باسورد للخزنة",
    pinSettings: "إعدادات الرمز",
    lockVault: "قفل الخزنة",
    privacyShieldActive: "درع الخصوصية نشط لحماية بياناتك المالية من التلصص. انقر للمتابعة.",
    backup: "نسخة احتياطية",

    // Tabs
    tabOverview: "الخزينة والأرصدة",
    tabLedger: "الدفتر والحركات",
    tabDebts: "لي وعليّ (الديون)",

    // Tab 1: Overview
    balancesSummary: "ملخص الأرصدة الحالية",
    netWorth: "صافي ما تملك",
    netWorthFormula: "كاش + بنك + لك عند أحد − ما عليك",
    pocketCash: "كاش",
    pocketBank: "البنك",
    owedToMe: "لك عند أحد",
    owedByMe: "عليك",
    viewArrow: "عرض ←",
    correctBalance: "تصحيح",
    quickActions: "تسجيل إجراء سريع",
    btnPurchase: "سجّل شراء",
    btnIncome: "أضفت مالاً",
    btnTransfer: "تحويل",
    monthlyFlowTitle: "حركة شهر",
    monthlyPurchases: "مشتريات الشهر",
    monthlyIncome: "دخل الشهر",
    monthlyFlowNote: "المشتريات والدخل فقط. التحويل والسداد لا يُحسبان هنا.",
    netMonthlySavings: "صافي الشهر (التوفير)",
    monthlySurplus: "فائض شهري",
    monthlyDeficit: "عجز شهري",
    categoryBreakdownTitle: "توزيع المصروفات حسب التصنيف",
    categoryFieldLabel: "التصنيف",
    categoryOptional: "التصنيف (اختياري)",
    dateFieldLabel: "تاريخ المعاملة",
    filterCategory: "تصفية بالتصنيف",
    allCategories: "جميع التصنيفات",
    noCategoryData: "لا توجد مصروفات مسجلة بتصنيفات لهذا الشهر.",
    openingPromptTitle: "ابدأ بتحديد أرصدتك الحالية",
    openingPromptDesc: "إذا كانت معك أموال الآن في الكاش أو في البنك، حددها كبداية صحيحة.",
    btnSetBalances: "تثبيت الأرصدة والبدء",
    btnStartFromZero: "ابدأ من الصفر (0.00)",

    // Tab 2: Ledger
    ledgerSearchPlaceholder: "بحث في العمليات (اسم الشخص، الملاحظة، المبلغ…)",
    clearSearch: "إلغاء البحث",
    filterAll: "الكل",
    filterPurchases: "مشتريات",
    filterIncome: "دخل",
    filterTransfers: "تحويلات",
    filterDebts: "ديون",
    sortNewest: "الأحدث أولاً",
    sortOldest: "الأقدم أولاً",
    sortLargest: "الأكبر مبلغاً",
    emptyLedgerTitle: "الدفتر فارغ حالياً",
    emptyLedgerDesc: "لم يتم تسجيل أي عمليات بعد في هذه الخزنة.",
    btnStartFirstTx: "ابدأ بتسجيل أول عملية",
    noSearchResults: "لا توجد حركات تطابق بحثك الحالي.",
    btnClearFilter: "مسح الفلتر",
    btnEdit: "تعديل",
    btnDelete: "حذف",
    btnConfirmDelete: "تأكيد الحذف",
    btnCancel: "تراجع",
    clearHistoryBtn: "مسح وتفريغ سجل الحركات (مع الاحتفاظ بكافة الفلوس)",
    localDataNotice: "الأرقام والعمليات تُحفظ محلياً على جهازك",

    // Tab 3: Debts
    debtsTitle: "دفتر المستحقات والديون (لي وعليّ)",
    debtsSubtitle: "إدارة كافة المبالغ التي تطالب بها الآخرين، والديون والالتزامات المستحقة عليك",
    totalReceivables: "إجمالي لك عند أحد (مستحقاتك)",
    totalPayables: "إجمالي عليك للغير (ديونك)",
    peopleCount: "شخص",
    partiesCount: "جهة",
    btnAddReceivable: "تسجيل مبلغ لك عند أحد",
    btnAddPayable: "تسجيل دين جديد عليك",
    receivablesListTitle: "لك عند أحد (مستحقات تطالب بها الآخرين)",
    payablesListTitle: "عليك للغير (ديون والتزامات واجبة السداد)",
    emptyReceivables: "لا أحد يدين لك الآن.",
    emptyPayables: "لا ديون عليك لأحد حالياً.",
    btnCollect: "استلمت المبلغ",
    btnRepay: "سداد الدين",
    btnWaiveReceivable: "إسقاط المبلغ",
    btnWaivePayable: "إسقاط الدين",

    // Modals & Action Sheet
    modalPurchaseDesc: "يُخصم المبلغ فوراً من الكاش أو من البنك.",
    modalIncomeDesc: "يُضاف المبلغ فوراً إلى الكاش أو البنك.",
    modalReceivableDesc: "هذا المال لك عند شخص، لكنه ليس في الكاش ولا في البنك.",
    modalPayableDesc: "يُحسب ضمن ما عليك، دون أن يخصم من الكاش أو البنك الآن.",
    modalTransferDesc: "نقل أموال بين الكاش وحساب البنك.",
    modalCollectDesc: "استلام مبلغ يدين به شخص لك.",
    modalRepayDesc: "سداد دين مسجل عليك لأحد الأشخاص.",
    modalWaiveInDesc: "إسقاط دين لك عند شخص (لن يُحصَّل).",
    modalWaiveOutDesc: "إسقاط دين عليك تم إعفاؤك منه.",
    remainingDebt: "المتبقي",
    amountFieldLabel: "المبلغ",
    whatDidYouBuy: "ماذا اشتريت؟",
    incomeSource: "مصدر الدخل (اختياري)",
    noteOptional: "ملاحظة (اختياري)",
    personFieldLabel: "اسم الشخص / الجهة",
    personPlaceholder: "مثال: أحمد، شركة النور…",
    purchasePlaceholder: "خضار، فاتورة، بنزين…",
    incomePlaceholder: "راتب، عمل حر، هدية…",
    pocketDeductFrom: "الخصم من",
    pocketAddTo: "إلى",
    pocketTransferFrom: "من",
    transferToCashHint: "سيصل المبلغ إلى الكاش",
    transferToBankHint: "سيصل المبلغ إلى البنك",
    btnSaveEdit: "تأكيد حفظ التعديل",
    saving: "جاري الحفظ...",

    // Submit Labels
    submitPurchase: "خصم المبلغ وتسجيل الشراء",
    submitIncome: "إضافة المبلغ للرصيد",
    submitTransfer: "تأكيد التحويل",
    submitReceivable: "تسجيل المبلغ أنه لك",
    submitPayable: "تسجيل المبلغ أنه عليك",
    submitCollect: "إضافة المحصّل للرصيد",
    submitRepay: "خصم السداد من الرصيد",
    submitWaive: "تأكيد الإسقاط",
    submitAdjust: "تأكيد تصحيح الرصيد",

    // Safe Clear Modal
    safeClearTitle: "تنظيف وتفريغ سجل الدفتر",
    safeClearBadge: "الخيار الآمن: مسح الحركات مع الحفاظ على الفلوس",
    safeClearDesc: "سيتم تفريغ وتنظيف سجل العمليات بالدفتر، مع تثبيت كامل أموالك وديونك الحالية كما هي تماماً:",
    savedCash: "الكاش المحفوظ:",
    savedBank: "البنك المحفوظ:",
    savedReceivables: "لك عند الآخرين:",
    savedPayables: "عليك للغير:",
    btnConfirmSafeClear: "تأكيد مسح الحركات والاحتفاظ بكافة الفلوس",
    factoryResetPrompt: "أو إذا كنت تريد تصفير الخزنة ومسح كل شيء للبدء من الصفر (0.00)...",
    factoryResetWarning: "تنبيه: سيتم مسح كل الأرصدة والحسابات لتصبح 0.00 تماماً (إعادة ضبط المصنع للخزنة).",
    btnConfirmFactoryReset: "تأكيد تصفير الخزنة نهائياً",
    btnReturnToSafe: "الرجوع للخيار الآمن",
    btnCancelDismiss: "إلغاء وتراجع",

    // Time & Days
    today: "اليوم",
    yesterday: "أمس",

    // Header & Tooltips
    onlineTooltip: "متصل بالإنترنت",
    offlineTooltip: "التطبيق يعمل بدون إنترنت بالكامل",
    setPinTooltip: "تأمين الخزنة برمز مرور مشفّر",
    pinSettingsTooltip: "تعديل رمز المرور أو إلغاء القفل",
    lockVaultTooltip: "قفل الخزنة وتسجيل الخروج",
    backupTooltip: "تصدير أو استيراد نسخة احتياطية",
    navVaultSections: "أقسام الخزنة",

    // Overview & Recent Activity
    recentActivityTitle: "آخر الحركات بالدفتر",
    viewAllCount: "فتح الدفتر بالكامل",
    emptyRecentActivity: "لم تُسجَّل حركات بعد. ابدأ برصيدك، ثم اكتب كل شراء ليُخصم من الكاش أو البنك.",
    ledgerFullStatement: "كشف حساب كامل بجميع المعاملات المالية",

    // Exit Toast & Footer
    pressBackAgainToExit: "اضغط رجوع مرة أخرى للخروج من التطبيق",
    footerCopyright: "خزينتي © 2026",
    footerPrivacy: "سياسة الخصوصية والأمان",
    footerSecurity: "تشفير محلي عسكري AES-256 · أوفلاين 100% بدون خوادم",

    // Action Sheets & Dynamic Tx labels
    collectedFrom: "استلمت من",
    repaidTo: "سددت إلى",
    waivedReceivableFor: "إسقاط مستحق",
    waivedPayableFor: "إسقاط دين",
    validAmountError: "اكتب المبلغ بشكل صحيح، مثل 150 أو 150.50",
    closeLabel: "إغلاق",
    closeWindowLabel: "إغلاق النافذة",
    validAmountInCurrency: "اكتب مبلغاً صحيحاً بـ",
    enterPersonNameError: "اكتب اسم الشخص.",
    enterItemDescError: "اكتب ماذا اشتريت.",
    waiveNotice: "الإسقاط لا يحرّك الكاش ولا البنك، ويعدّل الصافي فقط.",

    // Auth screen & Vault Creation & PIN Management
    defaultVaultName: "My Mouny",
    pinMinLengthError: "رمز المرور يجب أن يتكون من 4 خانات على الأقل (أو اتركه فارغاً للدخول بدون رمز)",
    pinsDoNotMatchError: "رمزا المرور غير متطابقين",
    chooseBackupFileError: "يرجى اختيار ملف النسخة الاحتياطية (.json)",
    failedToReadBackupError: "تعذر قراءة ملف النسخة الاحتياطية",
    returnToDashboard: "الرجوع إلى الصفحة الرئيسية للحسابات",
    unlockVaultTitle: "فتح الخزنة المالية",
    createVaultTitle: "إنشاء خزنة جديدة",
    importBackupTitle: "استيراد نسخة احتياطية",
    bruteForceProtectionActive: "تم تفعيل وضع الحماية ضد التخمين",
    waitPrefix: "انتظر",
    waitSuffix: "ثانية للمحاولة مجدداً.",
    selectVaultLabel: "اختر الخزنة",
    vaultPinLabel: "رمز مرور الخزنة",
    enterPinPlaceholder: "أدخل رمز المرور",
    verifyingPin: "جاري التحقق والفك...",
    openVaultBtn: "فتح الخزنة",
    createNewVaultBtn: "إنشاء خزنة جديدة على هذا الجهاز",
    importVaultFromBackupBtn: "استيراد خزنة من نسخة احتياطية (.json)",
    vaultNameLabel: "اسم الخزنة",
    vaultNamePlaceholder: "مثال: خزينتي الشخصية، مصاريف البيت",
    vaultPinOptionalLabel: "رمز المرور (PIN أو كلمة سر)",
    optionalBadge: "اختياري",
    pinOptionalPlaceholder: "اتركه فارغاً للدخول بدون رمز، أو 4 خانات",
    confirmPinLabel: "تأكيد رمز المرور",
    reenterPinPlaceholder: "أعد إدخال الرمز",
    highSecurityAssuranceTitle: "حماية وتشفير عالي المستوى",
    highSecurityAssuranceDesc: "يتم تشفير العمليات محلياً بخوارزمية AES-GCM-256 وPBKDF2 مع حماية ضد التلاعب والتخمين.",
    creatingVaultBtn: "جاري الإنشاء...",
    createAndProtectVaultBtn: "إنشاء الخزنة وحمايتها",
    enterVaultNowBtn: "الدخول إلى الخزنة الآن",
    returnToHomeImmediate: "الرجوع إلى الرئيسية فوراً",
    returnToVaultList: "الرجوع لقائمة الخزنات",
    chooseBackupFileLabel: "اختر ملف النسخة الاحتياطية",
    selectedFilePrefix: "الملف المحدد:",
    newPinForImportOptional: "رمز مرور جديد للخزنة المستوردة (اختياري)",
    newPinImportPlaceholder: "اتركه فارغاً أو 4 خانات على الأقل",
    importingBtn: "جاري الاستيراد...",
    restoreVaultAndActivateBtn: "استعادة الخزنة وتفعيلها",
    cancelAndReturnHome: "إلغاء والرجوع للرئيسية",
    enterCurrentPinToUnlockError: "أدخل رمز المرور الحالي لإلغاء القفل",
    editVaultSecurityTitle: "تعديل رمز حماية الخزنة",
    setVaultSecurityTitle: "تعيين رمز حماية للخزنة",
    returnToHomeBtn: "رجوع للرئيسية",
    securitySettingsSaved: "تم حفظ إعدادات الأمان بنجاح!",
    newPinLabel: "رمز المرور الجديد (PIN من 4 خانات على الأقل)",
    newPinPlaceholder: "أدخل رمز الحماية الجديد",
    pinExplanation: "عند تفعيل الرمز، يتم تشفير كافة العمليات المالية محلياً داخل جهازك باستخدام مفتاح AES-256-GCM.",
    encryptingAndSaving: "جاري التشفير والحفظ...",
    saveAndActivatePin: "حفظ وتفعيل رمز الحماية",
    removePinLabel: "إلغاء رمز الحماية وجعل الخزنة مفتوحة:",
    enterCurrentPinPlaceholder: "أدخل الرمز الحالي",
    removePinBtn: "إلغاء القفل",

    // Backup & Restore Modal
    backupAndRestoreTitle: "النسخ الاحتياطي والاستعادة",
    exportBackupTab: "تصدير نسخة احتياطية",
    importBackupTab: "استيراد نسخة",
    exportBackupDescPrefix: "تصدير ملف يحتوي على كامل بيانات الخزنة النشطة (",
    exportBackupDescSuffix: ") بما فيها العمليات والأرصدة لنقلها لأي جهاز آخر أو حفظها ضد مسح بيانات المتصفح.",
    prepareBackupBtn: "تجهيز ملف النسخة الاحتياطية",
    downloadBackupFileBtn: "تحميل الملف الآن",
    backupJsonFileLabel: "ملف النسخة (.json)",
    pinForImportedVaultOptional: "رمز مرور للخزنة المستوردة (اختياري)",
    confirmImportBtn: "تأكيد الاستيراد",
    backupReadySuccess: "تم تجهيز النسخة الاحتياطية بنجاح! انقر على زر التحميل لحفظها.",
    backupReadyFailed: "تعذر تجهيز النسخة الاحتياطية.",
    backupImportSuccess: "تم استيراد الخزنة بنجاح!",
    backupImportError: "خطأ أثناء استيراد الخزنة:",
    fileReadError: "خطأ أثناء قراءة الملف.",

    // Auth screen & Lock
    authScreenTitle: "الخزنة المالية المشفرة",
    authScreenSubtitle: "أموالك ومستحقاتك محمية محلياً بتشفير كامل",
    btnEnterPin: "إدخال رمز المرور",
    btnCreateNewVault: "إنشاء خزنة جديدة",
    btnImportBackup: "استيراد نسخة احتياطية",
    btnSkipToMain: "المتابعة إلى الرئيسية",
    privacyAssurance: "تطبيق مستقل محلياً بالكامل. بياناتك المالية لا تغادر هذا الجهاز نهائياً.",
    privacyLink: "سياسة الخصوصية",
  },

  en: {
    // Top Header & Vault
    appName: "My Mouny",
    appSubtitle: "Your data is stored and encrypted locally on this device without external servers",
    vaultEncrypted: "Encrypted & Protected 🔒",
    vaultOpen: "Open Local Vault 🔓",
    online: "Online",
    offline: "Offline (Ready)",
    installApp: "Install App",
    setPin: "Set Vault PIN",
    pinSettings: "PIN Settings",
    lockVault: "Lock Vault",
    privacyShieldActive: "Privacy shield active to protect financial data from shoulder-surfing. Click to resume.",
    backup: "Backup",

    // Tabs
    tabOverview: "Vault & Balances",
    tabLedger: "Ledger & History",
    tabDebts: "Receivables & Debts",

    // Tab 1: Overview
    balancesSummary: "Current Balances Summary",
    netWorth: "Total Net Worth",
    netWorthFormula: "Cash + Bank + Owed to you − Debts you owe",
    pocketCash: "Cash",
    pocketBank: "Bank",
    owedToMe: "Owed to you",
    owedByMe: "You owe",
    viewArrow: "View →",
    correctBalance: "Adjust",
    quickActions: "Quick Actions",
    btnPurchase: "Add Purchase",
    btnIncome: "Add Income",
    btnTransfer: "Transfer",
    monthlyFlowTitle: "Monthly Flow",
    monthlyPurchases: "Monthly Purchases",
    monthlyIncome: "Monthly Income",
    monthlyFlowNote: "Only purchases and income count here. Transfers and debt payments are not included.",
    netMonthlySavings: "Monthly Net Savings",
    monthlySurplus: "Monthly Surplus",
    monthlyDeficit: "Monthly Deficit",
    categoryBreakdownTitle: "Expense Breakdown by Category",
    categoryFieldLabel: "Category",
    categoryOptional: "Category (optional)",
    dateFieldLabel: "Transaction Date",
    filterCategory: "Filter by Category",
    allCategories: "All Categories",
    noCategoryData: "No categorized expenses recorded for this month.",
    openingPromptTitle: "Set Your Initial Balances",
    openingPromptDesc: "If you have funds right now in cash or in the bank, enter them as your starting baseline.",
    btnSetBalances: "Set Balances & Start",
    btnStartFromZero: "Start from Zero (0.00)",

    // Tab 2: Ledger
    ledgerSearchPlaceholder: "Search transactions (person name, note, amount…)",
    clearSearch: "Clear",
    filterAll: "All",
    filterPurchases: "Purchases",
    filterIncome: "Income",
    filterTransfers: "Transfers",
    filterDebts: "Debts",
    sortNewest: "Newest First",
    sortOldest: "Oldest First",
    sortLargest: "Highest Amount",
    emptyLedgerTitle: "Ledger is currently empty",
    emptyLedgerDesc: "No transactions recorded yet in this vault.",
    btnStartFirstTx: "Record your first transaction",
    noSearchResults: "No transactions match your search.",
    btnClearFilter: "Reset filter",
    btnEdit: "Edit",
    btnDelete: "Delete",
    btnConfirmDelete: "Confirm Delete",
    btnCancel: "Cancel",
    clearHistoryBtn: "Clear Ledger History (Keep All Balances)",
    localDataNotice: "Numbers and transactions are stored locally on your device",

    // Tab 3: Debts
    debtsTitle: "Receivables & Debts Ledger",
    debtsSubtitle: "Manage all money owed to you and personal debts you need to repay",
    totalReceivables: "Total Owed to You (Receivables)",
    totalPayables: "Total You Owe to Others (Debts)",
    peopleCount: "people",
    partiesCount: "entities",
    btnAddReceivable: "Record Money Owed to You",
    btnAddPayable: "Record New Debt You Owe",
    receivablesListTitle: "Owed to You (Claims from others)",
    payablesListTitle: "You Owe to Others (Liabilities to settle)",
    emptyReceivables: "Nobody owes you money right now.",
    emptyPayables: "You have no outstanding debts right now.",
    btnCollect: "Received Payment",
    btnRepay: "Repay Debt",
    btnWaiveReceivable: "Waive Claim",
    btnWaivePayable: "Waive Debt",

    // Modals & Action Sheet
    modalPurchaseDesc: "Amount is immediately deducted from Cash or Bank.",
    modalIncomeDesc: "Amount is immediately added to Cash or Bank.",
    modalReceivableDesc: "This money is owed to you by someone, but is not currently in Cash or Bank.",
    modalPayableDesc: "Counted towards your debt, without deducting from Cash or Bank now.",
    modalTransferDesc: "Transfer funds between Cash and Bank account.",
    modalCollectDesc: "Collect money someone owes you.",
    modalRepayDesc: "Repay money you owe to someone.",
    modalWaiveInDesc: "Waive a debt someone owes you (will not be collected).",
    modalWaiveOutDesc: "Waive a debt you owed that was forgiven.",
    remainingDebt: "Remaining",
    amountFieldLabel: "Amount",
    whatDidYouBuy: "What did you buy?",
    incomeSource: "Income Source (optional)",
    noteOptional: "Note (optional)",
    personFieldLabel: "Person / Company Name",
    personPlaceholder: "e.g. John, Acme Corp…",
    purchasePlaceholder: "Groceries, Bill, Gas…",
    incomePlaceholder: "Salary, Freelance, Gift…",
    pocketDeductFrom: "Deduct from",
    pocketAddTo: "Deposit into",
    pocketTransferFrom: "From",
    transferToCashHint: "Funds will be deposited into Cash",
    transferToBankHint: "Funds will be deposited into Bank",
    btnSaveEdit: "Save Changes",
    saving: "Saving...",

    // Submit Labels
    submitPurchase: "Deduct & Record Purchase",
    submitIncome: "Add Amount to Balance",
    submitTransfer: "Confirm Transfer",
    submitReceivable: "Record as Owed to You",
    submitPayable: "Record as Debt You Owe",
    submitCollect: "Deposit Collected Amount",
    submitRepay: "Deduct Repayment from Balance",
    submitWaive: "Confirm Waive",
    submitAdjust: "Confirm Balance Correction",

    // Safe Clear Modal
    safeClearTitle: "Clear & Reset Ledger History",
    safeClearBadge: "Safe Option: Clear History & Keep All Money",
    safeClearDesc: "Clears past transaction logs from the ledger, while preserving 100% of your current balances and debts:",
    savedCash: "Preserved Cash:",
    savedBank: "Preserved Bank:",
    savedReceivables: "Owed to you:",
    savedPayables: "Debts you owe:",
    btnConfirmSafeClear: "Confirm Clear History & Keep All Money",
    factoryResetPrompt: "Or if you want to wipe the vault completely to zero (0.00)...",
    factoryResetWarning: "Warning: All balances, transactions, and debts will be completely wiped to 0.00 (Factory Reset).",
    btnConfirmFactoryReset: "Confirm Complete Vault Reset",
    btnReturnToSafe: "Return to Safe Option",
    btnCancelDismiss: "Cancel & Go Back",

    // Time & Days
    today: "Today",
    yesterday: "Yesterday",

    // Header & Tooltips
    onlineTooltip: "Online",
    offlineTooltip: "App is running 100% offline",
    setPinTooltip: "Protect vault with encrypted PIN",
    pinSettingsTooltip: "Edit PIN or remove lock",
    lockVaultTooltip: "Lock vault and sign out",
    backupTooltip: "Export or import backup",
    navVaultSections: "Vault Sections",

    // Overview & Recent Activity
    recentActivityTitle: "Recent Ledger Activity",
    viewAllCount: "View Full Ledger",
    emptyRecentActivity: "No transactions recorded yet. Start by setting your balances, then record any purchase to deduct from cash or bank.",
    ledgerFullStatement: "Full statement of all recorded financial transactions",

    // Exit Toast & Footer
    pressBackAgainToExit: "Press back again to exit the app",
    footerCopyright: "Khazinti © 2026",
    footerPrivacy: "Privacy Policy & Security",
    footerSecurity: "Military-grade local AES-256 · 100% Offline without servers",

    // Action Sheets & Dynamic Tx labels
    collectedFrom: "Collected from",
    repaidTo: "Repaid to",
    waivedReceivableFor: "Waived claim for",
    waivedPayableFor: "Waived debt for",
    validAmountError: "Enter a valid amount, e.g. 150 or 150.50",
    closeLabel: "Close",
    closeWindowLabel: "Close window",
    validAmountInCurrency: "Enter a valid amount in",
    enterPersonNameError: "Enter person name.",
    enterItemDescError: "Enter item description.",
    waiveNotice: "Waiving does not move Cash or Bank, it only updates Net Worth.",

    // Auth screen & Vault Creation & PIN Management
    defaultVaultName: "My Mouny",
    pinMinLengthError: "PIN must be at least 4 digits (or leave blank to enter without PIN)",
    pinsDoNotMatchError: "PINs do not match",
    chooseBackupFileError: "Please select a backup file (.json)",
    failedToReadBackupError: "Failed to read backup file",
    returnToDashboard: "Return to main dashboard",
    unlockVaultTitle: "Unlock Vault",
    createVaultTitle: "Create New Vault",
    importBackupTitle: "Import Backup",
    bruteForceProtectionActive: "Brute force protection active",
    waitPrefix: "Wait",
    waitSuffix: "seconds to try again.",
    selectVaultLabel: "Select Vault",
    vaultPinLabel: "Vault PIN",
    enterPinPlaceholder: "Enter PIN",
    verifyingPin: "Verifying...",
    openVaultBtn: "Open Vault",
    createNewVaultBtn: "Create new vault on this device",
    importVaultFromBackupBtn: "Import vault from backup (.json)",
    vaultNameLabel: "Vault Name",
    vaultNamePlaceholder: "e.g. My Personal Vault, Home Budget",
    vaultPinOptionalLabel: "Passcode (PIN or Password)",
    optionalBadge: "Optional",
    pinOptionalPlaceholder: "Leave blank for no PIN, or 4+ digits",
    confirmPinLabel: "Confirm PIN",
    reenterPinPlaceholder: "Re-enter PIN",
    highSecurityAssuranceTitle: "High-grade Security & Encryption",
    highSecurityAssuranceDesc: "Transactions are encrypted locally using AES-GCM-256 and PBKDF2 with brute-force protection.",
    creatingVaultBtn: "Creating...",
    createAndProtectVaultBtn: "Create & Protect Vault",
    enterVaultNowBtn: "Enter Vault Now",
    returnToHomeImmediate: "Return to Home immediately",
    returnToVaultList: "Return to Vault List",
    chooseBackupFileLabel: "Choose Backup File",
    selectedFilePrefix: "Selected file:",
    newPinForImportOptional: "New PIN for imported vault (optional)",
    newPinImportPlaceholder: "Leave blank or 4+ digits",
    importingBtn: "Importing...",
    restoreVaultAndActivateBtn: "Restore & Activate Vault",
    cancelAndReturnHome: "Cancel & Return Home",
    enterCurrentPinToUnlockError: "Enter current PIN to remove lock",
    editVaultSecurityTitle: "Edit Vault PIN",
    setVaultSecurityTitle: "Set Vault PIN",
    returnToHomeBtn: "Back to Home",
    securitySettingsSaved: "Security settings saved successfully!",
    newPinLabel: "New PIN (at least 4 digits)",
    newPinPlaceholder: "Enter new security PIN",
    pinExplanation: "When PIN is enabled, all financial transactions are encrypted locally on your device with AES-256-GCM.",
    encryptingAndSaving: "Encrypting and saving...",
    saveAndActivatePin: "Save & Activate PIN",
    removePinLabel: "Remove PIN protection and make vault open:",
    enterCurrentPinPlaceholder: "Enter current PIN",
    removePinBtn: "Remove Lock",

    // Backup & Restore Modal
    backupAndRestoreTitle: "Backup & Restore",
    exportBackupTab: "Export Backup",
    importBackupTab: "Import Backup",
    exportBackupDescPrefix: "Export a file containing all data for the active vault (",
    exportBackupDescSuffix: ") including transactions and balances to transfer to another device or protect against browser data clearing.",
    prepareBackupBtn: "Prepare Backup File",
    downloadBackupFileBtn: "Download File Now",
    backupJsonFileLabel: "Backup file (.json)",
    pinForImportedVaultOptional: "PIN for imported vault (optional)",
    confirmImportBtn: "Confirm Import",
    backupReadySuccess: "Backup prepared successfully! Click download button to save.",
    backupReadyFailed: "Failed to prepare backup.",
    backupImportSuccess: "Vault imported successfully!",
    backupImportError: "Error importing vault:",
    fileReadError: "Error reading file.",

    // Auth screen & Lock
    authScreenTitle: "Encrypted Financial Vault",
    authScreenSubtitle: "Your funds and records are protected locally with end-to-end encryption",
    btnEnterPin: "Enter PIN",
    btnCreateNewVault: "Create New Vault",
    btnImportBackup: "Import Backup",
    btnSkipToMain: "Continue to Main Screen",
    privacyAssurance: "Fully offline standalone application. Your financial data never leaves this device.",
    privacyLink: "Privacy Policy",
  },

  el: {
    // Top Header & Vault
    appName: "My Mouny",
    appSubtitle: "Τα δεδομένα σας αποθηκεύονται και κρυπτογραφούνται τοπικά σε αυτήν τη συσκευή",
    vaultEncrypted: "Κρυπτογραφημένο & Προστατευμένο 🔒",
    vaultOpen: "Ανοιχτό Τοπικό Θησαυροφυλάκιο 🔓",
    online: "Σε σύνδεση",
    offline: "Εκτός σύνδεσης (Έτοιμο)",
    installApp: "Εγκατάσταση Εφαρμογής",
    setPin: "Ορισμός PIN Θησαυροφυλακίου",
    pinSettings: "Ρυθμίσεις PIN",
    lockVault: "Κλείδωμα",
    privacyShieldActive: "Η ασπίδα απορρήτου είναι ενεργή για προστασία των οικονομικών σας δεδομένων. Κάντε κλικ για συνέχεια.",
    backup: "Αντίγραφο Ασφαλείας",

    // Tabs
    tabOverview: "Θησαυροφυλάκιο & Υπόλοιπα",
    tabLedger: "Καθολικό & Συναλλαγές",
    tabDebts: "Απαιτήσεις & Οφειλές",

    // Tab 1: Overview
    balancesSummary: "Σύνοψη Τρεχόντων Υπολοίπων",
    netWorth: "Συνολική Καθαρή Αξία",
    netWorthFormula: "Μετρητά + Τράπεζα + Σας οφείλουν − Οφείλετε",
    pocketCash: "Μετρητά",
    pocketBank: "Τράπεζα",
    owedToMe: "Σας οφείλουν",
    owedByMe: "Οφείλετε",
    viewArrow: "Προβολή →",
    correctBalance: "Διόρθωση",
    quickActions: "Γρήγορες Ενέργειες",
    btnPurchase: "Καταγραφή Αγοράς",
    btnIncome: "Προσθήκη Εσόδου",
    btnTransfer: "Μεταφορά",
    monthlyFlowTitle: "Μηνιαία Κίνηση",
    monthlyPurchases: "Μηνιαίες Αγορές",
    monthlyIncome: "Μηνιαία Έσοδα",
    monthlyFlowNote: "Περιλαμβάνονται μόνο αγορές και έσοδα. Μεταφορές και εξοφλήσεις δεν υπολογίζονται εδώ.",
    netMonthlySavings: "Καθαρές Μηνιαίες Αποταμιεύσεις",
    monthlySurplus: "Μηνιαίο Πλεόνασμα",
    monthlyDeficit: "Μηνιαίο Έλλειμμα",
    categoryBreakdownTitle: "Κατανομή Εξόδων ανά Κατηγορία",
    categoryFieldLabel: "Κατηγορία",
    categoryOptional: "Κατηγορία (προαιρετικό)",
    dateFieldLabel: "Ημερομηνία συναλλαγής",
    filterCategory: "Φίλτρο ανά κατηγορία",
    allCategories: "Όλες οι κατηγορίες",
    noCategoryData: "Δεν έχουν καταγραφεί έξοδα με κατηγορία αυτόν τον μήνα.",
    openingPromptTitle: "Ορίστε τα Αρχικά σας Υπόλοιπα",
    openingPromptDesc: "Εάν έχετε χρήματα τώρα σε μετρητά ή τράπεζα, εισαγάγετέ τα ως αφετηρία.",
    btnSetBalances: "Αποθήκευση & Έναρξη",
    btnStartFromZero: "Έναρξη από Μηδέν (0.00)",

    // Tab 2: Ledger
    ledgerSearchPlaceholder: "Αναζήτηση συναλλαγών (όνομα, σημείωση, ποσό…)",
    clearSearch: "Εκκαθάριση",
    filterAll: "Όλα",
    filterPurchases: "Αγορές",
    filterIncome: "Έσοδα",
    filterTransfers: "Μεταφορές",
    filterDebts: "Οφειλές",
    sortNewest: "Νεότερα πρώτα",
    sortOldest: "Παλαιότερα πρώτα",
    sortLargest: "Μεγαλύτερο ποσό",
    emptyLedgerTitle: "Το καθολικό είναι άδειο",
    emptyLedgerDesc: "Δεν έχουν καταγραφεί ακόμη συναλλαγές σε αυτό το θησαυροφυλάκιο.",
    btnStartFirstTx: "Καταγράψτε την πρώτη σας συναλλαγή",
    noSearchResults: "Δεν βρέθηκαν συναλλαγές που να ταιριάζουν στην αναζήτηση.",
    btnClearFilter: "Επαναφορά φίλτρου",
    btnEdit: "Επεξεργασία",
    btnDelete: "Διαγραφή",
    btnConfirmDelete: "Επιβεβαίωση Διαγραφής",
    btnCancel: "Ακύρωση",
    clearHistoryBtn: "Εκκαθάριση Ιστορικού (Διατήρηση Όλων των Υπολοίπων)",
    localDataNotice: "Οι αριθμοί και οι συναλλαγές αποθηκεύονται τοπικά στη συσκευή σας",

    // Tab 3: Debts
    debtsTitle: "Καθολικό Απαιτήσεων & Οφειλών",
    debtsSubtitle: "Διαχειριστείτε όλα τα χρήματα που σας οφείλουν και τα χρέη που πρέπει να πληρώσετε",
    totalReceivables: "Σύνολο Απαιτήσεων (Σας οφείλουν)",
    totalPayables: "Σύνολο Οφειλών (Οφείλετε)",
    peopleCount: "άτομα",
    partiesCount: "οντότητες",
    btnAddReceivable: "Καταγραφή ποσού που σας οφείλουν",
    btnAddPayable: "Καταγραφή νέας οφειλής",
    receivablesListTitle: "Σας οφείλουν (Απαιτήσεις από τρίτους)",
    payablesListTitle: "Οφείλετε σε τρίτους (Υποχρεώσεις προς εξόφληση)",
    emptyReceivables: "Κανείς δεν σας οφείλει χρήματα αυτή τη στιγμή.",
    emptyPayables: "Δεν έχετε καμία εκκρεμή οφειλή αυτή τη στιγμή.",
    btnCollect: "Είσπραξη",
    btnRepay: "Εξόφληση Οφειλής",
    btnWaiveReceivable: "Διαγραφή Απαίτησης",
    btnWaivePayable: "Διαγραφή Οφειλής",

    // Modals & Action Sheet
    modalPurchaseDesc: "Το ποσό αφαιρείται άμεσα από τα Μετρητά ή την Τράπεζα.",
    modalIncomeDesc: "Το ποσό προστίθεται άμεσα στα Μετρητά ή την Τράπεζα.",
    modalReceivableDesc: "Αυτά τα χρήματα σας τα οφείλει κάποιος, αλλά δεν βρίσκονται στα Μετρητά ή την Τράπεζα.",
    modalPayableDesc: "Υπολογίζεται στις οφειλές σας, χωρίς να αφαιρεθεί από Μετρητά ή Τράπεζα τώρα.",
    modalTransferDesc: "Μεταφορά χρημάτων μεταξύ Μετρητών και Τράπεζας.",
    modalCollectDesc: "Είσπραξη χρημάτων που σας οφείλονται.",
    modalRepayDesc: "Εξόφληση οφειλής προς τρίτο.",
    modalWaiveInDesc: "Διαγραφή απαίτησης (δεν θα εισπραχθεί).",
    modalWaiveOutDesc: "Διαγραφή οφειλής που σας χαρίστηκε.",
    remainingDebt: "Υπόλοιπο",
    amountFieldLabel: "Ποσό",
    whatDidYouBuy: "Τι αγοράσατε;",
    incomeSource: "Πηγή Εσόδου (προαιρετικό)",
    noteOptional: "Σημείωση (προαιρετικό)",
    personFieldLabel: "Όνομα Ατόμου / Εταιρείας",
    personPlaceholder: "π.χ. Νίκος, Alpha Corp…",
    purchasePlaceholder: "Σούπερ μάρκετ, Λογαριασμός, Βενζίνη…",
    incomePlaceholder: "Μισθός, Ελεύθερο επάγγελμα, Δώρο…",
    pocketDeductFrom: "Αφαίρεση από",
    pocketAddTo: "Κατάθεση σε",
    pocketTransferFrom: "Από",
    transferToCashHint: "Το ποσό θα κατατεθεί στα Μετρητά",
    transferToBankHint: "Το ποσό θα κατατεθεί στην Τράπεζα",
    btnSaveEdit: "Αποθήκευση Αλλαγών",
    saving: "Αποθήκευση...",

    // Submit Labels
    submitPurchase: "Αφαίρεση & Καταγραφή Αγοράς",
    submitIncome: "Προσθήκη Ποσού στο Υπόλοιπο",
    submitTransfer: "Επιβεβαίωση Μεταφοράς",
    submitReceivable: "Καταγραφή ως Απαίτηση",
    submitPayable: "Καταγραφή ως Οφειλή",
    submitCollect: "Κατάθεση Εισπραχθέντος Ποσού",
    submitRepay: "Αφαίρεση Εξόφλησης από το Υπόλοιπο",
    submitWaive: "Επιβεβαίωση Διαγραφής",
    submitAdjust: "Επιβεβαίωση Διόρθωσης Υπολοίπου",

    // Safe Clear Modal
    safeClearTitle: "Εκκαθάριση Ιστορικού Καθολικού",
    safeClearBadge: "Ασφαλής Επιλογή: Εκκαθάριση Ιστορικού με Διατήρηση Χρημάτων",
    safeClearDesc: "Διαγράφει το ιστορικό παλαιών συναλλαγών, διατηρώντας το 100% των τρεχόντων υπολοίπων και οφειλών σας:",
    savedCash: "Διατηρημένα Μετρητά:",
    savedBank: "Διατηρημένη Τράπεζα:",
    savedReceivables: "Σας οφείλουν:",
    savedPayables: "Οφείλετε:",
    btnConfirmSafeClear: "Επιβεβαίωση Εκκαθάρισης & Διατήρηση Χρημάτων",
    factoryResetPrompt: "Ή εάν θέλετε πλήρη μηδενισμό του θησαυροφυλακίου (0.00)...",
    factoryResetWarning: "Προειδοποίηση: Όλα τα υπόλοιπα, οι συναλλαγές και τα χρέη θα μηδενιστούν πλήρως σε 0.00 (Επαναφορά Εργοστασιακών Ρυθμίσεων).",
    btnConfirmFactoryReset: "Επιβεβαίωση Πλήρους Μηδενισμού",
    btnReturnToSafe: "Επιστροφή στην Ασφαλή Επιλογή",
    btnCancelDismiss: "Ακύρωση",

    // Time & Days
    today: "Σήμερα",
    yesterday: "Χθες",

    // Header & Tooltips
    onlineTooltip: "Σε σύνδεση",
    offlineTooltip: "Η εφαρμογή λειτουργεί 100% εκτός σύνδεσης",
    setPinTooltip: "Προστασία θησαυροφυλακίου με κρυπτογραφημένο PIN",
    pinSettingsTooltip: "Επεξεργασία PIN ή αφαίρεση κλειδώματος",
    lockVaultTooltip: "Κλείδωμα θησαυροφυλακίου και αποσύνδεση",
    backupTooltip: "Εξαγωγή ή εισαγωγή αντιγράφου ασφαλείας",
    navVaultSections: "Ενότητες Θησαυροφυλακίου",

    // Overview & Recent Activity
    recentActivityTitle: "Πρόσφατες Συναλλαγές",
    viewAllCount: "Προβολή Όλου του Καθολικού",
    emptyRecentActivity: "Δεν έχουν καταγραφεί ακόμη συναλλαγές. Ξεκινήστε ορίζοντας τα υπόλοιπά σας, και στη συνέχεια καταγράψτε οποιαδήποτε αγορά για αφαίρεση από μετρητά ή τράπεζα.",
    ledgerFullStatement: "Πλήρης κατάσταση όλων των καταγεγραμμένων οικονομικών συναλλαγών",

    // Exit Toast & Footer
    pressBackAgainToExit: "Πατήστε ξανά πίσω για έξοδο από την εφαρμογή",
    footerCopyright: "Khazinti © 2026",
    footerPrivacy: "Πολιτική Απορρήτου & Ασφάλεια",
    footerSecurity: "Στρατιωτικού επιπέδου τοπικό AES-256 · 100% Εκτός σύνδεσης χωρίς διακομιστές",

    // Action Sheets & Dynamic Tx labels
    collectedFrom: "Είσπραξη από",
    repaidTo: "Εξόφληση προς",
    waivedReceivableFor: "Διαγραφή απαίτησης για",
    waivedPayableFor: "Διαγραφή οφειλής για",
    validAmountError: "Εισαγάγετε ένα έγκυρο ποσό, π.χ. 150 ή 150.50",
    closeLabel: "Κλείσιμο",
    closeWindowLabel: "Κλείσιμο παραθύρου",
    validAmountInCurrency: "Εισαγάγετε ένα έγκυρο ποσό σε",
    enterPersonNameError: "Εισαγάγετε το όνομα του ατόμου.",
    enterItemDescError: "Εισαγάγετε την περιγραφή του αντικειμένου.",
    waiveNotice: "Η διαγραφή δεν επηρεάζει τα Μετρητά ή την Τράπεζα, ενημερώνει μόνο την Καθαρή Αξία.",

    // Auth screen & Vault Creation & PIN Management
    defaultVaultName: "My Mouny",
    pinMinLengthError: "Το PIN πρέπει να αποτελείται από τουλάχιστον 4 ψηφία (ή αφήστε το κενό)",
    pinsDoNotMatchError: "Τα PIN δεν ταιριάζουν",
    chooseBackupFileError: "Παρακαλώ επιλέξτε αρχείο αντιγράφου ασφαλείας (.json)",
    failedToReadBackupError: "Αποτυχία ανάγνωσης αρχείου αντιγράφου ασφαλείας",
    returnToDashboard: "Επιστροφή στην κύρια σελίδα",
    unlockVaultTitle: "Ξεκλείδωμα Θησαυροφυλακίου",
    createVaultTitle: "Δημιουργία Νέου Θησαυροφυλακίου",
    importBackupTitle: "Εισαγωγή Αντιγράφου Ασφαλείας",
    bruteForceProtectionActive: "Προστασία κατά της παραβίασης ενεργή",
    waitPrefix: "Περιμένετε",
    waitSuffix: "δευτερόλεπτα για να δοκιμάσετε ξανά.",
    selectVaultLabel: "Επιλέξτε Θησαυροφυλάκιο",
    vaultPinLabel: "PIN Θησαυροφυλακίου",
    enterPinPlaceholder: "Εισαγάγετε PIN",
    verifyingPin: "Επαλήθευση...",
    openVaultBtn: "Άνοιγμα Θησαυροφυλακίου",
    createNewVaultBtn: "Δημιουργία νέου θησαυροφυλακίου σε αυτή τη συσκευή",
    importVaultFromBackupBtn: "Εισαγωγή από αντίγραφο ασφαλείας (.json)",
    vaultNameLabel: "Όνομα Θησαυροφυλακίου",
    vaultNamePlaceholder: "π.χ. Προσωπικό Ταμείο, Οικιακός Προϋπολογισμός",
    vaultPinOptionalLabel: "Κωδικός πρόσβασης (PIN)",
    optionalBadge: "Προαιρετικό",
    pinOptionalPlaceholder: "Αφήστε κενό για είσοδο χωρίς PIN, ή 4+ ψηφία",
    confirmPinLabel: "Επιβεβαίωση PIN",
    reenterPinPlaceholder: "Επανεισάγετε το PIN",
    highSecurityAssuranceTitle: "Υψηλό Επίπεδο Ασφάλειας & Κρυπτογράφησης",
    highSecurityAssuranceDesc: "Οι συναλλαγές κρυπτογραφούνται τοπικά με AES-GCM-256 και PBKDF2 με προστασία από παραβίαση.",
    creatingVaultBtn: "Δημιουργία...",
    createAndProtectVaultBtn: "Δημιουργία & Προστασία",
    enterVaultNowBtn: "Είσοδος στο Θησαυροφυλάκιο",
    returnToHomeImmediate: "Επιστροφή στην Αρχική άμεσα",
    returnToVaultList: "Επιστροφή στη Λίστα Θησαυροφυλακίων",
    chooseBackupFileLabel: "Επιλογή Αρχείου Αντιγράφου",
    selectedFilePrefix: "Επιλεγμένο αρχείο:",
    newPinForImportOptional: "Νέο PIN για το εισαγόμενο θησαυροφυλάκιο (προαιρετικό)",
    newPinImportPlaceholder: "Αφήστε κενό ή τουλάχιστον 4 ψηφία",
    importingBtn: "Εισαγωγή...",
    restoreVaultAndActivateBtn: "Επαναφορά & Ενεργοποίηση",
    cancelAndReturnHome: "Ακύρωση & Επιστροφή στην Αρχική",
    enterCurrentPinToUnlockError: "Εισαγάγετε το τρέχον PIN για αφαίρεση του κλειδώματος",
    editVaultSecurityTitle: "Επεξεργασία PIN Θησαυροφυλακίου",
    setVaultSecurityTitle: "Ορισμός PIN Θησαυροφυλακίου",
    returnToHomeBtn: "Πίσω στην Αρχική",
    securitySettingsSaved: "Οι ρυθμίσεις ασφαλείας αποθηκεύτηκαν επιτυχώς!",
    newPinLabel: "Νέο PIN (τουλάχιστον 4 ψηφία)",
    newPinPlaceholder: "Εισαγάγετε νέο PIN ασφαλείας",
    pinExplanation: "Όταν ενεργοποιηθεί το PIN, όλες οι οικονομικές συναλλαγές κρυπτογραφούνται τοπικά με κλειδί AES-256-GCM.",
    encryptingAndSaving: "Κρυπτογράφηση και αποθήκευση...",
    saveAndActivatePin: "Αποθήκευση & Ενεργοποίηση PIN",
    removePinLabel: "Αφαίρεση προστασίας PIN και άνοιγμα θησαυροφυλακίου:",
    enterCurrentPinPlaceholder: "Εισαγάγετε το τρέχον PIN",
    removePinBtn: "Αφαίρεση Κλειδώματος",

    // Backup & Restore Modal
    backupAndRestoreTitle: "Αντίγραφο Ασφαλείας & Επαναφορά",
    exportBackupTab: "Εξαγωγή Αντιγράφου",
    importBackupTab: "Εισαγωγή Αντιγράφου",
    exportBackupDescPrefix: "Εξαγωγή αρχείου με όλα τα δεδομένα του ενεργού θησαυροφυλακίου (",
    exportBackupDescSuffix: ") συμπεριλαμβανομένων των συναλλαγών και υπολοίπων για μεταφορά σε άλλη συσκευή.",
    prepareBackupBtn: "Προετοιμασία Αρχείου Αντιγράφου",
    downloadBackupFileBtn: "Λήψη Αρχείου Τώρα",
    backupJsonFileLabel: "Αρχείο αντιγράφου (.json)",
    pinForImportedVaultOptional: "PIN για το εισαγόμενο θησαυροφυλάκιο (προαιρετικό)",
    confirmImportBtn: "Επιβεβαίωση Εισαγωγής",
    backupReadySuccess: "Το αντίγραφο ασφαλείας είναι έτοιμο! Κάντε κλικ στο κουμπί λήψης.",
    backupReadyFailed: "Αποτυχία προετοιμασίας αντιγράφου ασφαλείας.",
    backupImportSuccess: "Το θησαυροφυλάκιο εισήχθη επιτυχώς!",
    backupImportError: "Σφάλμα κατά την εισαγωγή:",
    fileReadError: "Σφάλμα κατά την ανάγνωση του αρχείου.",

    // Auth screen & Lock
    authScreenTitle: "Κρυπτογραφημένο Θησαυροφυλάκιο",
    authScreenSubtitle: "Τα κεφάλαια και τα αρχεία σας προστατεύονται τοπικά με πλήρη κρυπτογράφηση",
    btnEnterPin: "Εισαγωγή PIN",
    btnCreateNewVault: "Δημιουργία Νέου Θησαυροφυλακίου",
    btnImportBackup: "Εισαγωγή Αντιγράφου Ασφαλείας",
    btnSkipToMain: "Συνέχεια στην Κύρια Οθόνη",
    privacyAssurance: "Πλήρως τοπική εφαρμογή εκτός σύνδεσης. Τα οικονομικά σας δεδομένα δεν φεύγουν ποτέ από αυτήν τη συσκευή.",
    privacyLink: "Πολιτική Απορρήτου",
  },
} as const;

export type TranslationKey = keyof typeof translations.ar;

export function t(key: TranslationKey, lang: Language = "ar"): string {
  const langDict = translations[lang] || translations.ar;
  return (langDict as any)[key] || (translations.ar as any)[key] || key;
}

export function formatPocketName(pocket: Pocket, lang: Language = "ar"): string {
  if (lang === "en") return pocket === "cash" ? "Cash" : "Bank";
  if (lang === "el") return pocket === "cash" ? "Μετρητά" : "Τράπεζα";
  return pocket === "cash" ? "الكاش" : "البنك";
}

export function formatTimeLocalized(at: number, lang: Language = "ar"): string {
  const locale = lang === "en" ? "en-US" : lang === "el" ? "el-GR" : "ar-EG";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    numberingSystem: "latn",
  }).format(new Date(at));
}

export function formatMonthLocalized(date = new Date(), lang: Language = "ar"): string {
  const locale = lang === "en" ? "en-US" : lang === "el" ? "el-GR" : "ar-EG";
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    numberingSystem: "latn",
  }).format(date);
}

export function formatDayLocalized(at: number, lang: Language = "ar"): string {
  const date = new Date(at);
  const now = new Date();
  const start = (v: Date) => new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime();
  const diff = Math.round((start(now) - start(date)) / 86_400_000);

  if (diff === 0) return t("today", lang);
  if (diff === 1) return t("yesterday", lang);

  const locale = lang === "en" ? "en-US" : lang === "el" ? "el-GR" : "ar-EG";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    numberingSystem: "latn",
  }).format(date);
}

export function translateSystemNote(note: string, lang: Language): string {
  if (!note) return "";
  const trimmed = note.trim();

  const dict: Record<string, Record<Language, string>> = {
    "رصيد افتتاحي": { ar: "رصيد افتتاحي", en: "Opening Balance", el: "Αρχικό Υπόλοιπο" },
    "Opening balance": { ar: "رصيد افتتاحي", en: "Opening Balance", el: "Αρχικό Υπόλοιπο" },
    "Opening Balance": { ar: "رصيد افتتاحي", en: "Opening Balance", el: "Αρχικό Υπόλοιπο" },
    "Αρχικό υπόλοιπο": { ar: "رصيد افتتاحي", en: "Opening Balance", el: "Αρχικό Υπόλοιπο" },
    "Αρχικό Υπόλοιπο": { ar: "رصيد افتتاحي", en: "Opening Balance", el: "Αρχικό Υπόλοιπο" },

    "رصيد الكاش المثبت": { ar: "رصيد الكاش المثبت", en: "Confirmed Cash Balance", el: "Επιβεβαιωμένο Υπόλοιπο Μετρητών" },
    "Confirmed Cash Balance": { ar: "رصيد الكاش المثبت", en: "Confirmed Cash Balance", el: "Επιβεβαιωμένο Υπόλοιπο Μετρητών" },

    "رصيد البنك المثبت": { ar: "رصيد البنك المثبت", en: "Confirmed Bank Balance", el: "Επιβεβαιωμένο Υπόλοιπο Τράπεζας" },
    "Confirmed Bank Balance": { ar: "رصيد البنك المثبت", en: "Confirmed Bank Balance", el: "Επιβεβαιωμένο Υπόλοιπο Τράπεζας" },

    "مستحق قائم ومحفوظ": { ar: "مستحق قائم ومحفوظ", en: "Saved Receivable", el: "Αποθηκευμένη Απαίτηση" },
    "دين قائم ومحفوظ": { ar: "دين قائم ومحفوظ", en: "Saved Debt", el: "Αποθηκευμένη Οφειλή" },

    "تصحيح الرصيد": { ar: "تصحيح الرصيد", en: "Balance Adjustment", el: "Διόρθωση Υπολοίπου" },
    "تصحيح رصيد": { ar: "تصحيح رصيد", en: "Balance Adjustment", el: "Διόρθωση Υπολοίπου" },
    "Balance Adjustment": { ar: "تصحيح الرصيد", en: "Balance Adjustment", el: "Διόρθωση Υπολοίπου" },
    "تعديل رصيد": { ar: "تصحيح الرصيد", en: "Balance Adjustment", el: "Διόρθωση Υπολοίπου" },

    "شراء": { ar: "شراء", en: "Purchase", el: "Αγορά" },
    "Purchase": { ar: "شراء", en: "Purchase", el: "Αγορά" },

    "دخل": { ar: "دخل", en: "Income", el: "Έσοδο" },
    "Income": { ar: "دخل", en: "Income", el: "Έσοδο" },

    "تحويل": { ar: "تحويل", en: "Transfer", el: "Μεταφορά" },
    "Transfer": { ar: "تحويل", en: "Transfer", el: "Μεταφορά" },

    "دين لك": { ar: "دين لك", en: "Loan / Receivable", el: "Απαίτηση" },
    "دين عليك": { ar: "دين عليك", en: "Debt Owed", el: "Οφειλή" },
    "تحصيل دين": { ar: "تحصيل دين", en: "Debt Collected", el: "Είσπραξη Οφειλής" },
    "سداد دين": { ar: "سداد دين", en: "Debt Repaid", el: "Εξόφληση Χρέους" },
    "إسقاط دين لك": { ar: "إسقاط دين لك", en: "Waived Claim", el: "Διαγραφή Απαίτησης" },
    "إسقاط دين عليك": { ar: "إسقاط دين عليك", en: "Waived Debt", el: "Διαγραφή Οφειλής" },
  };

  return dict[trimmed]?.[lang] || trimmed;
}

export function describeLocalized(tx: Tx, lang: Language = "ar") {
  const who = tx.person
    ? (tx.person === "شخص" || tx.person === "Unknown" || tx.person === "Άγνωστος"
        ? (lang === "en" ? "Someone" : lang === "el" ? "Κάποιος" : "شخص")
        : tx.person)
    : (lang === "en" ? "Someone" : lang === "el" ? "Κάποιος" : "شخص");
  const note = translateSystemNote(tx.note, lang);

  if (lang === "en") {
    switch (tx.kind) {
      case "purchase":
        return {
          title: note || "Purchase",
          detail: tx.pocket ? `Paid with ${formatPocketName(tx.pocket, "en")}` : "Expense",
          tone: "out" as const,
          cents: Math.abs(tx.amount),
        };
      case "income":
        return {
          title: note || "Income",
          detail: tx.pocket ? `Deposited to ${formatPocketName(tx.pocket, "en")}` : "Income",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "transfer":
        return {
          title: "Transfer",
          detail:
            tx.pocket && tx.toPocket
              ? `From ${formatPocketName(tx.pocket, "en")} to ${formatPocketName(tx.toPocket, "en")}`
              : "Between accounts",
          tone: "neutral" as const,
          cents: Math.abs(tx.amount),
        };
      case "receivable":
        return {
          title: `Owed by ${who}`,
          detail: note || "Loan / Receivable",
          tone: "asset" as const,
          cents: Math.abs(tx.amount),
        };
      case "payable":
        return {
          title: `Owed to ${who}`,
          detail: note || "Debt",
          tone: "debt" as const,
          cents: Math.abs(tx.amount),
        };
      case "collect":
        return {
          title: `Collected from ${who}`,
          detail: tx.pocket ? `To ${formatPocketName(tx.pocket, "en")}` : "Debt collected",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "repay":
        return {
          title: `Repaid to ${who}`,
          detail: tx.pocket ? `From ${formatPocketName(tx.pocket, "en")}` : "Debt repaid",
          tone: "out" as const,
          cents: Math.abs(tx.amount),
        };
      case "waive-in":
        return {
          title: `Waived claim on ${who}`,
          detail: note || "Debt cancelled",
          tone: "debt" as const,
          cents: Math.abs(tx.amount),
        };
      case "waive-out":
        return {
          title: `Debt forgiven by ${who}`,
          detail: note || "Debt forgiven",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "adjust":
        return {
          title: note || "Balance Adjustment",
          detail: tx.pocket ? formatPocketName(tx.pocket, "en") : "Correction",
          tone: tx.amount < 0 ? ("out" as const) : ("in" as const),
          cents: Math.abs(tx.amount),
        };
    }
  }

  if (lang === "el") {
    switch (tx.kind) {
      case "purchase":
        return {
          title: note || "Αγορά",
          detail: tx.pocket ? `Πληρωμή με ${formatPocketName(tx.pocket, "el")}` : "Έξοδο",
          tone: "out" as const,
          cents: Math.abs(tx.amount),
        };
      case "income":
        return {
          title: note || "Έσοδο",
          detail: tx.pocket ? `Κατάθεση σε ${formatPocketName(tx.pocket, "el")}` : "Έσοδο",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "transfer":
        return {
          title: "Μεταφορά",
          detail:
            tx.pocket && tx.toPocket
              ? `Από ${formatPocketName(tx.pocket, "el")} σε ${formatPocketName(tx.toPocket, "el")}`
              : "Μεταξύ λογαριασμών",
          tone: "neutral" as const,
          cents: Math.abs(tx.amount),
        };
      case "receivable":
        return {
          title: `Οφειλή από ${who}`,
          detail: note || "Απαίτηση",
          tone: "asset" as const,
          cents: Math.abs(tx.amount),
        };
      case "payable":
        return {
          title: `Οφειλή προς ${who}`,
          detail: note || "Χρέος",
          tone: "debt" as const,
          cents: Math.abs(tx.amount),
        };
      case "collect":
        return {
          title: `Είσπραξη από ${who}`,
          detail: tx.pocket ? `Σε ${formatPocketName(tx.pocket, "el")}` : "Είσπραξη οφειλής",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "repay":
        return {
          title: `Εξόφληση προς ${who}`,
          detail: tx.pocket ? `Από ${formatPocketName(tx.pocket, "el")}` : "Εξόφληση χρέους",
          tone: "out" as const,
          cents: Math.abs(tx.amount),
        };
      case "waive-in":
        return {
          title: `Διαγραφή απαίτησης από ${who}`,
          detail: note || "Ακύρωση απαίτησης",
          tone: "debt" as const,
          cents: Math.abs(tx.amount),
        };
      case "waive-out":
        return {
          title: `Διαγραφή οφειλής προς ${who}`,
          detail: note || "Χαρίστηκε",
          tone: "in" as const,
          cents: Math.abs(tx.amount),
        };
      case "adjust":
        return {
          title: note || "Διόρθωση Υπολοίπου",
          detail: tx.pocket ? formatPocketName(tx.pocket, "el") : "Διόρθωση",
          tone: tx.amount < 0 ? ("out" as const) : ("in" as const),
          cents: Math.abs(tx.amount),
        };
    }
  }

  // Fallback Arabic
  switch (tx.kind) {
    case "purchase":
      return {
        title: note || "شراء",
        detail: tx.pocket ? `خصم من ${formatPocketName(tx.pocket, "ar")}` : "مصروف",
        tone: "out" as const,
        cents: Math.abs(tx.amount),
      };
    case "income":
      return {
        title: note || "دخل",
        detail: tx.pocket ? `إيداع في ${formatPocketName(tx.pocket, "ar")}` : "دخل",
        tone: "in" as const,
        cents: Math.abs(tx.amount),
      };
    case "transfer":
      return {
        title: "تحويل",
        detail:
          tx.pocket && tx.toPocket
            ? `من ${formatPocketName(tx.pocket, "ar")} إلى ${formatPocketName(tx.toPocket, "ar")}`
            : "بين الكاش والبنك",
        tone: "neutral" as const,
        cents: Math.abs(tx.amount),
      };
    case "receivable":
      return {
        title: `لك عند ${who}`,
        detail: note || "دين لك",
        tone: "asset" as const,
        cents: Math.abs(tx.amount),
      };
    case "payable":
      return {
        title: `عليك لـ ${who}`,
        detail: note || "دين عليك",
        tone: "debt" as const,
        cents: Math.abs(tx.amount),
      };
    case "collect":
      return {
        title: `استلمت من ${who}`,
        detail: tx.pocket ? `إلى ${formatPocketName(tx.pocket, "ar")} · الصافي لم يتغير` : "تحصيل دين",
        tone: "in" as const,
        cents: Math.abs(tx.amount),
      };
    case "repay":
      return {
        title: `سددت إلى ${who}`,
        detail: tx.pocket ? `من ${formatPocketName(tx.pocket, "ar")} · الصافي لم يتغير` : "سداد دين",
        tone: "out" as const,
        cents: Math.abs(tx.amount),
      };
    case "waive-in":
      return {
        title: `شطب دين لك عند ${who}`,
        detail: note || "لن يُحصَّل · نُقص من الصافي",
        tone: "debt" as const,
        cents: Math.abs(tx.amount),
      };
    case "waive-out":
      return {
        title: `شطب دين عليك لـ ${who}`,
        detail: note || "سُقط عنك · زاد الصافي",
        tone: "in" as const,
        cents: Math.abs(tx.amount),
      };
    case "adjust":
      return {
        title: note || "تصحيح رصيد",
        detail: tx.pocket ? formatPocketName(tx.pocket, "ar") : "تصحيح",
        tone: tx.amount < 0 ? ("out" as const) : ("in" as const),
        cents: Math.abs(tx.amount),
      };
  }
}
