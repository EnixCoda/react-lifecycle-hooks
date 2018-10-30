import * as React from 'react';
declare type lifecycleName = 'render' | keyof React.ComponentLifecycle<any, any, any> | keyof React.StaticLifecycle<any, any>;
declare type ComponentClass = React.ComponentClass | React.SFC;
interface Middleware {
    (componentClass: ComponentClass, componentInstance: React.ReactInstance | React.StatelessComponent, lifeCycleName: lifecycleName, lifecycleArguments?: any): RemoveMiddleware;
}
interface RemoveMiddleware extends Function {
}
export declare function addMiddleware(middleware: Middleware): () => void;
declare type Compat = 'legacy' | 'latest' | 'all';
interface Options {
    compat: Compat;
}
interface Deactivate extends Function {
}
export declare function activate(react?: typeof React, options?: Options): Deactivate;
declare const _default: {
    activate: typeof activate;
    addMiddleware: typeof addMiddleware;
};
export default _default;
