"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
function captureRouteMethod(routeMethods, routeOptions) {
    const { method, url } = routeOptions;
    let methods = routeMethods.get(url) || "";
    if (methods) {
        methods += ", ";
    }
    methods += method;
    routeMethods.set(url, methods);
}
function handleNotFound(routeMethods, request, reply) {
    const { url, method } = request;
    let statusCode, message, error;
    const methods = routeMethods.get(url);
    if (methods) {
        statusCode = 405;
        message = `${method} ${url} not allowed`;
        error = "Method Not Allowed";
        reply.header("allow", methods);
    }
    else {
        statusCode = 404;
        message = `Route ${method}:${url} not found`;
        error = "Not Found";
    }
    reply
        .code(statusCode)
        .send({
        message,
        error,
        statusCode
    });
}
function addAllowHeader(routeMethods, request, reply, done) {
    // @ts-ignore
    const url = reply.context.config.url;
    const methods = routeMethods.get(url);
    if (methods) {
        reply.header("allow", methods);
    }
    done();
}
function plugin(fastify, opts, done) {
    const routeMethods = new Map();
    fastify.addHook("onRoute", (o) => captureRouteMethod(routeMethods, o));
    fastify.addHook("onRequest", (q, p, d) => addAllowHeader(routeMethods, q, p, d));
    const { send405 = true } = opts;
    if (send405) {
        fastify.setNotFoundHandler((q, p) => handleNotFound(routeMethods, q, p));
    }
    done();
}
exports.default = fastify_plugin_1.default(plugin, {
    name: "fastify-allow",
    fastify: ">=3.x"
});
