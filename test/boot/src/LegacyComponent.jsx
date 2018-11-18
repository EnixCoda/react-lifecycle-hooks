export function createLegacyComponent(React) {
  function Container({ children }) {
    return <div>{children}</div>
  }

  return class LegacyComponent extends React.Component {
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
