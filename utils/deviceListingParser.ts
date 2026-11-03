import { getAllDevices, getDeviceById } from './catalogHelper';
import { barePrice, explicitPrices, selectPrice } from './listingPrice';
import type { DeviceItem } from '../types/catalog';
import type { ParsedListingResult } from '../types/listing';

const MAX_TEXT_LENGTH = 12000;

function fold(text: string): string {
  return text.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function modelText(text: string): string {
  return fold(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(?:ip|iphon|ayfon)(?=\s*\d|\b)/g, 'iphone')
    .replace(/\b(?:samsng|samsun)\b/g, 'samsung')
    .replace(/\b(?:xiomi|xaiomi)\b/g, 'xiaomi')
    .replace(/\+/g, ' plus ')
    .replace(/\b(?:samsung|galaxy)\b/g, ' ')
    .replace(/\biphone\s*(\d{1,2})\s*(pm|promax|pro\s+max|p)\b/g,
      (_, generation: string, suffix: string) => `iphone ${generation} ${suffix === 'p' ? 'pro' : 'pro max'}`)
    .replace(/\bs(2[0-4])\s*(ultra|u|plus|fe)?\b/g,
      (_, generation: string, suffix: string | undefined) =>
        `s${generation} ${suffix === 'u' ? 'ultra' : suffix ?? ''}`)
    .replace(/\ba(52s|5[2-5])\b/g,
      (_, generation: string) => `a${generation}${generation === '52' ? '' : ' 5g'}`)
    .replace(/\b(?:z\s*)?(flip|fold)\s*([3-6])\b/g, 'z $1$2')
    .replace(/\b1st\s+generation\b|\b1\.\s*nesil\b|\bnesil\s*1\b/g, '1')
    .replace(/\b2nd\s+generation\b|\b2\.\s*nesil\b|\bnesil\s*2\b/g, '2')
    .replace(/\b3rd\s+generation\b|\b3\.\s*nesil\b|\bnesil\s*3\b/g, '3')
    .replace(/\bse\s*([123])\b/g, 'se $1')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const devices = getAllDevices();
const names = new Set(devices.map((device) => modelText(device.model)));
const modelIndex = devices.map((device) => {
  const name = modelText(device.model).replace(/ konsept ongoru$/, '');
  const aliases = [name];
  // Only omit network suffixes where a distinct 4G model cannot be confused.
  if (name.endsWith(' 5g') && !names.has(name.replace(/ 5g$/, ''))) {
    aliases.push(name.replace(/ 5g$/, ''));
  }
  return {
    device,
    has5gVariant: names.has(`${name} 5g`),
    patterns: aliases.map((alias) => new RegExp(
      `(?<![a-z0-9])${alias.split(/\s+/).map(escapeRegex).join('\\s*')}(?![a-z0-9])`, 'g',
    )),
  };
});

function matchDevice(input: string): DeviceItem | null {
  const text = modelText(input);
  const matches: { id: string; start: number; end: number }[] = [];
  for (const entry of modelIndex) {
    for (const pattern of entry.patterns) {
      for (const match of text.matchAll(pattern)) {
        const end = match.index + match[0].length;
        const after = text.slice(end);
        // Never silently downgrade an unsupported suffix to the base model.
        if (/^\s+(?:pro|max|plus|ultra|mini|fe|lite|air)\b/.test(after)) continue;
        if (entry.has5gVariant && /^\s+5g\b/.test(after)) continue;
        matches.push({ id: entry.device.id, start: match.index, end });
      }
    }
  }
  // Prefer longer overlapping names, but reject separate competing models.
  const longest = matches.filter((match) => !matches.some((other) =>
    other.start <= match.start && other.end >= match.end &&
    other.end - other.start > match.end - match.start,
  ));
  const ids = [...new Set(longest.map((match) => match.id))];
  return ids.length === 1 ? getDeviceById(ids[0] ?? '') ?? null : null;
}

function detectStorage(input: string): string | undefined {
  const candidates: string[] = [];
  for (const match of input.matchAll(/(?<![a-z0-9.,])(16|32|64|128|256|512|1024|2048)(?:\s*(gb|gigabayt))?(?![a-z0-9.,])|\b([12])\s*(tb|terabayt)\b/g)) {
    const before = input.slice(Math.max(0, match.index - 25), match.index);
    const after = input.slice(match.index + match[0].length);
    if (/(?:%|\bpil(?:\s+sagligi)?|\bbatarya(?:\s+sagligi)?)\s*[:=%]?\s*$/.test(before)) continue;
    if (/^\s*(?:%|tl\b|₺|lira\b|ram\b|ay\b|yil\b)/.test(after)) continue;
    if (/\bram\s*[:=]?\s*$/.test(before)) continue;
    const gb = Number(match[1]);
    candidates.push(match[3] ? `${match[3]}TB` : gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);
  }
  const distinct = [...new Set(candidates)];
  return distinct.length === 1 ? distinct[0] : undefined;
}

function detectBattery(input: string): number | undefined {
  const labeled = [...input.matchAll(/\b(?:pil|batarya)(?:\s+sagligi)?\s*[:=]?\s*%?\s*(\d{1,3})(?![\d.,])\s*%?/g)]
    .filter((match) => !/^\s*(?:tl\b|₺|lira\b|ay\b|yil\b)/.test(input.slice(match.index + match[0].length)))
    .map((match) => Number(match[1]));
  const fallback = [...input.matchAll(/%\s*(\d{1,3})(?!\d)|\b(\d{1,3})\s*%(?!\s*\d)/g)]
    .filter((match) => !/\b(?:indirim|pazarlik|fiyat)\s*$/.test(input.slice(Math.max(0, match.index - 20), match.index)))
    .map((match) => Number(match[1] ?? match[2]));
  const distinct = [...new Set((labeled.length ? labeled : fallback).filter((value) => value >= 0 && value <= 100))];
  return distinct.length === 1 ? distinct[0] : undefined;
}

function detectFlags(input: string): ParsedListingResult['flags'] {
  const noBox = /\b(?:kutusuz|kutu(?:su)?\s*(?:yok\w*|bulunmuyor|mevcut degil)|kutu(?:su)?\s+ve\s+fatura(?:si)?\s+yok\w*|sadece cihaz)\b/.test(input);
  const noInvoice = /\b(?:faturasiz|fatura(?:si)?\s*(?:yok\w*|bulunmuyor|mevcut degil)|fatura(?:si)?\s+ve\s+kutu(?:su)?\s+yok\w*)\b/.test(input);
  const noWarranty = /\b(?:garantisiz|garanti(?:si)?(?:\s+suresi)?\s*(?:yok\w*|bitti|bitmis|doldu|dolmus|sona erdi|mevcut degil|0\s*(?:ay|yil)))\b/.test(input);
  const changeNotes: string[] = [];
  const negativeAfter = /^\s*(?:yok\w*|degil|olmadi|olmam[i]?s|g[o]?rmedi|g[o]?rmemis)\b/;
  const changePattern = /\b(?:(?:ekran|pil|batarya|anakart|kamera|kasa|arka cam|soket)(?:i|si)?\s+(?:degisti|degismis|degistirildi|degistirilmis|degisen|degisimli)|(?:tamir|onarim)\s+(?:gordu|gormus)|degisen(?:\s+parca)?|degisim\s+yapildi)\b/g;
  for (const match of input.matchAll(changePattern)) {
    if (!negativeAfter.test(input.slice(match.index + match[0].length))) changeNotes.push(match[0]);
  }
  return {
    hasBox: !noBox && /\bkutu(?:su|lu)?\b/.test(input),
    hasInvoice: !noInvoice && /\bfatura(?:si|li)?\b/.test(input),
    hasWarranty: !noWarranty && /\bgaranti(?:si|li)?\b/.test(input),
    hasChanges: changeNotes.length > 0,
    changeNotes: [...new Set(changeNotes)],
  };
}

export function compareDevicePrice(
  device: DeviceItem | null,
  price: number | undefined,
): ParsedListingResult['priceComparison'] {
  const average = device?.estimatedPriceBand.avgTry ?? 0;
  if (price === undefined || !Number.isFinite(price) || price <= 0 || average <= 0 || device?.releaseYear === 0) return undefined;
  return {
    differencePercentage: ((price - average) / average) * 100,
    status: price <= (average * 85) / 100 ? 'FIRSAT' : price >= (average * 115) / 100 ? 'PAHALI' : 'NORMAL',
  };
}

/** Deterministic catalog parser; it never fetches URLs or invents missing values. */
export function parseDeviceListing(text: string): ParsedListingResult {
  const input = fold(text.trim().slice(0, MAX_TEXT_LENGTH)).replace(/https?:\/\/\S+/g, ' ');
  const explicit = explicitPrices(input);
  let masked = input;
  for (const candidate of [...explicit].sort((a, b) => b.start - a.start)) {
    masked = masked.slice(0, candidate.start) + ' '.repeat(candidate.end - candidate.start) + masked.slice(candidate.end);
  }
  const matchedDevice = matchDevice(masked);
  const detectedStorage = detectStorage(masked);
  const detectedBattery = detectBattery(masked);
  const preferred = explicit.some((candidate) => candidate.labeled)
    ? explicit.filter((candidate) => candidate.labeled) : explicit;
  // Mask bare storage and percentages before price inference, keeping offsets.
  const priceInput = input
    .replace(/\b(?:16|32|64|128|256|512|1024|2048)(?:\s*(?:gb|gigabayt))?\b(?![.,])/g, (value) => ' '.repeat(value.length))
    .replace(/%\s*\d{1,3}|\b\d{1,3}\s*%/g, (value) => ' '.repeat(value.length));
  const price = preferred.length
    ? selectPrice(preferred.map((candidate) => candidate.value), [])
    : barePrice(priceInput, modelText(matchedDevice?.model ?? '').split(/\s+/), []);
  const result: ParsedListingResult = {
    matchedDevice,
    ...(detectedStorage === undefined ? {} : { detectedStorage }),
    ...(price === null ? {} : { detectedPrice: price }),
    ...(detectedBattery === undefined ? {} : { detectedBattery }),
    flags: detectFlags(input),
  };
  const comparison = compareDevicePrice(matchedDevice, result.detectedPrice);
  if (comparison) result.priceComparison = comparison;
  return result;
}
