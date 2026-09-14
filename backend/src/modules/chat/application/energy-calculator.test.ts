import { expect, test } from 'bun:test'

import { calculateEnergyBudget } from './energy-calculator'

test('calculates several devices with battery reserve and inverter losses', () => {
  const result = calculateEnergyBudget({
    stationCapacityWh: 537,
    stationMaxOutputW: 500,
    devices: [
      { name: 'телефон', powerW: 15, hours: 1, quantity: 2 },
      { name: 'телевизор', powerW: 65, hours: 3 },
    ],
  })

  if (result.status !== 'ok') throw new Error('expected a calculation result')
  expect(result.requiredWh).toBe(225)
  expect(result.availableWh).toBeCloseTo(387.9825, 4)
  expect(result.peakLoadW).toBe(95)
  expect(result.fits).toBe(true)
  expect(result.runtimeHours).toBeCloseTo(4.0840263158, 6)
})

test('answers «на сколько хватит» without inventing a duration or timed-plan fit', () => {
  const result = calculateEnergyBudget({
    stationCapacityWh: 205,
    stationMaxOutputW: 300,
    devices: [{ name: 'телевизор', powerW: 65 }],
  })

  if (result.status !== 'ok') throw new Error('expected a calculation result')
  expect(result.runtimeHours).toBeCloseTo(2.2786538462, 6)
  expect(result.requiredWh).toBeNull()
  expect(result.fits).toBeNull()
  expect(result.missing).toEqual(['devices[].hours'])
})

test('rejects a plan that exceeds both energy and output limits', () => {
  const result = calculateEnergyBudget({
    stationCapacityWh: 205,
    stationMaxOutputW: 300,
    devices: [
      { name: 'телевизор', powerW: 65, hours: 3 },
      { name: 'фен', powerW: 1_200, hours: 0.1 },
    ],
  })

  if (result.status !== 'ok') throw new Error('expected a calculation result')
  expect(result.requiredWh).toBe(315)
  expect(result.peakLoadW).toBe(1_265)
  expect(result.fits).toBe(false)
  expect(result.outputLimitExceeded).toBe(true)
})

test('keeps compatibility unknown when the station output limit is missing', () => {
  const result = calculateEnergyBudget({
    stationCapacityWh: 537,
    devices: [{ name: 'мощный прибор', powerW: 600, hours: 0.5 }],
  })

  if (result.status !== 'ok') throw new Error('expected a calculation result')
  expect(result.requiredWh).toBe(300)
  expect(result.outputLimitExceeded).toBeNull()
  expect(result.fits).toBeNull()
  expect(result.missing).toEqual(['stationMaxOutputW'])
})

test('can prove energy failure even when the output limit is unknown', () => {
  const result = calculateEnergyBudget({
    stationCapacityWh: 205,
    devices: [{ name: 'нагрузка', powerW: 600, hours: 1 }],
  })

  if (result.status !== 'ok') throw new Error('expected a calculation result')
  expect(result.outputLimitExceeded).toBeNull()
  expect(result.fits).toBe(false)
  expect(result.missing).toBeUndefined()
})

test('returns a clarification instead of guessing missing station or device data', () => {
  expect(() => calculateEnergyBudget({
    stationCapacityWh: 205,
    devices: [{ name: 'телевизор', powerW: 0, hours: 3 }],
  })).toThrow('powerW')

  expect(calculateEnergyBudget({
    devices: [{ name: 'телевизор', powerW: 65, hours: 3 }],
  })).toEqual({
    status: 'insufficient_data',
    missing: ['stationCapacityWh'],
  })
})
