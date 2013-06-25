var util = require('util')
	, mc = require('../mc').mc

var lastMinute

exports.index = function(req, res, next) {
	res.set('Content-Type', 'image/jpeg')
	res.send(200)
	var now = new Date()
		, minTime = now.getFullYear() + '/' + (now.getMonth()+1) + '/' + now.getDate()
			+ ' ' + now.getHours() + ':' + now.getMinutes() + ':00'
		, result = parseReq(req)
	if (lastMinute === minTime) {
		mc.append(minTime, JSON.stringify(result) + ',')
	} else {
		lastMinute = minTime;
		mc.set(minTime, JSON.stringify(result) + ',', 120) // keep 2 minutes
		console.log(minTime)
	}
}

function parseReq(req) {
	var result = {}
	result.country    = req.query.country
	result.abTestType = req.query.abTestType
	result.mainPage   = req.query.mainPage
	result.networkLatency = parseInt(req.query.responseEnd) - parseInt(req.query.fetchStart)
	result.domReady   = parseInt(req.query.domContentLoadedEventStart) - parseInt(req.query.fetchStart)
	result.load       = parseInt(req.query.loadEventStart) - parseInt(req.query.fetchStart)
	return result
}
