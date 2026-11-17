import { createBackendRuntime } from '../src/runtime'
import { buildCatalogWebsite } from '../src/modules/catalog'

const runtime = createBackendRuntime()
try { await buildCatalogWebsite(runtime, process.argv[2] ?? '') }
finally { await runtime.close() }
