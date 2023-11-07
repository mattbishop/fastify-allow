import { FastifyInstance, FastifyPluginOptions } from "fastify";
export interface AllowOptions extends FastifyPluginOptions {
    send405?: boolean;
    send405ForWildcard?: boolean;
}
declare function plugin(fastify: FastifyInstance, opts: AllowOptions, done: () => void): void;
declare const _default: typeof plugin;
export default _default;
