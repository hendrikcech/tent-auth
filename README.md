# tent-auth
A node.js helper for the [Tent](https://tent.io) app authentication process. Thanks to [browserify](https://github.com/substack/node-browserify) this module can also be used in the browser!
More information can be found in the corresponding [docs](https://tent.io/docs/apps).

## install
With npm:

    npm install tent-auth

# usage
Working examples can be found in the [example](example) folder. To understand how to utilize this module you should really look at these.
The [simple one](example/cmdline.js) just goes one time through the auth flow, the [more complex one](example/server.js) spins up a server and remembers entities to support "logins" and is extensively commented.

## methods

    var auth = require('tent-auth')

### auth.registerApp(meta, app, function callback(err, tempCreds, appID) {})
If the entity didn't authorize the app previously, this is the first function to call. Else this step should be skipped ([server example](example/server.js)).
It takes the content part of the meta post (`meta.post.content`), the app post to create (following [this schema](https://tent.io/docs/post-types#app)) and a callback.
After completion, the callback gets passed temporary credentials, which have to be used during the authorization process and the id of the created app post.

### auth.generateURL(meta, appID)
This function generates a URL to which the user has to be directed.
It requires the same meta object as `auth.registerApp()` and takes the id of the created app post.
The return is an object, containing `state` and `url` keys. The state should be persisted, to be able to compare it later.

### auth.tradeCode(meta, tempCreds, code, function callback(err, permaCreds) {})
When the server finally redirects the user to the specified redirect uri, this function can be used to trade the code for permanent tokens.
Use the `tempCreds` obtained from `auth.registerApp()`.

# test
Tests can be run both in node and the browser.

	npm test

# license
This software is released under the MIT license:

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
