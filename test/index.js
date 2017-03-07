'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
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
    });

    describe('asPlugin()', () => {

        it('doesn\'t have tests yet.', (done) => {

            done(new Error('TODO'));
        });
    });
});
