'use strict';

// Load modules

const Stream = require('stream');

const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const Express = require('express');
const BodyParser = require('body-parser');
const Hecks = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('Hecks', () => {

    describe('the hapi plugin', () => {

        it('may be registered multiple times.', async () => {

            const server = Hapi.server();

            await server.register([Hecks, Hecks]);
        });
    });

    describe('"express" handler', () => {

        it('defaults payload and cookie parsing off.', async () => {

            const server = Hapi.server();

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/{expressPath*}',
                config: {
                    id: 'my-route',
                    handler: { express: Express() }
                }
            });

            const route = server.lookup('my-route');

            expect(route.settings.payload).to.include({
                parse: false,
                output: 'stream'
            });

            expect(route.settings.state.parse).to.equal(false);
        });

        it('plays nice with express path params.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/some/:descriptor', (req, res) => {

                return res.send(`${req.params.descriptor} smackeroos`);
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject('/some/ole');

            expect(result).to.equal('ole smackeroos');
        });

        it('plays nice with express payload parsing.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.post('/', BodyParser.json(), (req, res) => {

                return res.send(`${req.body.num} big ones`);
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject({
                method: 'post',
                url: '/',
                payload: { num: 7 }
            });

            expect(result).to.equal('7 big ones');
        });

        it('plays nice with hapi request.setUrl().', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/:num/tiny', (req, res) => {

                return res.send(`${req.params.num} lil ones`);
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/please/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            server.ext('onRequest', (request, h) => {

                request.setUrl('/please/144/tiny');

                return h.continue;
            });

            const { result } = await server.inject('/total/junk');

            expect(result).to.equal('144 lil ones');
        });

        it('routes to empty expressPath.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/prefix/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject('/prefix');

            expect(result).to.equal('ok');
        });

        it('routes to non-empty expressPath.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/be/okay', (req, res) => {

                return res.send('ok');
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/prefix/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject('/prefix/be/okay');

            expect(result).to.equal('ok');
        });

        it('passes through query params when rewriting with expressPath.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/be/okay', (req, res) => {

                return res.send(`ok ${req.query.here}`);
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/prefix/{expressPath*}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject('/prefix/be/okay?here=present');

            expect(result).to.equal('ok present');
        });

        it('routes to full path in absence of expressPath.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/magical/:items', (req, res) => {

                return res.send(`magical ${req.params.items}`);
            });

            await server.register(Hecks);

            server.route({
                method: 'get',
                path: '/magical/{items}',
                config: {
                    handler: { express: app }
                }
            });

            const { result } = await server.inject('/magical/beans');

            expect(result).to.equal('magical beans');
        });

        it('routes with plugin prefix.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/seat/yourself', (req, res) => {

                return res.send('ok');
            });

            const plugin = {
                name: 'plugin-x',
                register(srv) {

                    srv.route({
                        method: '*',
                        path: '/do/{expressPath*2}',
                        config: {
                            handler: { express: app }
                        }
                    });
                }
            };

            await server.register([
                Hecks,
                {
                    plugin,
                    routes: { prefix: '/please' }
                }
            ]);

            const { result } = await server.inject('/please/do/seat/yourself');

            expect(result).to.equal('ok');
        });

        it('ends response on error, before end.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                const BadStream = class extends Stream.Readable {
                    _read() {

                        if (this.isDone) {
                            this.push('|');
                            this.push('second');
                            this.push(null);
                            return;
                        }

                        this.push('first');
                        this.isDone = true;
                    }
                };

                const badStream = new BadStream();
                badStream.pipe(res);

                // Error after first chunk of data is written
                badStream.once('data', () => res.emit('error', new Error()));
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/',
                config: {
                    handler: { express: app }
                }
            });

            const { statusCode, result } = await server.inject({
                method: 'get',
                url: '/'
            });

            expect(statusCode).to.equal(200);
            expect(result).to.equal('first');
        });

        it('ends response on error, after end.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                const BadStream = class extends Stream.Readable {
                    _read() {

                        if (this.isDone) {
                            this.push('|');
                            this.push('second');
                            this.push(null);
                            return;
                        }

                        this.push('first');
                        this.isDone = true;
                    }
                };

                // Error after response is finished

                res.once('finish', () => {

                    res.once('error', () => null); // Avoid unhandled error event
                    process.nextTick(() => res.emit('error', new Error()));
                });

                const badStream = new BadStream();
                badStream.pipe(res);
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/',
                config: {
                    handler: { express: app }
                }
            });

            const { statusCode, result } = await server.inject({
                method: 'get',
                url: '/'
            });

            expect(statusCode).to.equal(200);
            expect(result).to.equal('first|second');
        });

        it('takes { app } config.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/{expressPath*}',
                config: {
                    handler: { express: { app } }
                }
            });

            const { result } = await server.inject('/');

            expect(result).to.equal('ok');
        });

        it('takes { app, express } config, using the provided express lib internally.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            let called = false;
            const express = () => {

                called = true;
                return Express();
            };

            await server.register(Hecks);

            server.route({
                method: '*',
                path: '/{expressPath*}',
                config: {
                    handler: { express: { app, express } }
                }
            });

            const { result } = await server.inject('/');

            expect(result).to.equal('ok');
            expect(called).to.equal(true);
        });
    });

    describe('toPlugin()', () => {

        it('mounts an express app as a hapi plugin.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            await server.register([
                Hecks.toPlugin(app, 'x')
            ], {
                routes: { prefix: '/x' }
            });

            const { result } = await server.inject('/x');

            expect(result).to.equal('ok');
        });

        it('receives a name for the created plugin.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            await server.register([
                Hecks.toPlugin(app, 'my-name')
            ]);

            expect(server.registrations['my-name']).to.exist();
        });

        it('receives attributes for the created plugin.', async () => {

            const server = Hapi.server();
            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            await server.register([
                Hecks.toPlugin(app, { name: 'my-name', version: '4.2.0' })
            ]);

            expect(server.registrations['my-name']).to.contain({
                name: 'my-name',
                version: '4.2.0'
            });
        });
    });
});
