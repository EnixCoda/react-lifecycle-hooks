"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var compareVersions = require('compare-versions');
var theReact;
try {
    theReact = require('react');
}
catch (e) { }
var middlewares = [];
function applyMiddlewares(componentClass, componentInstance, lifecycleName, lifecycleArguments) {
    middlewares.forEach(function (middleware) {
        middleware(componentClass, componentInstance, lifecycleName, lifecycleArguments);
    });
}
function addMiddleware(middleware) {
    var uniqueMiddleware = middleware.bind(null);
    middlewares.push(uniqueMiddleware);
    return function removeMiddleware() {
        var index = middlewares.indexOf(uniqueMiddleware);
        middlewares.splice(index, 1);
    };
}
exports.addMiddleware = addMiddleware;
var instanceLifecycles = [];
var instancePureLifecycles = [];
var staticLifecycles = [];
var lifecycles = {
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
function handleCompat(compat) {
    var instance = lifecycles.instance, statics = lifecycles.statics;
    switch (compat) {
        case 'legacy':
            instancePureLifecycles = instance.common.concat(instance.legacy);
            instanceLifecycles = instancePureLifecycles.concat(instance.pure);
            staticLifecycles = statics.common.concat(statics.legacy);
            return;
        case 'latest':
            instancePureLifecycles = instance.common.concat(instance.latest);
            instanceLifecycles = instancePureLifecycles.concat(instance.pure);
            staticLifecycles = statics.common.concat(statics.latest);
            return;
        case 'all':
            instancePureLifecycles = instance.common.concat(instance.legacy, instance.latest);
            instanceLifecycles = instancePureLifecycles.concat(instance.pure);
            staticLifecycles = statics.common.concat(statics.legacy, statics.latest);
            return;
        default:
            if (compareVersions(theReact.version, '16.3.0') < 0) {
                handleCompat('legacy');
            }
            else {
                handleCompat('all');
            }
    }
}
function applyOptions(options) {
    handleCompat(options.compat);
}
function noop() { }
var decorationMap = new Map();
function wrapLifecycleMethod(componentClass, method, lifecycleName) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        applyMiddlewares(componentClass, this, lifecycleName, args);
        return method.apply(this, arguments);
    };
}
function decorate(componentType) {
    var isPureComponentClass = componentType.prototype instanceof theReact.PureComponent;
    var isComponentClass = isPureComponentClass || componentType.prototype instanceof theReact.Component;
    if (isComponentClass) {
        var componentClass_1 = componentType;
        var DecoratedClass_1 = /** @class */ (function (_super) {
            __extends(DecoratedClass, _super);
            function DecoratedClass() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return DecoratedClass;
        }(componentClass_1));
        var lifecyclesForTheClass = isPureComponentClass ? instancePureLifecycles : instanceLifecycles;
        lifecyclesForTheClass.forEach(function (lifecycle) {
            var method = componentClass_1.prototype[lifecycle.name];
            DecoratedClass_1.prototype[lifecycle.name] = wrapLifecycleMethod(componentClass_1, typeof method === 'function' ? method : lifecycle.default || noop, lifecycle.name);
        });
        // Seems somehow redundant to above :(
        staticLifecycles.forEach(function (lifecycle) {
            var method = componentClass_1[lifecycle.name];
            DecoratedClass_1[lifecycle.name] = wrapLifecycleMethod(componentClass_1, typeof method === 'function' ? method : lifecycle.default, lifecycle.name);
        });
        return DecoratedClass_1;
    }
    var render = componentType;
    return wrapLifecycleMethod(componentType, render, 'render');
}
// export function activate(react?: typeof React, options?: Options): Deactivate
// export function activate(options?: Options): Deactivate
function activate(react, options) {
    // // allow activate(options)
    // if (typeof react === 'object' && !options) return activate(undefined, options)
    // else
    if (react) {
        // activate(React) | activate(React, options)
        theReact = react;
    }
    else {
        // activate()
        if (!theReact) {
            console.warn('React is not available, activation aborted!');
            return;
        }
    }
    react = theReact;
    applyOptions(options);
    var createElement = react.createElement;
    react.createElement = function createElement(type) {
        if (typeof type !== 'function')
            return createElement.apply(this, arguments);
        var componentClass = type;
        if (!decorationMap.has(componentClass)) {
            decorationMap.set(componentClass, decorate(componentClass));
        }
        var decorated = decorationMap.get(componentClass);
        return createElement.apply(this, [decorated].concat(Array.prototype.slice.call(arguments, 1)));
    };
    return function deactivate() {
        react.createElement = createElement;
    };
}
exports.activate = activate;
exports.default = {
    activate: activate,
    addMiddleware: addMiddleware,
};
