import {FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest} from "fastify"
import fp from "fastify-plugin"


export interface AllowOptions extends FastifyPluginOptions {
  send405: boolean
}


type RouteMethodsMap = Map<string, string>
type MatcherMethodsMap = Map<RegExp, string>


function captureRouteMethod(caseSensitive:        boolean,
                            ignoreTrailingSlash:  boolean,
                            routeMethods:         RouteMethodsMap,
                            matcherMethods:       MatcherMethodsMap,
                            routeOptions:         FastifyPluginOptions) {
  const { method, url } = routeOptions
  const pattern = url.replace(/\/:[^/]+/g, "/[^/]+")
  const flags = caseSensitive ? "" : "i"
  const trailingSlash = ignoreTrailingSlash ? "/?" : ""
  let urlMatcher = new RegExp(`^${pattern}${trailingSlash}$`, flags)
  let urlMethods = ""

  for (const [matcher, methods] of matcherMethods.entries()) {
    if (urlMatcher.toString() === matcher.toString()) {
      urlMatcher = matcher
      urlMethods = methods
      break
    }
  }

  if (urlMethods) {
    urlMethods += ", "
  }
  urlMethods += method
  routeMethods.set(url, urlMethods)
  matcherMethods.set(urlMatcher, urlMethods)
}


function handleRequest(routeMethods:    RouteMethodsMap,
                       matcherMethods:  MatcherMethodsMap,
                       send405:         boolean,
                       request:         FastifyRequest,
                       reply:           FastifyReply,
                       done:            () => void) {
  const {
    url,
    method,
    // @ts-ignore request does not have context in it's type declaration
    context: {
      config: {
        url: path
      }
    }
  } = request

  const methods = path
    ? routeMethods.get(path)
    : findUrlMethods(matcherMethods, url)

  if (methods) {
    reply.header("allow", methods)

    if (send405 && !methods.includes(method)) {
      // send 405
      reply
        .code(405)
        .send({
          statusCode: 405,
          message:    `${method} ${url} not allowed`,
          error:      "Method Not Allowed"
        })
    }
  }
  done()
}


function findUrlMethods(matcherMethods: MatcherMethodsMap,
                        url:            string): string | undefined {
  for (const [matcher, urlMethods] of matcherMethods.entries()) {
    if (matcher.test(url)) {
      return urlMethods
    }
  }
}


function plugin(fastify:  FastifyInstance,
                opts:     AllowOptions,
                done:     () => void) {
  const { send405 = true } = opts
  const { caseSensitive = true, ignoreTrailingSlash = false } = fastify.initialConfig
  const routeMethods = new Map()
  const matcherMethods = new Map()
  fastify.addHook("onRoute", (o) => captureRouteMethod(caseSensitive, ignoreTrailingSlash, routeMethods, matcherMethods, o))
  fastify.addHook("onRequest", (q, p, d) => handleRequest(routeMethods, matcherMethods, send405, q, p, d))
  done()
}


export default fp(plugin, {
  name: "fastify-allow",
  fastify: ">=3.x"
})