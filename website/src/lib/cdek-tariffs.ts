import type { CdekTariff } from "./cdek-widget";

export type CdekDeliveryOption = { label: string; tariff: CdekTariff | null };

export function selectCdekDeliveryOptions(tariffs: CdekTariff[], deliveryMode: "office" | "courier"): CdekDeliveryOption[] {
  const modes = deliveryMode === "office" ? [2, 4] : [1, 3];
  const eligible = tariffs.filter((tariff) => modes.includes(tariff.delivery_mode))
    .sort((a, b) => a.delivery_sum - b.delivery_sum || a.period_min - b.period_min || a.period_max - b.period_max);
  return [
    { label: "Обычная доставка", tariff: eligible.find((tariff) => /^Посылка(?:\s|$)/i.test(tariff.tariff_name)) ?? null },
    { label: "Экспресс-доставка", tariff: eligible.find((tariff) => /^Экспресс(?:\s|$)/i.test(tariff.tariff_name)) ?? null },
  ];
}
