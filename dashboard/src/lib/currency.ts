export type CurrencyCode = 'USD' | 'CHF' | 'GBP' | 'EUR' | 'AUD' | 'CAD';

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  prefix: boolean; // true = symbol before number, false = after
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', prefix: true },
  CHF: { code: 'CHF', symbol: 'CHF', prefix: false },
  GBP: { code: 'GBP', symbol: '£', prefix: true },
  EUR: { code: 'EUR', symbol: '€', prefix: true },
  AUD: { code: 'AUD', symbol: 'A$', prefix: true },
  CAD: { code: 'CAD', symbol: 'C$', prefix: true },
};

// Countries that use CHF
const CHF_COUNTRIES = new Set(['CH', 'LI']);

// Countries that use GBP
const GBP_COUNTRIES = new Set(['GB']);

// Countries that use AUD
const AUD_COUNTRIES = new Set(['AU']);

// Countries that use CAD
const CAD_COUNTRIES = new Set(['CA']);

// European countries → EUR (all that aren't CHF or GBP)
const EUR_COUNTRIES = new Set([
  // Eurozone
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR',
  // Non-Eurozone European (user wants all non-CHF Europe as EUR)
  'SE', 'NO', 'DK', 'PL', 'CZ', 'HU', 'RO', 'BG', 'IS',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK', 'AL', 'BA', 'MK', 'RS',
  'MD', 'UA', 'BY',
]);

function countryToCurrency(countryCode: string): CurrencyCode {
  const cc = countryCode.toUpperCase();
  if (CHF_COUNTRIES.has(cc)) return 'CHF';
  if (GBP_COUNTRIES.has(cc)) return 'GBP';
  if (AUD_COUNTRIES.has(cc)) return 'AUD';
  if (CAD_COUNTRIES.has(cc)) return 'CAD';
  if (EUR_COUNTRIES.has(cc)) return 'EUR';
  return 'USD';
}

// Map IANA timezones to country codes for fallback detection
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Europe/Zurich': 'CH',
  'Europe/Vaduz': 'LI',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Lord_Howe': 'AU',
  'Australia/Eucla': 'AU',
  'Australia/Lindeman': 'AU',
  'Australia/Broken_Hill': 'AU',
  // Canadian timezones
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Moncton': 'CA',
  'America/Regina': 'CA',
  'America/Thunder_Bay': 'CA',
  'America/Iqaluit': 'CA',
  'America/Rankin_Inlet': 'CA',
  'America/Whitehorse': 'CA',
  'America/Dawson': 'CA',
  'America/Yellowknife': 'CA',
  'America/Swift_Current': 'CA',
  'America/Cambridge_Bay': 'CA',
  'America/Inuvik': 'CA',
  'America/Creston': 'CA',
  'America/Fort_Nelson': 'CA',
  'America/Glace_Bay': 'CA',
  'America/Goose_Bay': 'CA',
  'America/Nipigon': 'CA',
  'America/Pangnirtung': 'CA',
  'America/Rainy_River': 'CA',
  'America/Resolute': 'CA',
  'America/Atikokan': 'CA',
  'America/Blanc-Sablon': 'CA',
};

// European timezone prefixes (everything under Europe/ that isn't CH/GB)
const EUROPE_TZ_NON_EUR: Record<string, string> = {
  'Europe/Zurich': 'CH',
  'Europe/Vaduz': 'LI', // LI uses CHF
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Guernsey': 'GB',
  'Europe/Isle_of_Man': 'GB',
  'Europe/Jersey': 'GB',
};

/**
 * Detect the user's currency based on browser locale and timezone.
 * Only returns USD, CHF, GBP, EUR, AUD, or CAD.
 */
export function detectCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';

  // Strategy 1: Use timezone (most reliable for physical location)
  // Language codes like "en-GB" only indicate the language variant, not location —
  // a Swiss user with English iOS will have "en-GB" but timezone "Europe/Zurich".
  let tzCurrency: CurrencyCode | null = null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Check direct timezone mapping
    if (TIMEZONE_COUNTRY[tz]) {
      tzCurrency = countryToCurrency(TIMEZONE_COUNTRY[tz]);
    } else if (tz.startsWith('Australia/')) {
      tzCurrency = 'AUD';
    } else if (tz.startsWith('Europe/')) {
      // Check Europe/* pattern — if not CH/LI/GB, it's EUR
      const nonEur = EUROPE_TZ_NON_EUR[tz];
      tzCurrency = nonEur ? countryToCurrency(nonEur) : 'EUR';
    }
  } catch {
    // Intl not available, fall through
  }

  if (tzCurrency) return tzCurrency;

  // Strategy 2: Extract country from navigator.language as fallback
  // Only used when timezone didn't resolve (rare)
  const languages = navigator.languages ?? [navigator.language];
  for (const lang of languages) {
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].toUpperCase();
      if (country.length === 2 && /^[A-Z]{2}$/.test(country)) {
        const currency = countryToCurrency(country);
        if (currency !== 'USD') return currency;
      }
    }
  }

  return 'USD';
}

/**
 * Format a price with the correct currency symbol.
 * Always shows whole numbers as integers, decimals with 2 places.
 */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency];
  const formatted = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);

  if (config.prefix) {
    return `${config.symbol}${formatted}`;
  }
  // CHF: "19 CHF" or "15.20 CHF"
  return `${formatted} ${config.symbol}`;
}

/**
 * Get just the currency symbol for display.
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Check if the currency symbol is a prefix (before the number).
 */
export function isCurrencyPrefix(currency: CurrencyCode): boolean {
  return CURRENCIES[currency].prefix;
}

// Allowed currencies for validation
const ALLOWED_CURRENCIES = new Set<string>(['usd', 'chf', 'gbp', 'eur', 'aud', 'cad']);

/**
 * Validate that a currency string is one of our supported currencies.
 * Returns lowercase currency code or 'usd' as fallback.
 */
export function validateCurrency(currency: string): string {
  const lower = currency.toLowerCase();
  return ALLOWED_CURRENCIES.has(lower) ? lower : 'usd';
}
