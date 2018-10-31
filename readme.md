# React Lifecycle Hooks

Listening to **ALL** your React components in a neat and simple way.

2 steps to get started:
1. Install from npm
    ```
    $ npm i react-lifecycle-hooks --save-dev
    ```
1. Then add this to somewhere in your codebase
    ```jsx
    import { activate } from 'react-lifecycle-hooks'
    activate()
    ```

## Usage
Now `react-lifecycle-hooks` is ready to serve, it is watching every lifecycle among all components in your app. You can tell it what to do when lifecycles are invoked.

Besides `activate`, it also provides method `addMiddleware`:

```jsx
import React from 'react'
import { activate, addMiddleware } from 'react-lifecycle-hooks'

// Example component
class App extends React.Component {
  render() {
    return 'Hello, World!'
  }
}

// Example middleware
function logEverything(
    componentClass,
    componentInstance,
    lifecycleName,
    lifecycleArguments,
) {
  console.log('Going to execute', lifecycleName, 'of', componentClass.name, 'on instance', componentInstance, 'with arguments', lifecycleArguments)
}

/*
A typical middleware should accept these arguments:
    componentClass, componentInstance, lifecycleName and lifecycleArguments.

It should be obvious from their names that
    `componentInstance` is an instance of `componentClass`,
    `lifecycleName` is the name of the lifecycle going to be invoked,
    `lifecycleArguments` is the arguments  will be passed to the lifecycle.
*/

const removeLogMiddleware = addMiddleware(logEverything)
// removeLogMiddleware() will remove logEverything from middlewares

const deactivate = activate()
// Use deactivate() to undo activate
```

Then every time App renders, you'll see output like this in your console:
```
Going to execute render of App on instance {app instance} with arguments [].
```

Check out [Code Sandbox Demo](https://codesandbox.io/s/vnw3w00qxl) for more detailed usages!

## Why react-lifecycle-hooks instead of others?
Most similar tools work as HoC or hijack `React.Component` prototype methods to achieve the similar goal. But they have disadvantages:
1. Developers have to add HoC decorator to each components.
    > It would be a disaster if there are lots of components.
1. Due to `1.`, components code have be polluted.
    > In most cases, these changes are supposed to be included only when developing. Modifying lots of component code for global needs is not a good idea.
1. If hijack prototype lifecycle methods, it will not work for components who have custom lifecycle method declared.

## Options
`react-lifecycle-hooks` accepts an optional argument when activating:
```js
activate({ React, compat })
```

`options` works with these optional keys:

* compat - React team has announced lifecycle changes since 16.3, that's the reason of having this option. It is in short for compatibility, valid values:
    * `'legacy'` - for React < `v16.3.0`
    * `'latest'` - for React >= `v16.3.0`
    * `'all'` - all lifecycles, but you'll might get warnings in console.
    * if omitted, `react-lifecycle-hooks` will decide automatically!

* React - Explicitly pass React or react-like lib in, for example:

    ```js
    activate({ React: require('react') })
    ```
