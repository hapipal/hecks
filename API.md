# API
Mount your express app onto your hapi server, aw heck!

> **Note**
>
> Hecks is intended for use with hapi v19+ and nodejs v12+ (see v2 for lower support).

## `Hecks`
### The hapi plugin
You should register Hecks in any plugin that would like to take advantage of its features; it does not take any options.  Hecks specifies the `once` [plugin attribute](https://hapi.dev/api/#plugins), which means hapi will ensure it is not registered multiple times to the same connection.

#### `express` handler type
The `express` handler type mounts an [express application](http://expressjs.com/en/4x/api.html#app) to a route.  Its configuration may be either an express application or an object,
 - `app` - an express application.
 - `express` - (optional) the express module used to create `app`.  In the absence of this configuration option express is simply `require('express')`'d as a peer dependency.

The route will automatically have the following [route configuration](https://hapi.dev/api/#route-options) defaults, in particular to avoid reading the request payload before express and to avoid parsing cookies aimed at the express application.
```json5
{
    payload: {
        parse: false,
        output: 'stream'
    },
    state: {
        parse: false
    }
}
```

##### Route path
The route's path has some say in determining the url passed-along to the express application.  There are two possibilities,
 - The route's path has a parameter named `expressPath`, e.g. `/my-app/{expressPath*}`.  In this case, the url handed to the express app will have the path contained in `request.params.expressPath`.
 - The route's path _does not_ have a parameter named `expressPath`, e.g. `/dogs/{id}`.  In this case, the url handed to the express app will be the entire path matched by the route.

In both cases, any route prefixes passed during [plugin registration](https://hapi.dev/api/#server.register()) will be hidden from the express app.  Additionally, any calls to [`request.setUrl()`](https://hapi.dev/api/#request.setUrl()) will be respected by the application.

```js
// Serving an express app mounted at /old-api and secured behind hapi auth

server.route({
    method: '*',
    path: '/old-api/{expressPath*}',
    options: {
        auth: 'my-strategy',
        handler: { express: app } // app is an express application
    }
});
```

### `Hecks.toPlugin(app, nameOrAttributes)`
Returns a hapi plugin that mounts an express application `app`, with a route matching any method and path.  When `nameOrAttributes` is a string, it will be used as the `name` in the plugin's attributes.  If `nameOrAttributes` is an object, it will be used as the plugin's full attributes.
