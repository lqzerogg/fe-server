exports.helper = {
	parseMinuteTime: function(date) {
		return date.getFullYear() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + ('0'+date.getDate()).slice(-2)
				+ ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':00~'
	},

	parseHourTime: function(date) {
		return date.getFullYear() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + ('0'+date.getDate()).slice(-2)
				+ ('0'+date.getHours()).slice(-2) + ':00:00'
	},

	parse5MinuteTime: function(date) {
		var minute = date.getMinutes()
		date.setMinutes(parseInt(minute / 5) * 5)
		return date.getFullYear() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + ('0'+date.getDate()).slice(-2)
				+ ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':00'
	},

	// Sort object by keys and export to an array, not supported before ie9
	// Object items is not ordered as they were declared for non-numerical key
	// refer: http://stackoverflow.com/questions/280713/elements-order-in-a-for-in-loop
	jsonToSortedArray: function(obj) {
		var sorted = []
		Object.keys(obj).sort().forEach(function(name) {
			var item = {}
			item[name] = obj[name]
			sorted[sorted.length] = item
		})
		return sorted
	}
}