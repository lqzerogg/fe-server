var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery,
	helper = require('./helper').helper

setInterval(function() {
	var now = new Date()
	now.setMinutes(now.getMinutes() - 1)
	var lastMinute = helper.parseMinuteTime(now),
		lastHour   = helper.parseHourTime(now)

	mc.get(lastMinute, function(err, datas) {
		if (!datas)
			return
		mc.delete(lastMinute)

		datas = JSON.parse('[' + datas.replace(/,$/, '') + ']')
		var i = 0, j = 0, metric = {}, dims = [], key
			allDatas = {}
		for (i in datas) {
			metric.networkLatency = datas[i].networkLatency
			metric.domReady       = datas[i].domReady
			metric.load           = datas[i].load

			delete datas[i].networkLatency
			delete datas[i].domReady
			delete datas[i].load

			dims = extendDim(datas[i])

			j = 0
			for (j in dims) {
				key = JSON.stringify(dims[j]).replace(/\s/g, '')
				if (allDatas[key]) {
					allDatas[key].networkLatency += metric.networkLatency
					allDatas[key].domReady       += metric.domReady
					allDatas[key].load           += metric.load
					allDatas[key].count++
				} else {
					allDatas[key] = jQuery.extend({}, metric, {count: 1})
				}
			}
		}

		for (key in allDatas) {
			mcDatas(lastHour + key, allDatas[key])
		}
	})
}, 30 * 1000)


function extendDim(data) {

	var dim = jQuery.jsonToSortedArray(data),
		i = 0,
		dims = [{}]

	for (i in dim) {
		var j = 0, tempDims = [], obj = {}
		for (j in dims) {
			tempDims[tempDims.length] = jQuery.extend({}, dims[j], dim[i])
			obj[Object.keys(dim[i])[0]] = 'all'
			tempDims[tempDims.length] = jQuery.extend({}, dims[j], obj)
		}
		dims = tempDims
	}

	return dims
}

function mcDatas(key, metric) {
	mc.get(key, function(err, result) {
		if (result) {
			result = JSON.parse(result)
			result.networkLatency += metric.networkLatency
			result.domReady += metric.domReady
			result.load += metric.load
			result.count += metric.count

			mc.replace(key, JSON.stringify(result))
		} else {
			mc.set(key, JSON.stringify(metric), function() {}, 2 * 3600) // keep 2 hours
		}
	})
}
