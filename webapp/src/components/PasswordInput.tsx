import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState, type ComponentProps } from 'react'

import { Button } from '@/components/button'
import { Input } from '@/components/input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'variant'> & {
  visibilityLabel?: string
}

export function PasswordInput({
  id,
  visibilityLabel = 'entered password',
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const actionLabel = `${isVisible ? 'Hide' : 'Show'} ${visibilityLabel}`

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={isVisible ? 'text' : 'password'}
        variant="password"
      />
      <span className="absolute top-0 right-0">
        <Button
          aria-controls={id}
          aria-label={actionLabel}
          onClick={() => setIsVisible((visible) => !visible)}
          size="icon"
          type="button"
          variant="fieldAction"
        >
          <HugeiconsIcon
            aria-hidden
            icon={isVisible ? ViewOffIcon : ViewIcon}
            strokeWidth={2}
          />
        </Button>
      </span>
    </div>
  )
}
