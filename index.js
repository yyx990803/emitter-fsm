var Emitter = require('events').EventEmitter

function StateMachine (opts) {

    Emitter.call(this)

    opts = opts || {}
    this.states = opts.states || ['default']
    this.currentState = opts.defaultState || this.states[0]
    this.history = []
    this.configs = {}
    this.events  = []

    var self = this
    this.on('transition', function (e) {
        self.events.forEach(function (condition) {
            if (condition.from === e.from && condition.to === e.to) {
                self.emit(condition.event)
            }
        })
    })

}

StateMachine.prototype = Object.create(Emitter.prototype)

StateMachine.prototype.setState = function (to) {

    var from = this.currentState
    if (!this._validate(from, to)) {
        return false
    }

    this.history.push({
        state : from,
        args  : this.currentArgs
    })

    var args = arguments.length > 1
        ? [].slice.call(arguments, 1)
        : null

    this.currentArgs  = args
    this.currentState = to
    this._emit(from, to, args)

    return true

}

StateMachine.prototype.back = function () {

    if (!this.history.length) {
        return false
    }

    var last = this.history[this.history.length - 1],
        from = this.currentState,
        to   = last.state,
        args = last.args

    if (!this._validate(from, to)) {
        return false
    }

    this.history.pop()
    this.currentState = to
    this.currentArgs  = args
    this._emit(from, to, args, true)

    return true

}

StateMachine.prototype.lock = function () {

    this.locked = true

}

StateMachine.prototype.unlock = function () {

    this.locked = false

}

StateMachine.prototype.config = function (state, options) {

    options.to   = options.to   || {}
    options.from = options.from || {}
    this.configs[state] = options

}

StateMachine.prototype.register = function (event, condition) {
    
    this.events.push({
        event : event,
        from  : condition.from,
        to    : condition.to
    })

}

StateMachine.prototype._emit = function (from, to, args, back) {

    var event = {
        from : from,
        to   : to,
        args : args,
        back : back
    }

    this.emit('transition', event)
    this.emit('leave:' + from, event)
    this.emit('enter:' + to, event)

}

StateMachine.prototype._validate = function (from, to) {

    if (this.locked) return
    if (from === to) return
    if (this.states.indexOf(to) < 0) return

    var fromConf = this.configs[from]
    if (fromConf) {
        if (fromConf.to.only) {
            if (fromConf.to.only.indexOf(to) < 0) return
        } else if (fromConf.to.exclude) {
            if (fromConf.to.exclude.indexOf(to) > -1) return
        }
    }

    var toConf = this.configs[to]
    if (toConf) {
        if (toConf.from.only) {
            if (toConf.from.only.indexOf(from) < 0) return
        } else if (toConf.from.exclude) {
            if (toConf.from.exclude.indexOf(from) > -1) return
        }
    }

    return true

}

module.exports = StateMachine