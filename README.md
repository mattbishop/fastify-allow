# Fastify Allow Plugin
The HTTP 1.1 specification has an [`Allow` header](https://datatracker.ietf.org/doc/html/rfc7231#section-7.4.1) for resources to include in client responses, indicating all the methods the resource supports. All resource requests return the `Allow` header so client developers can discover all of the allowable methods on the resource. If a resource does not support a method, for instance, `DELETE`, then the response status will be `405 Not Allowed` along with the `Allow` header.

This plugin adds an `Allow` header to all responses with routes that have registered handlers, regardless of the method they handle. It returns a `405 Not Allowed` response when a route has no supported method handler. This behaviour is different from Fastify's default behaviour, which is to return a `404 Not Found` for unhandled methods on a route.

If a route has no registered method handlers, fastify-allow will send the usual `404 Not Found` response.

### Install

```shell
npm install fastify-allow
```

### Usage
To use the plugin, simply register it _before adding method handlers_ to the fastify instance.

```js
const fastify = require('fastify')()

fastify.register(require('fastify-allow'))

/*
  The replies for GET and POST to this endpoint will include the header Allow: GET, POST
  This route will reply 405 on HEAD, OPTIONS, PUT, PATCH and DELETE in addition to the header
  Allow: GET, POST
*/
fastify.get('/foo', (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.post('/foo', (req, reply) => {
  reply.status(201)
})

fastify.listen(3000, (err) => {
  if (err) throw err
  console.log('Server listening at http://localhost:3000')
})
```

### Options
The plugin can be configured to retain fastify's default behaviour for unsupported methods, which is to respond with `404 Not Found`. Configure the plugin at registration with this option:

```js
fastify.register(require('fastify-allow', { send405: false }))
```

### Typescript Support
fastify-allow is written in Typescript and includes type declarations for the options.

```typescript
import Fastify from "fastify"
import allowPlugin, {AllowOptions} from "fastify-allow"

const fastify = Fastify()
const allowOpts: AllowOptions = { send405: false }

fastify.register(allowPlugin, allowOpts)

// now register handlers
```
