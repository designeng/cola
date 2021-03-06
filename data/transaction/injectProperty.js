/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	return function injectProperty(name) {
		return function(model, target) {
			target[name] = model;
			return function() {
				return target[name];
			}
		};
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
