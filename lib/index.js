"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
function addSortedMatcher(ctx, matcher, route) {
    const { sortedMatchers, matcherRoutes } = ctx;
    /*
      Replace all the path parts with single characters that sort in the right order.
  
      static      '"'
      param       '$'
      wildcard    '?'
  
        /static1/:p1/static2/*
      becomes:
        /"/$/"/?
    */
    const sortablePath = route
        // wildcards
        .replace(/\*/g, "?")
        // params
        .replace(/\/:[^/]+/g, "/$")
        // static
        .replace(/\/[^?$/]+/g, "/\"");
    const matcherRoute = { matcher, route };
    let insertPos = sortedMatchers.findIndex(sortedKey => comparePaths(sortablePath, sortedKey) > -1);
    if (insertPos < 0) {
        insertPos = sortedMatchers.length;
    }
    sortedMatchers.splice(insertPos, 0, sortablePath);
    matcherRoutes.splice(insertPos, 0, matcherRoute);
}
function comparePaths(p1, p2) {
    return p1.length === p2.length
        ? p1.localeCompare(p2)
        // longest path comes first as it has more URI parts
        : p1.length - p2.length;
}
function captureRouteMethod(caseSensitive, ignoreTrailingSlash, ctx, routeOptions) {
    const { send405ForWildcard, routeMethods } = ctx;
    const { method, url } = routeOptions;
    const wildcardPattern = url.replace(/\*/g, ".+");
    const isWildcard = wildcardPattern !== url;
    const pattern = wildcardPattern.replace(/\/:[^/]+/g, "/[^/]+");
    const flags = caseSensitive ? "" : "i";
    const trailingSlash = ignoreTrailingSlash ? "/?" : "";
    const urlMatcher = new RegExp(`^${pattern}${trailingSlash}$`, flags);
    let urlMethods = routeMethods.get(url) || "";
    if (urlMethods) {
        urlMethods += ", ";
    }
    urlMethods += method;
    const wildcardMatcher = isWildcard ? new RegExp(wildcardPattern) : false;
    for (const [key, value] of routeMethods.entries()) {
        //  1. Is this url a wildcard url? Yes, are there urls that this one covers? Add method to their methods
        if (wildcardMatcher
            && wildcardMatcher.test(key)
            && !value.includes(method)) {
            routeMethods.set(key, `${value}, ${method}`);
        }
        // 2. Are any existing urls wildcards that cover this url? Add their missing methods to your methods.
        if (key.endsWith("*")
            && url.startsWith(key.slice(0, key.length - 1))) {
            const otherMethods = value.split(", ");
            urlMethods = otherMethods.reduce((acc, m) => {
                if (!acc.includes(m)) {
                    acc = `${acc}, ${m}`;
                }
                return acc;
            }, urlMethods);
        }
    }
    routeMethods.set(url, urlMethods);
    if (!isWildcard || send405ForWildcard) {
        addSortedMatcher(ctx, urlMatcher, url);
    }
}
function handleRequest(ctx, request, reply, done) {
    const { routeMethods, matcherRoutes, send405 } = ctx;
    let { url, method, 
    // @ts-ignore request does not have context in it's type declaration
    context: { config: { url: path = findUrlRoute(matcherRoutes, url) } } } = request;
    const methods = routeMethods.get(path);
    if (methods) {
        reply.header("allow", methods);
        if (send405 && !methods.includes(method)) {
            reply
                .code(405)
                .send({
                statusCode: 405,
                message: `${method} ${url} not allowed. Examine 'Allow' header for supported methods.`,
                error: "Method Not Allowed"
            });
        }
    }
    done();
}
function findUrlRoute(matcherToRoute, url) {
    for (const { matcher, route } of matcherToRoute) {
        if (matcher.test(url)) {
            return route;
        }
    }
}
function plugin(fastify, opts, done) {
    const { send405 = true, send405ForWildcard = false } = opts;
    const { caseSensitive = true, ignoreTrailingSlash = false } = fastify.initialConfig;
    const ctx = {
        send405,
        send405ForWildcard,
        routeMethods: new Map(),
        sortedMatchers: [],
        matcherRoutes: []
    };
    fastify.addHook("onRoute", (o) => captureRouteMethod(caseSensitive, ignoreTrailingSlash, ctx, o));
    fastify.addHook("onRequest", (q, p, d) => handleRequest(ctx, q, p, d));
    done();
}
exports.default = fastify_plugin_1.default(plugin, {
    name: "fastify-allow",
    fastify: ">=3.x"
});
