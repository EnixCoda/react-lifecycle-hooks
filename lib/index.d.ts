import { ReactInstance } from 'react'

export function addMiddleware(
  middleware: (
    componentClass: React.ComponentClass | React.StatelessComponent,
    componentInstance: ReactInstance | React.StatelessComponent,
    lifeCycleName: React.ComponentLifecycle,
  ) => void
) {}

export function removeMiddleware(middlewareToRemove: Middleware) {}
