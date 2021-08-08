"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
const fastify_1 = __importDefault(require("fastify"));
const src_1 = __importDefault(require("../src"));
tape_1.default("register without options", (t) => {
    t.plan(2);
    const app = fastify_1.default();
    app.setNotFoundHandler = () => {
        t.pass("notFoundHandler set");
        return app;
    };
    app.register(src_1.default);
    app.ready(t.error);
});
tape_1.default("register with send405 options set to true", (t) => {
    t.plan(2);
    const app = fastify_1.default();
    app.setNotFoundHandler = () => {
        t.pass("notFoundHandler set");
        return app;
    };
    const opts = { send405: true };
    app.register(src_1.default, opts);
    app.ready(t.error);
});
tape_1.default("register with send405 options set to false", (t) => {
    t.plan(1);
    const app = fastify_1.default();
    app.setNotFoundHandler = () => {
        t.fail("notFoundHandler should not be set");
        return app;
    };
    const opts = { send405: false };
    app.register(src_1.default, opts);
    app.ready(t.error);
});
tape_1.default("request tests, default fastify options", (testGroup) => {
    const app = fastify_1.default();
    const opts = { send405: true };
    app.register(src_1.default, opts);
    const routePath = "/:param1/things/:p2";
    app.get(routePath, (req, rep) => {
        rep.send("Testing");
    });
    app.post(routePath, (req, rep) => {
        rep.status(201);
    });
    testGroup.test("ALLOW / 405 tests", (t) => {
        const url = "/AbCdE/things/123?q=1";
        t.plan(6);
        app.inject({ method: "GET", url }, (err, res) => {
            t.equal(res.statusCode, 200);
            t.equal(res.headers.allow, "GET, POST");
            t.equal(res.body, "Testing");
        });
        app.inject({ method: "DELETE", url }, (err, res) => {
            t.equal(res.statusCode, 405);
            t.equal(res.headers.allow, "GET, POST");
            t.deepEqual(JSON.parse(res.body), {
                message: `DELETE ${url} not allowed`,
                error: "Method Not Allowed",
                statusCode: 405
            });
        });
    });
    testGroup.test("404 for trailing slash", (t) => {
        t.plan(2);
        const url = "/AbCdE/things/123/";
        app.inject({ method: "GET", url }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: `Route GET:${url} not found`,
                error: "Not Found",
                statusCode: 404
            });
        });
    });
    testGroup.test("404 for non-handled routes", (t) => {
        t.plan(2);
        const url = "/no-handler/test";
        app.inject({ method: "GET", url }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: `Route GET:${url} not found`,
                error: "Not Found",
                statusCode: 404
            });
        });
    });
});
tape_1.default("request tests, fastify caseSensitive, ignoreTrailingSlash options set to opposite of default", (testGroup) => {
    const app = fastify_1.default({
        caseSensitive: false,
        ignoreTrailingSlash: true
    });
    const opts = { send405: true };
    app.register(src_1.default, opts);
    const routePath = "/:param1/things/:p2";
    app.get(routePath, (req, rep) => {
        rep.send("Testing");
    });
    app.post(routePath, (req, rep) => {
        rep.status(201);
    });
    testGroup.test("request tests that don't match", (t) => {
        const url = "/abcde/things/123?q=1";
        t.plan(6);
        app.inject({ method: "GET", url }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: `Route GET:${url} not found`,
                error: "Not Found",
                statusCode: 404
            });
        });
        app.inject({ method: "DELETE", url }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: `Route DELETE:${url} not found`,
                error: "Not Found",
                statusCode: 404
            });
        });
    });
    testGroup.test("404 for non-handled routes", (t) => {
        t.plan(2);
        const url = "/no-handler/test";
        app.inject({ method: "GET", url }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: `Route GET:${url} not found`,
                error: "Not Found",
                statusCode: 404
            });
        });
    });
});
