"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
function captureRouteMethod(caseSensitive, ignoreTrailingSlash, routeMethods, routeOptions) {
    const { method, url } = routeOptions;
    const pattern = url.replace(/\/:[^/]+/g, "/[^/]+");
    const flags = caseSensitive ? "" : "i";
    const trailingSlash = ignoreTrailingSlash ? "/?" : "";
    let urlMatcher = new RegExp(`^${pattern}${trailingSlash}$`, flags);
    let urlMethods = "";
    for (const [matcher, methods] of routeMethods.entries()) {
        if (urlMatcher.toString() === matcher.toString()) {
            urlMatcher = matcher;
            urlMethods = methods;
            break;
        }
    }
    if (urlMethods) {
        urlMethods += ", ";
    }
    urlMethods += method;
    routeMethods.set(urlMatcher, urlMethods);
}
function handleNotFound(routeMethods, request, reply) {
    const { url, method } = request;
    const methods = findUrlMethods(routeMethods, url);
    let statusCode, message, error;
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
    const { url } = request;
    const methods = findUrlMethods(routeMethods, url);
    if (methods) {
        reply.header("allow", methods);
    }
    done();
}
function findUrlMethods(routeMethods, url) {
    for (const [matcher, urlMethods] of routeMethods.entries()) {
        if (matcher.test(url)) {
            return urlMethods;
        }
    }
}
function plugin(fastify, opts, done) {
    const routeMethods = new Map();
    const { caseSensitive = true, ignoreTrailingSlash = false } = fastify.initialConfig;
    fastify.addHook("onRoute", (o) => captureRouteMethod(caseSensitive, ignoreTrailingSlash, routeMethods, o));
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
