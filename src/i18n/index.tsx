import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  isValidElement,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "./en";
import ur from "./ur";
import type { Translations } from "./en";

// ─── Supported languages ──────────────────────────────────────────────────
export type Locale = "en" | "ur";

export const LOCALES: { id: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl"; font: string }[] = [
  { id: "en", label: "English", nativeLabel: "English", dir: "ltr", font: "" },
  { id: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", font: "'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'Noto Sans', sans-serif" },
];

// ─── Translation map ──────────────────────────────────────────────────────
const translations: Record<Locale, Translations> = { en, ur };

const localizedTextMap = new Map<string, string>();

function collectTextPairs(english: unknown, urdu: unknown) {
  if (typeof english === "string" && typeof urdu === "string") {
    localizedTextMap.set(english, urdu);
    return;
  }
  if (Array.isArray(english) && Array.isArray(urdu)) {
    english.forEach((value, index) => collectTextPairs(value, urdu[index]));
    return;
  }
  if (english && urdu && typeof english === "object" && typeof urdu === "object") {
    for (const key of Object.keys(english)) {
      collectTextPairs(
        (english as Record<string, unknown>)[key],
        (urdu as Record<string, unknown>)[key],
      );
    }
  }
}

collectTextPairs(en, ur);

const FALLBACK_URDU_WORDS: Record<string, string> = {
  access: "رسائی",
  account: "اکاؤنٹ",
  accuracy: "درستگی",
  action: "عمل",
  active: "فعال",
  add: "شامل کریں",
  admin: "ایڈمن",
  admins: "ایڈمنز",
  affected: "متاثرہ",
  alert: "انتباہ",
  alerts: "انتباہات",
  all: "تمام",
  amount: "رقم",
  analytics: "تجزیہ",
  approve: "منظور کریں",
  approved: "منظور شدہ",
  archive: "محفوظ کریں",
  assigned: "تفویض شدہ",
  attachments: "منسلک فائلیں",
  audit: "آڈٹ",
  available: "دستیاب",
  average: "اوسط",
  back: "واپس",
  batch: "بیچ",
  batches: "بیچز",
  billing: "بلنگ",
  body: "متن",
  blocked: "بلاک شدہ",
  business: "کاروبار",
  cancel: "منسوخ کریں",
  cancelled: "منسوخ شدہ",
  carrier: "کیریئر",
  carriers: "کیریئرز",
  category: "زمرہ",
  change: "تبدیلی",
  check: "چیک",
  clear: "صاف کریں",
  close: "بند کریں",
  closed: "بند شدہ",
  code: "کوڈ",
  company: "کمپنی",
  completed: "مکمل شدہ",
  compliance: "تعمیل",
  configure: "ترتیب دیں",
  connected: "منسلک",
  contact: "رابطہ",
  continue: "جاری رکھیں",
  cost: "لاگت",
  count: "تعداد",
  created: "بنایا گیا",
  customer: "گاہک",
  data: "ڈیٹا",
  database: "ڈیٹا بیس",
  date: "تاریخ",
  days: "دن",
  default: "پہلے سے طے شدہ",
  delete: "حذف کریں",
  delivered: "پہنچا دیا گیا",
  delivery: "ترسیل",
  description: "تفصیل",
  details: "تفصیل",
  device: "ڈیوائس",
  devices: "ڈیوائسز",
  disabled: "غیر فعال",
  display: "دکھائیں",
  disputes: "تنازعات",
  document: "دستاویز",
  documents: "دستاویزات",
  download: "ڈاؤن لوڈ کریں",
  driver: "ڈرائیور",
  drivers: "ڈرائیورز",
  duration: "دورانیہ",
  edit: "ترمیم کریں",
  email: "ای میل",
  enabled: "فعال",
  environment: "ماحول",
  error: "خرابی",
  errors: "خرابیاں",
  event: "واقعہ",
  events: "واقعات",
  export: "برآمد کریں",
  failed: "ناکام",
  failure: "ناکامی",
  field: "فیلڈ",
  file: "فائل",
  filter: "فلٹر",
  finance: "مالیات",
  fleet: "بیڑا",
  from: "سے",
  full: "مکمل",
  history: "تاریخ",
  health: "صحت",
  hide: "چھپائیں",
  hours: "گھنٹے",
  humidity: "نمی",
  id: "آئی ڈی",
  incidents: "واقعات",
  inactive: "غیر فعال",
  included: "شامل",
  information: "معلومات",
  install: "انسٹال",
  installed: "انسٹال شدہ",
  installation: "انسٹالیشن",
  invoice: "انوائس",
  invoices: "انوائسز",
  issue: "مسئلہ",
  items: "اشیا",
  key: "کی",
  last: "گزشتہ",
  latest: "تازہ ترین",
  ledger: "لیجر",
  level: "سطح",
  link: "لنک",
  live: "براہ راست",
  loading: "لوڈ ہو رہا ہے",
  location: "مقام",
  logs: "لاگز",
  low: "کم",
  maintenance: "دیکھ بھال",
  manager: "مینیجر",
  managers: "مینیجرز",
  marketplace: "مارکیٹ پلیس",
  message: "پیغام",
  messages: "پیغامات",
  metric: "میٹرک",
  metrics: "میٹرکس",
  minutes: "منٹ",
  model: "ماڈل",
  monthly: "ماہانہ",
  more: "مزید",
  name: "نام",
  native: "مقامی",
  net: "خالص",
  new: "نیا",
  next: "اگلا",
  no: "کوئی نہیں",
  note: "نوٹ",
  notes: "نوٹس",
  notification: "اطلاع",
  notifications: "اطلاعات",
  offline: "آف لائن",
  on: "آن",
  online: "آن لائن",
  open: "کھلا",
  opened: "کھولا گیا",
  order: "آرڈر",
  orders: "آرڈرز",
  overdue: "تاخیر شدہ",
  paid: "ادا شدہ",
  page: "صفحہ",
  pending: "زیر التوا",
  performance: "کارکردگی",
  personal: "ذاتی",
  phone: "فون",
  plan: "پلان",
  platform: "پلیٹ فارم",
  policy: "پالیسی",
  policies: "پالیسیاں",
  preview: "پیش نظارہ",
  price: "قیمت",
  priority: "ترجیح",
  product: "پروڈکٹ",
  products: "پروڈکٹس",
  profile: "پروفائل",
  publish: "شائع کریں",
  push: "پش",
  quantity: "مقدار",
  read: "پڑھا ہوا",
  readings: "ریڈنگز",
  recipient: "وصول کنندہ",
  records: "ریکارڈز",
  refresh: "تازہ کریں",
  rejected: "مسترد شدہ",
  remove: "ہٹائیں",
  report: "رپورٹ",
  reports: "رپورٹس",
  request: "درخواست",
  requests: "درخواستیں",
  required: "ضروری",
  reset: "ری سیٹ",
  resolve: "حل کریں",
  resolved: "حل شدہ",
  review: "جائزہ",
  save: "محفوظ کریں",
  scheduled: "شیڈول شدہ",
  search: "تلاش",
  security: "سکیورٹی",
  select: "منتخب کریں",
  seller: "فروخت کنندہ",
  send: "بھیجیں",
  sensor: "سینسر",
  sensors: "سینسرز",
  service: "سروس",
  settings: "ترتیبات",
  shipment: "شپمنٹ",
  shipments: "شپمنٹس",
  show: "دکھائیں",
  sign: "دستخط",
  silo: "سائلو",
  silos: "سائلو",
  source: "ماخذ",
  status: "حالت",
  storage: "اسٹوریج",
  submit: "جمع کریں",
  subscription: "رکنیت",
  subscriptions: "رکنیتیں",
  support: "مدد",
  suspend: "معطل کریں",
  system: "سسٹم",
  team: "ٹیم",
  technician: "ٹیکنیشن",
  technicians: "ٹیکنیشنز",
  tenant: "کمپنی",
  tenants: "کمپنیاں",
  temperature: "درجہ حرارت",
  test: "ٹیسٹ",
  total: "کل",
  tracking: "ٹریکنگ",
  update: "اپ ڈیٹ",
  updated: "اپ ڈیٹ شدہ",
  upload: "اپ لوڈ کریں",
  user: "صارف",
  users: "صارفین",
  value: "قدر",
  vehicle: "گاڑی",
  vehicles: "گاڑیاں",
  version: "ورژن",
  view: "دیکھیں",
  volume: "حجم",
  warehouse: "گودام",
  warehouses: "گودام",
  warning: "انتباہ",
  webhook: "ویب ہک",
  weekly: "ہفتہ وار",
  when: "کب",
  with: "کے ساتھ",
  without: "کے بغیر",
  year: "سال",
  yearly: "سالانہ",
  yes: "ہاں",
  carousel: "سلائیڈ شو",
  more: "مزید",
  next: "اگلا",
  pages: "صفحات",
  pagination: "صفحہ بندی",
  previous: "پچھلا",
  slide: "سلائیڈ",
  sidebar: "سائیڈ بار",
  toggle: "بدلیں",
  your: "آپ کا",
  and: "اور",
  are: "ہیں",
  by: "کی طرف سے",
  for: "کے لیے",
  in: "میں",
  is: "ہے",
  of: "کا",
  or: "یا",
  the: "یہ",
  this: "یہ",
  to: "کو",
  up: "تک",
  daysleft: "دن باقی",
};

const LOCALIZED_TEXT_PROPS = new Set([
  "alt",
  "aria-label",
  "description",
  "emptyText",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "text",
  "title",
]);

export function translateText(value: string, locale: Locale): string {
  if (locale !== "ur") return value;
  const exact = localizedTextMap.get(value);
  if (exact) return exact;
  if (value.includes("://") || value.includes("/api/") || /^[A-Z0-9_./:-]+$/.test(value)) {
    return value;
  }
  let translatedWords = 0;
  const translated = value.replace(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g, (word) => {
    const replacement = FALLBACK_URDU_WORDS[word.toLowerCase()];
    if (!replacement) return word;
    translatedWords += 1;
    return replacement;
  });
  return translatedWords > 0 ? translated : value;
}

function localizeNode(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translateText(node, locale);
  if (Array.isArray(node)) return node.map((child) => localizeNode(child, locale));
  if (!isValidElement(node)) return node;

  const element = node as React.ReactElement<Record<string, unknown>>;
  const nextProps: Record<string, unknown> = { ...element.props };
  let changed = false;

  const elementType = typeof element.type === "string" ? element.type : "";
  if ("children" in element.props && elementType !== "code" && elementType !== "pre") {
    const children = localizeNode(element.props.children as ReactNode, locale);
    if (children !== element.props.children) {
      nextProps.children = children;
      changed = true;
    }
  }

  for (const [name, value] of Object.entries(element.props)) {
    if (typeof value !== "string" || !LOCALIZED_TEXT_PROPS.has(name)) continue;
    const translated = translateText(value, locale);
    if (translated !== value) {
      nextProps[name] = translated;
      changed = true;
    }
  }

  return changed ? cloneElement(element, nextProps) : node;
}

export function LocalizedContent({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <>{localizeNode(children, locale)}</>;
}

const STORAGE_KEY = "gh-locale";

function getStoredLocale(): Locale {
  if (typeof localStorage === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return v && v in translations ? v : "en";
}

function applyLocaleToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const def = LOCALES.find((l) => l.id === locale);
  document.documentElement.lang = locale;
  // Keep the document direction LTR in every language so the layout stays
  // identical to the English design. Urdu words render correctly inside an
  // LTR layout via the browser's bidirectional text engine. Flipping the
  // document to RTL reverses per-letter animated labels (e.g. the sidebar's
  // VariableFontText) and mirrors the whole design, which users reported as
  // broken — so we never flip.
  document.documentElement.dir = "ltr";
  // Apply language-specific font
  if (def?.font) {
    document.documentElement.style.setProperty("--font-lang", def.font);
  } else {
    document.documentElement.style.removeProperty("--font-lang");
  }
}

// ─── Context ──────────────────────────────────────────────────────────────
type I18nContextValue = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: en,
  setLocale: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyLocaleToDocument(next);
  }, []);

  // Apply on mount + whenever locale changes
  useEffect(() => {
    applyLocaleToDocument(locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, t: translations[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Convenience hook that returns a typed `t` object.
 *
 * Supports simple interpolation: `t("dashboard.welcome", { name: "Ali" })`
 * replaces `{{name}}` in the string.
 */
export function useTranslation() {
  const { locale, t, setLocale } = useI18n();

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const lookup = (dict: Translations): string | null => {
        let result: unknown = dict;
        for (const part of key.split(".")) {
          if (result && typeof result === "object" && part in result) {
            result = (result as Record<string, unknown>)[part];
          } else {
            return null;
          }
        }
        return typeof result === "string" ? result : null;
      };
      // Prefer the active locale; fall back to English so a missing
      // translation never leaks a raw dotted key into the UI.
      const result = lookup(t) ?? lookup(en);
      if (result === null) return key;
      if (!params) return result;
      // Interpolate {{param}} placeholders
      return result.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        name in params ? String(params[name]) : `{{${name}}}`,
      );
    },
    [t],
  );

  return { t: translate, locale, setLocale, raw: t };
}
