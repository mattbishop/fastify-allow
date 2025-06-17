import {deepStrictEqual, strictEqual} from "node:assert"
import test, {after, before} from "node:test"
import Fastify, {FastifyInstance, FastifyReply, FastifyRequest, LightMyRequestResponse} from "fastify"

import FastifyAllowPlugin, {AllowOptions} from "../lib/index.js"




test("request tests, default fastify options", async (ctx) => {
  let app: FastifyInstance
  before(async () => {
    app = Fastify()
    const opts: AllowOptions = {
      send405: true
    }
    // need to await as the plugin is registered on a queue
    await app.register(FastifyAllowPlugin, opts)
    const routePath = "/:param1/things/:p2"
    app.get(routePath, (req: FastifyRequest, rep: FastifyReply) => {
      rep.send("\"Testing\"")
    })
    app.post(routePath, (req: FastifyRequest, rep: FastifyReply) => {
      rep.status(201)
    })
    app.options("*", (req: FastifyRequest, rep: FastifyReply) => {
      rep.send("\"Testing wildcards\"")
    })
  })

  after(async () => {
    await app.close()
  })


  await ctx.test("ALLOW / 405 tests", async () => {
    const url = "/abcde/things/123?q=1"
    let res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 200)
    strictEqual(res.headers.allow, "GET, HEAD, POST, OPTIONS")
    strictEqual(res.body, "\"Testing\"")

    res = await app.inject({method: "OPTIONS", url: "/wildcard/things/anything/here"})
    strictEqual(res.statusCode, 200)
    strictEqual(res.headers.allow, "OPTIONS")
    strictEqual(res.body, "\"Testing wildcards\"")

    res = await app.inject({method: "DELETE", url})
    strictEqual(res.statusCode, 405)
    strictEqual(res.headers.allow, "GET, HEAD, POST, OPTIONS")
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
      error:      "Method Not Allowed",
      statusCode: 405
    })
  })

  await ctx.test("404 for case sensitive URL", async () => {
    const url = "/ttgg/THINGS/123"
    const res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 404)
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `Route GET:${url} not found`,
      error:      "Not Found",
      statusCode: 404
    })
  })

  await ctx.test("404 for trailing slash", async () => {
    const url = "/ttgg/things/123/"
    const res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 404)
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `Route GET:${url} not found`,
      error:      "Not Found",
      statusCode: 404
    })
  })

  await ctx.test("404 for non-handled routes", async () => {
    const url = "/no-handler/test"
    const res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 404)
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `Route GET:${url} not found`,
      error:      "Not Found",
      statusCode: 404
    })
  })
})

test("send405ForWildcard, caseSensitive, ignoreTrailingSlash options set to opposite of default", async (ctx) => {

  let app: FastifyInstance

  before(async () => {
    app = Fastify({
      caseSensitive:       false,
      ignoreTrailingSlash: true
    })
    const opts: AllowOptions = {
      send405:            true,
      send405ForWildcard: true
    }    // need to await as the plugin is registered on a queue
    await app.register(FastifyAllowPlugin, opts)
    const routePath = "/:param/stuff"
    app.get(routePath, (req: FastifyRequest, rep: FastifyReply) => {
      rep.send("\"Testing 2\"")
    })

    app.options("/:param/*", (req: FastifyRequest, rep: FastifyReply) => {
      rep.send()
    })
  })

  after(async () => {
    await app.close()
  })

  await ctx.test("request tests prefix-different matches", async () => {
    const url = "/not/p1/things"
    const res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 405)
    strictEqual(res.headers.allow, "OPTIONS")
  })

  await ctx.test("request tests case insensitive matches", async () => {
    const url = "/p1/STUFF"
    const res = await app.inject({method: "GET", url})
    strictEqual(res.statusCode, 200)
    strictEqual(res.headers.allow, "GET, HEAD, OPTIONS")
    strictEqual(res.body, "\"Testing 2\"")
  })

  await ctx.test("request tests trailing slash matches", async () => {
    const url = "/p1/stuff/"
    const res = await app.inject({method: "DELETE", url})
    strictEqual(res.statusCode, 405)
    strictEqual(res.headers.allow, "GET, HEAD, OPTIONS")
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
      error:      "Method Not Allowed",
      statusCode: 405
    })
  })

  await ctx.test("request tests wildcard returns 405", async () => {
    const url = "/p1/other-stuff"
    const res = await app.inject({method: "DELETE", url})
    strictEqual(res.statusCode, 405)
    strictEqual(res.headers.allow, "OPTIONS")
    const data = parseBody(res)
    deepStrictEqual(data, {
      message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
      error:      "Method Not Allowed",
      statusCode: 405
    })
  })
})


function parseBody(res: LightMyRequestResponse): any {
  return res.body.length
    ? JSON.parse(res.body)
    : ""
}
