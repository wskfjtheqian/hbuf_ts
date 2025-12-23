// Handler 是用于处理RPC请求
import { Data } from "../hbuf/data";
export class Error extends Data {
    constructor(code, msg) {
        super();
        this.code = code;
        this.msg = msg;
    }
    toMap(tag) {
        return this;
    }
}
export class Result extends Error {
    constructor(code, msg, data, from) {
        super(code, msg);
        this.data = data;
        this.from = from;
    }
    toMap(tag) {
        return {
            ...super.toMap(tag),
            data: this.data?.toMap(tag)
        };
    }
    fromMap(map, tag) {
        return new Result(map.code, map.msg, this.from?.call(this, map.data, tag));
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function NewJsonDecoder() {
    const decoder = new TextDecoder('utf-8');
    return (buffer, from, tag) => {
        const str = decoder.decode(buffer);
        return from(JSON.parse(str), tag);
    };
}
export function NewJsonEncode() {
    const encoder = new TextEncoder();
    return (v, tag) => {
        const str = JSON.stringify(v.toMap(tag));
        return encoder.encode(str).buffer;
    };
}
export class Client {
    constructor(request, option) {
        this.request = request;
        this.middleware = (next) => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option.middleware[i](next);
            }
            return next;
        };
    }
    invoke(id, name, method, tag, request, from) {
        name = name.replace(/^\/+|\/+$/g, "") + "/";
        return this.middleware(async (req, opt) => {
            const result = new Result(0, "ok", undefined, from);
            const resp = await this.request(name + method, true, req, tag, from && result.fromMap.bind(result), opt);
            if (from) {
                if (resp.code !== 0) {
                    throw resp;
                }
                return resp.data;
            }
            return resp;
        })(request, { method: method, headers: new Headers() });
    }
}
export class Server {
    constructor(option) {
        this.decode = option?.decode ?? NewJsonDecoder();
        this.encode = option?.encode ?? NewJsonEncode();
        this.methods = {};
        this.middleware = (next) => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option.middleware[i](next);
            }
            return next;
        };
    }
    register(id, name, methods) {
        name = name.replace(/^\/+|\/+$/g, "") + "/";
        for (const method of methods) {
            const key = method.name.replace(/|\/+$/g, "");
            this.methods[name + key] = method;
        }
    }
    async response(path, req) {
        const method = this.methods[path];
        if (!method) {
            throw new Error(-1, "Method not found");
        }
        const val = !method.from ? req : method.from(req, method.tag?.length > 0 ? "I" + method.tag : "");
        return await this.middleware(method.handler)(val);
    }
}
