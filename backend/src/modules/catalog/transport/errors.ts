import { AppError } from '../../../http/errors'
import { CatalogFailure } from '../domain/catalog'

export function toCatalogAppError(error: unknown) {
  if (!(error instanceof CatalogFailure)) return error

  if (error.kind === 'not_found') {
    return new AppError(404, 'NOT_FOUND', error.message)
  }

  if (error.kind === 'not_configured') {
    return new AppError(503, 'INTERNAL_ERROR', 'Catalog provider is not configured')
  }

  if (error.kind === 'invalid_response') {
    return new AppError(503, 'INTERNAL_ERROR', 'Catalog provider returned invalid data')
  }

  return new AppError(503, 'INTERNAL_ERROR', 'Catalog provider is temporarily unavailable')
}

export async function executeCatalog<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toCatalogAppError(error)
  }
}
