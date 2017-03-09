# API
## `Hecks`
### The hapi plugin
You should register Hecks in any plugin that would like to take advantage of its features; it does not take any options.  Hecks specifies the `once` [plugin attribute](http://hapijs.com/api#plugins), which means hapi will ensure it is not registered multiple times to the same connection.

#### `express` handler type
TODO

### `Hecks.toPlugin(app, nameOrAttributes)`
TODO
