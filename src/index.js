let theReact
try {
  theReact = require('react')
} catch(e) {}

const middlewares = []

function applyMiddlewares(componentClass, componentInstance, lifecycleName, lifecycleArguments) {
  middlewares.forEach(middleware => {
    middleware.call(null, componentClass, componentInstance, lifecycleName, lifecycleArguments)
  })
}

export function addMiddleware(middleware) {
  const uniqueMiddleware = middleware.bind(null)
  middlewares.push(uniqueMiddleware)
  return function removeMiddleware() {
    let index = middlewares.indexOf(uniqueMiddleware)
    middlewares.splice(index, 1)
  }
}

function noop() {}

const reactComponentInstanceLifecycles = [
  { name: 'componentWillMount' },
  { name: 'componentDidMount' },
  { name: 'render' },
  { name: 'componentWillReceiveProps' },
  {
    name: 'shouldComponentUpdate',
    default: function() { return true },
  },
  { name: 'componentWillUpdate' },
  { name: 'componentDidUpdate' },
  { name: 'componentWillUnmount' },
  { name: 'componentDidCatch' },
  { name: 'getSnapshotBeforeUpdate' },
]

const reactComponentStaticLifecycles = [
  {
    name: 'getDerivedStateFromProps',
    default: function() { return null },
  },
]

const decorationMap = new Map()

function wrapLifecycleMethod(componentClass, method, lifecycleName) {
  return function () {
    applyMiddlewares(componentClass, this, lifecycleName, arguments)
    return method.apply(this, arguments)
  }
}

function decorate(componentClass) {
  const isComponentClass = componentClass.prototype instanceof theReact.Component
  if (isComponentClass) {
    class DecoratedClass extends componentClass {}

    reactComponentInstanceLifecycles.forEach(lifecycle => {
      const method = componentClass.prototype[lifecycle.name]
      DecoratedClass.prototype[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : (lifecycle.default || noop),
        lifecycle.name,
      )
    })

    // Seems somehow redundant to above :(
    reactComponentStaticLifecycles.forEach(lifecycle => {
      const method = componentClass[lifecycle.name]
      DecoratedClass[lifecycle.name] = wrapLifecycleMethod(
        componentClass,
        typeof method === 'function' ? method : lifecycle.default,
        lifecycle.name,
      )
    })
    return DecoratedClass
  }

  return wrapLifecycleMethod(componentClass, componentClass, 'render')
}

export function activate(React) {
  if (React) {
    theReact = React
  } else if (!theReact) {
    console.warn('React is not available, activation aborted!')
    return
  }

  const { createElement } = React
  React.createElement = function(type) {
    if (typeof type === 'string') return createElement.apply(this, arguments)
    const componentClass = type
    if (!decorationMap.has(componentClass)) {
      decorationMap.set(componentClass, decorate(componentClass))
    }
    const decorated = decorationMap.get(componentClass)
    return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)))
  }
  return function deactivate() {
    React.createElement = createElement
  }
}

export default {
  activate,
  addMiddleware,
}
