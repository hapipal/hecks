# hecks
Mount your express app onto your hapi server, aw heck!

[![Build Status](https://travis-ci.org/devinivy/hecks.svg?branch=master)](https://travis-ci.org/devinivy/hecks) [![Coverage Status](https://coveralls.io/repos/devinivy/hecks/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/hecks?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)
## Usage
> See also the [API Reference](API.md)

Hecks allows you to seamlessly incorporate express applications into a hapi server.  This is particularly useful for testing an express server using [`server.inject()`](https://github.com/hapijs/hapi/blob/v16/API.md#serverinjectoptions-callback), for unifying deployment of existing express and hapi applications, and as an initial stepping stone in migrating an express application to hapi.

```js
const Express = require('express');
const BodyParser = require('body-parser');
const Hapi = require('hapi');
const Hoek = require('hoek');
const Hecks = require('hecks');

const app = Express();

app.post('/user', BodyParser.json(), (req, res) => {

    const user = Hoek.shallow(req.body);
    user.saved = true;

    res.json(user);
});

const server = new Hapi.Server();
server.connection();

server.register([
    Hecks.toPlugin(app, 'my-express-app')
], (err) => {

    Hoek.assert(!err, err);

    server.inject({
        method: 'post',
        url: '/user',
        payload: { name: 'Bill', faveFood: 'cactus' }
    }, (res) => {

        console.log(res.result); // {"name":"Bill","faveFood":"cactus","saved":true}
    });
});
```
