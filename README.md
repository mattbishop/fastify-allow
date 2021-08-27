# Fastify Allow Plugin
The HTTP 1.1 specification has an [`Allow` header](https://datatracker.ietf.org/doc/html/rfc7231#section-7.4.1) for resources to include in client responses, indicating all the methods the resource supports. All resource requests return the `Allow` header so client develpers can discover all of the allowable methods on the resource. If a resource does not support a method, for instance, `DELETE`, then the response status will be `405 Not Allowed` along with the `Allow` header.

This plugin adds an `Allow` header to all responses with routes that have registered handlers, regardless of the method they handle. It returns a `405 Not Allowed` response when a route has no supported method handler. This behaviour is different from Fastify's default behaviour, which is to return a `404 Not Found` for unhandled methodson a route.

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

When `send405` is true, wildcard path behavior is also configurable. By default, if a path _only_ has wildcard handlers, and not a specific path handler, then 404 will be returned instead of 405. If you wish 405 to be sent for all paths that match, even when only a wildcard path matches, then set the `send405ForWildcard` to `true`:

```js
fastify.register(require('fastify-allow', { send405: true, send405ForWildcard: true }))

fastify.options('*', optionsHandler)

// fastify will send 405 for all requests that do not have method handlers as all paths match '*'
```

if `send405` is set to false, then `send405ForWildcard` is ignored.

| Option               | Description                                                  | Default value |
| -------------------- | ------------------------------------------------------------ | ------------- |
| `send405`            | Controls whether or not to send `405 Not Allowed` status codes for request that have handlers for other methods, just not the one being sent. | `true`        |
| `send405ForWildcard` | Only applies when `send405` is true. Wildcard routes that have no non-wildcard route handlers will still return 405 `Not Allowed` for requests that have a matching wildcard handler. | `false`       |



### Typescript Support

fastify-allow is written in Typescript and includes type declarations for the options.

```typescript
import Fastify from "fastify"
import allowPlugin, {AllowOptions} from "fastify-allow"

const fastify = Fastify()
const allowOpts: AllowOptions = { send405: false, send405ForWildcard: true }

fastify.register(allowPlugin, allowOpts)

// now register handlers
```