const React = require('react')
const ReactTestRenderer = require('react-test-renderer')
const { activate, addMiddleware } = require('react-lifecycle-hooks')

activate({
  React,
})

class SerializerComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.count = 0
  }

  render() {
    console.log(`${SerializerComponent.name} rendering`)
    return JSON.stringify(this.props)
  }
}

class Clock extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      count: 0,
    }
  }

  componentDidMount() {
    this.timer = setInterval(() => this.setState(({ count }) => ({ count: count + 1 })), 1000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  render() {
    console.log('clock ticking')
    return React.cloneElement(this.props.children, { count: this.state.count })
  }
}

const rendered = ReactTestRenderer.create(
  /**
   * <Clock>
   *   <PureComponent />
   * </Clock>
   */
  React.createElement(Clock, {}, React.createElement(SerializerComponent))
)

let allowRender = true
addMiddleware((componentClass, instance, lifecycleName, lifecycleArguments, wait) => {
  if (componentClass === SerializerComponent) {
    if (lifecycleName === 'shouldComponentUpdate') {
      wait.then(r => {
        return allowRender
      })
    }
  }
})

setTimeout(() => {
  allowRender = false
  console.log(`From now on, ${SerializerComponent.name} won't render anymore.`)

  setTimeout(() => {
    console.log(`Test finish.`)
    rendered.unmount()
  }, 2000)
}, 2000)
