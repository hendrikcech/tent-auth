var test = require('tape')
var auth = require('..')
var openAndAsk = require('./openAndAsk')

var meta = require('./meta.json')
var data = {}


test('registerApp()', function(t) {
	t.plan(5)

	var app = { 
		name: 'tent-auth Test App',
		url: 'http://testtestappapp.com',
		redirect_uri: 'http://aeppdadaepp.net/redirect'
	}

	auth.registerApp(meta, app, cb)

	function cb(err, creds, appId) {
		t.error(err, 'no error')
		t.ok(creds.id, 'id exists')
		t.ok(creds.key, 'key exists')
		t.ok(creds.algorithm, 'algorithm set')
		t.ok(appId, 'appId set')

		data = {
			creds: creds,
			appId: appId
		}
	}
})

test('generateURL', function(t) {
	t.plan(3)

	var url = auth.generateURL(meta, data.appId)

	t.ok(url.url, 'url returned')
	t.ok(url.state, 'state returned')

	openAndAsk(url.url, done)

	function done(code) {
		if(!code) {
			t.fail('no code; aborting')
			process.exit(1)
		} else {
			data.code = code
			t.pass('code received')
		}
	}
})

test('tradeCode()', function(t) {
	t.plan(4)

	auth.tradeCode(meta, data.creds, data.code, onCode)

	function onCode(err, creds) {
		t.error(err, 'no error')
		t.ok(creds, 'credentials returned')
		t.ok(creds.access_token, 'access_token')
		t.ok(creds.hawk_key, 'hawk_key')
	}
})