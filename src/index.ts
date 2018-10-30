const compareVersions = require('compare-versions')
import * as React from 'react'

let theReact: typeof React
try {
  theReact = require('react')
} catch (e) {}

const middlewares: Middleware[] = []

type lifecycleName =
  | 'render'
  | keyof React.ComponentLifecycle<any, any, any>
  | keyof React.StaticLifecycle<any, any>

type ComponentClass = React.ComponentClass | React.SFC

function applyMiddlewares(
  componentClass: ComponentClass,
  componentInstance: React.ReactInstance,
  lifecycleName: lifecycleName,
  lifecycleArguments?: any[]
) {
  middlewares.forEach(middleware => {
    middleware(componentClass, componentInstance, lifecycleName, lifecycleArguments)
  })
}

interface Middleware {
  (
    componentClass: ComponentClass,
    componentInstance: React.ReactInstance | React.StatelessComponent,
    lifeCycleName: lifecycleName,
    lifecycleArguments?: any
  ): RemoveMiddleware
}

interface RemoveMiddleware extends Function {}

export function addMiddleware(middleware: Middleware) {
  const uniqueMiddleware = middleware.bind(null)
  middlewares.push(uniqueMiddleware)
  return function removeMiddleware() {
    let index = middlewares.indexOf(uniqueMiddleware)
    if (index !== -1) middlewares.splice(index, 1)
  }
}

let instanceLifecycles: lifecycleSlot[] = []
let instancePureLifecycles: lifecycleSlot[] = []
let staticLifecycles: lifecycleSlot[] = []

interface lifecycleSlot {
  name: lifecycleName
  default?: Function
}

const lifecycles: {
  [key: string]: {
    [key: string]: lifecycleSlot[]
  }
} = {
  instance: {
    common: [
      { name: 'componentDidMount' },
      { name: 'render' },
      { name: 'componentDidUpdate' },
      { name: 'componentWillUnmount' },
      { name: 'componentDidCatch' },
    ],
    pure: [
      {
        name: 'shouldComponentUpdate',
        default: function shouldComponentUpdate() {
          return true
        },
      },
    ],
    legacy: [
      { name: 'componentWillMount' },
      { name: 'componentWillReceiveProps' },
      { name: 'componentWillUpdate' },
    ],
    latest: [
      {
        name: 'getSnapshotBeforeUpdate',
        default: function getSnapshotBeforeUpdate(): null {
          return null
        },
      },
    ],
  },
  statics: {
    common: [],
    legacy: [],
    latest: [
      {
        name: 'getDerivedStateFromProps',
        default: function getDerivedStateFromProps(): null {
          return null
        },
      },
    ],
  },
}

type Compat = 'legacy' | 'latest' | 'all'

function handleCompat(compat: Compat) {
  const { instance, statics } = lifecycles
  switch (compat) {
    case 'legacy':
      instancePureLifecycles = [...instance.common, ...instance.legacy]
      instanceLifecycles = [...instancePureLifecycles, ...instance.pure]
      staticLifecycles = [...statics.common, ...statics.legacy]
      return
    case 'latest':
      instancePureLifecycles = [...instance.common, ...instance.latest]
      instanceLifecycles = [...instancePureLifecycles, ...instance.pure]
      staticLifecycles = [...statics.common, ...statics.latest]
      return
    case 'all':
      instancePureLifecycles = [...instance.common, ...instance.legacy, ...instance.latest]
      instanceLifecycles = [...instancePureLifecycles, ...instance.pure]
      staticLifecycles = [...statics.common, ...statics.legacy, ...statics.latest]
      return
    default:
      if (compareVersions(theReact.version, '16.3.0') < 0) {
        handleCompat('legacy')
      } else {
        handleCompat('all')
      }
  }
}

interface Options {
  compat: Compat
}

function applyOptions(options: Options) {
  handleCompat(options.compat)
}

function noop() {}

const decorationMap = new Map()

function wrapLifecycleMethod(
  componentClass: ComponentClass,
  method: Function,
  lifecycleName: lifecycleName
) {
  return function(...args: any[]) {
    applyMiddlewares(componentClass, this, lifecycleName, args)
    return method.apply(this, arguments)
  }
}

function decorate(componentType: ComponentClass) {
  const isPureComponentClass = componentType.prototype instanceof theReact.PureComponent
  const isComponentClass =
    isPureComponentClass || componentType.prototype instanceof theReact.Component
  if (isComponentClass) {
    const componentClass = componentType as React.ComponentClass
    class DecoratedClass extends componentClass {}

    const lifecyclesForTheClass = isPureComponentClass ? instancePureLifecycles : instanceLifecycles

    lifecyclesForTheClass.forEach(lifecycle => {
      const method = componentClass.prototype[lifecycle.name] as Function | undefined
      ;(DecoratedClass.prototype as any)[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : lifecycle.default || noop,
        lifecycle.name
      )
    })

    // Seems somehow redundant to above :(
    staticLifecycles.forEach(lifecycle => {
      const method = (componentClass as any)[lifecycle.name] as Function
      ;(DecoratedClass as any)[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : lifecycle.default,
        lifecycle.name
      )
    })
    return DecoratedClass
  }

  const render = componentType as React.SFC
  return wrapLifecycleMethod(componentType, render, 'render')
}

interface Deactivate extends Function {}

// export function activate(react?: typeof React, options?: Options): Deactivate
// export function activate(options?: Options): Deactivate

export function activate(react?: typeof React, options?: Options): Deactivate {
  // // allow activate(options)
  // if (typeof react === 'object' && !options) return activate(undefined, options)
  // else
  if (react) {
    // activate(React) | activate(React, options)
    theReact = react
  } else {
    // activate()
    if (!theReact) {
      console.warn('React is not available, activation aborted!')
      return
    }
  }

  react = theReact

  applyOptions(options)

  const { createElement } = react
  react.createElement = function createElement(type: string | ComponentClass) {
    if (typeof type !== 'function') return createElement.apply(this, arguments)
    const componentClass = type
    if (!decorationMap.has(componentClass)) {
      decorationMap.set(componentClass, decorate(componentClass))
    }
    const decorated = decorationMap.get(componentClass)
    return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)))
  }
  return function deactivate() {
    react.createElement = createElement
  }
}

export default {
  activate,
  addMiddleware,
}
