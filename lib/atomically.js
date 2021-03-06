/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var Transaction, transactional, queue, curry, txq;

	Transaction = require('./Transaction');
	transactional = require('../data/transaction');
	queue = require('./queue');
	curry = require('./fn').curry;

	txq = queue();

	return curry(atomically);

	function atomically(f, datasource) {
		return Transaction.begin()
			.map(f)
			.commit(datasource);
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
