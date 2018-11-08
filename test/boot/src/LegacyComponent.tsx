import * as React from 'react'

export function createLegacyComponent(_React: typeof React) {
  function Container({ children }) {
    return <div>{children}</div>
  }

  return class LegacyComponent extends _React.Component<any, any, any> {
    componentDidMount() {}
    render() {
      return <Container>{this.props.children || `legacy`}</Container>
    }
    componentDidUpdate() {}
    componentWillUnmount() {}
    componentDidCatch() {}
    componentWillMount() {}
    componentWillReceiveProps() {}
    componentWillUpdate() {}
  }
}
