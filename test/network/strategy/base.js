(function (buster, require) {

var assert, refute, undef;

assert = buster.assert;
refute = buster.refute;

var base = require('cola/network/strategy/base'),
	mockApi = {
		isPropagating: function () { return true; }
	};

buster.testCase('cola/network/strategy/base', {

	'should return function': function () {
		assert.isFunction(base());
	},
	'should	execute method on dest adapter': function () {
		var spy, strategy, dest;

		spy = this.spy();
		strategy = base();
		dest = {
			anyEvent: spy
		};

		strategy(null, dest, {}, 'anyEvent', mockApi);

		assert.calledOnce(spy);
	},
	'should not execute method on dest adapter if source == dest': function () {
		var spy, strategy, dest;

		spy = this.spy();
		strategy = base();
		dest = {
			anyEvent: spy
		};

		strategy(dest, dest, {}, 'anyEvent', mockApi);

		refute.calledOnce(spy);
	},
	'should not execute method on dest adapter if method doesn\'t exist': function () {
		var spy, strategy, dest;

		spy = this.spy();
		strategy = base();
		dest = {};

		strategy(null, dest, {}, 'anyEvent', mockApi);

		refute.calledOnce(spy);
	},
	'should throw if non-method with event name exists on dest adapter': function () {
		var spy, strategy, dest;

		spy = this.spy();
		strategy = base();
		dest = {
			anyProp: 1
		};

		try {
			strategy(null, dest, {}, 'anyProp', mockApi);
			refute(true);
		}
		catch (ex) {
			assert(true);
		}
	}

});
})( require('buster'), require );