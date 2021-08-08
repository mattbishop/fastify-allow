import test from "tape"
import Fastify, {FastifyReply, FastifyRequest} from "fastify"
import allowPlugin, {AllowOptions} from "../src"


test("register without options", (t) => {
  t.plan(2)
  const app = Fastify()
  app.setNotFoundHandler = () => {
    t.pass("notFoundHandler set")
    return app
  }
  app.register(allowPlugin)
  app.ready(t.error)
})

test("register with send405 options set to true", (t) => {
  t.plan(2)
  const app = Fastify()
  app.setNotFoundHandler = () => {
    t.pass("notFoundHandler set")
    return app
  }
  const opts: AllowOptions = {send405: true}
  app.register(allowPlugin, opts)
  app.ready(t.error)
})

test("register with send405 options set to false", (t) => {
  t.plan(1)
  const app = Fastify()
  app.setNotFoundHandler = () => {
    t.fail("notFoundHandler should not be set")
    return app
  }
  const opts: AllowOptions = {send405: false}
  app.register(allowPlugin, opts)
  app.ready(t.error)
})


test("request tests", (testGroup) => {
  const app = Fastify()
  const opts: AllowOptions = {send405: true}
  app.register(allowPlugin, opts)
  app.get("/", (req: FastifyRequest, rep: FastifyReply) => {
      rep.send("Testing")
    })
  app.post("/", (req: FastifyRequest, rep: FastifyReply) => {
      rep.status(201)
    })

  testGroup.test("ALLOW / 405 tests", (t) => {
    t.plan(6)
    app.inject({method: "GET", url: "/"}, (err, res) => {
      t.equal(res.statusCode, 200)
      t.equal(res.headers.allow, "GET, POST")
      t.equal(res.body, "Testing")
    })

    app.inject({method: "DELETE", url: "/"}, (err, res) => {
      t.equal(res.statusCode, 405)
      t.equal(res.headers.allow, "GET, POST")
      t.deepEqual(JSON.parse(res.body), {
        message:    "DELETE / not allowed",
        error:      "Method Not Allowed",
        statusCode: 405
      })
    })
  })

  testGroup.test("404 for non-handled routes", (t) => {
    t.plan(2)
    app.inject({method: "GET", url: "/no-handler"}, (err, res) => {
      t.equal(res.statusCode, 404)
      t.deepEqual(JSON.parse(res.body), {
        message:    "Route GET:/no-handler not found",
        error:      "Not Found",
        statusCode: 404
      })
    })
  })
})
