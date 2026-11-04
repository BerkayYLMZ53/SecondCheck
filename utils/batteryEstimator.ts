import { getAllDevices, normalizeCatalogSearch } from '../data/devices';
import type { DeviceItem } from '../types/catalog';

export interface BatteryEstimate {
  health?: number;
  condition: 'ideal' | 'moderate' | 'critical' | 'unknown';
  label: string;
  replacementCost?: number;
  deduction: number;
  months?: { min: number; max: number };
}
type BatteryDevice = Pick<DeviceItem, 'brand' | 'model' | 'releaseYear'>;
const models = getAllDevices();
const key = (value: string) => normalizeCatalogSearch(value).replace(/\s+/g, '');

/** User-specified budget bands, not a fetched or certified OEM service tariff. */
export function estimateBattery(device: BatteryDevice | string | null, health?: number): BatteryEstimate {
  const selected = typeof device === 'string'
    ? models.find((d) => key(d.model) === key(device) || key(`${d.brand} ${d.model}`) === key(device)) : device;
  let replacementCost: number | undefined;
  if (selected && selected.releaseYear > 0) {
    const name = selected.model.toLowerCase();
    if (selected.brand === 'Apple') {
      replacementCost = Math.min(4800, Math.max(2200, Math.round((2200 +
        Math.max(0, selected.releaseYear - 2014) * 125 + (/pro/.test(name) ? 450 : 0) +
        (/max|plus/.test(name) ? 250 : 0)) / 100) * 100));
    } else if (selected.brand === 'Samsung') {
      replacementCost = Math.min(3200, Math.max(1500, Math.round((1500 +
        Math.max(0, selected.releaseYear - 2019) * 200 + (/ultra|fold/.test(name) ? 700 : 0) +
        (/plus|\+/.test(name) ? 200 : 0)) / 100) * 100));
    }
  }
  if (health === undefined || !Number.isFinite(health) || health < 0 || health > 100) {
    return { condition: 'unknown', label: 'Pil sağlığı belirtilmedi', replacementCost, deduction: 0 };
  }
  if (health >= 85) return { health, condition: 'ideal', label: 'Kondisyon: İdeal / Değişim İhtiyacı Yok', replacementCost, deduction: 0 };
  const deduction = replacementCost ?? 0;
  if (health >= 80) return { health, condition: 'moderate', label: 'Kondisyon: Orta / Tahmini 4-7 Ay İçinde Değişim Gerekebilir', replacementCost, deduction, months: { min: 4, max: 7 } };
  return { health, condition: 'critical', label: 'Kondisyon: Kritik / Servis Uyarısı - Acil Değişim Tavsiye Edilir', replacementCost, deduction };
}
