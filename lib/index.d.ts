import React, { ReactInstance } from 'react'

interface Options {
  compat: 'all'|'legacy'|'latest'
}

interface Deactivate extends Function {}

export function activate(React?: React, options: Options): Deactivate {}

interface RemoveMiddleware extends Function {}

export function addMiddleware(
  middleware: (
    componentClass: React.ComponentClass | React.StatelessComponent,
    componentInstance: ReactInstance | React.StatelessComponent,
    lifeCycleName: React.ComponentLifecycle,
  ) => void
): RemoveMiddleware {}
