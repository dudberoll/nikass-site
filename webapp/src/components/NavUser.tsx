import {
  Logout01Icon,
  MoreVerticalCircle01Icon,
  Settings01Icon,
  UserCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { UserDto } from '@web-app-demo/contracts'
import { useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/avatar'
import { Badge } from '@/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/sidebar'
import { Typography } from '@/components/typography'
import type { WorkspaceRoutePath } from '@/features/navigation'
import { DashboardLink } from './DashboardLink'

export function NavUser({
  accountPath,
  onLogout,
  settingsPath,
  user,
}: {
  accountPath?: WorkspaceRoutePath
  onLogout: () => Promise<void>
  settingsPath: WorkspaceRoutePath
  user: UserDto
}) {
  const { isMobile, setOpen } = useSidebar()
  const [logoutError, setLogoutError] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)

  const logout = async () => {
    setLogoutError(false)
    setLogoutPending(true)
    try {
      await onLogout()
    } catch {
      setLogoutError(true)
      setOpen(true)
    } finally {
      setLogoutPending(false)
    }
  }

  return (
    <>
      {logoutError && (
        <Typography role="alert" variant="caption" tone="destructive">
          Logout failed. Please try again.
        </Typography>
      )}
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                aria-label="Open account menu"
                size="lg"
                tooltip={user.displayName ?? user.email}
              >
                <Avatar shape="rounded">
                  <AvatarFallback>
                    {userInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-0.5 text-left">
                  <span className="min-w-0 truncate">
                    <Typography variant="control">
                      {user.displayName ?? user.email}
                    </Typography>
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate">
                      <Typography variant="caption" tone="muted">
                        {user.email}
                      </Typography>
                    </span>
                    <Badge variant="role">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <HugeiconsIcon
                  className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
                  icon={MoreVerticalCircle01Icon}
                  strokeWidth={2}
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              variant="account"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel variant="flush">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <Avatar shape="rounded">
                    <AvatarFallback>
                      {userInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="min-w-0 truncate">
                      <Typography variant="bodySmMedium">
                        {user.displayName ?? user.email}
                      </Typography>
                    </span>
                    <span className="min-w-0 truncate">
                      <Typography variant="caption" tone="muted">
                        {user.email}
                      </Typography>
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {accountPath && (
                  <DropdownMenuItem asChild>
                    <DashboardLink to={accountPath}>
                      <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} />
                      Profile
                    </DashboardLink>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <DashboardLink to={settingsPath}>
                    <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
                    Settings
                  </DashboardLink>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={logoutPending}
                onSelect={() => void logout()}
                variant="destructive"
              >
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                {logoutPending ? 'Logging out…' : 'Log out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}

function userInitials(user: UserDto) {
  return (user.displayName ?? user.email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
