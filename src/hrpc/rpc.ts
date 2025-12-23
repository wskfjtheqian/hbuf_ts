// Handler 是用于处理RPC请求
import {Data, FromMap} from "../hbuf/data";

export type BufferType = ArrayBuffer | Blob
export type RequestType = BufferType | Data | undefined
export type ResponseType = BufferType | Data | undefined

export interface Option {
    headers: Headers
    method: string
}

export type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>

// HandlerMiddleware 用于对 Handler 进行中间件处理。
export type HandlerMiddleware = (next: Handler) => Handler

export type Encoder = (v: Data, tag: string) => ArrayBuffer

export type Decoder = (reader: ArrayBuffer, from: FromMap, tag: string) => Data

export type Request = (path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option) => Promise<ResponseType>


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
    data?: Data
    from?: FromMap;

    constructor(code: number, msg: string, data?: Data, from?: FromMap) {
        super(code, msg);
        this.data = data;
        this.from = from;
    }

    public toMap(tag: string): Record<string, any> {
        return {
            ...super.toMap(tag),
            data: this.data?.toMap(tag)
        };
    }

    fromMap(map: Record<string, any>, tag: string): Result {
        return new Result(
            map.code,
            map.msg,
            this.from?.call(this, map.data as Record<string, any>, tag),
        );
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function NewJsonDecoder(): Decoder {
    const decoder = new TextDecoder('utf-8');
    return (buffer: ArrayBuffer, from: FromMap, tag: string): Data => {
        const str = decoder.decode(buffer);
        return from(JSON.parse(str) as Data, tag)
    }
}

export function NewJsonEncode(): Encoder {
    const encoder = new TextEncoder();
    return (v: Data, tag: string): ArrayBuffer => {
        const str = JSON.stringify(v.toMap(tag))
        return encoder.encode(str).buffer
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ClientOption {

    middleware?: HandlerMiddleware[]
}

export class Client {
    request: Request

    middleware: HandlerMiddleware

    constructor(request: Request, option?: ClientOption) {
        this.request = request;

        this.middleware = (next: Handler): Handler => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option!.middleware![i](next)
            }
            return next
        }
    }

    public invoke(id: number, name: string, method: string, tag: string, request: RequestType, from?: FromMap): Promise<ResponseType> {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        return this.middleware(async (req: RequestType, opt?: Option): Promise<ResponseType> => {
            const result = new Result(0, "ok", undefined, from)
            const resp = await this.request(name + method, true, req, tag, from && result.fromMap.bind(result), opt)
            if (from) {
                if ((resp as Result).code !== 0) {
                    throw resp
                }
                return (resp as Result).data
            }
            return resp
        })(request, {method: method, headers: new Headers()})
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Method {
    id: number
    name: string
    handler: Handler
    withContext: (opt: Option) => Option
    from: FromMap;
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

    public async response(path: string, req: ArrayBuffer | Record<string, any>): Promise<ResponseType> {
        const method = this.methods[path]
        if (!method) {
            throw new Error(-1, "Method not found")
        }

        const val = !method.from ? req : method.from(req, method.tag?.length > 0 ? "I" + method.tag : "")
        return await this.middleware(method.handler)(val as ArrayBuffer | Data)
    }
}
