// Handler 是用于处理RPC请求
import {Data} from "../hbuf/data";

export type BufferType = ArrayBuffer | Blob
export type RequestType = BufferType | Data
export type ResponseType = BufferType | Data


export class Context {
    headers: Headers
    method: string

    constructor(method: string, headers: Headers) {
        this.headers = headers;
        this.method = method;
    }
}

export type Handler = (req: RequestType, ctx?: Context) => Promise<ResponseType>

// HandlerMiddleware 用于对 Handler 进行中间件处理。
export type HandlerMiddleware = (next: Handler) => Handler

export type Encoder = (v: Data, tag: string) => ArrayBuffer

export type Decoder = (reader: ArrayBuffer, tag: string) => Data

export type Request = (path: string, notification: boolean, callback: () => BufferType, ctx?: Context) => Promise<ArrayBuffer>

export type RequestMiddleware = (next: Request) => Request

export interface Error {
    code: number
    msg: string
}

export interface Result extends Error {
    data: any
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function NewJsonDecoder(): Decoder {
    const decoder = new TextDecoder('utf-8');
    return (buffer: ArrayBuffer, tag: string): Data => {
        const str = decoder.decode(buffer);
        return JSON.parse(str) as Data
    }
}

function NewJsonEncode(): Encoder {
    const encoder = new TextEncoder();
    return (v: Data, tag: string): ArrayBuffer => {
        const str = JSON.stringify(v)
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

    public Invoke(id: Number, name: string, method: string, tag: string, request: RequestType, retType: "data" | "buffer"): Promise<ResponseType> {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        return this.middleware(async (req: RequestType, ctx?: Context): Promise<ResponseType> => {
            const reader = await this.request(name + method, false, (): BufferType => {
                if (req instanceof Data) {
                    return this.encode(req as Data, tag.length > 0 ? "I" + tag : "")
                } else {
                    return req as BufferType
                }
            }, ctx)
            if (retType == "data") {
                const ret = this.decode(reader as ArrayBuffer, "") as Result
                if (ret.code != 0) {
                    throw ret
                }
                return ret.data
            } else {
                return reader
            }
        })(request, new Context(method, new Headers()))
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
