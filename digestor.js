var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery,
	helper = require('./helper').helper

var allDatas, lastMinute,
	lastHour, pastHour, keyCount,
	// HOURLY_TIMEOUT = 10 * 60
	HOURLY_TIMEOUT = 2 * 60 * 60

/*
	Check request count of last minute every half a minute.
	Then handle each request in sequence.
*/
setInterval(function() {
	var now = new Date()
	now.setMinutes(now.getMinutes() - 1)
	lastMinute = helper.parseMinuteTime(now)
	// lastHour   = helper.parse5MinuteTime(now)
	lastHour   = helper.parseHourTime(now)

	if (pastHour !== lastHour) {
		keyCount = 0
		pastHour = lastHour
	}

	mc.get(lastMinute, function(err, count) {
		if (!count)
			return
		console.log(lastMinute + ' success')
		mc.delete(lastMinute)

		count = parseInt(count)

		allDatas = {}

		for (; count > 0; count--) {
			makePiece(count)
		}
	})
}, 30 * 1000)


/*
	Get one request from memcache and accumulate metrics with all other requests group by dimension.
	Store accumulated data into memcache after handling the last request.
*/
function makePiece(count) {
	var i, metric = {}, dims, key
	mc.get(lastMinute + '-' + count, function(err, data) {
		data = JSON.parse(data)
		metric.networkLatency = data.networkLatency
		metric.domReady       = data.domReady
		metric.load           = data.load

		delete data.networkLatency
		delete data.domReady
		delete data.load

		dims = extendDim(data)

		for (i in dims) {
			key = JSON.stringify(dims[i]).replace(/\s/g, '')
			if (allDatas[key]) {
				allDatas[key].networkLatency += metric.networkLatency
				allDatas[key].domReady       += metric.domReady
				allDatas[key].load           += metric.load
				allDatas[key].count++
			} else {
				allDatas[key] = jQuery.extend({}, metric, {count: 1})
			}
		}

		// after making the last piece of data
		// store 'allDatas' to hourly set
		if (count === 1) {
			for (key in allDatas) {
				mcDatas(key, allDatas[key])
			}
		}
	})
}

/*
	Extend a single dimension to multiple dimensions with sorted keys

	Example
		data: {"site": "mini", "mainPage": "product-info", "pageTemplate": 3, "country": "us"}
		return: [
					{"country": "us", "mainPage": "product-info", "pageTemplate": 3, "site": "mini"},
					{"country": "all", "mainPage": "product-info", "pageTemplate": 3, "site": "mini"},
					{"country": "us", "mainPage": "product-info", "pageTemplate": "all", "site": "mini"},
					{"country": "all", "mainPage": "product-info", "pageTemplate": "all", "site": "mini"},
					{"country": "us", "mainPage": "all", "site": "mini"},
					{"country": "all", "mainPage": "all", "site": "mini"}
				]
*/
function extendDim(data) {
	var dim = helper.jsonToSortedArray(data),
		i = 0,
		dims = [{}]

	for (i in dim) {
		var j = 0, tempDims = [], obj = {}
		for (j in dims) {
			// 'all' page should be with no template
			if ((dims[j]['mainPage'] === 'all' || dims[j]['mainPage'] === 'm_all') && dim[i]['pageTemplate']) {
				tempDims[tempDims.length] = jQuery.extend({}, dims[j])
				continue
			}
			// 'all' browser should be with no version
			if ((dims[j]['browser'] === 'all' || dims[j]['browser'] === 'm_all') && dim[i]['browserVersion']) {
				tempDims[tempDims.length] = jQuery.extend({}, dims[j])
				continue
			}
			tempDims[tempDims.length] = jQuery.extend({}, dims[j], dim[i])
			// there is not 'all' dimension of site
			if (!dim[i]['site']) {
				if ((dim[i]['mainPage'] && dim[i]['mainPage'].search(/m_/) === 0)
					|| (dim[i]['browser'] && dim[i]['browser'].search(/m_/) === 0)) {
					obj[Object.keys(dim[i])[0]] = 'm_all'
				} else {
					obj[Object.keys(dim[i])[0]] = 'all'
				}
				tempDims[tempDims.length] = jQuery.extend({}, dims[j], obj)
			}
		}
		dims = tempDims
	}

	return dims
}

/*
	Store data into memcache.

	If the key already exists, then update value by accumulating the metrics and the count.
	Otherwise put a new key:value pair and store the key using the hour and sequential number of the key in that hour.

	Example
		call 1 at 2013/06/20 00:10:39 ===================================
		key: {"site":"litb", "country":"us" ...}
		metric: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 1}

		The key is not existing, then
		store value       {{"site":"litb", "country":"us" ...}: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 1}}
		store key         {'2013/06/2000:00:00-1': key}
		store key's count {'2013/06/2000:00:00': 1}

		call 2 at 2013/06/20 00:20:43 ===================================
		key: {"site":"litb", "country":"us" ...}
		metric: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 1}

		Because of the key exist already, then
		update value      {{"site":"litb", "country":"us" ...}: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 2}}

		call 3 at 2013/06/20 00:30:27 ===================================
		key: {"site":"litb", "country":"br" ...}
		metric: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 1}

		The key is not existing, then
		store value       {{"site":"litb", "country":"br" ...}: {"networkLatency": ..., "domReady": ..., "load": ..., "count": 1}}
		store key         {'2013/06/2000:00:00-2': key}
		store key's count {'2013/06/2000:00:00': 2}
*/
function mcDatas(key, metric) {
	var mcKey = lastHour + '-' + key
	mc.get(mcKey, function(err, result) {
		if (result) {
			result = JSON.parse(result)
			result.networkLatency += metric.networkLatency
			result.domReady += metric.domReady
			result.load += metric.load
			result.count += metric.count

			// console.log('update ' + mcKey)
			mc.replace(mcKey, JSON.stringify(result), function() {}, HOURLY_TIMEOUT) // keep 2 hours
		} else {
			// console.log('set ' + mcKey)
			mc.set(mcKey, JSON.stringify(metric), function() {}, HOURLY_TIMEOUT) // keep 2 hours

			// store keys
			mc.set(lastHour + '-' + ++keyCount, key, function(err, response) {
				// console.log(err === null ? lastHour + ' set key ' + key + ' ' + response : err)
			}, HOURLY_TIMEOUT) // keep 2 hours

			mc.set(lastHour, keyCount, function() {}, HOURLY_TIMEOUT)
		}
	})
}
