import { z } from 'zod'

const widgetRequestSchema = z.object({ action: z.enum(['cities', 'offices', 'calculate']) }).passthrough()
const tokenSchema = z.object({ access_token: z.string().min(1) })
type Config = { account: string; password: string; environment: 'production' | 'test'; timeoutMs: number }

function appendQuery(search: URLSearchParams, key: string, value: unknown, depth = 0) {
  if (value === null || value === undefined) return
  if (depth > 5) throw new Error('CDEK widget query nesting is too deep')
  if (Array.isArray(value)) return value.forEach((item, index) => appendQuery(search, `${key}[${index}]`, item, depth + 1))
  if (typeof value === 'object') return Object.entries(value).forEach(([name, item]) => appendQuery(search, `${key}[${name}]`, item, depth + 1))
  search.append(key, String(value))
}

export function createCdekWidgetService(config: Config, fetchImpl: typeof fetch = fetch) {
  const apiBase = config.environment === 'test' ? 'https://api.edu.cdek.ru/v2' : 'https://api.cdek.ru/v2'
  return {
    async proxy(request: Request) {
      if (request.url.length > 8_192) return Response.json({ message: 'Слишком длинный запрос виджета СДЭК.' }, { status: 414 })
      let body: unknown = {}
      if (request.method === 'POST') {
        try { body = await request.json() } catch { return Response.json({ message: 'Некорректный запрос виджета СДЭК.' }, { status: 400 }) }
      }
      const query = Object.fromEntries(new URL(request.url).searchParams)
      const value = widgetRequestSchema.safeParse({ ...query, ...(body && typeof body === 'object' && !Array.isArray(body) ? body : {}) })
      if (!value.success) return Response.json({ message: 'Некорректный запрос виджета СДЭК.' }, { status: 400 })

      try {
        const tokenResponse = await fetchImpl(`${apiBase}/oauth/token`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'X-App-Name': 'widget_pvz', 'X-App-Version': '3.11.1' },
          body: new URLSearchParams({ grant_type: 'client_credentials', client_id: config.account, client_secret: config.password }),
          signal: AbortSignal.timeout(config.timeoutMs),
        })
        if (!tokenResponse.ok) throw new Error('CDEK authorization failed')
        const token = tokenSchema.safeParse(await tokenResponse.json().catch(() => null))
        if (!token.success) throw new Error('CDEK authorization response is invalid')

        const { action, ...payload } = value.data
        const endpoint = action === 'cities' ? 'location/suggest/cities' : action === 'offices' ? 'deliverypoints' : 'calculator/tarifflist'
        const url = new URL(`${apiBase}/${endpoint}`)
        const headers = new Headers({ Accept: 'application/json', Authorization: `Bearer ${token.data.access_token}`, 'X-App-Name': 'widget_pvz', 'X-App-Version': '3.11.1' })
        const init: RequestInit = { method: action === 'calculate' ? 'POST' : 'GET', headers, signal: AbortSignal.timeout(config.timeoutMs) }
        if (action !== 'calculate') {
          for (const [key, item] of Object.entries(payload)) appendQuery(url.searchParams, key, item)
        } else {
          headers.set('Content-Type', 'application/json')
          init.body = JSON.stringify(payload)
        }
        const response = await fetchImpl(url, init)
        return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' } })
      } catch (error) {
        console.error('CDEK widget request failure', { type: error instanceof Error ? error.name : typeof error })
        return Response.json({ message: 'Сервис СДЭК временно недоступен.' }, { status: 503 })
      }
    },
  }
}
