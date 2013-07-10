var util = require('util'),
	mc = require('../mc').mc,
	helper = require('../helper').helper,
	uaParser = require('ua-parser'),
	fs = require('fs'),
	path = require('path')

var IMAGE_BUF = fs.readFileSync(path.join(__dirname, '../public/performance.jpg'))

var lastMinute, count

/*
	Store every request as a stringified object into memcache.

	The key is current minute with the sequential number of requests in that minute.

	Example
		There are 3 requests arriving in sequence at:
		2013/06/20 00:00:10
		2013/06/20 00:00:20
		2013/06/20 00:01:20

		Then the data in memcache is like this:
		{"2013/06/2000:00:00-1", JSON.stringify([request object])}
		{"2013/06/2000:00:00-2", JSON.stringify([request object])}
		{"2013/06/2000:01:00-1", JSON.stringify([request object])}
*/
exports.performance = function(req, res, next) {
	// response a 1*1 image
	res.set('Content-Type', 'image/jpeg');
	res.send(IMAGE_BUF)

	var minuteTime = helper.parseMinuteTime(new Date())
		, result = parseReq(req)

	if (!result)
		return
	
	// If a new minute comes, reset the count
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

/*
	Parse request to an object.

	networkLatency = responseEnd - fetchStart
	domReady = domContentLoadedEventStart - fetchStart
	load = loadEventStart - fetchStart

	Example
		request like this:
		"GET /performance?site=mini&mainPage=advanced_search_result&pageTemplate=3&country=it&abTestType=ATest
		&loadEventStart=1371606352591&domContentLoadedEventStart=1371606351555&responseEnd=1371606350091&fetchStart=1371606348510
		HTTP/1.1" 200 695 "-" "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)"
		__cust=00000000A3F6DB51DA7906A202E01D09 - - -

		returns:
		{
			"site": "mini",
			"mainPage": "advanced_search_result",
			"pageTemplate": "3",
			"country": "it",
			"abTestType": "ATest",
			"networkLatency": 1581,
			"domReady": 3045,
			"load": 4081,
			"browser": "IE",
			"browserVersion": 10
		}

	There are 3 conditions that return null
	1. Any parameter is null, except pageTemplate
	2. Any of networkLatency, domReady  or load is less than 0
	3. Can't parse user agent infomation

*/
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
		return null

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
