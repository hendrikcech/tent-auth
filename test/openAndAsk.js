var open = require('open')
var readline = require('readline')

module.exports = function(url, cb) {
	if(typeof window !== 'undefined') { // browser
		cb(prompt(url))
	} else { // node
		open(url)

		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		})

		var question = 'Accept oauth request, then paste the code here:\n'
		rl.question(question, function(code) {
			rl.close()
			cb(code)
		})
	}
}