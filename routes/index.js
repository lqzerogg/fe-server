var util = require('util')
	, mc = require('../mc').mc

var lastMinute

exports.index = function(req, res, next) {
	res.set('Content-Type', 'image/jpeg')
	res.send(200)
	var minuteTime = parseMinuteTime(new Date())
		, result = parseReq(req)
	if (lastMinute === minuteTime) {
		mc.append(minuteTime, JSON.stringify(result) + ',', function(err, response) {
			console.log(err === null ? minuteTime + ' updated' : err)
		})
	} else {
		lastMinute = minuteTime;
		mc.set(minuteTime, JSON.stringify(result) + ',', function(err, response) {
			console.log(err === null ? minuteTime + ' set' : err)
		}, 120) // keep 2 minutes
	}
}

exports.get = function(req, res, next) {
	var minuteTime
	if (typeof req.query.time !== 'undefined' && req.query.time !== null) {
		minuteTime = req.query.time
	} else {
		minuteTime = parseMinuteTime(new Date())
	}
	mc.get(minuteTime, function(err, result) {
		res.send(result)
	})
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

function parseMinuteTime(date) {
	return date.getFullYear() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + ('0'+date.getDate()).slice(-2)
			+ ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':00'

}
