"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyAllowPlugin = void 0;
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
    const urlPattern = url.replace(/\*/g, ".+");
    const isWildcard = urlPattern !== url;
    const urlMatcher = buildUrlMatcher(urlPattern, caseSensitive, ignoreTrailingSlash);
    let urlMethods = routeMethods.get(url) || "";
    if (urlMethods) {
        urlMethods += ", ";
    }
    urlMethods += method;
    const wildcardRouteMatcher = isWildcard
        ? new RegExp(`^${urlPattern}`)
        : false;
    for (const [aRoute, aRouteMethods] of routeMethods.entries()) {
        //  1. Is this url a wildcard route? Yes, are there urls that this one covers? Add method to their methods
        if (wildcardRouteMatcher
            && wildcardRouteMatcher.test(aRoute)
            && !aRouteMethods.includes(method)) {
            routeMethods.set(aRoute, `${aRouteMethods}, ${method}`);
        }
        // 2. Are any existing urls wildcards that cover this url? Add their missing methods to your methods.
        if (aRoute.endsWith("*")
            && url.startsWith(aRoute.slice(0, aRoute.length - 1))) {
            const otherMethods = aRouteMethods.split(", ");
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
function buildUrlMatcher(wildcardPattern, caseSensitive, ignoreTrailingSlash) {
    const pattern = wildcardPattern.replace(/\/:[^/]+/g, "/[^/]+");
    const flags = caseSensitive ? "" : "i";
    const trailingSlash = ignoreTrailingSlash ? "/?" : "";
    return new RegExp(`^${pattern}${trailingSlash}$`, flags);
}
function handleRequest(ctx, request, reply, done) {
    const { routeMethods, matcherRoutes, send405 } = ctx;
    const { url, method, routeOptions: { url: routerPath = findUrlRoute(matcherRoutes, url) || "" } } = request;
    const methods = routeMethods.get(routerPath);
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
exports.FastifyAllowPlugin = (0, fastify_plugin_1.default)(plugin, {
    name: "fastify-allow",
    fastify: ">=4.x"
});
exports.default = exports.FastifyAllowPlugin;
