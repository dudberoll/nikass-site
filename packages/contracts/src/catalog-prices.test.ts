import { expect, test } from 'bun:test'
import { catalogSnapshot } from './catalog-snapshot'

test('catalog prices match the agreed retail prices', () => {
  const expected: Record<string, number> = {
    'AGM10012': 21750, 'AGM20012': 43500, 'AGM65012': 15500, 'AGM7012': 17250, 'AGM9012': 20500,
    'FSP-100': 6750, 'FSP-210': 12230, 'FSP-30': 2950, 'FSP-50': 4050,
    'PB-20': 1430, 'PB-50': 3250, 'PB-60': 4250,
    'NS-31-150': 9500, 'NS-31-300': 15950, 'NS-54': 10880,
    'NS-63-600': 30080, 'NS-63-800': 39350, 'NS-66-1000': 52750,
    'NS-69-150': 9680, 'NS-69-300': 13880, 'NS-69-500': 23150,
    'NS-85-2000': 73500, 'NS-93-150': 8430, 'NS-93-300': 11630, 'NS-93-500': 19200,
    'SP-100': 5250, 'SP-30': 2650, 'SP-50': 3400,
    'WJF-1200MX': 4880, 'WJF-1300GST': 9650, 'WJF-1600MX': 8600,
    'WJF-1800GST': 11950, 'WJF-2300MX': 10100, 'WJF-2500GST': 16330,
    'WJF-3000GST': 19450, 'WJF-3500GST': 24980, 'WJF-600MX': 3550, 'WJF-800GST': 6980,
  }
  const prices = Object.fromEntries(catalogSnapshot.flatMap(product => product.variants.map(({ sku, price }) => [sku, price])))
  for (const [sku, price] of Object.entries(expected)) expect(prices[sku]).toBe(price)
})
