'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Stream = require('stream');
const Express = require('express');
const BodyParser = require('body-parser');
const Hapi = require('hapi');
const Hecks = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('Hecks', () => {

    describe('the hapi plugin', () => {

        it('may be registered multiple times.', (done) => {

            const server = new Hapi.Server();

            server.register([Hecks, Hecks], (err) => {

                expect(err).to.not.exist();
                done();
            });
        });

        it('"express" handler defaults payload and cookie parsing off.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

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

                done();
            });
        });

        it('"express" handler plays nice with express path params.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.get('/some/:descriptor', (req, res) => {

                return res.send(`${req.params.descriptor} smackeroos`);
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: '*',
                    path: '/{expressPath*}',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject('/some/ole', (res) => {

                    expect(res.result).to.equal('ole smackeroos');
                    done();
                });
            });
        });

        it('"express" handler plays nice with express payload parsing.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.post('/', BodyParser.json(), (req, res) => {

                return res.send(`${req.body.num} big ones`);
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: '*',
                    path: '/{expressPath*}',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject({
                    method: 'post',
                    url: '/',
                    payload: { num: 7 }
                }, (res) => {

                    expect(res.result).to.equal('7 big ones');
                    done();
                });
            });
        });

        it('"express" handler routes to empty expressPath.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.get('/', (req, res) => {

                return res.send('ok');
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: '*',
                    path: '/prefix/{expressPath*}',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject('/prefix', (res) => {

                    expect(res.result).to.equal('ok');
                    done();
                });
            });
        });

        it('"express" handler routes to non-empty expressPath.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.get('/be/okay', (req, res) => {

                return res.send('ok');
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: '*',
                    path: '/prefix/{expressPath*}',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject('/prefix/be/okay', (res) => {

                    expect(res.result).to.equal('ok');
                    done();
                });
            });
        });

        it('"express" handler routes to full path in absence of expressPath.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.get('/magical/:items', (req, res) => {

                return res.send(`magical ${req.params.items}`);
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: 'get',
                    path: '/magical/{items}',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject('/magical/beans', (res) => {

                    expect(res.result).to.equal('magical beans');
                    done();
                });
            });
        });

        it('"express" handler routes with plugin prefix.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const app = Express();

            app.get('/seat/yourself', (req, res) => {

                return res.send('ok');
            });

            const plugin = (srv, opts, next) => {

                srv.route({
                    method: '*',
                    path: '/do/{expressPath*2}',
                    config: {
                        handler: { express: app }
                    }
                });

                next();
            };

            plugin.attributes = { name: 'plugin-x' };

            server.register([
                Hecks,
                {
                    register: plugin,
                    routes: { prefix: '/please' }
                }
            ], (err) => {

                expect(err).to.not.exist();

                server.inject('/please/do/seat/yourself', (res) => {

                    expect(res.result).to.equal('ok');
                    done();
                });
            });
        });

        it('"express" handler ends response on error.', (done) => {

            const server = new Hapi.Server();
            server.connection();

            const BadStream = class extends Stream.Readable {
                _read() {

                    if (this.isDone) {
                        return;
                    }

                    this.isDone = true;

                    this.push('success');
                }
            };

            const app = Express();

            app.get('/', (req, res) => {

                const badStream = new BadStream();

                setImmediate(() => res.emit('error'));

                return badStream.pipe(res);
            });

            server.register(Hecks, (err) => {

                expect(err).to.not.exist();

                server.route({
                    method: '*',
                    path: '/',
                    config: {
                        handler: { express: app }
                    }
                });

                server.inject({
                    method: 'get',
                    url: '/'
                }, (res) => {

                    console.log(res.result);
                    expect(res.statusCode).to.equal(500);
                    //expect(res.result).to.equal({});
                    done();
                });
            });
        });
    });

    describe('asPlugin()', () => {

        it('doesn\'t have tests yet.', (done) => {

            done(new Error('TODO'));
        });
    });
});
