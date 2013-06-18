var request = require('tent-request')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var hawk = require('hawk')
var urlMod = require('url')

/* registers app and builds an url where the user can authorize the app */
exports.registerApp = function(meta, app, callback) {
	if(!meta) throw new Error('meta post required (the post.content part)')
	if(!app) throw new Error('app post content required')
	if(!(app.name && app.url && app.redirect_uri)) {
		throw new Error('missing required app infos'
			+ '(more information: https://tent.io/docs/post-types#app)')}

	var client = request.createClient(meta)
	client.create('https://tent.io/types/app/v0#', parseLinkHeader)
		.content(app)
		.permissions(false)

	function parseLinkHeader(err, res, body) {
		if(err) return callback(err)

		var links = res.headers.link
		if(!links) return callback(
			new Error('flawed response: no credential link header (1)'))

		links = links.split(',') //split, if there are multiple urls

		var found = false
		links.forEach(function(link) {
			//tent credential link?
			if(link.match(/https:\/\/tent.io\/rels\/credentials/)) {
				var url = link.match(/<([^>]*)>/) //get url
				found = true
				return followCredURL(url[1], body.post.id)
			}
		})
		if(!found) return callback(
			new Error('flawed response: no credential link header (2)'))
	}

	function followCredURL(url, appID) {
		var req = hyperquest(addPort(url),
			{ headers: { 'Accept': 'application/vnd.tent.post.v0+json'}})

		var statusErr = false
		req.on('response', function(res) {
			if(res.statusCode !== 200)
				statusErr = new Error('error following link header: '
					+res.statusCode)
		})

		req.pipe(concat(function(err, data) {
			if(err) return callback(err)
			if(statusErr) return callback(statusErr)

			try {
				data = JSON.parse(data)
			} catch(e) {
				return callback(e)
			}

			var creds = {
				id: data.post.id,
				key: data.post.content.hawk_key,
				algorithm: data.post.content.hawk_algorithm
			}

			callback(null, creds, appID)
		}))
	}
}

exports.generateURL = function(meta, appID) {
	//create nonce
	//http://www.mediacollege.com/internet/javascript/number/random.html
	var chars =
		"0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
	var state = ''
	for (var i=0; i<11; i++) {
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

/* last authentication step; 'trades' received code for a persistive token */
exports.tradeCode = function(meta, creds, code, callback) {
	if(!meta) throw new Error('meta post required (the post.content part)')
	if(!creds || !creds.id || !creds.key || !creds.algorithm)
		throw new Error(
			'temporary credentials required (object with id, key and algorithm')
	if(!code) throw new Error('code required (read the function name!)')

	var url = addPort(meta.servers[0].urls.oauth_token)

	var auth = hawk.client.header(url, 'POST', { credentials: creds })
	var header = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'Authorization': auth.field
	}

	var req = hyperquest.post(url, { headers: header })

	req.on('response', function(res) {
		if(res.statusCode !== 200)
			return callback(new Error('bad status code:'+res.statusCode))
	})

	req.pipe(concat(function(err, data) {
		if(err) return callback(err)

		try {
			data = JSON.parse(data)
		} catch(e) {
			return callback(e)
		}

		callback(null, data)
	}))

	req.write(JSON.stringify({
		code: code,
		token_type: 'https://tent.io/oauth/hawk-token'
	}))
	req.end()
	//console.log(req.request)
}

function addPort(url) {
	// non-browserified version or on standard port (80 or 443?) -> just return
	if(typeof window === 'undefined' || !window.location.port)
		return url

	var parsed = urlMod.parse(url)
	var port = null
	if(!parsed.port) {
		if(parsed.protocol === 'http:') port = 80
		else if(parsed.protocol === 'https:') port = 443
	}
	if(port) {
		parsed.port = port
		parsed.host += ':' + port //why node, why?
	}
	return urlMod.format(parsed)
}