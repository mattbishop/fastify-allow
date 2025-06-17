import { FastifyInstance, FastifyPluginOptions } from "fastify";
export interface AllowOptions extends FastifyPluginOptions {
    send405?: boolean;
    send405ForWildcard?: boolean;
}
declare function plugin(fastify: FastifyInstance, opts: AllowOptions, done: () => void): void;
export declare const FastifyAllowPlugin: typeof plugin;
export default FastifyAllowPlugin;
