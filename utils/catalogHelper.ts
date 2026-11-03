import rawCatalog from '../data/devicesCatalog.json';
import type { DeviceBrand, DeviceItem } from '../types/catalog';

const BRANDS: readonly DeviceBrand[] = ['Apple', 'Samsung', 'Xiaomi', 'Redmi'];

function isDeviceBrand(value: string): value is DeviceBrand {
  return BRANDS.some((brand) => brand === value);
}

// JSON imports widen string literals. Narrow the brand with a runtime guard
// while TypeScript checks every remaining field against DeviceItem.
const catalog: DeviceItem[] = rawCatalog.map((device) => {
  const { brand } = device;
  if (!isDeviceBrand(brand)) {
    throw new Error(`Unsupported catalog brand: ${brand}`);
  }
  return { ...device, brand };
});

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Build the lookup and search index once; each keystroke only filters strings.
const byId = new Map<string, DeviceItem>();
const searchIndex = catalog.map((device) => {
  if (byId.has(device.id)) {
    throw new Error(`Duplicate catalog ID: ${device.id}`);
  }
  byId.set(device.id, device);
  const text = normalize(`${device.brand} ${device.model}`);
  return { device, text, compact: text.replace(/\s+/g, '') };
});

// Callers can sort or edit results without corrupting subsequent lookups.
function copyDevice(device: DeviceItem): DeviceItem {
  return {
    ...device,
    variants: {
      storage: [...device.variants.storage],
      colors: [...device.variants.colors],
    },
    estimatedPriceBand: { ...device.estimatedPriceBand },
    chronicIssues: [...device.chronicIssues],
    criticalChecks: [...device.criticalChecks],
  };
}

/** Includes the explicitly labeled concept entry; see docs/devices-catalog.md. */
export function getAllDevices(): DeviceItem[] {
  return catalog.map(copyDevice);
}

/** IDs are exact and case-sensitive. Unknown IDs return undefined. */
export function getDeviceById(id: string): DeviceItem | undefined {
  const device = byId.get(id);
  return device === undefined ? undefined : copyDevice(device);
}

/** Empty/whitespace queries return all devices, in stable catalog order. */
export function searchDevices(query: string): DeviceItem[] {
  if (query.trim() === '') return getAllDevices();
  const normalized = normalize(query);
  if (normalized === '') return [];
  const tokens = normalized.split(/\s+/);
  const compact = normalized.replace(/\s+/g, '');
  return searchIndex
    .filter(({ text, compact: candidate }) =>
      tokens.every((token) => text.includes(token)) || candidate.includes(compact),
    )
    .map(({ device }) => copyDevice(device));
}

/** Case/diacritic-insensitive exact brand match; unknown/empty brands return []. */
export function filterByBrand(brand: string): DeviceItem[] {
  const normalized = normalize(brand);
  return catalog
    .filter((device) => normalize(device.brand) === normalized)
    .map(copyDevice);
}
