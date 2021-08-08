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
tape_1.default("request tests", (testGroup) => {
    const app = fastify_1.default();
    const opts = { send405: true };
    app.register(src_1.default, opts);
    app.get("/", (req, rep) => {
        rep.send("Testing");
    });
    app.post("/", (req, rep) => {
        rep.status(201);
    });
    testGroup.test("ALLOW / 405 tests", (t) => {
        t.plan(6);
        app.inject({ method: "GET", url: "/" }, (err, res) => {
            t.equal(res.statusCode, 200);
            t.equal(res.headers.allow, "GET, POST");
            t.equal(res.body, "Testing");
        });
        app.inject({ method: "DELETE", url: "/" }, (err, res) => {
            t.equal(res.statusCode, 405);
            t.equal(res.headers.allow, "GET, POST");
            t.deepEqual(JSON.parse(res.body), {
                message: "DELETE / not allowed",
                error: "Method Not Allowed",
                statusCode: 405
            });
        });
    });
    testGroup.test("404 for non-handled routes", (t) => {
        t.plan(2);
        app.inject({ method: "GET", url: "/no-handler" }, (err, res) => {
            t.equal(res.statusCode, 404);
            t.deepEqual(JSON.parse(res.body), {
                message: "Route GET:/no-handler not found",
                error: "Not Found",
                statusCode: 404
            });
        });
    });
});
