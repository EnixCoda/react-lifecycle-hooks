(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global['react-lifecycle-hooks'] = {})));
}(this, (function (exports) { 'use strict';

  const compareVersions = require('compare-versions');

  let theReact;
  try {
    theReact = require('react');
  } catch (e) {}

  const middlewares = [];

  function applyMiddlewares(componentClass, componentInstance, lifecycleName, lifecycleArguments) {
    middlewares.forEach(middleware => {
      middleware.call(null, componentClass, componentInstance, lifecycleName, lifecycleArguments);
    });
  }

  function addMiddleware(middleware) {
    const uniqueMiddleware = middleware.bind(null);
    middlewares.push(uniqueMiddleware);
    return function removeMiddleware() {
      let index = middlewares.indexOf(uniqueMiddleware);
      middlewares.splice(index, 1);
    }
  }

  let instanceLifecycles = [];
  let instancePureLifecycles = [];
  let staticLifecycles = [];

  const lifecycles = {
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
  };

  function handleCompat(compat) {
    const { instance, statics } = lifecycles;
    switch (compat) {
      case 'legacy':
        instancePureLifecycles = [...instance.common, ...instance.legacy];
        instanceLifecycles = instanceLifecycles.concat(instance.pure);
        staticLifecycles = [...statics.common, ...statics.legacy];
        return
      case 'latest':
        instancePureLifecycles = [...instance.common, ...instance.latest];
        instanceLifecycles = instanceLifecycles.concat(instance.pure);
        staticLifecycles = [...statics.common, ...statics.latest];
        return
      case 'all':
        instancePureLifecycles = [...instance.common, ...instance.legacy, ...instance.latest];
        instanceLifecycles = instanceLifecycles.concat(instance.pure);
        staticLifecycles = [...statics.common, ...statics.legacy, ...statics.latest];
        return
      default:
        if (compareVersions(theReact.version, '16.3.0') < 0) {
          handleCompat('legacy');
        } else {
          handleCompat('all');
        }
    }
  }

  function applyOptions(options) {
    if (typeof options !== 'object' || options === null) options = {};
    handleCompat(options.compat);
  }

  function noop() {}

  const decorationMap = new Map();

  function wrapLifecycleMethod(componentClass, method, lifecycleName) {
    return function() {
      applyMiddlewares(componentClass, this, lifecycleName, arguments);
      return method.apply(this, arguments)
    }
  }

  function decorate(componentClass) {
    const isPureComponentClass = componentClass.prototype instanceof theReact.PureComponent;
    const isComponentClass = isPureComponentClass || componentClass.prototype instanceof theReact.Component;
    if (isComponentClass) {
      class DecoratedClass extends componentClass {}

      const lifecyclesForTheClass = isPureComponentClass ? instancePureLifecycles : instanceLifecycles;

      lifecyclesForTheClass.forEach(lifecycle => {
        const method = componentClass.prototype[lifecycle.name];
        DecoratedClass.prototype[lifecycle.name] = wrapLifecycleMethod(
          componentClass,
          typeof method === 'function' ? method : lifecycle.default || noop,
          lifecycle.name
        );
      });

      // Seems somehow redundant to above :(
      staticLifecycles.forEach(lifecycle => {
        const method = componentClass[lifecycle.name];
        DecoratedClass[lifecycle.name] = wrapLifecycleMethod(
          componentClass,
          typeof method === 'function' ? method : lifecycle.default,
          lifecycle.name
        );
      });
      return DecoratedClass
    }

    return wrapLifecycleMethod(componentClass, componentClass, 'render')
  }

  function activate(React, options) {
    if (React) {
      theReact = React;
    } else if (!theReact) {
      console.warn('React is not available, activation aborted!');
      return
    }

    React = theReact;

    applyOptions(options);

    const { createElement } = React;
    React.createElement = function(type) {
      if (typeof type !== 'function') return createElement.apply(this, arguments)
      const componentClass = type;
      if (!decorationMap.has(componentClass)) {
        decorationMap.set(componentClass, decorate(componentClass));
      }
      const decorated = decorationMap.get(componentClass);
      return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)))
    };
    return function deactivate() {
      React.createElement = createElement;
    }
  }

  var index = {
    activate,
    addMiddleware,
  };

  exports.addMiddleware = addMiddleware;
  exports.activate = activate;
  exports.default = index;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
