import { productContactRequestSchema, restockResponseSchema } from './restock'

export const managerContactRequestSchema = productContactRequestSchema
export const managerContactResponseSchema = restockResponseSchema
export type ManagerContactRequest = import('./restock').ProductContactRequest
