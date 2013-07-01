var util = require('util'),
    memcache = require('memcache'),
    assert = require('assert'),
    port = 11211;

mc = new memcache.Client(port, '127.0.0.1');
mc.on('error', function(e){

	if (e.errno == 111){
		exports['startup test'] = function(){

			assert.ok(false, "You need to have a memcache server running on localhost:11211 for these tests to run");
		}
		return;
	}

	exports['startup test'] = function(){
		assert.ok(false, "Unexpected error during connection: "+util.inspect(e));
	}
});
mc.on('close', function(e) {
	e && console.log(e)
})
mc.on('connect', function(e) {
	console.log('memcached connected')
})
mc.connect()

exports.mc = mc
