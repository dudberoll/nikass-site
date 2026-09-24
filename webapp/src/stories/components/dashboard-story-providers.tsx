import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { createContext, useContext, type ReactNode } from 'react'
import { SidebarProvider } from '@/components/sidebar'

const StoryContentContext = createContext<ReactNode>(null)

function StoryContent() {
  return useContext(StoryContentContext)
}

const rootRoute = createRootRoute()
const paths = ['/app', '/app/profile', '/app/settings', '/admin', '/admin/users', '/admin/settings', '/login'] as const
const routes = paths.map((path) => createRoute({
  getParentRoute: () => rootRoute,
  path,
  component: StoryContent,
}))
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ['/app'] }),
  routeTree: rootRoute.addChildren(routes),
})

export function DashboardStoryProviders({ children }: { children: ReactNode }) {
  return (
    <StoryContentContext.Provider value={children}>
      <SidebarProvider>
        <RouterProvider router={router} />
      </SidebarProvider>
    </StoryContentContext.Provider>
  )
}
