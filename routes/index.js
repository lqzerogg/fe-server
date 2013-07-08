var util = require('util'),
	mc = require('../mc').mc,
	helper = require('../helper').helper,
	uaParser = require('ua-parser'),
	fs = require('fs')

var IMAGE_BUF = fs.readFileSync('public/performance.jpg')

var lastMinute, count

exports.performance = function(req, res, next) {
	// response a 1*1 image
	res.set('Content-Type', 'image/jpeg');
	res.send(IMAGE_BUF)

	var minuteTime = helper.parseMinuteTime(new Date())
		, result = parseReq(req)

	if (!result)
		return
	
	if (lastMinute !== minuteTime) {
		count = 0
		lastMinute = minuteTime;
	}

	mc.set(minuteTime + '-' + ++count, JSON.stringify(result), function(err, response) {
		if (err) {
			console.log(minuteTime)
			console.log(err)
		}
	}, 120) // keep 2 minutes

	mc.set(minuteTime, count, function() {}, 120)
}

exports.getPerformance = function(req, res, next) {
	var minuteTime
	if (typeof req.query.time !== 'undefined' && req.query.time) {
		minuteTime = req.query.time
	} else {
		minuteTime = helper.parseMinuteTime(new Date())
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

	if (!req.query.site)
		return null
	result.site = req.query.site

	if (!req.query.country)
		return null
	result.country = req.query.country

	if (!req.query.abTestType)
		return null
	result.abTestType = req.query.abTestType

	if (!req.query.mainPage)
		return null
	result.mainPage = req.query.mainPage

	if (req.query.pageTemplate)
		result.pageTemplate   = req.query.pageTemplate

	if (!req.query.fetchStart || parseInt(req.query.fetchStart) === 0)
		return null
	if (!req.query.responseEnd || parseInt(req.query.responseEnd) === 0)
		return null
	result.networkLatency = parseInt(req.query.responseEnd) - parseInt(req.query.fetchStart)
	if (isNaN(result.networkLatency) || result.networkLatency <= 0)
		return null;

	if (!req.query.domContentLoadedEventStart || parseInt(req.query.domContentLoadedEventStart) === 0)
		return null
	result.domReady = parseInt(req.query.domContentLoadedEventStart) - parseInt(req.query.fetchStart)
	if (isNaN(result.domReady) || result.domReady <= 0)
		return null;

	if (!req.query.loadEventStart || parseInt(req.query.loadEventStart) === 0)
		return null
	result.load = parseInt(req.query.loadEventStart) - parseInt(req.query.fetchStart)
	if (isNaN(result.load) || result.load <= 0)
		return null;

	var ua = uaParser.parse(req.headers['user-agent'])

	if (ua.family === 'Other')
		return result

	if (ua.device.family === 'Other') { // PC
		result.browser = ua.family.toLowerCase()
		result.browserVersion = ua.major
	} else { // Mobile
		result.browser = 'm_' + ua.family.toLowerCase()
		if (result.browser === 'm_android') {
			result.browserVersion = ua.major + '.' + ua.minor
		} else {
			result.browserVersion = ua.major
		}
	}

	return result
}
