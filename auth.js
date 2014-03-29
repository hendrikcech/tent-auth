var request = require('tent-request')
var http = require('http')
var https = require('https')
var hawk = require('hawk')
var urlMod = require('url')
var debug = require('debug')('tent-auth')

module.exports = {
	registerApp: registerApp,
	generateURL: generateURL,
	tradeCode: tradeCode
}

/* registers app and builds an url where the user can authorize the app */
function registerApp(meta, app, cb) {
	if(!meta) {
		throw new Error('meta post required (the post.content part)')
	}
	if(!app) {
		throw new Error('app post content required')
	}
	if(!(app.name && app.url && app.redirect_uri)) {
		var err = 'missing required app infos'
			+ '(more information: https://tent.io/docs/post-types#app)'
		throw new Error(err)
	}

	debug('create app post')

	var client = request(meta)
	client.create('https://tent.io/types/app/v0#', {permissions: false}, app,
		parseLinkHeader)

	function parseLinkHeader(err, res, body) {
		if(err) return cb(err)

		var links = res.headers.link

		if(!links) {
			err = 'flawed response: no credential link header (1)'
			return cb(new Error(err))
		}

		links = links.split(',') //split, if there are multiple urls

		debug('link header:', links)

		var found = false
		links.forEach(function(link) {
			//tent credential link?
			if(link.match(/https:\/\/tent.io\/rels\/credentials/)) {
				var url = link.match(/<([^>]*)>/) //get url
				found = true
				return followCredURL(url[1], body.post.id)
			}
		})

		if(!found) {
			err = 'flawed response: no credential link header (2)'
			return cb(new Error(err))
		}
	}

	function followCredURL(url, appId) {
		debug('follow', url)

		var u = urlMod.parse(url)
		var iface = u.protocol === 'https:' ? https : http
		u.headers = { 'Accept': 'application/vnd.tent.post.v0+json'}

		// only relevant for browserified version
		u.withCredentials = false
		u.method = 'GET'
		u.scheme = u.protocol.split(':')[0]

		debug('request with', u)

		var req = iface.request(u)

		var error = []
		req.on('error', function(err) {
			error.push(err)
		})

		req.on('response', function(res) {
			if(res.statusCode !== 200) {
				var err = res.statusCode+' '+http.STATUS_CODES[res.statusCode]
				error.push(err)
			}

			var data = ''
			res.on('data', function(d) {
				data += d
			})

			res.on('end', function() {
				onCreds(data.toString('utf8'))
			})
		})

		req.end()

		function onCreds(body) {
			if(err) error.push(err)

			try {
				var data = JSON.parse(body)
			} catch(e) {}

			if(data && data.error) {
				error.push(data.error)
			}

			if(error.length > 0) {
				return cb(new Error(error.join()))
			}

			var creds = {
				id: data.post.id,
				key: data.post.content.hawk_key,
				algorithm: data.post.content.hawk_algorithm
			}

			cb(null, creds, appId)
		}
	}
}


function generateURL(meta, appId) {
	if(!meta) {
		throw new Error('meta post required')
	}
	if(!appId) {
		throw new Error('appId required')
	}

	meta = normalizeMataPost(meta)

	//create nonce
	//http://www.mediacollege.com/internet/javascript/number/random.html
	var chars =
		"0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
	var state = ''

	for (var i = 0; i < 11; i++) {
		var rnum = Math.floor(Math.random() * chars.length)
		state += chars.substring(rnum,rnum+1)
	}

	var oauth_url = meta.servers[0].urls.oauth_auth
	var url = oauth_url + '?client_id=' + appId + '&state=' + state

	return {
		state: state,
		url: url
	}
}

/* allow users to provide the meta post however they want */
function normalizeMataPost(meta) {
	if(meta.post) meta = meta.post
	if(meta.content) meta = meta.content
	// Check at least for servers and entity
	if(!meta.servers || !meta.entity)
		throw new Error('meta post needs at least a list of servers and an entity')

	if(meta.servers.length > 1) {
		// select server with lowest preference number
		meta.servers = meta.servers.sort(function(a,b) {
			if (a.preference < b.preference) return -1
			else if (a.preference == b.preference) return 0
			else return 1
		})
	}

	return meta
}

/* last authentication step; 'trades' received code for a persitent token */
function tradeCode(meta, creds, code, cb) {
	if(!meta) {
		throw new Error('meta post required (the post.content part)')
	}
	if(!creds || !creds.id || !creds.key || !creds.algorithm) {
		var err = 'temporary credentials required (object with id, key and algorithm keys'
		throw new Error(err)
	}
	if(!code)  {
		throw new Error('code required (read the function name!)')
	}

	meta = normalizeMataPost(meta)

	var url = meta.servers[0].urls.oauth_token

	var u = urlMod.parse(url)
	var iface = u.protocol === 'https:' ? https : http

	var auth = hawk.client.header(url, 'POST', { credentials: creds })
	u.headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'Authorization': auth.field
	}
	u.method = 'POST'

	// only relevant for browserified version
	u.withCredentials = false

	debug('trade code request', u)

	var req = iface.request(u)

	var error = []
	req.on('error', function(err) {
		error.push(err)
	})

	req.on('response', function(res) {
		if(res.statusCode !== 200) {
			var err = res.statusCode+' '+http.STATUS_CODES[res.statusCode]
			error.push(err)
		}

		var data = ''
		res.on('data', function(d) {
			data += d
		})

		res.on('end', function() {
			onCreds(data.toString('utf8'))
		})
	})

	function onCreds(body) {
		if(err) error.push(err)

		try {
			var data = JSON.parse(body)
		} catch(e) {}

		if(data && data.error) {
			error.push(data.error)
		}

		if(error.length > 0) {
			return cb(new Error(error.join()))
		}

		cb(null, data)
	}

	req.end(JSON.stringify({
		code: code,
		token_type: 'https://tent.io/oauth/hawk-token'
	}))
}