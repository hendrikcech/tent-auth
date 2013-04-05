# tent-auth
A node.js helper for the [Tent](https://tent.io) app authentication process.

With release of version 0.3 of the Tent protocol, this module will need a major rework. Therefore I stopped working on it until a reference server implementation is available.

So be warned. You can play around with this, but the API will likely change in the near future, I'm not even happy with it in the current state.

Nevertheless it works at the moment (even if the tests say different).

## install
With npm:
```
npm install tent-auth
```

## example
An example of the whole auth flow can be found in the `example` folder.

## methods

```
var auth = require('tent-auth')
```

### auth.generateUrl(server, app, callback)

```
auth.generateUrl(server, app, function(err, url, appKeys, state) {
    if(err) return console.log(err)
    console.log(appKeys)
})
```

- `server` (string): Tent server of the entity, found in the [core profile](https://tent.io/docs/info-types#core)
- `app` (object): app profile ([lookie lookie](https://tent.io/docs/app-auth#app-registration))
- `callback` (function):
    - `err`: an error object if something bad happend or `null` if not
    - `url` (string): url to redirect the user to
    - `appKeys` (object): mac keys to use during the authentication process (for example for `auth.tradeCode`)
    - `state` (string): the random string appended to the `url`. Verify to prevent cross-side request forgery attacks

### auth.tradeCode(server, appKeys, code, callback)

```
auth.tradeCode(server, appKeys, code, function(err, token) {
    if(err) return console.log(err)
    console.log(token)
}
```

- `server` (string): Tent server of the entity, found in the [core profile](https://tent.io/docs/info-types#core)
- `appKeys` (object): mac keys to use during the authentication process (for example from `auth.generateUrl`)
- `code` (string): code got back from the server after the user permitted the app
- `callback` (function):
    - `err`: an error object if something bad happend or `null` if not
    - `token`: the final auth keys

## license
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