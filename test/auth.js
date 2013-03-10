var test = require('tap').test
var auth = require('../auth')
var https = require('https')

var server = 'https://hendrik.tent.is'

test('generateUrl should generate an URL', function(t) {
	var app = {
		"name": "FooApp",
		"description": "Does amazing foos with your data",
		"url": "http://example.com",
		"icon": "http://example.com/icon.png",
		"redirect_uris": [
			"https://app.example.com/tent/callback"
		],
		"scopes": {
			"write_profile": "Uses an app profile section to describe foos",
			"read_followings": "Calculates foos based on your followings"
		},
		"tent_profile_info_types": "all",
		"tent_post_types": "https://tent.io/types/posts/status/v0.1.0"
	}
	auth.generateUrl(server, app, function(err, url, keys, state) {
		t.notOk(err, 'no error returned')
		t.ok(url, 'url returned')
		t.type(url, 'string', 'url type string')
		t.ok(keys, 'keys returned')
		t.type(keys, 'object')
		t.equal(4, Object.keys(keys).length, 'keys object length')
		t.ok(state, 'state returned')
		t.type(state, 'string')
		
		https.get(url, function(res) {
			t.equal(res.statusCode, 200)
			t.end()
		})
	})
})

test('tradeCode should not throw', function(t) {
	var keys = {
		id: '8234ui234',
		mac_key: '9w2348adsf',
		mac_key_id: 'w8745923r'
	}
	var code = 'kasdkfjskfasdf'
	auth.tradeCode(server + '/tent', keys, code, function(err, token) {
		//hard to test
		t.end()
	})
})