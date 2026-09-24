import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { loginRequestSchema, type LoginRequest } from '@web-app-demo/contracts'
import { useId, useState } from 'react'

import { Typography } from '@/components/typography'
import { PasswordInput } from '@/components/PasswordInput'
import { Button } from '@/components/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/field'
import { Input } from '@/components/input'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '../use-auth'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import { clearFieldError, errorId, hasErrors, toValidationErrors } from './form-validation'

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const auth = useAuth()
  const emailId = useId()
  const emailErrorId = useId()
  const passwordId = useId()
  const passwordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const result = loginRequestSchema.safeParse(value)
      if (!result.success) {
        const validation = toValidationErrors(result.error.issues)
        setFieldErrors(validation.fieldErrors)
        setFormError(validation.formError)
        return
      }

      setFieldErrors({})
      try {
        await auth.login(result.data as LoginRequest)
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError ? caughtError.message : 'Unexpected auth error',
        )
      }
    },
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup variant="form">
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="h1" variant="h3">
            Login to your account
          </Typography>
          <Typography variant="bodySm" tone="muted">
            Enter your email below to login to your account
          </Typography>
        </div>

        <form.Field
          name="email"
          children={(field) => (
            <Field data-invalid={hasErrors(fieldErrors.email)}>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <Input
                aria-describedby={errorId(fieldErrors.email, emailErrorId)}
                aria-invalid={hasErrors(fieldErrors.email)}
                autoComplete="email"
                id={emailId}
                inputMode="email"
                name={field.name}
                variant="surface"
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('email', setFieldErrors)
                  setFormError(null)
                }}
                placeholder="m@example.com"
                type="email"
                value={field.state.value}
              />
              <FieldError id={emailErrorId} errors={fieldErrors.email} />
            </Field>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <Field data-invalid={hasErrors(fieldErrors.password)}>
              <div className="flex items-center">
                <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                <span className="ml-auto">
                  <Link to="/forgot-password">
                    <Typography as="span" variant="linkSm">Forgot your password?</Typography>
                  </Link>
                </span>
              </div>
              <PasswordInput
                aria-describedby={errorId(fieldErrors.password, passwordErrorId)}
                aria-invalid={hasErrors(fieldErrors.password)}
                autoComplete="current-password"
                id={passwordId}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  clearFieldError('password', setFieldErrors)
                  setFormError(null)
                }}
                value={field.state.value}
              />
              <FieldError id={passwordErrorId} errors={fieldErrors.password} />
            </Field>
          )}
        />

        <FormAlert message={formError} />

        <Field>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Signing in…' : 'Login'}
              </Button>
            )}
          />
        </Field>

        <div className="text-center">
          <FieldDescription>
            Don&apos;t have an account?{' '}
            <Link search={{ returnTo }} to="/signup">
              Sign up
            </Link>
          </FieldDescription>
        </div>
      </FieldGroup>
    </form>
  )
}
