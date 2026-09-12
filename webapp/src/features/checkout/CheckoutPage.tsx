import { useEffect, useState, type FormEvent } from 'react'
import { cartReviewRequestSchema, orderQuoteRequestSchema, orderQuoteResponseSchema, orderResultSchema, type CartReviewRequest, type OrderResult } from '@web-app-demo/contracts'
import { Typography } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiRequestError, HttpClient } from '@/platform/api'
import './checkout.css'

const api = new HttpClient()
const storageKey = 'nikass-checkout'
type Quote = ReturnType<typeof orderQuoteResponseSchema.parse>
const money = (minor: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(minor / 100)
const fields = [
  ['name', 'Имя и фамилия', 'text', 'name', 100],
  ['phone', 'Телефон', 'tel', 'tel', 30],
  ['email', 'Email', 'email', 'email', 254],
  ['region', 'Регион / область', 'text', 'address-level1', 100],
  ['city', 'Город', 'text', 'address-level2', 100],
  ['street', 'Улица', 'text', 'address-line1', 150],
  ['house', 'Дом / корпус', 'text', 'off', 30],
  ['apartment', 'Квартира / офис (необязательно)', 'text', 'address-line2', 30],
  ['postcode', 'Почтовый индекс', 'text', 'postal-code', 6],
] as const

function legalUrl(value: string | undefined) {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' ? url.href : null } catch { return null }
}
const privacyUrl = legalUrl(import.meta.env.VITE_PRIVACY_URL)
const termsUrl = legalUrl(import.meta.env.VITE_TERMS_URL)

function readCheckout(): { cart: CartReviewRequest | null; quote: Quote | null; result: OrderResult | null; error: string } {
  try {
    const raw = sessionStorage.getItem(storageKey)
    const saved = raw ? JSON.parse(raw) : null
    const quote = orderQuoteResponseSchema.safeParse(saved?.quote)
    if (quote.success) return {
      cart: cartReviewRequestSchema.parse(saved.cart), quote: quote.data,
      result: saved.sent ? { state: 'submitting', orderNumber: null } : null, error: '',
    }
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get('cart')
    return { cart: cartReviewRequestSchema.parse(incoming ? JSON.parse(incoming) : saved?.cart), quote: null, result: null, error: '' }
  } catch {
    return { cart: null, quote: null, result: null, error: 'Корзина недоступна. Вернитесь в каталог и повторите переход; браузер должен разрешать хранение данных.' }
  }
}

export function CheckoutPage() {
  const [initial] = useState(readCheckout)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [cart, setCart] = useState<CartReviewRequest | null>(initial.cart)
  const [quote, setQuote] = useState<Quote | null>(initial.quote)
  const [result, setResult] = useState<OrderResult | null>(initial.result)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initial.error)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function restore() {
      if (initial.quote) {
        if (initial.result) setResult(await api.request('/api/orders/status', orderResultSchema, {
          method: 'POST', credentials: 'omit', body: { checkoutToken: initial.quote.checkoutToken },
        }))
      } else if (initial.cart) {
        sessionStorage.setItem(storageKey, JSON.stringify({ cart: initial.cart }))
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    void restore().catch(() => setError('Не удалось восстановить оформление. Проверьте статус или разрешите хранение данных в браузере.'))
  }, [initial])

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setFieldErrors({})
    const data = new FormData(event.currentTarget)
    setDraft(Object.fromEntries(Array.from(data.entries()).map(([key, value]) => [key, String(value)])))
    const customer = { ...Object.fromEntries(data), consent: data.get('consent') === 'on' }
    delete (customer as Record<string, unknown>).promoCode
    const parsed = orderQuoteRequestSchema.safeParse({ customer, cart, promoCode: data.get('promoCode') ?? '' })
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path.at(-1)), issue.message]))
      setFieldErrors(errors); setError('Проверьте отмеченные поля.'); return
    }
    if (!privacyUrl || !termsUrl) { setError('Документы магазина ещё не опубликованы. Отправка заказа пока недоступна.'); return }
    setBusy(true)
    try {
      const next = await api.request('/api/orders/quote', orderQuoteResponseSchema, { method: 'POST', credentials: 'omit', body: parsed.data })
      // Persist only the selection and quote capability; contact/address fields stay out of browser storage.
      sessionStorage.setItem(storageKey, JSON.stringify({ cart, quote: next, sent: false }))
      setQuote(next); setResult(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось проверить заказ.') }
    finally { setBusy(false) }
  }

  async function submit() {
    if (!quote || busy) return
    setBusy(true); setError('')
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ cart, quote, sent: true }))
      setResult({ state: 'submitting', orderNumber: null })
      setResult(await api.request('/api/orders', orderResultSchema, { method: 'POST', credentials: 'omit', body: { checkoutToken: quote.checkoutToken } }))
    } catch (cause) {
      if (cause instanceof ApiRequestError && [400, 409].includes(cause.status)) {
        setResult({ state: 'rejected', orderNumber: null }); setError(cause.message)
      } else setError('Ответ не получен. Проверьте статус: заказ мог уже сохраниться.')
    }
    finally { setBusy(false) }
  }

  async function status() {
    if (!quote) return
    setBusy(true); setError('')
    try { setResult(await api.request('/api/orders/status', orderResultSchema, { method: 'POST', credentials: 'omit', body: { checkoutToken: quote.checkoutToken } })) }
    catch { setError('Статус временно недоступен. Повторите проверку позже.') }
    finally { setBusy(false) }
  }

  function edit() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ cart })); setQuote(null); setResult(null); setError('') }
    catch { setError('Не удалось сохранить корзину в браузере.') }
  }

  function newCart() {
    try {
      const incoming = new URLSearchParams(window.location.hash.slice(1)).get('cart')
      if (!incoming) { setError('Вернитесь в каталог, выберите товары и перейдите сюда из корзины.'); return }
      const next = cartReviewRequestSchema.parse(JSON.parse(incoming))
      sessionStorage.setItem(storageKey, JSON.stringify({ cart: next }))
      setCart(next); setQuote(null); setResult(null); setDraft({}); setError('')
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch { setError('Не удалось прочитать новую корзину.') }
  }

  return <main className="nikass-checkout">
    <header><Typography as="p" variant="body">NIKASS / ОФОРМЛЕНИЕ</Typography><Typography as="h1" variant="h1">{result?.state === 'confirmed' ? 'Заказ принят' : 'Ваш заказ'}</Typography><Typography as="p" variant="body">Без регистрации. Доставка СДЭК по России бесплатно. Онлайн-оплата не требуется.</Typography></header>
    {error && <Typography as="p" variant="body" role="alert" className="checkout-error">{error}</Typography>}
    {result?.state === 'confirmed' ? <section aria-live="polite"><Typography as="h2" variant="h2">Заказ №{result.orderNumber}</Typography><Typography as="p" variant="body">Заказ ожидает обработки менеджером. Сохраните номер для обращения.</Typography><Button variant="outline" onClick={newCart}>Перейти к новой корзине</Button></section>
      : result && result.state !== 'quoted' ? <section aria-live="polite"><Typography as="h2" variant="h2">{result.state === 'rejected' ? 'Нужно проверить заказ заново' : 'Проверяем результат оформления'}</Typography><Typography as="p" variant="body">{result.state === 'rejected' ? 'Цена, доступность или условия заказа изменились. Вернитесь к расчёту.' : 'Не оформляйте этот заказ повторно. Если статус не изменится, менеджеру потребуется проверить его в магазине.'}</Typography><Button disabled={busy} onClick={result.state === 'rejected' ? edit : status}>{result.state === 'rejected' ? 'Проверить заново' : 'Обновить статус'}</Button></section>
      : quote ? <section><Typography as="h2" variant="h2">Проверьте итоговую сумму</Typography><ul>{quote.totals.items.map((item) => <li key={item.sku}><Typography as="span" variant="body">{item.name} · {item.quantity} шт.</Typography><Typography as="strong" variant="emphasis">{money(item.totalMinor)}</Typography></li>)}</ul><Typography as="p" variant="body">Скидка по промокоду: {money(quote.totals.discountMinor)}</Typography><Typography as="p" variant="body">Доставка: бесплатно</Typography><Typography as="h2" variant="h2">Итого: {money(quote.totals.totalMinor)}</Typography><Typography as="p" variant="body">Расчёт действителен 15 минут. При изменении суммы потребуется новый расчёт.</Typography><div className="checkout-actions"><Button onClick={submit} disabled={busy}>{busy ? 'Отправляем…' : 'Подтвердить и оформить заказ'}</Button><Button variant="outline" onClick={edit} disabled={busy}>Изменить данные</Button></div></section>
      : cart && <form onSubmit={review} noValidate>
        <fieldset disabled={busy}><Typography as="legend" variant="h2">Контакты и адрес доставки</Typography><div className="checkout-fields">
          {fields.map(([name, label, type, autoComplete, maxLength]) => <div key={name}><Typography as="label" variant="label" htmlFor={name}>{label}</Typography><Input id={name} name={name} type={type} defaultValue={draft[name] ?? ''} autoComplete={autoComplete} maxLength={maxLength} required={name !== 'apartment'} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `${name}-error` : undefined} />{fieldErrors[name] && <Typography as="p" variant="body" id={`${name}-error`} className="checkout-error">{fieldErrors[name]}</Typography>}</div>)}
        </div><Typography as="label" variant="label" htmlFor="comment">Комментарий к заказу</Typography><Textarea id="comment" name="comment" defaultValue={draft.comment ?? ''} required maxLength={1000} aria-invalid={Boolean(fieldErrors.comment)} aria-describedby="comment-error" placeholder="Например, когда удобнее позвонить" /><Typography as="p" variant="body" id="comment-error" className="checkout-error">{fieldErrors.comment}</Typography>
        <Typography as="label" variant="label" htmlFor="promoCode">Промокод (если есть)</Typography><Input id="promoCode" name="promoCode" defaultValue={draft.promoCode ?? ''} maxLength={100} autoComplete="off" /><Typography as="p" variant="body">Скидку и условия применения проверим в магазине.</Typography>
        <Typography as="label" variant="label" className="checkout-consent"><input type="checkbox" name="consent" defaultChecked={draft.consent === 'on'} required aria-invalid={Boolean(fieldErrors.consent)} /><Typography as="span" variant="body">Согласен с {termsUrl ? <Typography as="a" variant="body" href={termsUrl} target="_blank" rel="noreferrer">условиями покупки</Typography> : 'условиями покупки'} и {privacyUrl ? <Typography as="a" variant="body" href={privacyUrl} target="_blank" rel="noreferrer">обработкой персональных данных</Typography> : 'обработкой персональных данных'}.</Typography></Typography><Typography as="p" variant="body" className="checkout-error">{fieldErrors.consent}</Typography>
        {(!privacyUrl || !termsUrl) && <Typography as="p" variant="body">Документы магазина ещё не опубликованы. Оформление станет доступно после их добавления.</Typography>}
        <Button type="submit">{busy ? 'Проверяем…' : 'Проверить заказ и промокод'}</Button>
        </fieldset>
      </form>}
  </main>
}
