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
// #app.jsx
// Assume such component is in somewhere of your project
class App extends React.Component {
  render() {
    return 'Hello, World!'
  }
}
```

```jsx
// #use-lifecycle-hooks.js
// You can create such a new file, then you can plug/unplug this easily
import React from 'react'
import { activate, addMiddleware } from 'react-lifecycle-hooks'
import App from './path/to/app'

// Example middleware
function logEverything({
    componentClass,     // component class
    componentInstance,  // instance of `componentClass`
    lifecycleName,      // name of the lifecycle going to be invoked
    lifecycleArguments, // arguments will be passed to the lifecycle
    returnAs,           // pass functions that accept & overwrite return value
}) {
  console.log('Going to execute', lifecycleName, 'of', componentClass.displayName || componentClass.name, 'on instance', componentInstance, 'with arguments', lifecycleArguments)
}

function forcePureComponent({
  lifecycleName,
  lifecycleInstance,
  lifecycleArguments: [nextProps, nextState],
  returnAs,
}) {
  if (lifecycleName === 'shouldComponentUpdate') {
    const { props, state } = lifecycleInstance
    returnAs(returnValue => {
      // Do nothing if the component's `shouldComponentUpdate` returns a boolean, which means it has been implemented
      if (typeof returnValue === 'boolean') return returnValue
      // Do what pure component does.
      // This return value will overwrite the original return value!
      return !(shallowEqual(props, nextProps) && shallowEqual(state, nextState))
    })

    returnAs(shouldUpdate => {
      // One more good news!
      // You can use multiple returnAs, they will be chained so that you can modify return value multiple times.
      return shouldUpdate
    })
  }
}

const removeLogMiddleware = addMiddleware(logEverything)
// removeLogMiddleware() will remove logEverything from middlewares

const deactivate = activate()
// Use deactivate() to undo activate
```

Then every time App renders, you'll see output like this in your console:
```
Going to execute render of App on instance {app instance} with arguments [].
```

Check out [Code Sandbox Demo](https://codesandbox.io/s/vq0y5mpo47) for more detailed usages!

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
