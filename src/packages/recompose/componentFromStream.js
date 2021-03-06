import React, { Component } from 'react'
import { createSubscription } from 'create-subscription'
import { createChangeEmitter } from 'change-emitter'
import $$observable from 'symbol-observable'
import { config as globalConfig } from './setObservableConfig'

class SimpleBehaviorSubject {
  currentValue = null

  constructor(observable) {
    this.observable = observable
  }

  getCurrentValue() {
    return this.currentValue
  }

  subscribe(callback) {
    const subscription = this.observable.subscribe({
      next: value => {
        this.currentValue = value
        callback(value)
      },
    })

    return () => {
      subscription.unsubscribe()
    }
  }
}

const Subscription = createSubscription({
  subscribe(simpleSubject, callback) {
    return simpleSubject.subscribe(callback)
  },

  getCurrentValue(simpleSubject) {
    return simpleSubject.getCurrentValue()
  },
})

export const componentFromStreamWithConfig = config => propsToVdom =>
  class ComponentFromStream extends Component {
    propsEmitter = createChangeEmitter()

    // Stream of props
    props$ = config.fromESObservable({
      subscribe: observer => {
        const unsubscribe = this.propsEmitter.listen(props => {
          if (props) {
            observer.next(props)
          } else {
            observer.complete()
          }
        })
        return { unsubscribe }
      },
      [$$observable]() {
        return this
      },
    })

    // Stream of vdom
    vdom$ = config.toESObservable(propsToVdom(this.props$))

    constructor(props$) {
      super(props)
      this.subscription = new SimpleBehaviorSubject(this.vdom$)
      this.propsEmitter.emit(props)
    }

    componentDidUpdate(prevProps) {
      if (this.props !== prevProps) {
        this.propsEmitter.emit(this.props)
      }
    }

    render() {
      return (
        <Subscription source={this.subscription}>
          {vdom => vdom}
        </Subscription>
      )
    }
  }

const componentFromStream = propsToVdom => componentFromStreamWithConfig(globalConfig)(propsToVdom)

export default componentFromStream
