import React from 'react'


const middlewares = []

function applyMiddlewares(componentClass, componentInstance, lifecycleName) {
  middlewares.forEach(middleware => {
    middleware.call(null, componentClass, componentInstance, lifecycleName)
  })
}

export function addMiddleware(middleware) {
  middlewares.push(middleware)
}

export function removeMiddleware(middleware) {
  let index = middlewares.indexOf(middleware)
  while (index !== -1) {
    middlewares.splice(index, 1)
    index = middlewares.indexOf(middleware)
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
    applyMiddlewares(theComponentClass, this, lifecycleName)
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
