var auth = require('..')
var discover = require('tent-discover')
var readline = require('readline')

// install `tent-discover` if you haven't done it already!

var entity = process.argv[2]
if(!entity) {
	console.error('usage: node authCmdline http://entity.com')
	process.exit(1)
}

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

var app = { 
	name: 'tent-auth Test App',
	url: 'http://testtestappapp.com',
	redirect_uri: 'http://aeppdadaepp.net/redirect'
}

var metaStore = {}
var credsStore = {}

discover(entity, function(err, meta) {
	if(err) return console.error(err)
	
	metaStore = meta

	auth.registerApp(meta.post.content, app, function(err, tempCreds, appID) {
		if(err) return console.error(err)
		
		credsStore = tempCreds

		var url = auth.generateURL(meta.post.content, appID)
		console.log('Visit this url and paste the code back in:\n%s', url.url)
		rl.question('Code:', tradeCode)
	})
})

function tradeCode(code) {
	auth.tradeCode(metaStore.post.content, credsStore, code,
		function(err, permaCreds) {
			if(err) return console.error(err)
			console.log(permaCreds)
			process.exit(0)
	})
}