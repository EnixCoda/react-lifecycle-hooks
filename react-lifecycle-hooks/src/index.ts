import compareVersions = require('compare-versions')
import * as React from 'react'
import { defaultGetDerivedStateFromProps, defaultShouldComponentUpdate } from './methods'

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
let pureComponentLifecycles: lifecycleSlot[] = [] // for React.PureComponent, it should not include `shouldComponentUpdate`
let staticLifecycles: lifecycleSlot[] = []

type Compat = 'legacy' | 'latest' | 'all'

function handleCompat(compat: Compat) {
  switch (compat) {
    case 'legacy':
      pureComponentLifecycles = [
        'componentWillMount',
        'render',
        'componentDidMount',
        'componentWillReceiveProps',
        'componentWillUpdate',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      componentLifecycles = pureComponentLifecycles.concat({
        name: 'shouldComponentUpdate',
        default: defaultShouldComponentUpdate,
      })
      staticLifecycles = []
      return
    case 'latest':
      pureComponentLifecycles = [
        'render',
        'componentDidMount',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      componentLifecycles = pureComponentLifecycles.concat({
        name: 'shouldComponentUpdate',
        default: defaultShouldComponentUpdate,
      })
      staticLifecycles = [
        {
          name: 'getDerivedStateFromProps',
          default: defaultGetDerivedStateFromProps,
        },
      ]
      return
    case 'all':
      pureComponentLifecycles = [
        'componentWillMount',
        'render',
        'componentDidMount',
        'componentWillReceiveProps',
        'componentWillUpdate',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentDidCatch',
      ]
      componentLifecycles = pureComponentLifecycles.concat({
        name: 'shouldComponentUpdate',
        default: defaultShouldComponentUpdate,
      })
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
  transformToClass?: boolean
  fill?: boolean
}

function applyOptions(options: Options) {
  handleCompat(options.compat)
}

function transformToClass<P>(functionComponent: React.SFC<P>) {
  return class TransformedComponent extends React.Component<P> {
    static displayName = functionComponent.displayName || functionComponent.name
    state = {} // for getDerivedStateFromProps
    render() {
      return functionComponent(this.props)
    }
  }
}

function noop() {}

const decorationMap = new Map()

function decorate(componentType: ComponentClass, options: Options) {
  if (
    !(componentType.prototype instanceof theReact.Component) &&
    !(componentType as any).isReactTopLevelWrapper // for React v15
  ) {
    if (options.transformToClass) {
      const decorated = decorate(transformToClass(<React.SFC>componentType), options)
      return decorated
    } else {
      const render = componentType as React.SFC
      const decorated = wrapLifecycleMethod(componentType, render, 'render') as React.SFC
      decorated.displayName = componentType.displayName || componentType.name
      return decorated
    }
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
        ? options.fill
          ? noop
          : undefined
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
      decorationMap.set(componentClass, decorate(componentClass, options))
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
