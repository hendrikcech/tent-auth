var request = require('tent-request')
var http = require('http')
var https = require('https')
var concat = require('concat-stream')
var hawk = require('hawk')
var urlMod = require('url')
var debug = require('debug')('tent-auth')

/* registers app and builds an url where the user can authorize the app */
exports.registerApp = function(meta, app, cb) {
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

	function followCredURL(url, appID) {
		debug('follow', url)

		var u = urlMod.parse(url)
		var iface = u.protocol === 'https:' ? https : http
		u.headers = { 'Accept': 'application/vnd.tent.post.v0+json'}

		debug('request with', u)

		var req = iface.get(u)

		var error = []
		req.on('error', function(err) {
			error.push(err)
		})

		req.on('response', function(res) {
			if(res.statusCode !== 200) {
				var err = res.statusCode+' '+http.STATUS_CODES[res.statusCode]
				error.push(err)
			}

			res.pipe(concat({ encoding: 'string' }, onCreds))
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

			var creds = {
				id: data.post.id,
				key: data.post.content.hawk_key,
				algorithm: data.post.content.hawk_algorithm
			}

			cb(null, creds, appID)
		}
	}
}


exports.generateURL = function(meta, appID) {
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
	var url = oauth_url + '?client_id=' + appID + '&state=' + state

	return {
		state: state,
		url: url
	}
}

/* last authentication step; 'trades' received code for a persitent token */
exports.tradeCode = function(meta, creds, code, cb) {
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

		res.pipe(concat({ encoding: 'string' }, onCreds))
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