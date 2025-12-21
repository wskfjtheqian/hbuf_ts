// Handler 是用于处理RPC请求
import {Data, FromMap} from "../hbuf/data";

export type BufferType = ArrayBuffer | Blob
export type RequestType = BufferType | Data
export type ResponseType = BufferType | Data


export class Option {
    headers: Headers
    method: string

    constructor(method: string, headers: Headers) {
        this.headers = headers;
        this.method = method;
    }
}

export type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>

// HandlerMiddleware 用于对 Handler 进行中间件处理。
export type HandlerMiddleware = (next: Handler) => Handler

export type Encoder = (v: Data, tag: string) => ArrayBuffer

export type Decoder = (reader: ArrayBuffer, from: FromMap, tag: string) => Data

export type Request = (path: string, notification: boolean, callback: () => BufferType, opt?: Option) => Promise<ArrayBuffer>

export type RequestMiddleware = (next: Request) => Request


export class Error extends Data {
    constructor(code: number, msg: string) {
        super();
        this.code = code;
        this.msg = msg;
    }

    code: number
    msg: string

    public toMap(tag: string): Record<string, any> {
        return this;
    }
}

export class Result extends Error {
    constructor(code: number, msg: string, data: Data) {
        super(code, msg);
        this.data = data;
    }

    data: Data

    public toMap(tag: string): Record<string, any> {
        return {
            ...super.toMap(tag),
            data: this.data.toMap(tag)
        };
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function NewJsonDecoder(): Decoder {
    const decoder = new TextDecoder('utf-8');
    return (buffer: ArrayBuffer, from: FromMap, tag: string): Data => {
        const str = decoder.decode(buffer);
        return from(JSON.parse(str) as Data)
    }
}

function NewJsonEncode(): Encoder {
    const encoder = new TextEncoder();
    return (v: Data, tag: string): ArrayBuffer => {
        const str = JSON.stringify(v.toMap(tag))
        return encoder.encode(str).buffer
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ClientOption {
    decode?: Decoder
    encode?: Encoder
    middleware?: HandlerMiddleware[]
}

export class Client {
    request: Request
    decode: Decoder
    encode: Encoder
    middleware: HandlerMiddleware

    constructor(request: Request, option?: ClientOption) {
        this.request = request;
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()
        this.middleware = (next: Handler): Handler => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option!.middleware![i](next)
            }
            return next
        }
    }

    public Invoke(id: number, name: string, method: string, tag: string, request: RequestType, from?: FromMap): Promise<ResponseType> {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        return this.middleware(async (req: RequestType, opt?: Option): Promise<ResponseType> => {
            const reader = await this.request(name + method, false, (): BufferType => {
                if (req instanceof Data) {
                    return this.encode(req as Data, tag.length > 0 ? "I" + tag : "")
                } else {
                    return req as BufferType
                }
            }, opt)
            if (from) {
                const ret = this.decode(reader as ArrayBuffer, from, "") as Result
                if (ret.code != 0) {
                    throw ret
                }
                return ret.data
            } else {
                return reader
            }
        })(request, new Option(method, new Headers()))
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Method {
    id: number
    name: string
    handler: Handler
    withContext: (opt: Option) => Option
    decode: (decoder: (v: ArrayBuffer) => (Data)) => Data
    tag: string
}

export interface ServerOption {
    decode?: Decoder
    encode?: Encoder
    middleware?: HandlerMiddleware[]
}


export class Server {
    middleware: HandlerMiddleware
    decode: Decoder
    encode: Encoder
    methods: Record<string, Method>

    constructor(option?: ServerOption) {
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()
        this.methods = {}
        this.middleware = (next: Handler): Handler => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option!.middleware![i](next)
            }
            return next
        }
    }

    public register(id: number, name: string, methods: Method[]): void {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        for (const method of methods) {
            const key = method.name.replace(/|\/+$/g, "")
            this.methods[name + key] = method
        }
    }

    public async response(path: string, req: RequestType, from: FromMap): Promise<BufferType> {
        const method = this.methods[path]
        if (!method) {
            throw new Error(-1, "Method not found")
        }

        const val = !method.decode ? req : method.decode((v: ArrayBuffer): Data => {
            return this.decode(v, from, method.tag?.length > 0 ? "I" + method.tag : "")
        })
        try {
            const response: ResponseType = await this.middleware(method.handler)(val)
            if (response instanceof Data) {
                return this.encode(new Result(0, "ok", response), method.tag?.length > 0 ? "O" + method.tag : "")
            }
            return response
        } catch (e) {
            if (e instanceof Error) {
                return this.encode(e, "")
            } else {
                return this.encode(new Error(0, "ok"), "")
            }
        }
    }
}
