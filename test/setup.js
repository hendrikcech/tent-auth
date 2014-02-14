var discover = require('tent-discover')
var write = require('fs').writeFileSync

var entity = process.argv[2]
if(!entity) {
	console.error('usage: node authCmdline http://entity.com')
	process.exit(1)
}

discover(entity, function(err, meta) {
	if(err) console.error(err)
	else write(__dirname + '/meta.json', JSON.stringify(meta, null, 4))
})