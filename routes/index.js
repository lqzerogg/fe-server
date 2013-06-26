var util = require('util')
	, mc = require('../mc').mc

var lastMinute

exports.performance = function(req, res, next) {
	res.set('Content-Type', 'image/jpeg')
	res.send(200)
	var minuteTime = parseMinuteTime(new Date())
		, result = parseReq(req)

	if (!result)
		return
	if (lastMinute === minuteTime) {
		mc.append(minuteTime, JSON.stringify(result) + ',', function(err, response) {
			console.log(err === null ? minuteTime + ' updated' : err)
		})
	} else {
		mc.set(minuteTime, JSON.stringify(result) + ',', function(err, response) {
			console.log(err === null ? minuteTime + ' set' : err)
		}, 120) // keep 2 minutes

		// because the result key is always changing, store is as 'lastMinute'
		lastMinute && mc.set('performance-last-minute', lastMinute, null, 60)

		lastMinute = minuteTime;
	}
}

exports.getPerformance = function(req, res, next) {
	var minuteTime
	if (typeof req.query.time !== 'undefined' && req.query.time) {
		minuteTime = req.query.time
	} else {
		minuteTime = parseMinuteTime(new Date())
	}
	mc.get(minuteTime, function(err, result) {
		if (result)
			res.send(JSON.parse('[' + result.replace(/,$/, '') + ']'))
		else
			res.send('no result')
	})
}

function parseReq(req) {
	var result = {}
	if (typeof req.query.country === 'undefined' || !req.query.country)
		return null
	result.country    = req.query.country

	if (typeof req.query.abTestType === 'undefined' || !req.query.abTestType)
		return null
	result.abTestType = req.query.abTestType

	if (typeof req.query.mainPage === 'undefined' || !req.query.mainPage)
		return null
	result.mainPage   = req.query.mainPage

	if (typeof req.query.pageTemplate !== 'undefined' && req.query.pageTemplate)
		result.pageTemplate   = req.query.pageTemplate

	if (typeof req.query.fetchStart === 'undefined' || !req.query.fetchStart || parseInt(req.query.fetchStart) === 0)
		return null
	if (typeof req.query.responseEnd === 'undefined' || !req.query.responseEnd || parseInt(req.query.responseEnd) === 0)
		return null
	result.networkLatency = parseInt(req.query.responseEnd) - parseInt(req.query.fetchStart)
	if (isNaN(result.networkLatency) || result.networkLatency <= 0)
		return null;

	if (typeof req.query.domContentLoadedEventStart === 'undefined' || !req.query.domContentLoadedEventStart
		|| parseInt(req.query.domContentLoadedEventStart) === 0)
		return null
	result.domReady   = parseInt(req.query.domContentLoadedEventStart) - parseInt(req.query.fetchStart)
	if (isNaN(result.domReady) || result.domReady <= 0)
		return null;

	if (typeof req.query.loadEventStart === 'undefined' || !req.query.loadEventStart || parseInt(req.query.loadEventStart) === 0)
		return null
	result.load       = parseInt(req.query.loadEventStart) - parseInt(req.query.fetchStart)
	if (isNaN(result.load) || result.load <= 0)
		return null;

	return result
}

function parseMinuteTime(date) {
	return date.getFullYear() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + ('0'+date.getDate()).slice(-2)
			+ ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':00'

}
