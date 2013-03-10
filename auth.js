var request = require('tent-request')

/* registers app and builds an url where the user can authorize the app */
exports.generateUrl = function(server, app, callback) {
	
	var content = {
		'name': app.name,
		'description': app.description,
		'url': app.url,
		'icon': app.icon,
		'redirect_uris': app.redirect_uris,
		'scopes': app.scopes
	}

	request('post', 'https://hendrik.tent.is/tent/apps', null, content, function(err, body) {
			if(err) return callback(err)

			var keys = {
				'id': body.id, //id of app
				'mac_key_id': body.mac_key_id, //valid during auth process
				'mac_key': body.mac_key, //same
				'mac_algorithm': body.mac_algorithm //sisi
			}
			
			/* builds a url where the user cann authorize the app */
			var scopes = []
			for(var key in app.scopes) {
				scopes.push(key)
			}
			var scope = scopes.join(',')

			//create nonce http://www.mediacollege.com/internet/javascript/number/random.html
			var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
			var state = ''
			for (var i=0; i<6; i++) {
				var rnum = Math.floor(Math.random() * chars.length)
				state += chars.substring(rnum,rnum+1)
			}

			var url = server + '/oauth/authorize?'
				+ 'client_id=' + keys.id
				+ '&scope=' + scope
				+ '&state=' + state
				+ '&redirect_uri=' + app.redirect_uris[0]
				+ '&tent_profile_info_types=' + app.tent_profile_info_types
				+ '&tent_post_types=' + app.tent_post_types

			callback(null, url, keys, state)
		}
	)
}

/* last authentication step; 'trades' received code for a persistive token */
exports.tradeCode = function(server, keys, code, callback) {
	//clientId, macKey, macKeyId
	if(!server) throw new Error("'server' as first argument required")
	if(!keys) throw new Error("'keys' as second argument required")
	if(!keys.id) throw new Error("'keys.id' required")
	if(!keys.mac_key_id) throw new Error("'keys.mac_key_id' required")
	if(!keys.mac_key) throw new Error("'keys.mac_key' required")
	if(!code) throw new Error("'code' as second argument required")

	var path = '/apps/'+keys.id+'/authorizations'
	var method = 'post'
	var arg = {
		host: server,
		path: path,
		method: method,
		macKey: keys.mac_key,
		macKeyId: keys.mac_key_id
	}
	request('post', server + path, keys, {code: code, 'token_type': 'mac'}, function(err, token) {
		if(err) return callback(err)
		callback(null, token)
	})
}