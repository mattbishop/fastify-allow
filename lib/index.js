"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
function captureRouteMethod(caseSensitive, ignoreTrailingSlash, routeMethods, matcherMethods, routeOptions) {
    const { method, url } = routeOptions;
    const pattern = url.replace(/\/:[^/]+/g, "/[^/]+");
    const flags = caseSensitive ? "" : "i";
    const trailingSlash = ignoreTrailingSlash ? "/?" : "";
    let urlMatcher = new RegExp(`^${pattern}${trailingSlash}$`, flags);
    let urlMethods = "";
    for (const [matcher, methods] of matcherMethods.entries()) {
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
    routeMethods.set(url, urlMethods);
    matcherMethods.set(urlMatcher, urlMethods);
}
function handleRequest(routeMethods, matcherMethods, send405, request, reply, done) {
    const { url, method, 
    // @ts-ignore request does not have context in it's type declaration
    context: { config: { url: path } } } = request;
    const methods = path
        ? routeMethods.get(path)
        : findUrlMethods(matcherMethods, url);
    if (methods) {
        reply.header("allow", methods);
        if (send405 && !methods.includes(method)) {
            // send 405
            reply
                .code(405)
                .send({
                statusCode: 405,
                message: `${method} ${url} not allowed`,
                error: "Method Not Allowed"
            });
        }
    }
    done();
}
function findUrlMethods(matcherMethods, url) {
    for (const [matcher, urlMethods] of matcherMethods.entries()) {
        if (matcher.test(url)) {
            return urlMethods;
        }
    }
}
function plugin(fastify, opts, done) {
    const { send405 = true } = opts;
    const { caseSensitive = true, ignoreTrailingSlash = false } = fastify.initialConfig;
    const routeMethods = new Map();
    const matcherMethods = new Map();
    fastify.addHook("onRoute", (o) => captureRouteMethod(caseSensitive, ignoreTrailingSlash, routeMethods, matcherMethods, o));
    fastify.addHook("onRequest", (q, p, d) => handleRequest(routeMethods, matcherMethods, send405, q, p, d));
    done();
}
exports.default = fastify_plugin_1.default(plugin, {
    name: "fastify-allow",
    fastify: ">=3.x"
});
