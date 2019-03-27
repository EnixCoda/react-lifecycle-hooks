# React Lifecycle Hooks

Listening to **ALL** your React components in a neat and simple way.

To start up:

1. Install from npm
   ```
   $ npm i react-lifecycle-hooks --save-dev
   ```
1. Use in single file, but influence whole app!
   ```jsx
   import { activate } from 'react-lifecycle-hooks'
   activate()
   ```

## Usage

After above steps, `react-lifecycle-hooks` is ready to serve. It is watching every lifecycle among all components in your app. You can tell it what to do when lifecycles are invoked and even change the original behaviors!

Besides `activate`, it provides another method `addMiddleware`.

```jsx
// #use-lifecycle-hooks.js
// You can create such a new file, then you can plug/unplug this easily
// Just don't forget to import this file :)
import React from 'react'
import { activate, addMiddleware } from 'react-lifecycle-hooks'

// You'll see basic usages with example middleware
// you can tell that it logs every happening in your app from its name.
function logEverything({
  // A middleware is a function accepts single argument, which has 5 properties.
  componentClass, // component's class
  componentInstance, // current instance of `componentClass`
  lifecycleName, // name of the lifecycle going to be invoked
  lifecycleArguments, // arguments will be passed to the lifecycle
  returnAs, // pass functions that accept & overwrite return value
}) {
  console.log(
    'Going to execute',
    lifecycleName,
    'of',
    componentClass.displayName || componentClass.name,
    'on instance',
    componentInstance,
    'with arguments',
    lifecycleArguments
  )
}

// Do you believe, this single middleware can turn every component class into React.PureComponent?
function forcePureComponent({
  componentInstance,
  lifecycleName,
  lifecycleArguments: [nextProps, nextState],
  returnAs,
}) {
  if (lifecycleName === 'shouldComponentUpdate') {
    const { props, state } = componentInstance
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

// All components works like pure components now!
addMiddleware(forcePureComponent)

const deactivate = activate()
// Use deactivate() to undo activate
```

Assume such a component is in your project.

```jsx
//#my-component.jsx
function MyComponent(props) {
  return <span>Hello, World!</span>
}
```

Then every time it renders, you'll see output like this from console:

```
  Going to execute render of MyComponent on instance {the instance} with arguments {props}.
```

Check out [Code Sandbox Demo](https://codesandbox.io/s/vq0y5mpo47) for more detailed usages!

## Options

`react-lifecycle-hooks` accepts an optional argument when activating:

```js
activate({ React, compat })
```

`options` works with these optional keys:

- compat - It is in short for compatibility. React team has announced lifecycle changes since 16.3, that's the reason of having this option. valid values:

  - `'legacy'` - for React < `v16.3.0`
  - `'latest'` - for React >= `v16.3.0`
  - `'all'` - all lifecycles, but you'll might get warnings in console.
  - if omitted, `react-lifecycle-hooks` will decide automatically!

- React - Explicitly pass React or react-like lib in, for example:

  ```js
  activate({ React: require('react') })
  ```

- fill - auto fill unimplemented lifecycle with `function() {}`. While few special lifecycles (like `getDerivedStateFromProps`) will be filled anyway with correct return value. Type: `Boolean`, default: `false`.

- transformToClass - transform function components to class components. Type: `Boolean`, default: `false`.

## Why react-lifecycle-hooks instead of others?

Most similar tools work as HoC or hijack `React.Component` prototype methods to achieve the similar goal. But they have disadvantages:

1. Developers have to add HoC decorator to each components.
   > It would be a disaster if there are lots of components.
1. Due to `1.`, components code have be polluted.
   > In most cases, these changes are supposed to be included only when developing. Modifying lots of component code for global needs is not a good idea.
1. If hijack prototype lifecycle methods, it will not work for components who have custom lifecycle method declared.
