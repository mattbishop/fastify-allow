import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify"
import fp from "fastify-plugin"


export interface AllowOptions extends FastifyPluginOptions {
  send405?:            boolean
  send405ForWildcard?: boolean
}


interface MatcherRoute {
  matcher:  RegExp
  route:    string
}

interface AllowContext {
  send405:            boolean
  send405ForWildcard: boolean
  routeMethods:       Map<string, string>
  sortedMatchers:     string[]
  matcherRoutes:      MatcherRoute[]
}


function addSortedMatcher(ctx: AllowContext, matcher: RegExp, route: string) {
  const {
    sortedMatchers,
    matcherRoutes
  } = ctx
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
    .replace(/\/[^?$/]+/g, "/\"")
  const matcherRoute = { matcher, route }
  let insertPos = sortedMatchers.findIndex(sortedKey => comparePaths(sortablePath, sortedKey) > -1)
  if (insertPos < 0) {
    insertPos = sortedMatchers.length
  }
  sortedMatchers.splice(insertPos,0, sortablePath)
  matcherRoutes.splice(insertPos, 0, matcherRoute)
}


function comparePaths(p1: string, p2: string): number {
  return p1.length === p2.length
    ? p1.localeCompare(p2)
      // longest path comes first as it has more URI parts
    : p1.length - p2.length
}


function captureRouteMethod(caseSensitive:        boolean,
                            ignoreTrailingSlash:  boolean,
                            ctx:                  AllowContext,
                            routeOptions:         FastifyPluginOptions) {
  const {
    send405ForWildcard,
    routeMethods
  } = ctx
  const {
    method,
    url
  } = routeOptions

  const urlPattern = url.replace(/\*/g, ".+")
  const isWildcard = urlPattern !== url
  const urlMatcher = buildUrlMatcher(urlPattern, caseSensitive, ignoreTrailingSlash);

  let urlMethods = routeMethods.get(url) || ""
  if (urlMethods) {
    urlMethods += ", "
  }
  urlMethods += method

  const wildcardRouteMatcher = isWildcard
    ? new RegExp(`^${urlPattern}`)
    : false

  for (const [aRoute, aRouteMethods] of routeMethods.entries()) {
    //  1. Is this url a wildcard route? Yes, are there urls that this one covers? Add method to their methods
    if (   wildcardRouteMatcher
        && wildcardRouteMatcher.test(aRoute)
        && !aRouteMethods.includes(method)) {

      routeMethods.set(aRoute, `${aRouteMethods}, ${method}`)
    }

    // 2. Are any existing urls wildcards that cover this url? Add their missing methods to your methods.
    if (   aRoute.endsWith("*")
        && url.startsWith(aRoute.slice(0, aRoute.length - 1))) {

      const otherMethods = aRouteMethods.split(", ")
      urlMethods = otherMethods.reduce((acc, m) => {
        if (!acc.includes(m)) {
          acc = `${acc}, ${m}`
        }
        return acc
      }, urlMethods)
    }
  }

  routeMethods.set(url, urlMethods)
  if (!isWildcard || send405ForWildcard) {
    addSortedMatcher(ctx, urlMatcher, url)
  }
}


function buildUrlMatcher(wildcardPattern: string, caseSensitive: boolean, ignoreTrailingSlash: boolean): RegExp {
  const pattern = wildcardPattern.replace(/\/:[^/]+/g, "/[^/]+")
  const flags = caseSensitive ? "" : "i"
  const trailingSlash = ignoreTrailingSlash ? "/?" : ""
  return new RegExp(`^${pattern}${trailingSlash}$`, flags)
}


function handleRequest(ctx:     AllowContext,
                       request: FastifyRequest,
                       reply:   FastifyReply,
                       done:    () => void) {
  const {
    routeMethods,
    matcherRoutes,
    send405
  } = ctx
  const {
    url,
    method,
    routeOptions: {
      url: routerPath = findUrlRoute(matcherRoutes, url) || ""
    }
  } = request

  const methods = routeMethods.get(routerPath)

  if (methods) {
    reply.header("allow", methods)

    if (send405 && !methods.includes(method)) {
      reply
        .code(405)
        .send({
          statusCode: 405,
          message:    `${method} ${url} not allowed. Examine 'Allow' header for supported methods.`,
          error:      "Method Not Allowed"
        })
    }
  }
  done()
}


function findUrlRoute(matcherToRoute: MatcherRoute[],
                      url:            string): string | undefined {
  for (const { matcher, route } of matcherToRoute) {
    if (matcher.test(url)) {
      return route
    }
  }
}


function plugin(fastify:  FastifyInstance,
                opts:     AllowOptions,
                done:     () => void) {
  const { send405 = true, send405ForWildcard = false } = opts
  const { caseSensitive = true, ignoreTrailingSlash = false } = fastify.initialConfig
  const ctx = {
    send405,
    send405ForWildcard,
    routeMethods:   new Map(),
    sortedMatchers: [],
    matcherRoutes:  []
  }
  fastify.addHook("onRoute", (o) => captureRouteMethod(caseSensitive, ignoreTrailingSlash, ctx, o))
  fastify.addHook("onRequest", (q, p, d) => handleRequest(ctx, q, p, d))
  done()
}


const FastifyAllowPlugin = fp(plugin, {
  name:     "fastify-allow",
  fastify:  ">=4.x"
})

export default FastifyAllowPlugin
