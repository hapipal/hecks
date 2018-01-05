'use strict';

const Url = require('url');
const Hoek = require('hoek');
const Bounce = require('bounce');
const Toys = require('toys');
const Package = require('../package.json');

const internals = {};

exports.plugin = {
    pkg: Package,
    once: true,
    register(server) {

        const express = internals.express.bind();   // clone handler definition
        express.defaults = internals.routeDefaults; // set route defaults for use with this handler

        server.decorate('handler', 'express', express);
    }
};

exports.toPlugin = (handlerOpts, nameOrAttrs) => {

    const attributes = (typeof nameOrAttrs === 'string') ? { name: nameOrAttrs } : nameOrAttrs;

    return Object.assign({}, attributes, {
        async register(srv) {

            const hecks = exports;

            await srv.register(hecks);

            srv.route({
                method: '*',
                path: '/{expressPath*}',
                handler: { express: handlerOpts }
            });
        }
    });
};

internals.express = (route, options) => {

    if (typeof options === 'function') {
        options = { app: options };
    }

    const app = options.app;
    const express = options.express || require('express');
    const handlerApp = express();

    // An undefined expressPath may mean '/' or that there is no such param, so we
    // detect this upfront.  If there is no such param then rely on express mounting
    // for the entire url rewrite.  That means, if there's a hapi plugin route prefix
    // then that prefix will need to be preserved by expressPathMiddleware().

    if (route.path !== '/{expressPath*}' && route.path.match(/\{expressPath(?:(\*)(\d+)?)?(\?)?\}/)) {
        handlerApp.use(internals.expressPathMiddleware);
    }

    // Restore req/res methods potentially used by shot, see hapijs/shot#82
    handlerApp.use(internals.restoreForShotMiddleware);

    // Mount the app at the route path prefix
    handlerApp.use(route.realm.modifiers.route.prefix || '/', app);

    return async (request, h) => {

        const { req, res } = request.raw;

        req._hecks = { request };
        res._hecks = {};

        // Stash req/res methods potentially used by shot, see hapijs/shot#82
        internals.stashForShot(req, res);

        // Aw, heck!
        handlerApp(req, res);

        try {
            await Toys.stream(res);
        }
        catch (err) {
            Bounce.rethrow(err, 'system');
            return h.close;
        }

        return h.abandon;
    };
};

internals.routeDefaults = {
    payload: {
        parse: false,       // Default to not parse payload or cookies
        output: 'stream'
    },
    state: {
        parse: false
    }
};

internals.expressPathMiddleware = (req, res, next) => {

    const { request } = req._hecks;
    const expressPath = request.params.expressPath || '';
    const prefix = request.route.realm.modifiers.route.prefix || '';

    const parsedUrl = Hoek.shallow(request.url);
    parsedUrl.pathname = `/${expressPath}`;

    req.url = prefix + Url.format(parsedUrl);

    next();
};

internals.restoreForShotMiddleware = (req, res, next) => {

    req._read = req._hecks._read;
    req.destroy = req._hecks.destroy;

    res.write = res._hecks.write;
    res.end = res._hecks.end;
    res.writeHead = res._hecks.writeHead;
    res.destroy = res._hecks.destroy;

    next();
};

internals.stashForShot = (req, res) => {

    req._hecks._read = req._read;
    req._hecks.destroy = req.destroy;

    res._hecks.write = res.write;
    res._hecks.end = res.end;
    res._hecks.writeHead = res.writeHead;
    res._hecks.destroy = res.destroy;
};
