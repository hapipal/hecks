# hecks
Mount your express app onto your hapi server, aw heck!

[![Build Status](https://travis-ci.com/hapipal/hecks.svg?branch=master)](https://travis-ci.com/hapipal/hecks) [![Coverage Status](https://coveralls.io/repos/hapipal/hecks/badge.svg?branch=master&service=github)](https://coveralls.io/github/hapipal/hecks?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Usage
> See also the [API Reference](API.md)
>
> Hecks is intended for use with hapi v19+ and nodejs v12+ (see v2 for lower support).

Hecks allows you to seamlessly incorporate express applications into a **hapi v17+** server.  This is particularly useful for testing an express server using [`server.inject()`](https://github.com/hapijs/hapi/blob/master/API.md#server.inject()), for unifying deployment of existing express and hapi applications, and as an initial stepping stone in migrating an express application to hapi.

```js
const Express = require('express');
const BodyParser = require('body-parser');
const Hapi = require('@hapi/hapi');
const Hecks = require('@hapipal/hecks');

(async () => {

    const app = Express();

    app.post('/user', BodyParser.json(), (req, res) => {

        const user = { ...req.body };
        user.saved = true;

        res.json(user);
    });

    const server = Hapi.server();

    await server.register([
        Hecks.toPlugin(app, 'my-express-app')
    ]);

    const { result } = await server.inject({
        method: 'post',
        url: '/user',
        payload: { name: 'Bill', faveFood: 'cactus' }
    });

    console.log(result); // {"name":"Bill","faveFood":"cactus","saved":true}
})();
```
