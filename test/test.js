var assert  = require('assert'),
    Machine = require('../')

describe('Inititalization', function () {
    
    it('no options', function () {
        var m = new Machine()
        assert.equal(m.currentState, 'default')
    })

    it('options.states', function () {
        var m = new Machine({
            states: ['a', 'b', 'c']
        })
        assert.equal(m.states.length, 3)
        assert.equal(m.currentState, 'a')
    })

    it('options.defaultState', function () {
        var m = new Machine({
            states: ['a', 'b', 'c'],
            defaultState: 'c'
        })
        assert.equal(m.currentState, 'c')
    })

})

describe('Setting state', function () {
    
    var m = new Machine({
        states: ['a', 'b', 'c']
    })

    it('should set state', function () {
        var res = m.setState('b')
        assert.equal(m.currentState, 'b')
        assert.ok(res)
    })

    it('should not set if it doesn\'t have the state', function () {
        var res = m.setState('d')
        assert.equal(m.currentState, 'b')
        assert.ok(!res)
    })

    it('should emit events', function () {
        
        var transition = false,
            enterC     = false,
            leaveB     = false
        
        m.on('transition', function (e) {
            assert.equal(e.from, 'b')
            assert.equal(e.to  , 'c')
            transition = true
        })
        m.on('enter:c', function () {
            enterC = true
        })
        m.on('leave:b', function () {
            leaveB = true
        })

        var res = m.setState('c')
        assert.ok(transition)
        assert.ok(enterC)
        assert.ok(leaveB)
        assert.ok(res)

        m.removeAllListeners()
    })

    it('should not emit if set to same state', function () {
        
        var emitted = false
        m.on('transition', function () {
            emitted = true
        })

        var res = m.setState('c')
        assert.ok(!emitted)
        assert.ok(!res)

        m.removeAllListeners()

    })

    it('should not emit if locked', function () {

        var emitted = false
        m.on('transition', function () {
            emitted = true
        })

        m.lock()
        var res = m.setState('a')

        assert.ok(!emitted)
        assert.ok(!res)
        assert.equal(m.currentState, 'c')

        m.unlock()
        res = m.setState('a')
        assert.ok(emitted)
        assert.ok(res)
        assert.equal(m.currentState, 'a')

    })

    it('should pass arguments in the event', function () {
        
        var emitted = false
        m.on('transition', function (e) {
            assert.deepEqual(e.args, [1, 2, 3])
            emitted = true
        })

        m.setState('b', 1, 2, 3)
        assert.ok(emitted)
        assert.deepEqual(m.currentArgs, [1, 2, 3])

    })

})

describe('History', function () {

    var m = new Machine({
        states: ['a', 'b', 'c']
    })
    
    it('should push to history on transition', function () {
        m.setState('b')
        assert.equal(m.history.length, 1)
        assert.equal(m.history[0].state, 'a')
        m.setState('c')
        assert.equal(m.history.length, 2)
        assert.equal(m.history[1].state, 'b')
    })

    it('should also remember the arguments of the transition', function () {
        m.setState('a', 1, 2, 3)
        m.setState('b')
        assert.equal(m.history.length, 4)
        assert.deepEqual(m.history[m.history.length - 1].args, [1, 2, 3])
    })

    it('should be able to go back in history, with correct arguments', function () {

        var emitted = false
        m.on('enter:a', function (e) {
            assert.equal(e.from, 'b')
            assert.deepEqual(e.args, [1, 2, 3])
            emitted = true
        })

        m.back()
        assert.equal(m.history.length, 3)
        assert.equal(m.currentState, 'a')
        assert.deepEqual(m.currentArgs, [1, 2, 3])
        assert.ok(emitted)

        m.removeAllListeners()

    })

    it('should stop if history is empty', function () {
        
        m.back()
        m.back()
        m.back()

        assert.equal(m.history.length, 0)
        assert.equal(m.currentState, 'a')

        m.back()
        assert.equal(m.currentState, 'a')

    })

})

describe('Config Limitations', function () {

    it('to only', function () {

        var m = new Machine({
            states: ['a', 'b', 'c']
        })

        m.config('a', {
            to: { only: ['c'] }
        })

        var res = m.setState('b')
        assert.ok(!res)
        assert.equal(m.currentState, 'a')

        res = m.setState('c')
        assert.ok(res)
        assert.equal(m.currentState, 'c')
    })

    it('to exclude', function () {

        var m = new Machine({
            states: ['a', 'b', 'c']
        })

        m.config('a', {
            to: { exclude: ['c'] }
        })

        var res = m.setState('c')
        assert.ok(!res)
        assert.equal(m.currentState, 'a')

        res = m.setState('b')
        assert.ok(res)
        assert.equal(m.currentState, 'b')
    })

    it('from only', function () {

        var m = new Machine({
            states: ['a', 'b', 'c']
        })

        m.config('b', {
            from: { only: ['c'] }
        })

        var res = m.setState('b')
        assert.ok(!res)
        assert.equal(m.currentState, 'a')

        res = m.setState('c')
        assert.ok(res)
        assert.equal(m.currentState, 'c')

        res = m.setState('b')
        assert.ok(res)
        assert.equal(m.currentState, 'b')

    })

    it('from exclude', function () {
        
        var m = new Machine({
            states: ['a', 'b', 'c']
        })

        m.config('b', {
            from: { exclude: ['a'] }
        })

        var res = m.setState('b')
        assert.ok(!res)
        assert.equal(m.currentState, 'a')

        res = m.setState('c')
        assert.ok(res)
        assert.equal(m.currentState, 'c')

        res = m.setState('b')
        assert.ok(res)
        assert.equal(m.currentState, 'b')

    })

})

describe('Register Events', function () {
    
    it('should register event to be triggered on condition', function () {
        var m = new Machine({
            states: ['a', 'b', 'c']
        })

        m.register('custom-event', {
            from: 'b',
            to:   'c'
        })

        var emitted = false
        m.on('custom-event', function () {
            emitted = true
        })

        m.setState('b')
        assert.ok(!emitted)

        m.setState('c')
        assert.ok(emitted)

    })

})