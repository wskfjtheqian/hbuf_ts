// Handler 是用于处理RPC请求
import { Data } from "../hbuf/data";
export class Context {
    constructor(method, headers) {
        this.headers = headers;
        this.method = method;
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function NewJsonDecoder() {
    const decoder = new TextDecoder('utf-8');
    return (buffer, tag) => {
        const str = decoder.decode(buffer);
        return JSON.parse(str);
    };
}
function NewJsonEncode() {
    const encoder = new TextEncoder();
    return (v, tag) => {
        const str = JSON.stringify(v);
        return encoder.encode(str).buffer;
    };
}
export class Client {
    constructor(request, option) {
        this.request = request;
        this.decode = option?.decode ?? NewJsonDecoder();
        this.encode = option?.encode ?? NewJsonEncode();
        this.middleware = (next) => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option.middleware[i](next);
            }
            return next;
        };
    }
    Invoke(id, name, method, tag, request, retType) {
        name = name.replace(/^\/+|\/+$/g, "") + "/";
        return this.middleware(async (req, ctx) => {
            const reader = await this.request(name + method, false, () => {
                if (req instanceof Data) {
                    return this.encode(req, tag.length > 0 ? "I" + tag : "");
                }
                else {
                    return req;
                }
            }, ctx);
            if (retType == "data") {
                const ret = this.decode(reader, "");
                if (ret.code != 0) {
                    throw ret;
                }
                return ret.data;
            }
            else {
                return reader;
            }
        })(request, new Context(method, new Headers()));
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
