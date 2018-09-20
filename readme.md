# React Lifecycle Hooks

> This package was previously named `react-life-hooks`

Listening to lifecycles of your React components is not hard anymore! All you need to get started are:
1. Install from npm
    ```
    $ npm i react-lifecycle-hooks --save
    ```
1. Then add this to somewhere in your codebase
    ```jsx
    import { activate } from 'react-lifecycle-hooks'
    activate()
    // or
    activate(require('react'))
    ```

It's also available as default export.

```jsx
import reactLifecycleHooks from 'react-lifecycle-hooks'
reactLifecycleHooks.activate()
```

Done, it's ready to serve!

## Usage Example
Now `react-lifecycle-hooks` needs to know what it should do when lifecycles are invoked.

It provides such a method called `addMiddleware`:

```jsx
import React from 'react'
import { activate, addMiddleware } from 'react-lifecycle-hooks'

// Example component class
class App extends React.Component {
  render() {
    return 'Hello, World!'
  }
}

/*
Middlewares accept these arguments:
    componentClass, componentInstance, lifecycleName and lifecycleArguments.

It should be obvious from their names that
    `componentInstance` is an instance of `componentClass`,
    `lifecycleName` is the name of the lifecycle going to be invoked,
    `lifecycleArguments` is the exact arguments (the Array-like one) will be passed to the lifecycle.
*/

// Example middleware
function simplyLog(componentClass, componentInstance, lifecycleName, lifecycleArguments) {
  console.log('Going to execute', lifecycleName, 'of', componentClass.name, 'on', componentInstance)
}

const removeSimplyLogMiddleware = addMiddleware(simplyLog)
// removeSimplyLogMiddleware() will remove simplyLog from middlewares

const deactivate = activate()
// Use deactivate() to undo activate
```

Then every time App renders, you'll see output like this in your console:
```
Going to execute render of App on {app instance}.
```

Check out [Code Sandbox Demo](https://codesandbox.io/s/vnw3w00qxl) for more detailed usages!

## Why react-lifecycle-hooks?
Most similar tools work as HoC or hijack prototype methods to achieve the same goal. But those have these disadvantages:
1. Developers have to add HoC decorator to all components.
    > It would be a disaster if there are lots of components need to be watched.
1. Due to `1.`, code of components will be polluted.
    > In most cases, those tools are supposed to work only when developing. Modifying a lot of component code for global needs is not a good idea.
    >
    > BTW, Reverting those changes before submitting code would be another disaster.
1. If hijack prototype lifecycle methods, it will fail on components who have custom lifecycle method declared.

## How does this work?
The magic happens when your app renders.

It will overwrite `React.createElement`. Within it, it creates a wrapped React component class which has similar behavior just like the original one.
But all of its lifecycles will invoke middlewares and the original's corresponding lifecycle.
Thanks to that, `react-lifecycle-hooks` will only process those component which are going to render for the first time, and use the cached versions for further use.

Simple but efficient, right?

## Options
`react-lifecycle-hooks` can accept options as the second parameter of activate:
```js
activate(React, options)
```

`options` should be an object with following keys:

* compat - short for compatibility, valid values:
    * `'legacy'` - for React under `16.3.0`.
    * `'latest'` - latest React lifecycles, including `getSnapshotBeforeUpdate` and `getDerivedStateFromProps`. But removed `componentWillMount`, `componentWillReceiveProps` and `componentWillUpdate`.
    * `'all'` - all lifecycles, but you'll get a warning in console.

## TODO
- [ ] Better types definitions - current `index.d.ts` might has not been correctly written.
- [ ] Provide some preset middlewares - I believe there are some common cases.
- [ ] Add tests.
