import { createFileRoute, redirect } from '@tanstack/react-router'

// Legacy path — dedicated pages live at /auth/login, /auth/signup, etc.
export const Route = createFileRoute('/auth')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login' })
  },
  component: () => null,
})
