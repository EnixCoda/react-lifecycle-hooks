const compareVersions = require('compare-versions');
let theReact;
try {
    theReact = require('react');
}
catch (e) { }
const middlewares = [];
function applyMiddlewares(componentClass, componentInstance, lifecycleName, lifecycleArguments) {
    middlewares.forEach(middleware => {
        middleware.call(null, componentClass, componentInstance, lifecycleName, lifecycleArguments);
    });
}
export function addMiddleware(middleware) {
    const uniqueMiddleware = middleware.bind(null);
    middlewares.push(uniqueMiddleware);
    return function removeMiddleware() {
        let index = middlewares.indexOf(uniqueMiddleware);
        middlewares.splice(index, 1);
    };
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
                    return true;
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
                    return null;
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
                    return null;
                },
            },
        ],
    },
};
var Compat;
(function (Compat) {
    Compat["legacy"] = "legacy";
    Compat["latest"] = "latest";
    Compat["all"] = "all";
})(Compat || (Compat = {}));
function handleCompat(compat) {
    const { instance, statics } = lifecycles;
    switch (compat) {
        case Compat.legacy:
            instancePureLifecycles = [...instance.common, ...instance.legacy];
            instanceLifecycles = instanceLifecycles.concat(instance.pure);
            staticLifecycles = [...statics.common, ...statics.legacy];
            return;
        case Compat.latest:
            instancePureLifecycles = [...instance.common, ...instance.latest];
            instanceLifecycles = instanceLifecycles.concat(instance.pure);
            staticLifecycles = [...statics.common, ...statics.latest];
            return;
        case Compat.all:
            instancePureLifecycles = [...instance.common, ...instance.legacy, ...instance.latest];
            instanceLifecycles = instanceLifecycles.concat(instance.pure);
            staticLifecycles = [...statics.common, ...statics.legacy, ...statics.latest];
            return;
        default:
            if (compareVersions(theReact.version, '16.3.0') < 0) {
                handleCompat(Compat.legacy);
            }
            else {
                handleCompat(Compat.all);
            }
    }
}
function applyOptions(options) {
    handleCompat(options.compat);
}
function noop() { }
const decorationMap = new Map();
function wrapLifecycleMethod(componentClass, method, lifecycleName) {
    return function () {
        applyMiddlewares(componentClass, this, lifecycleName, arguments);
        return method.apply(this, arguments);
    };
}
function decorate(componentClass) {
    const isPureComponentClass = componentClass.prototype instanceof theReact.PureComponent;
    const isComponentClass = isPureComponentClass || componentClass.prototype instanceof theReact.Component;
    if (isComponentClass) {
        class DecoratedClass extends componentClass {
        }
        const lifecyclesForTheClass = isPureComponentClass ? instancePureLifecycles : instanceLifecycles;
        lifecyclesForTheClass.forEach(lifecycle => {
            const method = componentClass.prototype[lifecycle.name];
            DecoratedClass.prototype[lifecycle.name] = wrapLifecycleMethod(componentClass, typeof method === 'function' ? method : lifecycle.default || noop, lifecycle.name);
        });
        // Seems somehow redundant to above :(
        staticLifecycles.forEach(lifecycle => {
            const method = componentClass[lifecycle.name];
            DecoratedClass[lifecycle.name] = wrapLifecycleMethod(componentClass, typeof method === 'function' ? method : lifecycle.default, lifecycle.name);
        });
        return DecoratedClass;
    }
    return wrapLifecycleMethod(componentClass, componentClass, 'render');
}
export function activate(react, options) {
    if (react) {
        theReact = react;
    }
    else if (!theReact) {
        console.warn('React is not available, activation aborted!');
        return;
    }
    react = theReact;
    applyOptions(options);
    const { createElement } = react;
    react.createElement = function createElement(type) {
        if (typeof type !== 'function')
            return createElement.apply(this, arguments);
        const componentClass = type;
        if (!decorationMap.has(componentClass)) {
            decorationMap.set(componentClass, decorate(componentClass));
        }
        const decorated = decorationMap.get(componentClass);
        return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)));
    };
    return function deactivate() {
        react.createElement = createElement;
    };
}
export default {
    activate,
    addMiddleware,
};
