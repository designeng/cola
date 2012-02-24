/** MIT License (c) copyright B Cavalier & J Hann */


(function (define) {
	define(function (require) {
"use strict";

	var domEvents, fireSimpleEvent, watchNode;
		domEvents = require('./events');
	fireSimpleEvent = domEvents.fireSimpleEvent;
	watchNode = domEvents.watchNode;

	/**
	 * Creates a cola adapter for interacting with dom nodes.  Be sure to
	 * unwatch any watches to prevent memory leaks in Internet Explorer 6-8.
	 * @constructor
	 * @param rootNode {Node}
	 * @param options {Object}
	 */
	function NodeAdapter (rootNode, options) {

		this._rootNode = rootNode;

		// set options
		this._options = options;

		// keep data values
		this._values = {};

	}

	NodeAdapter.prototype = {

		getOptions: function () {
			return this._options;
		},

		/**
		 * Watches a specific property and calls back when it changes.
		 * @param name {String} the name of the property to watch.
		 * @param callback {Function} function (propValue, propName) {}
		 * @returns {Function} a function to call when done watching.
		 */
		watch: function (name, callback) {
			var b, node, events, prop, currValues;
			b = this._getBindingsFor(name);
			node = this._getNode(b.node);
			if (b && node) {
				events = 'events' in b ? b.events : guessEventsFor(node);
				prop = 'prop' in b ? b.prop : guessPropFor(node);
				currValues = this._values;
				return listenToNode(node, events, function() {
					var prev, curr;
					// ensure value has changed
					prev = currValues[name];
					curr = getNodePropOrAttr(node, prop);
					if (curr != prev) {
						currValues[name] = curr;
						callback(name, curr);
					}
				});
			}
			else {
				return noop;
			}
		},

		/**
		 * Watches all nodes that have explicit bindings.
		 * Due to lack of bubbling support for many events, we can't
		 * just listen at the root node. Instead, we have to just
		 * listen to all the nodes that are explicitly bound.
		 * @param callback {Function} function (propValue, propName) {}
		 * @returns {Function} a function to call when done watching.
		 */
		watchAll: function (callback) {
			var unwatchers;
			unwatchers = [];
			for (var p in this._options.bindings) {
				unwatchers.push(this.watch(p, callback));
			}
			return function () {
				var unwatcher;
				while ((unwatcher = unwatchers.pop())) unwatcher();
			}
		},

		/**
		 * Signals that a property in a synchronized object has changed.
		 * @param name {String} the name of the changed property
		 * @param value the value of the changed property
		 */
		set: function (name, value) {
			var b, node, prop, current;
			b = this._getBindingsFor(name);
			node = this._getNode(b.node);
			if (b && node) {
				prop = 'prop' in b ? b.prop : guessPropFor(node);
				current = getNodePropOrAttr(node, name);
				this._values[name] = current;
				if (current != value) {
					setNodePropOrAttr(node, prop, value);
					// notify watchers
					return fireSimpleEvent(node, colaSyntheticEvent);
				}
			}
		},

		forEach: function (lambda) {
			var p, b, node;
			for (p in this._options.bindings) {
				b = this._options.bindings[p];
				node = this._getNode(b.node);
				lambda(getNodePropOrAttr(node, b.prop), p);
			}
		},

		/**
		 * Returns the binding info for a node, if it exists.
		 * @param name {String} the name of the node
		 * @returns {Object} {
		 *     node: aNode,
		 *     prop: 'aProp',
		 *     events: 'event1,event2' // optional
		 * }
		 */
		_getBindingsFor: function (name) {
			var bindings, binding;
			bindings = this._options.bindings;
			if (bindings && name in bindings) {
				binding = bindings[name];
			}
			else {
				binding = {};
			}
			return binding;
		},

		_getNode: function (selector) {
			// TODO: cache querySelector lookups?
			var node;
			if (!selector) {
				node = guessNode(this._rootNode, selector);
			}
			else if (typeof selector == 'string') {
				node = this._options.querySelector(selector, this._rootNode);
			}
			else {
				node = selector; // is this possible?
			}
			return node;
		}

	};

	/**
	 * Tests whether the given object is a candidate to be handled by
	 * this adapter. Returns true if this is a DOMNode (or looks like one).
	 * @param obj
	 * @returns {Boolean}
	 */
	NodeAdapter.canHandle = function (obj) {
		// crude test if an object is a node.
		return obj && obj.tagName && obj.getAttribute && obj.setAttribute;
	};

	var colaSyntheticEvent, attrToProp;

	colaSyntheticEvent = 'ColaItemPropUpdated';

	attrToProp = {
		'class': 'className',
		'for': 'htmlFor'
	};

	/**
	 * Returns a property or attribute of a node.
	 * @param node {Node}
	 * @param name {String}
	 * @returns the value of the property or attribute
	 */
	function getNodePropOrAttr (node, name) {
		if (name in node) {
			return node[attrToProp[name] || name];
		}
		else {
			// TODO: do we need to cast to lower case?
			return node.getAttribute(name);
		}
	}

	/**
	 * Sets a property of a node.
	 * @param node {Node}
	 * @param name {String}
	 * @param value
	 */
	function setNodePropOrAttr (node, name, value) {
		if (name in node) {
			node[attrToProp[name] || name] = value;
		}
		else {
			// TODO: do we need to cast to lower case?
			node.setAttribute(name, value);
		}
	}

	function listenToNode (node, events, callback) {

		var unwatchers, i;

		if (typeof events == 'string') {
			events = events.split(/\s*,\s*/);
		}
		else if (!events) {
			events = [];
		}

		// add an event for notifying from the set() method
		events.push(colaSyntheticEvent);

		// create unwatchers
		unwatchers = [];
		for (i = 0; i < events.length; i++) {
			unwatchers.push(watchNode(node, events[i], callback));
		}

		// create and return single unwatcher to unwatch all events
		return function () {
			var unwatch;
			while ((unwatch == unwatchers.pop())) squelchedUnwatch(unwatch);
		};

	}

	function squelchedUnwatch (unwatch) {
		try { unwatch(); } catch (ex) {}
	}

	/**
	 * Crude way to find a node under the current node. This is just a
	 * default implementation. A better one should be injected by
	 * the environment.
	 * @private
	 * @param rootNode
	 * @param nodeName
	 */
	function guessNode (rootNode, nodeName) {
		// use form.elements if this is a form
		if (/^form$/i.test(rootNode.tagName)) {
			return rootNode.elements[nodeName];
		}
		// use getElementById, if not a form (yuk!)
		else {
			return rootNode.ownerDocument.getElementById(nodeName);
		}
	}

	function guessEventsFor (node) {
		if (/^input$/i.test(node.tagName) || /^select$/i.test(node.tagName)) {
			return ['change', 'blur'];
		}
		else {
			return [];
		}
	}

	function guessPropFor (node) {
		if (/^input$/i.test(node.tagName) || /^select$/i.test(node.tagName)) {
			return 'value';
		}
		else {
			return 'innerHTML';
		}
	}

	function noop () {}

	return NodeAdapter;

});
}(
	typeof define == 'function'
		? define
		: function (factory) { module.exports = factory(require); },
	this
));