# React Life Hook

Listening to life cycles of your React components is not hard anymore! All you need to get started are:
1. Install from npm
    > $ npm i react-life-hook
1. Then add this to somewhere in your codebase
    ```jsx
    import 'react-life-hook'
    ```

Done, it's ready to serve!

## Usage Example
Now `react-life-hook` needs to know what it should do when some lifecycles are invoked.

It provides such a method called `addMiddleware`:

```jsx
import React from 'react'
import { addMiddleware } from 'react-life-hook'

// Example component class
// Note: also works for StatelessFunctionalComponents
class App extends React.Component {
  render() {
    return 'Hello, World!'
  }
}

// This is what it need to do
function simplyLog(componentClass, componentInstance, lifecycleName) {
  console.log('Going to execute', lifecycleName, 'of', componentClass.name, 'on', componentInstance)
}

addMiddleware(simplyLog)
```

Then every time App's renders, you'll see something like this in your console:
```
Going to execute render of App on {app instance}.
```

## Why react-life-hook?
Most similar tools work as HoC to achieve the same goal. But those have 2 disadvantages:
1. Developers have to add HoC decorator to all components.
    > It would be a disaster if there are lots of components need to be watched.
1. Due to `1.`, code of components will be polluted.
    > In most cases, those tools are supposed to work only when developing. Modifying a lot of component code for global needs is not a good idea.
    >
    > BTW, Reverting those changes before submitting code would be another disaster.

## How does this work?
The magic happens when your app renders.
It will overwrite `React.createElement`. Within it, it creates a wrapped React component class which has similar behavior just like the original one.
But all of its lifecycles will invoke middlewares and the original's corresponding lifecycle.
Thanks to that, `react-life-hook` will only process those component which are going to render for the first time, and use the cached versions for further use.

Simple but efficient, right?

## TODO
- [ ] Better types definitions - current `index.d.ts` might has not been correctly written.
- [ ] Provide some preset middlewares - I believe there are some common cases.
- [ ] Add tests.
