export function createMixedComponent(React) {
  return class MixedComponent extends React.Component {
    componentDidMount() {}
    render() {
      return null
    }
    componentDidUpdate() {}
    componentWillUnmount() {}
    componentDidCatch() {}
    componentWillMount() {}
    componentWillReceiveProps() {}
    componentWillUpdate() {}
    getSnapshotBeforeUpdate() {}
    static getDerivedStateFromProps() {
      return null
    }
  }
}
