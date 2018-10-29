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

function applyMiddlewares(
  componentClass: React.ComponentClass,
  componentInstance: React.ReactInstance,
  lifecycleName: lifecycleName,
  lifecycleArguments?: any
) {
  middlewares.forEach(middleware => {
    middleware.call(null, componentClass, componentInstance, lifecycleName, lifecycleArguments)
  })
}

interface Middleware {
  (
    componentClass: React.ComponentClass | React.StatelessComponent,
    componentInstance: React.ReactInstance | React.StatelessComponent,
    lifeCycleName: lifecycleName,
    lifecycleArguments?: any
  ): RemoveMiddleware
}

interface RemoveMiddleware {
  (): void
}

export function addMiddleware(middleware: Middleware) {
  const uniqueMiddleware = middleware.bind(null)
  middlewares.push(uniqueMiddleware)
  return function removeMiddleware() {
    let index = middlewares.indexOf(uniqueMiddleware)
    middlewares.splice(index, 1)
  }
}

let instanceLifecycles: lifecycleSlot[] = []
let instancePureLifecycles: lifecycleSlot[] = []
let staticLifecycles: lifecycleSlot[] = []

interface lifecycleSlot {
  name: lifecycleName
  default?: React.ComponentLifecycle<any, any, any>
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
        default: function getSnapshotBeforeUpdate() {
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
        default: function getDerivedStateFromProps() {
          return null
        },
      },
    ],
  },
}

enum Compat {
  legacy = 'legacy',
  latest = 'latest',
  all = 'all',
}

function handleCompat(compat: Compat) {
  const { instance, statics } = lifecycles
  switch (compat) {
    case Compat.legacy:
      instancePureLifecycles = [...instance.common, ...instance.legacy]
      instanceLifecycles = instanceLifecycles.concat(instance.pure)
      staticLifecycles = [...statics.common, ...statics.legacy]
      return
    case Compat.latest:
      instancePureLifecycles = [...instance.common, ...instance.latest]
      instanceLifecycles = instanceLifecycles.concat(instance.pure)
      staticLifecycles = [...statics.common, ...statics.latest]
      return
    case Compat.all:
      instancePureLifecycles = [...instance.common, ...instance.legacy, ...instance.latest]
      instanceLifecycles = instanceLifecycles.concat(instance.pure)
      staticLifecycles = [...statics.common, ...statics.legacy, ...statics.latest]
      return
    default:
      if (compareVersions(theReact.version, '16.3.0') < 0) {
        handleCompat(Compat.legacy)
      } else {
        handleCompat(Compat.all)
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
  componentClass: React.ComponentClass,
  method: React.ComponentLifecycle<any, any, any>,
  lifecycleName: lifecycleName
) {
  return function() {
    applyMiddlewares(componentClass, this, lifecycleName, arguments)
    return method.apply(this, arguments)
  }
}

function decorate(componentClass: React.ComponentClass | React.SFC) {
  const isPureComponentClass = componentClass.prototype instanceof theReact.PureComponent
  const isComponentClass =
    isPureComponentClass || componentClass.prototype instanceof theReact.Component
  if (isComponentClass) {
    class DecoratedClass extends componentClass {}

    const lifecyclesForTheClass = isPureComponentClass ? instancePureLifecycles : instanceLifecycles

    lifecyclesForTheClass.forEach(lifecycle => {
      const method = componentClass.prototype[lifecycle.name]
      DecoratedClass.prototype[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : lifecycle.default || noop,
        lifecycle.name
      )
    })

    // Seems somehow redundant to above :(
    staticLifecycles.forEach(lifecycle => {
      const method = componentClass[lifecycle.name]
      DecoratedClass[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : lifecycle.default,
        lifecycle.name
      )
    })
    return DecoratedClass
  }

  return wrapLifecycleMethod(componentClass, componentClass, 'render')
}

export function activate(react: typeof React, options: Options) {
  if (react) {
    theReact = react
  } else if (!theReact) {
    console.warn('React is not available, activation aborted!')
    return
  }

  react = theReact

  applyOptions(options)

  const { createElement } = react
  react.createElement = function createElement(
    type:
      | string
      | Function
      | React.ComponentClass
  ) {
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
