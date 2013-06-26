var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery


setInterval(function() {
	mc.get('performance-last-minute', function(err, lastMinute) {
		console.log(lastMinute)
		if (!lastMinute)
			return
		mc.get(lastMinute, function(err, datas) {
			if (!datas)
				return
			datas = JSON.parse('[' + datas.replace(/,$/, '') + ']')
			var i = 0, metric = {}, dims = []
			for (i in datas) {
				metric.networkLatency = data.networkLatency
				metric.domReady       = data.domReady
				metric.load           = data.load

				delete data.networkLatency
				delete data.domReady
				delete data.load

				dims = extendDim(datas[i])

				mcData(dims, metric)
			}
		})
	})
}, 1 * 1000)


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

function mcDatas(dims, metric) {
	var i = 0, key
	for (i in dims) {
		key = JSON.stringify(dims[i]).replace(/\s/g, '')
		mc.get(key, function(err, result) {
			if (result) {
				result = JSON.parse(result)
				result.networkLatency += metric.networkLatency
				result.domReady += metric.domReady
				result.load += metric.load
				result.count++

				mc.replace(key, JSON.stringify(result))
			} else {
				metric.count = 1
				mc.set(key, JSON.stringify(metric), null, 2 * 3600) // keep 2 hours
			}
		})
	}
}