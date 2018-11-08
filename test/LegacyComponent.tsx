import * as React from 'react'

function Container({children}) {
  return <div>{children}</div>
}

export class LegacyComponent extends React.Component {
  componentDidMount() { }
  render() {
    return <Container>{this.props.children || `legacy`}</Container>
  }
  componentDidUpdate() { }
  componentWillUnmount() { }
  componentDidCatch() { }
  componentWillMount() { }
  componentWillReceiveProps() { }
  componentWillUpdate() { }
}
