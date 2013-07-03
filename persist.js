var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery,
	helper = require('./helper').helper

var lastHour

setInterval(function() {
	var now = new Date()
	//now.setHours(now.getHours() - 1)
	now.setMinutes(now.getMinutes() - 5)
	lastHour = helper.parse5MinuteTime(now)

	mc.get(lastHour, function(err, count) {
		if (!count)
			return
		mc.delete(lastHour)

		count = parseInt(count)

		for (; count > 0; count--) {
			persist(count)
		}
	})
}, 5 * 60 * 1000)

function persist(count) {
	mc.get(lastHour + '-' + count, function(err, key) {
		if (!key)
			return
		mc.get(lastHour + '-' + key, function(err, data) {
			if (!data)
				return
			console.log(key + ' : ' + data)
		})
	})
}
