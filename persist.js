var util = require('util'),
	mc = require('./mc').mc,
	jQuery = require('./minJQuery').jQuery,
	helper = require('./helper').helper,
	mysql = require('mysql'),
	mu = require('mustache')

var lastHour

var SQLTemplate = 'insert into fe_hourly_performance \
		(page_id, website, browser_id, country_id, networkLatencytime, domcontentloadtime, loadresponsetime, counter, logdate, abtag) \
		(select page.id, site.id, browser.id, country.id, {{networkLatency}}, {{domReady}}, {{load}}, {{count}}, \'{{{date}}}\', abtag.id \
		from fe_browser_type_and_version browser, fe_abtag abtag, fe_country country, fe_page_type_and_template page, fe_site site \
		where browser.browser = \'{{browser}}\' and abtag.name = \'{{abTestType}}\' and country.country = \'{{country}}\' and \
		page.page = \'{{mainPage}}\' and site.site = \'{{site}}\')'

/*
	Store data of last hour into mysql every half an hour.

	Example
		Data in memcache like this:
		{'2013/06/2000:00:00-{"country": "us", "mainPage": "all", "site": "mini"}': {"networkLatency": 1000, "domReady": 3000, "load": 5000, count: 1}}
		{'2013/06/2000:00:00-{"country": "all", "mainPage": "all", "site": "mini"}': {"networkLatency": 2000, "domReady": 6000, "load": 10000, count: 2}}
		{'2013/06/2000:00:00-1': {"country": "us", "mainPage": "all", "site": "mini"}}
		{'2013/06/2000:00:00-2': {"country": "all", "mainPage": "all", "site": "mini"}}
		{'2013/06/2000:00:00': 2}

		Then get the count first.
		Then get the dimension key and then get the metric in sequence.
*/
setInterval(function() {
	var now = new Date()
	// now.setMinutes(now.getMinutes() - 5)
	// lastHour = helper.parse5MinuteTime(now)
	now.setHours(now.getHours() - 1)
	lastHour = helper.parseHourTime(now)

	mc.get(lastHour, function(err, count) {
		if (!count)
			return
		mc.delete(lastHour)

		count = parseInt(count)

		for (; count > 0; count--) {
			persist(count)
		}
	})
}, 30 * 60 * 1000)

/*
	Get one dimension's metric and store it into mysql.
*/
function persist(count) {
	mc.get(lastHour + '-' + count, function(err, key) {
		if (!key)
			return
		mc.get(lastHour + '-' + key, function(err, data) {
			if (!data)
				return
			key = JSON.parse(key)
			key['browser'] = key['browser'] + (key['browserVersion'] ? ('-'+key['browserVersion']) : '')
			key['mainPage'] = key['mainPage'] + (key['pageTemplate'] ? ('-'+key['pageTemplate']) : '')
			
			data = JSON.parse(data)
			data['networkLatency'] = parseInt(data['networkLatency'] / data['count'])
			data['domReady'] = parseInt(data['domReady'] / data['count'])
			data['load'] = parseInt(data['load'] / data['count'])

			var values = jQuery.extend({'date': lastHour.slice(0, 10) + ' ' + lastHour.slice(10, 18)}, key, data)
			// console.log('------------------------')
			// console.log(mu.render(SQLTemplate, values))
			dataUtil.getResult(mu.render(SQLTemplate, values), function(result) {
				console.log(result.insertId)
			})
		})
	})
}

var dataUtil = function() {

	var db = function() {
		var pool = mysql.createPool({
			host     : 'localhost',
			user     : 'fe_admin',
			password : 'litb_fe_admin',
			database : 'fe_platform',
			insecureAuth: true,
			timezone : '+0000'
		})

		this.doQuery = function(sql, cb) {
			pool.getConnection(function(err, connection) {
				connection.query(sql, function(err, results) {
					if (err) {
						console.log(err.code)
						console.log('fatal: ' + err.fatal)
						throw err
						return
					}

					cb(results)

					connection.end()
				})
			})
		}

		return this
	}()

	this.getResult = function(sql, cb) {
		db.doQuery(sql, function(results) {
			cb(results)
		})
	}

	return this
}()

dataUtil.getResult('select 1', function(result) {
	console.log(result)
})