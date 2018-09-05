const compareVersions = require('compare-versions')

let theReact
try {
  theReact = require('react')
} catch (e) {}

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

let instanceLifecycles = []
let staticLifecycles = []

const lifecycles = {
  instance: {
    common: [
      { name: 'componentDidMount' },
      { name: 'render' },
      {
        name: 'shouldComponentUpdate',
        default: function shouldComponentUpdate() {
          return true
        },
      },
      { name: 'componentDidUpdate' },
      { name: 'componentWillUnmount' },
      { name: 'componentDidCatch' },
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

function handleCompat(compat) {
  const { instance, statics } = lifecycles
  switch (compat) {
    case 'legacy':
      instanceLifecycles = [...instance.common, ...instance.legacy]
      staticLifecycles = [...statics.common, ...statics.legacy]
      return
    case 'latest':
      instanceLifecycles = [...instance.common, ...instance.latest]
      staticLifecycles = [...statics.common, ...statics.latest]
      return
    case 'all':
    default:
      instanceLifecycles = [...instance.common, ...instance.legacy, ...instance.latest]
      staticLifecycles = [...statics.common, ...statics.legacy, ...statics.latest]
  }
}

function applyOptions(options) {
  if (typeof options !== 'object' || options === null) options = {}
  handleCompat(options.compat)
}

if (compareVersions(theReact.version, '16.3.0') < 0) {
  handleCompat('legacy')
} else {
  handleCompat('all')
}

function noop() {}

const decorationMap = new Map()

function wrapLifecycleMethod(componentClass, method, lifecycleName) {
  return function() {
    applyMiddlewares(componentClass, this, lifecycleName, arguments)
    return method.apply(this, arguments)
  }
}

function decorate(componentClass) {
  const isComponentClass = componentClass.prototype instanceof theReact.Component
  if (isComponentClass) {
    class DecoratedClass extends componentClass {}

    instanceLifecycles.forEach(lifecycle => {
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

export function activate(React, options) {
  if (React) {
    theReact = React
  } else if (!theReact) {
    console.warn('React is not available, activation aborted!')
    return
  }

  React = theReact

  applyOptions(options)

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
