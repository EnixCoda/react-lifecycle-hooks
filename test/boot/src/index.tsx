import { activate, addMiddleware } from '../../../react-lifecycle-hooks'
import { createLegacyComponent } from './LegacyComponent'
import { createSFC } from './SFC'
import * as _React from 'react'

export const test = (React: typeof _React, ReactTestRenderer) => {
  const LegacyComponent = createLegacyComponent(React)
  const SFC = createSFC(React)

  // testing options
  activate()()
  activate({ React })()
  activate({ compat: 'all' })()
  activate({ compat: 'latest' })()
  activate({ compat: 'legacy' })()
  activate({ compat: 'ancient' })()

  // testing activate/deactivate & add/remove middlewares
  let shouldInvoke = false
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
  shouldInvoke = true
  r = ReactTestRenderer.create(
    <LegacyComponent>
      <SFC text="Hello, world!" />
    </LegacyComponent>
  )
  console.groupEnd()

  console.group('removed middleware')
  console.log('there should be no log below')
  removeMiddleware()
  r = ReactTestRenderer.create(<LegacyComponent />)
  serialized = JSON.stringify(r.toJSON())
  console.groupEnd()

  console.group('re-add middleware but deactivate')
  console.log('there should be no log below')
  addMiddleware(middleware)
  deactivate()
  r = ReactTestRenderer.create(<LegacyComponent />)
  shouldInvoke = false
  if (serialized !== JSON.stringify(r.toJSON()))
    console.error(`render result not matched
${serialized}
${JSON.stringify(r.toJSON())}`)
  console.groupEnd()
}
