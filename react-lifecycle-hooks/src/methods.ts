import { shallowEqual } from './shallowEqual'

export const latestShouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
  const nothingChanged = shallowEqual(this.props, nextProps) && shallowEqual(this.state, nextState)
  const shouldUpdate = !nothingChanged
  return shouldUpdate
}

export const legacyShouldComponentUpdate = function shouldComponentUpdate(
  nextProps,
  nextState,
  nextContext
) {
  const nothingChanged =
    shallowEqual(this.props, nextProps) &&
    shallowEqual(this.state, nextState) &&
    shallowEqual(this.context, nextContext)
  const shouldUpdate = !nothingChanged
  return shouldUpdate
}

export const defaultShouldComponentUpdate: Function = function shouldComponentUpdate() {
  return true
}

export const defaultGetDerivedStateFromProps: Function = function getDerivedStateFromProps(): null {
  return null
}
