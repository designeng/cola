/** MIT License (c) copyright B Cavalier & J Hann */

(function(define) {
define(function (require) {

	"use strict";

	var ArrayAdapter, ObjectAdapter, propertiesKey, byProperty, when, undef;

	ArrayAdapter = require('./ArrayAdapter');
	ObjectAdapter = require('./ObjectAdapter');
	propertiesKey = require('./relational/propertiesKey');
	byProperty = require('./comparator/byProperty');
	when = require('when');

	/**
	 * Manages a collection of objects taken from the resolution of the
	 * supplied resultSet, since resultSet may be a promise.
	 * @constructor
	 * @param object {Array|Promise} array of data objects, or a promise for
	 * an array of data objects
	 * @param options.symbolizer {Function} function that returns a key/id for
	 * a data item.
	 * @param options.comparator {Function} comparator function that will
	 * be propagated to other adapters as needed
	 */
	function WidenAdapter(object, options) {

		var self, init;

		this._resultSetPromise = object;

		if (!(options && options.transform)) {
			throw new Error("options.transform must be provided");
		}

		this._transform = options.transform;
		delete options.transform;

		this.symbolizer = options.symbolizer;
		this.comparator = options.comparator;

		self = this;
		init = ArrayAdapter.prototype._init;

		ArrayAdapter.call(self, [], options);

		when(object, function (result) {
			init.call(self, self._transform(result));
		});
	}

	WidenAdapter.prototype = {

		/**
		 * ResultSetAdapter needs to delay running ArrayAdapter._init, so provides
		 * it's own noop _init which ArrayAdapter() will call immediately, and
		 * ResultSetAdapter() above will call ArrayAdapter._init at the appropriate
		 * time.
		 */
		_init: function() {},

		comparator: undef,

		symbolizer: undef,

		// just stubs for now
		getOptions: ArrayAdapter.prototype.getOptions,

		watch: makePromiseAware(ArrayAdapter.prototype.watch),

		forEach: makePromiseAware(ArrayAdapter.prototype.forEach),

		add: makePromiseAware(ArrayAdapter.prototype.add),

		remove: makePromiseAware(ArrayAdapter.prototype.remove)
	};

	/**
	 * Tests whether the given object is a candidate to be handled by
	 * this adapter.  Returns true if the object is a promise or
	 * ArrayAdapter.canHandle returns true;
	 *
	 * WARNING: Testing for a promise is NOT sufficient, since the promise
	 * may result to something that this adapter cannot handle.
	 *
	 * @param it
	 * @return {Boolean}
	 */
	WidenAdapter.canHandle = function(it) {
		return when.isPromise(it) || ObjectAdapter.canHandle(it);
	};

	/**
	 * Returns a new function that will delay execution of the supplied
	 * function until this._resultSetPromise has resolved.
	 *
	 * @param func {Function} original function
	 * @return {Promise}
	 */
	function makePromiseAware(func) {
		return function() {
			var self, args;

			self = this;
			args = Array.prototype.slice.call(arguments);

			return when(this._resultSetPromise, function() {
				return func.apply(self, args);
			});
		}
	}

	return WidenAdapter;
});

})(
	typeof define == 'function'
		? define
		: function(factory) { module.exports = factory(require); }
);