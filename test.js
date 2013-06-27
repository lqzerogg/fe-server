var util = require('util'),
	mc = require('./mc').mc,
	helper = require('./helper').helper


setInterval(function() {	
	mc.get(helper.parseHourTime(new Date()) + '{"abTestType":"all","country":"all","mainPage":"all"}', function(err, response) {
		response && console.log(response)
	})
}, 1000)