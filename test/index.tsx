import { activate, addMiddleware } from '../src'
import * as React from 'react'
import * as ReactTestRenderer from 'react-test-renderer'
import { LegacyComponent } from './LegacyComponent'

// testing options
activate()()
activate({ React })()
activate({ compat: 'all' })()
activate({ compat: 'latest' })()
activate({ compat: 'legacy' })()

// testing activate/deactivate & add/remove middlewares
const middleware = (componentClass, instance, lifecycleName, args) => {
  if (shouldInvoke) {
    console.log(componentClass.displayName || componentClass.name, lifecycleName)
  } else {
    throw Error(`removed middleware should not be invoked anymore`)
  }
}

let r, serialized // make sure render result equals

console.group('activate & add middleware')
const deactivate = activate()
const removeMiddleware = addMiddleware(middleware)
let shouldInvoke = true
r = ReactTestRenderer.create(<LegacyComponent />)
serialized = JSON.stringify(r.toJSON())
console.groupEnd()

console.group('removed middleware')
console.log('there should be no log below')
removeMiddleware()
shouldInvoke = false
r = ReactTestRenderer.create(<LegacyComponent />)
if (serialized !== JSON.stringify(r.toJSON())) console.error(`render result not matched
${serialized}
${JSON.stringify(r.toJSON())}`)
console.groupEnd()

console.group('re-add middleware but deactivate')
console.log('there should be no log below')
addMiddleware(middleware)
deactivate()
r = ReactTestRenderer.create(<LegacyComponent />)
if (serialized !== JSON.stringify(r.toJSON())) console.error(`render result not matched
${serialized}
${JSON.stringify(r.toJSON())}`)
console.groupEnd()
