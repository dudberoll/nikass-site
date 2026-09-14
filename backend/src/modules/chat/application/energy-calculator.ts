const DEFAULT_USABLE_FRACTION = 0.85
const DEFAULT_INVERTER_EFFICIENCY = 0.85

export type EnergyDevice = {
  name: string
  powerW: number
  hours?: number
  quantity?: number
}

export type EnergyBudgetInput = {
  stationCapacityWh?: number
  stationMaxOutputW?: number
  devices?: readonly EnergyDevice[]
}

export function shouldUseEnergyTool(messages: readonly { role: string; content: string }[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  return /хватит|проработ|время\s+работ|на\s+сколько.*(?:хват|работ)|автономн|рассчит/i.test(latestUserMessage)
    && /станци|ватт|вт|wh|втч|мощн|телефон|телевиз|ноутбук|холодиль|кот[её]л|насос|фен|ламп/i.test(latestUserMessage)
}

export type EnergyBudget = {
  status: 'ok'
  requiredWh: number | null
  availableWh: number
  peakLoadW: number
  runtimeHours: number | null
  fits: boolean | null
  outputLimitExceeded: boolean | null
  missing?: string[]
  assumptions: {
    usableFraction: number
    inverterEfficiency: number
  }
} | {
  status: 'insufficient_data'
  missing: string[]
}

/**
 * Conservative estimate for a portable station used through its 220 V inverter:
 * delivered Wh = nameplate Wh × 85% usable battery × 85% inverter efficiency.
 * It is an estimate, not a substitute for the model manual or a measured load.
 */
export function calculateEnergyBudget(input: EnergyBudgetInput): EnergyBudget {
  const missing: string[] = []
  const devices = input.devices
  if (input.stationCapacityWh === undefined) missing.push('stationCapacityWh')
  if (!devices?.length) missing.push('devices')
  if (missing.length) return { status: 'insufficient_data', missing }
  const resolvedDevices = devices!

  const stationCapacityWh = positive(input.stationCapacityWh, 'stationCapacityWh')
  const stationMaxOutputW = input.stationMaxOutputW === undefined
    ? undefined
    : positive(input.stationMaxOutputW, 'stationMaxOutputW')

  let requiredWh = 0
  let peakLoadW = 0
  let allDurationsProvided = true
  for (const device of resolvedDevices) {
    if (!device.name.trim()) throw new RangeError('name must not be empty')
    const powerW = positive(device.powerW, 'powerW')
    const quantity = device.quantity ?? 1
    if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError('quantity must be a positive integer')
    if (device.hours === undefined) {
      allDurationsProvided = false
    } else {
      requiredWh += powerW * positive(device.hours, 'hours') * quantity
    }
    peakLoadW += powerW * quantity
  }

  const availableWh = stationCapacityWh * DEFAULT_USABLE_FRACTION * DEFAULT_INVERTER_EFFICIENCY
  const outputLimitExceeded = stationMaxOutputW === undefined ? null : peakLoadW > stationMaxOutputW
  const energyInsufficient = allDurationsProvided && requiredWh > availableWh
  const missingOutputLimit = outputLimitExceeded === null && !energyInsufficient
  return {
    status: 'ok',
    requiredWh: allDurationsProvided ? requiredWh : null,
    availableWh,
    peakLoadW,
    runtimeHours: peakLoadW > 0 ? availableWh / peakLoadW : null,
    fits: !allDurationsProvided || energyInsufficient
      ? (energyInsufficient ? false : null)
      : outputLimitExceeded === false ? true : null,
    outputLimitExceeded,
    ...(!allDurationsProvided || missingOutputLimit ? {
      missing: [
        ...(!allDurationsProvided ? ['devices[].hours'] : []),
        ...(missingOutputLimit ? ['stationMaxOutputW'] : []),
      ],
    } : {}),
    assumptions: {
      usableFraction: DEFAULT_USABLE_FRACTION,
      inverterEfficiency: DEFAULT_INVERTER_EFFICIENCY,
    },
  }
}

function positive(value: number | undefined, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive finite number`)
  }
  return value
}
