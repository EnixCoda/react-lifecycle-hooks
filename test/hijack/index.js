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
    return null
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
    console.log('clock ticking', this.state.count)
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

let shouldRender = true
let shouldRevert = false

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout))

sleep(2000)
  .then(() => {
    shouldRender = false
    console.log(
      `${SerializerComponent.name} will not render. This proves return value is hijacked.`
    )
  })
  .then(() => sleep(2000))
  .then(() => {
    shouldRevert = true
    console.log(
      `${SerializerComponent.name} will continue render. This proves return values are chained.`
    )
  })
  .then(() => sleep(2000))
  .then(() => {
    console.log(`Test finish.`)
    rendered.unmount()
  })

addMiddleware(({ componentClass, lifecycleName, returnAs }) => {
  if (componentClass === SerializerComponent) {
    if (lifecycleName === 'shouldComponentUpdate') {
      returnAs(r => shouldRender)
      if (shouldRevert) {
        returnAs(r => !r)
      }
    }
  }
})
