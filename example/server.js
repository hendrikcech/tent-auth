var auth = require('..')

// install this module with `npm install tent-discover`
var discover = require('tent-discover')

var port = 4000

// do `npm install express` if you haven't done it yet!
var server = require('express')()

// set the properties of the app to register
// https://tent.io/docs/post-types#app
var app = {
	name: 'Äpp',
	url: 'http://aepp.com',
	redirect_uri: 'http://localhost:'+ port +'/auth/callback/',
	types: {
		read: [ 'https://tent.io/types/status/v0' ],
		write: [ 'https://tent.io/types/status/v0' ]
	}
}

// we need a place to persist some data between the redirect and the callback
// you should replace this with something like redis in production
var idPool = 0
var Store = {}
var EntityIdMap = {}

// entry point
// visit http://localhost:{port}/auth/{entity} to get started
// the entity needs to be url encoded!
// use http://meyerweb.com/eric/tools/dencoder/ for example
// example url: http://localhost:4000/auth/http%3A%2F%2Fenti.ty
server.get('/auth/:entity', function(req, res) {
	var entity = req.params.entity
	var store

	// check if the user did previously run through the auth process.
	// if he did, we can skip the registration skip and directly obtain refreshed
	// tokens ("login")
	if((store = Store[EntityIdMap[entity]]) && store.creds) {
		console.log('old user %s', entity)
		
		var url = auth.generateURL(store.meta.post.content, store.appID)
		store.state = url.state
		res.redirect(url.url)

	// start the registration process through which every user goes once
	} else {
		console.log('new user %s', entity)

		// create a new store for this user
		var id = idPool++
		store = Store[id] = {}
		EntityIdMap[entity] = id

		// discover the entity to get the meta post
		// I use the tent-discover module, but you can replace
		// it with another one!
		discover(entity, function(err, meta) {
			if(err) return res.send(err)
			store.meta = meta

			// we have to clone the app object, to not modify the global one
			var cApp = JSON.parse(JSON.stringify(app))

			// the callback needs to identify to whom the code belongs
			cApp.redirect_uri += id

			// register the app with the server
			// this step is skipped the next time
			auth.registerApp(meta.post.content, cApp,
				function(err, tempCreds, appID) {
					if(err) return res.send(err)
					store.appID = appID

					// these temporary credentials,
					// only used during authentication
					store.tempCreds = tempCreds
					
					//finally generate the auth url ...
					var url = auth.generateURL(meta.post.content, appID)
					store.state = url.state

					// ... and direct the user there!
					res.redirect(url.url)					
			})
		})
	}
})

// this ressource is only called by the tent server
server.get('/auth/callback/:id', function(req, res) {
	console.log('callback id %s', req.params.id)

	// get the store corresponding to the id
	var store = Store[req.params.id]

	// check state
	if(store.state !== req.query.state)
		return res.send('mismatching state')

	// make the final request, to trade the code for permanent credentials
	auth.tradeCode(store.meta.post.content, store.tempCreds, req.query.code,
		function(err, permaCreds) {
			if(err) return res.send(err)

			store.creds = permaCreds

			// dadaaaaaaa!
			res.json(permaCreds)
	})
})

server.listen(port)
console.log('server listing on :%s', port)