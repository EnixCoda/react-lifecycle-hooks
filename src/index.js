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

const reactComponentInstanceLifecycles = [
  'componentWillMount',
  'componentDidMount',
  'render',
  'componentWillReceiveProps',
  'shouldComponentUpdate',
  'componentWillUpdate',
  'componentDidUpdate',
  'componentWillUnmount',
  'componentDidCatch',
  'getSnapshotBeforeUpdate',
]

const reactComponentStaticLifecycles = [
  'getDerivedStateFromProps',
]

const decorationMap = new Map()

function wrapLifecycleMethod(theComponentClass, method, lifecycleName) {
  return function () {
    applyMiddlewares(theComponentClass, this, lifecycleName, arguments)
    return method.apply(this, arguments)
  }
}

function decorate(theComponentClass) {
  const isComponentClass = theComponentClass.prototype instanceof React.Component || theComponentClass.prototype instanceof React.PureComponent
  if (isComponentClass) {
    class DecoratedClass extends theComponentClass {}

    reactComponentInstanceLifecycles.forEach(lifecycleName => {
      if (lifecycleName in theComponentClass.prototype) {
        // Overwrite only if the component has implemented the life cycle method
        const method = theComponentClass.prototype[lifecycleName]
        DecoratedClass.prototype[lifecycleName] = wrapLifecycleMethod(theComponentClass, method, lifecycleName)
      }
    })

    // Seems somehow redundant to above :(
    reactComponentStaticLifecycles.forEach(lifecycleName => {
      if (lifecycleName in theComponentClass) {
        const method = theComponentClass[lifecycleName]
        DecoratedClass[lifecycleName] = wrapLifecycleMethod(theComponentClass, method, lifecycleName)
      }
    })
    return DecoratedClass
  }

  return wrapLifecycleMethod(theComponentClass, theComponentClass, 'render')
}

export function activate(React) {
  React = React || require('react')
  const { createElement } = React
  React.createElement = function(type) {
    if (typeof type === 'string') return createElement.apply(this, arguments)
    const theComponentClass = type
    if (!decorationMap.has(theComponentClass)) {
      decorationMap.set(theComponentClass, decorate(theComponentClass))
    }
    const decorated = decorationMap.get(theComponentClass)
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
