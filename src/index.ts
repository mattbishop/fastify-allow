import {FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest} from "fastify"
import fp from "fastify-plugin"


export interface AllowOptions extends FastifyPluginOptions {
  send405: boolean
}


type RouteMethodsMap = Map<string, string>


function captureRouteMethod(routeMethods: RouteMethodsMap,
                            routeOptions: FastifyPluginOptions) {
  const {method, url} = routeOptions
  let methods = routeMethods.get(url) || ""
  if (methods) {
    methods += ", "
  }
  methods += method
  routeMethods.set(url, methods)
}


function handleNotFound(routeMethods: RouteMethodsMap,
                        request:      FastifyRequest,
                        reply:        FastifyReply) {
  const {url, method} = request
  let statusCode, message, error
  const methods = routeMethods.get(url)

  if (methods) {
    statusCode = 405
    message = `${method} ${url} not allowed`
    error = "Method Not Allowed"
    reply.header("allow", methods)
  } else {
    statusCode = 404
    message = `Route ${method}:${url} not found`
    error = "Not Found"
  }

  reply
    .code(statusCode)
    .send({
        message,
        error,
        statusCode
      })
}


function addAllowHeader(routeMethods: RouteMethodsMap,
                        request:      FastifyRequest,
                        reply:        FastifyReply,
                        done:         () => void) {
  // @ts-ignore
  const url = reply.context.config.url
  const methods = routeMethods.get(url)
  if (methods) {
    reply.header("allow", methods)
  }
  done()
}


function plugin(fastify:  FastifyInstance,
                opts:     AllowOptions,
                done:     () => void) {
  const routeMethods = new Map()
  fastify.addHook("onRoute", (o) => captureRouteMethod(routeMethods, o))
  fastify.addHook("onRequest", (q, p, d) => addAllowHeader(routeMethods, q, p, d))
  const { send405 = true } = opts
  if (send405) {
    fastify.setNotFoundHandler((q, p) => handleNotFound(routeMethods, q, p))
  }
  done()
}


export default fp(plugin, {
  name: "fastify-allow",
  fastify: ">=3.x"
})