import { managerContactRequestSchema, type ManagerContactRequest } from '@web-app-demo/contracts'
import { AppError } from '../../../http/errors'
import type { CatalogService } from './catalog-service'

export type ManagerContactNotification = { request: ManagerContactRequest; name: string; label: string }

export class ManagerContactService {
  constructor(private readonly catalog: CatalogService, private readonly enabled: boolean,
    private readonly queue: (notification: ManagerContactNotification) => Promise<void>) {}

  async request(input: ManagerContactRequest) {
    const request = managerContactRequestSchema.parse(input)
    if (!this.enabled) throw new AppError(503, 'INTERNAL_ERROR', 'Связь с менеджером временно недоступна.')
    const { product } = await this.catalog.getBySlug(request.slug, true)
    const variant = product.variants.find(({ sku }) => sku === request.sku)
    if (!variant) throw new AppError(404, 'NOT_FOUND', 'Этот вариант товара больше недоступен.')
    if (variant.salesMode !== 'manager') throw new AppError(409, 'CONFLICT', 'Для этого товара свяжитесь с менеджером со страницы товара.')
    await this.queue({ request, name: product.name, label: variant.label })
    return { requestId: request.requestId, status: 'accepted' as const }
  }
}
