import test from "tape"
import Fastify, {FastifyReply, FastifyRequest, LightMyRequestResponse} from "fastify"
import allowPlugin, {AllowOptions} from "../lib"


test("request tests, default fastify options", async (testGroup) => {
  const app = Fastify()
  const opts: AllowOptions = {send405: true}
  // need to await as the plugin is registered on a queue
  await app.register(allowPlugin, opts)
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

  testGroup.test("ALLOW / 405 tests", (t) => {
    const url = "/abcde/things/123?q=1"
    t.plan(9)
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 200)
      t.equal(res.headers.allow, "GET, HEAD, POST, OPTIONS")
      t.equal(res.body, "\"Testing\"")
    })
    app.inject({method: "OPTIONS", url: "/wildcard/things/anything/here"}, (err, res) => {
      t.equal(res.statusCode, 200)
      t.equal(res.headers.allow, "OPTIONS")
      t.equal(res.body, "\"Testing wildcards\"")
    })

    app.inject({method: "DELETE", url}, (err, res) => {
      t.equal(res.statusCode, 405)
      t.equal(res.headers.allow, "GET, HEAD, POST, OPTIONS")
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
        error:      "Method Not Allowed",
        statusCode: 405
      })
    })
  })

  testGroup.test("404 for case sensitive URL", (t) => {
    t.plan(2)
    const url = "/ttgg/THINGS/123"
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 404)
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `Route GET:${url} not found`,
        error:      "Not Found",
        statusCode: 404
      })
    })
  })

  testGroup.test("404 for trailing slash", (t) => {
    t.plan(2)
    const url = "/ttgg/things/123/"
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 404)
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `Route GET:${url} not found`,
        error:      "Not Found",
        statusCode: 404
      })
    })
  })

  testGroup.test("404 for non-handled routes", (t) => {
    t.plan(2)
    const url = "/no-handler/test"
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 404)
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `Route GET:${url} not found`,
        error:      "Not Found",
        statusCode: 404
      })
    })
  })
})

test("send405ForWildcard, caseSensitive, ignoreTrailingSlash options set to opposite of default", async (testGroup) => {
  const app = Fastify({
    caseSensitive:       false,
    ignoreTrailingSlash: true
  })
  const opts: AllowOptions = {
    send405:            true,
    send405ForWildcard: true
  }
  await app.register(allowPlugin, opts)
  const routePath = "/:param/stuff"
  app.get(routePath, (req: FastifyRequest, rep: FastifyReply) => {
    rep.send("\"Testing 2\"")
  })

  app.options("/:param/*", (req: FastifyRequest, rep: FastifyReply) => {
    rep.send()
  })

  testGroup.test("request tests prefix-different matches", (t) => {
    const url = "/not/p1/things"
    t.plan(2)
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 405)
      t.equal(res.headers.allow, "OPTIONS")
    })
  })

  testGroup.test("request tests case insensitive matches", (t) => {
    const url = "/p1/STUFF"
    t.plan(3)
    app.inject({method: "GET", url}, (err, res) => {
      t.equal(res.statusCode, 200)
      t.equal(res.headers.allow, "GET, HEAD, OPTIONS")
      t.equal(res.body, "\"Testing 2\"")
    })
  })

  testGroup.test("request tests trailing slash matches", (t) => {
    const url = "/p1/stuff/"
    t.plan(3)
    app.inject({method: "DELETE", url}, (err, res) => {
      t.equal(res.statusCode, 405)
      t.equal(res.headers.allow, "GET, HEAD, OPTIONS")
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
        error:      "Method Not Allowed",
        statusCode: 405
      })
    })
  })

  testGroup.test("request tests wildcard returns 405", (t) => {
    const url = "/p1/other-stuff"
    t.plan(3)
    app.inject({method: "DELETE", url}, (err, res) => {
      t.equal(res.statusCode, 405)
      t.equal(res.headers.allow, "OPTIONS")
      const data = parseBody(res)
      t.deepEqual(data, {
        message:    `DELETE ${url} not allowed. Examine 'Allow' header for supported methods.`,
        error:      "Method Not Allowed",
        statusCode: 405
      })
    })
  })
})


function parseBody(res: LightMyRequestResponse): any {
  return res.body.length
    ? JSON.parse(res.body)
    : ""
}
