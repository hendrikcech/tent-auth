// this example also uses the tent-discover module!
// => npm install tent-discover

var discover = require('tent-discover')
var auth = require('../auth')
var readline = require('readline')

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

var app = {
	"name": "FooApp",
	"description": "Does amazing foos with your data",
	"url": "http://example.com",
	"icon": "http://example.com/icon.png",
	"redirect_uris": [
		"https://example.com/"
	],
	"scopes": {
		"write_profile": "Uses an app profile section to describe foos",
		"read_followings": "Calculates foos based on your followings",
		"read_posts": "GIVE IT",
		"write_posts": "TO ME"
  	},
	"tent_profile_info_types": "all",
	"tent_post_types": "https://tent.io/types/posts/status/v0.1.0"
}

var entity = 'https://hendrik.tent.is' // change this to the desired entity

var server;
discover(entity, function(err, profile) {
	if(err) return console.log(err)

	server = profile['https://tent.io/types/info/core/v0.1.0']['servers'][0]

	auth.generateUrl(server, app, proceed)
})

function proceed(err, url, appKeys, state) {
	if(err) return console.log(err)

	console.log('Navigate to:\n' + url)
	rl.question('code:', function(code) {
		auth.tradeCode(server, appKeys, code, function(err, token) {
			if(err) return console.log(err)

			console.log(token)
			rl.close()
		})
	})
}