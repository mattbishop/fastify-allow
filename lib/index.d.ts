/// <reference types="node" />
import { FastifyPluginOptions } from "fastify";
export interface AllowOptions extends FastifyPluginOptions {
    send405?: boolean;
    send405ForWildcard?: boolean;
}
declare const _default: import("fastify").FastifyPluginCallback<AllowOptions, import("http").Server>;
export default _default;
