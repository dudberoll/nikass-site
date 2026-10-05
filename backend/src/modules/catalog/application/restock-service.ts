import { restockRequestSchema, type RestockRequest } from '@web-app-demo/contracts'
import { AppError } from '../../../http/errors'
import type { CatalogService } from './catalog-service'

export type RestockNotification = { request: RestockRequest; name: string; label: string }

export class RestockService {
  constructor(private readonly catalog: CatalogService, private readonly enabled: boolean,
    private readonly queue: (notification: RestockNotification) => Promise<void>) {}

  async request(input: RestockRequest) {
    const request = restockRequestSchema.parse(input)
    if (!this.enabled) throw new AppError(503, 'INTERNAL_ERROR', 'Заявки пока недоступны. Попробуйте позже.')
    const { product } = await this.catalog.getBySlug(request.slug, true)
    const variant = product.variants.find(({ sku }) => sku === request.sku)
    if (!variant) throw new AppError(404, 'NOT_FOUND', 'Этот вариант товара больше недоступен.')
    if (variant.availability !== 'preorder') throw new AppError(409, 'CONFLICT', variant.availability === 'in-stock'
      ? 'Товар уже в наличии. Обновите страницу, чтобы добавить его в корзину.' : 'Этот вариант товара больше недоступен.')
    await this.queue({ request, name: product.name, label: variant.label })
    return { requestId: request.requestId, status: 'accepted' as const }
  }
}
