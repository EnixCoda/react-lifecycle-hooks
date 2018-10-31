import * as React from 'react'

function Cont({children}) {
  return <div>{children}</div>
}

export class LegacyComponent extends React.Component {
  componentDidMount() { }
  render() {
    return <Cont>`legacy`</Cont>
  }
  componentDidUpdate() { }
  componentWillUnmount() { }
  componentDidCatch() { }
  componentWillMount() { }
  componentWillReceiveProps() { }
  componentWillUpdate() { }
}
