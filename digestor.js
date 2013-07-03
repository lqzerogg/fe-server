var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery,
	helper = require('./helper').helper

var allDatas, lastMinute,
	lastHour, pastHour, keyCount

setInterval(function() {
	var now = new Date()
	now.setMinutes(now.getMinutes() - 1)
	lastMinute = helper.parseMinuteTime(now)
	lastHour   = helper.parseHourTime(now)

	if (pastHour !== lastHour) {
		keyCount = 0
		pastHour = lastHour
	}

	mc.get(lastMinute, function(err, count) {
		if (!count)
			return
		mc.delete(lastMinute)

		count = parseInt(count)

		allDatas = {}

		for (; count > 0; count--) {
			makePiece(lastMinute, count)
		}
	})
}, 30 * 1000)


function makePiece(lastMinute, count) {
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


function extendDim(data) {

	var dim = helper.jsonToSortedArray(data),
		i = 0,
		dims = [{}]

	for (i in dim) {
		var j = 0, tempDims = [], obj = {}
		for (j in dims) {
			// 'all' page should be with no template
			if (dims[j]['mainPage'] === 'all' && dim[i]['pageTemplate']) {
				tempDims[tempDims.length] = jQuery.extend({}, dims[j])
				continue
			}
			// 'all' browser should be with no version
			if (dims[j]['browser'] === 'all' && dim[i]['browserVersion']) {
				tempDims[tempDims.length] = jQuery.extend({}, dims[j])
				continue
			}
			tempDims[tempDims.length] = jQuery.extend({}, dims[j], dim[i])
			obj[Object.keys(dim[i])[0]] = 'all'
			tempDims[tempDims.length] = jQuery.extend({}, dims[j], obj)
		}
		dims = tempDims
	}

	return dims
}

function mcDatas(key, metric) {
	var mcKey = lastHour + '-' + key
	mc.get(mcKey, function(err, result) {
		if (result) {
			result = JSON.parse(result)
			result.networkLatency += metric.networkLatency
			result.domReady += metric.domReady
			result.load += metric.load
			result.count += metric.count

			console.log('update ' + mcKey)
			mc.replace(mcKey, JSON.stringify(result), function() {}, 2 * 3600)
		} else {
			console.log('set ' + mcKey)
			mc.set(mcKey, JSON.stringify(metric), function() {}, 2 * 3600) // keep 2 hours

			// store keys
			mc.set(lastHour + '-' + ++keyCount, key, function(err, response) {
				console.log(err === null ? lastHour + ' set key ' + key + ' ' + response : err)
			}, 2 * 3600) // keep 2 minutes

			mc.set(lastHour, keyCount, function() {}, 2 * 3600)
		}
	})
}
