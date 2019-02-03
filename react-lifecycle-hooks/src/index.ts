import compareVersions = require('compare-versions')
import * as React from 'react'
import {
  legacyShouldComponentUpdate,
  latestShouldComponentUpdate,
  defaultGetDerivedStateFromProps,
  defaultShouldComponentUpdate,
} from './methods'

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

function applyMiddlewares(heartbeat: HeartBeat) {
  middlewares.forEach(middleware => {
    middleware(heartbeat)
  })
}

type Task = (returnValue: any) => any

interface HeartBeat {
  componentClass: ComponentClass
  componentInstance: React.ReactInstance | React.StatelessComponent
  lifecycleName: lifecycleName
  lifecycleArguments: any[]
  returnAs: (task: Task) => void
}

interface Middleware {
  (heartbeat: HeartBeat): void
}

interface RemoveMiddleware {
  (): void
}

export function addMiddleware(middleware: Middleware): RemoveMiddleware {
  const uniqueMiddleware = middleware.bind(null)
  middlewares.push(uniqueMiddleware)
  return function removeMiddleware() {
    let index = middlewares.indexOf(uniqueMiddleware)
    if (index !== -1) middlewares.splice(index, 1)
  }
}

function wrapLifecycleMethod(
  componentClass: ComponentClass,
  method: Function | undefined,
  lifecycleName: lifecycleName
) {
  return function(...lifecycleArguments: any[]) {
    const componentInstance = this
    let shouldNotAddTaskAnymore = false
    const tasks: Task[] = []
    const returnAs = (task: Task) => {
      if (shouldNotAddTaskAnymore) {
        console.warn('Please do not call returnAs in returnAs, aborting...')
        return
      }
      tasks.push(task)
    }
    applyMiddlewares({
      componentClass,
      componentInstance,
      lifecycleName,
      lifecycleArguments,
      returnAs,
    })
    const returnValue = method ? method.apply(componentInstance, lifecycleArguments) : undefined
    shouldNotAddTaskAnymore = true
    return tasks.reduce((prevReturn, task) => task(prevReturn), returnValue)
  }
}

type lifecycleSlot =
  | {
      name: lifecycleName
      default?: Function
    }
  | lifecycleName

let componentLifecycles: lifecycleSlot[] = [] // for React.Component
let pureComponentLifecycles: lifecycleSlot[] = [] // for React.PureComponent
let staticLifecycles: lifecycleSlot[] = []

function mapForPureComponentLifecycles(
  shouldComponentUpdate: typeof legacyShouldComponentUpdate | typeof latestShouldComponentUpdate
): lifecycleSlot[] {
  return componentLifecycles.map(lifecycle => {
    const lifecycleName = typeof lifecycle === 'string' ? lifecycle : lifecycle.name
    if (lifecycleName === 'shouldComponentUpdate') {
      return {
        name: lifecycleName,
        default: shouldComponentUpdate,
      } as lifecycleSlot
    }
    return lifecycle
  })
}

type Compat = 'legacy' | 'latest' | 'all'

function handleCompat(compat: Compat) {
  switch (compat) {
    case 'legacy':
      componentLifecycles = [
        'componentWillMount',
        'render',
        'componentDidMount',
        'componentWillReceiveProps',
        {
          name: 'shouldComponentUpdate',
          default: defaultShouldComponentUpdate,
        },
        'componentWillUpdate',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      pureComponentLifecycles = mapForPureComponentLifecycles(legacyShouldComponentUpdate)
      staticLifecycles = []
      return
    case 'latest':
      componentLifecycles = [
        'render',
        'componentDidMount',
        {
          name: 'shouldComponentUpdate',
          default: defaultShouldComponentUpdate,
        },
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      pureComponentLifecycles = mapForPureComponentLifecycles(latestShouldComponentUpdate)
      staticLifecycles = [
        {
          name: 'getDerivedStateFromProps',
          default: defaultGetDerivedStateFromProps,
        },
      ]
      return
    case 'all':
      componentLifecycles = [
        'componentWillMount',
        'render',
        'componentDidMount',
        'componentWillReceiveProps',
        {
          name: 'shouldComponentUpdate',
          default: defaultShouldComponentUpdate,
        },
        'componentWillUpdate',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      pureComponentLifecycles = mapForPureComponentLifecycles(legacyShouldComponentUpdate)
      staticLifecycles = [
        {
          name: 'getDerivedStateFromProps',
          default: defaultGetDerivedStateFromProps,
        },
      ]
      return
    default:
      if (compareVersions(theReact.version, '16.0.0') < 0) {
        handleCompat('legacy')
      } else {
        handleCompat('latest')
      }
  }
}

interface Options {
  compat?: Compat
  React?: typeof React
}

function applyOptions(options: Options) {
  handleCompat(options.compat)
}

const decorationMap = new Map()

function decorate(componentType: ComponentClass) {
  if (
    !(componentType.prototype instanceof theReact.Component) &&
    !(componentType as any).isReactTopLevelWrapper // for React v15
  ) {
    const render = componentType as React.SFC
    const decorated = wrapLifecycleMethod(componentType, render, 'render') as React.SFC
    decorated.displayName = componentType.displayName || componentType.name
    return decorated
  }
  const componentClass = componentType as React.ComponentClass
  class DecoratedClass extends componentClass {
    static displayName = componentClass.displayName || componentClass.name
  }

  const isPureComponentClass = componentType.prototype instanceof theReact.PureComponent
  const lifecyclesForTheClass = isPureComponentClass ? pureComponentLifecycles : componentLifecycles

  lifecyclesForTheClass.forEach(lifecycle => {
    const lifecycleName = typeof lifecycle === 'string' ? lifecycle : lifecycle.name
    const method = componentClass.prototype[lifecycleName] as Function | undefined
    ;(DecoratedClass.prototype as any)[lifecycleName] = wrapLifecycleMethod(
      componentClass,
      typeof method === 'function'
        ? method
        : typeof lifecycle === 'string'
        ? undefined
        : lifecycle.default,
      lifecycleName
    )
  })

  // Seems somehow redundant to above :(
  staticLifecycles.forEach(lifecycle => {
    const lifecycleName = typeof lifecycle === 'string' ? lifecycle : lifecycle.name
    const method = (componentClass as any)[lifecycleName] as Function | undefined
    ;(DecoratedClass as any)[lifecycleName] = wrapLifecycleMethod(
      componentClass,
      typeof method === 'function'
        ? method
        : typeof lifecycle === 'string'
        ? undefined
        : lifecycle.default,
      lifecycleName
    )
  })
  return DecoratedClass
}

interface Deactivate {
  (): void
}

export function activate(options: Options = {}): Deactivate {
  if (options && options.React) {
    theReact = options.React
  } else {
    if (!theReact) {
      console.warn('React is not available, activation aborted!')
      return
    }
  }

  const react = theReact

  applyOptions(options)

  const { createElement } = react
  function _createElement(type: string | ComponentClass) {
    if (typeof type !== 'function') return createElement.apply(this, arguments)
    const componentClass = type
    if (!decorationMap.has(componentClass)) {
      decorationMap.set(componentClass, decorate(componentClass))
    }
    const decorated = decorationMap.get(componentClass)
    return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)))
  }
  react.createElement = _createElement
  return function deactivate() {
    if (react.createElement === _createElement) {
      react.createElement = createElement
    }
  }
}

export default {
  activate,
  addMiddleware,
}
