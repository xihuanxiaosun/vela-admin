import { createAuthenticatedTransport } from '@vela-admin/adapters'

import { starterAuthAdapter } from '../access'
import { createDemoUserApiTransport } from './demo-user-api'
import { createHttpStarterUserRepository } from './user-http-repository'

const demoApiTransport = createDemoUserApiTransport()
const authenticatedTransport = createAuthenticatedTransport(demoApiTransport, starterAuthAdapter)

export const starterUserRepository = createHttpStarterUserRepository(authenticatedTransport)
