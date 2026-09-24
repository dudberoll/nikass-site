import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { passwordResetConfirmRequestSchema } from '@web-app-demo/contracts'
import { useId, useState } from 'react'

import { Typography } from '@/components/typography'
import { PasswordInput } from '@/components/PasswordInput'
import { Alert, AlertDescription, AlertTitle } from '@/components/alert'
import { Button } from '@/components/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/field'
import { ApiRequestError } from '@/platform/api'
import { useAuth } from '../use-auth'
import { FormAlert } from './form-errors'
import type { FieldErrors } from './form-model'
import {
  clearFieldError,
  errorId,
  hasErrors,
  passwordConfirmationErrors,
  toValidationErrors,
} from './form-validation'

export function ResetPasswordForm({ token }: { token: string }) {
  const auth = useAuth()
  const tokenIsValid = passwordResetConfirmRequestSchema.shape.token.safeParse(token).success
  const passwordId = useId()
  const passwordDescriptionId = useId()
  const passwordErrorId = useId()
  const confirmPasswordId = useId()
  const confirmPasswordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(
    tokenIsValid ? null : 'This password reset link is invalid or incomplete.',
  )
  const [completed, setCompleted] = useState(false)
  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      if (!tokenIsValid) return
      setFormError(null)
      const result = passwordResetConfirmRequestSchema.safeParse({
        token,
        password: value.password,
      })
      const validation = toValidationErrors(result.success ? [] : result.error.issues)
      const nextErrors = validation.fieldErrors
      const confirmationErrors = passwordConfirmationErrors(
        value.password,
        value.confirmPassword,
      )
      if (confirmationErrors) nextErrors.confirmPassword = confirmationErrors
      if (!result.success || hasErrors(nextErrors.confirmPassword)) {
        setFieldErrors(nextErrors)
        setFormError(validation.formError)
        return
      }

      setFieldErrors({})
      try {
        await auth.confirmPasswordReset(result.data)
        setCompleted(true)
      } catch (caughtError) {
        setFormError(
          caughtError instanceof ApiRequestError
            ? caughtError.message
            : 'Unable to reset your password',
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
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <Typography as="h1" variant="h3">
            Choose a new password
          </Typography>
          <Typography variant="bodySm" tone="muted">
            Your new password will sign out every existing session
          </Typography>
        </div>

        {completed ? (
          <Alert>
            <AlertTitle>Password updated</AlertTitle>
            <AlertDescription>You can now sign in with your new password.</AlertDescription>
          </Alert>
        ) : (
          <>
            <form.Field name="password" children={(field) => (
              <Field data-invalid={hasErrors(fieldErrors.password)}>
                <FieldLabel htmlFor={passwordId}>New Password</FieldLabel>
                <PasswordInput
                  aria-describedby={[
                    passwordDescriptionId,
                    errorId(fieldErrors.password, passwordErrorId),
                  ].filter(Boolean).join(' ')}
                  aria-invalid={hasErrors(fieldErrors.password)}
                  autoComplete="new-password"
                  id={passwordId}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                    clearFieldError('password', setFieldErrors)
                    clearFieldError('confirmPassword', setFieldErrors)
                    setFormError(
                      tokenIsValid ? null : 'This password reset link is invalid or incomplete.',
                    )
                  }}
                  value={field.state.value}
                  visibilityLabel="replacement password"
                />
                <FieldDescription id={passwordDescriptionId}>
                  Must be at least 8 characters long.
                </FieldDescription>
                <FieldError id={passwordErrorId} errors={fieldErrors.password} />
              </Field>
            )} />

            <form.Field name="confirmPassword" children={(field) => (
              <Field data-invalid={hasErrors(fieldErrors.confirmPassword)}>
                <FieldLabel htmlFor={confirmPasswordId}>Confirm Password</FieldLabel>
                <PasswordInput
                  aria-describedby={errorId(fieldErrors.confirmPassword, confirmPasswordErrorId)}
                  aria-invalid={hasErrors(fieldErrors.confirmPassword)}
                  autoComplete="new-password"
                  id={confirmPasswordId}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                    clearFieldError('confirmPassword', setFieldErrors)
                    setFormError(
                      tokenIsValid ? null : 'This password reset link is invalid or incomplete.',
                    )
                  }}
                  value={field.state.value}
                  visibilityLabel="password confirmation"
                />
                <FieldError id={confirmPasswordErrorId} errors={fieldErrors.confirmPassword} />
              </Field>
            )} />

            <FormAlert message={formError} title="Password reset failed" />

            <Field>
              <form.Subscribe selector={(state) => state.isSubmitting} children={(isSubmitting) => (
                <Button disabled={isSubmitting || !tokenIsValid} type="submit">
                  {isSubmitting ? 'Updating password…' : 'Update password'}
                </Button>
              )} />
            </Field>
          </>
        )}

        <div className="text-center">
          <Link search={{ returnTo: undefined }} to="/login">
            <Typography as="span" variant="linkSm">Back to login</Typography>
          </Link>
        </div>
      </FieldGroup>
    </form>
  )
}
