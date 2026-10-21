import {Data, FromMap, HData, Marshal, Unmarshal} from "../hbuf/data";

export type BufferType = ArrayBuffer | Blob
export type RequestType = BufferType | Data | undefined
export type ResponseType = BufferType | Data | undefined | void

export interface Option {
    headers: Headers
    method: string
    traceId?: string
}

export type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>

// HandlerMiddleware 用于对 Handler 进行中间件处理。
export type HandlerMiddleware = (next: Handler) => Handler

export type Encoder = (v: Data) => ArrayBuffer

export type Decoder = (reader: ArrayBuffer, from: FromMap) => Data

export type Request = (path: string, notification: boolean, req: RequestType, from?: FromMap, opt?: Option) => Promise<ResponseType>


export class Error extends Data {
    constructor(code: number, msg: string) {
        super();
        this.code = code;
        this.msg = msg;
    }

    code: number
    msg: string

    public toMap(): Record<string, any> {
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

    public toMap(): Record<string, any> {
        return {
            ...super.toMap(),
            data: this.data?.toMap()
        };
    }

    fromMap(map: Record<string, any>): Result {
        return new Result(
            map.code,
            map.msg,
            map.data && this.from?.call(this, map.data as Record<string, any>),
        );
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function NewJsonDecoder(): Decoder {
    const decoder = new TextDecoder('utf-8');
    return (buffer: ArrayBuffer, from: FromMap): Data => {
        const str = decoder.decode(buffer);
        return from(JSON.parse(str) as Data)
    }
}

export function NewJsonEncode(): Encoder {
    const encoder = new TextEncoder();
    return (v: Data): ArrayBuffer => {
        const str = JSON.stringify(v.toMap())
        return encoder.encode(str).buffer
    }
}

export function NewHBufEncode(): Encoder {
    return (v: Data): ArrayBuffer => {
        return Marshal(v as unknown as HData).slice().buffer
    }
}

export function NewHBufDecoder(): Decoder {
    return (buffer: ArrayBuffer, from: FromMap): Data => {
        const data = from({} as Record<string, any>) as unknown as HData
        Unmarshal(new Uint8Array(buffer), data)
        return data as unknown as Data
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

    public invoke<T extends ResponseType>(id: number, name: string, method: string, request: RequestType, from?: FromMap): Promise<T> {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        return this.middleware(async (req: RequestType, opt?: Option): Promise<ResponseType> => {
            const result = new Result(0, "ok", undefined, from)
            const resp = await this.request(name + method, from == null, req, from && result.fromMap.bind(result), opt)
            if (from) {
                if ((resp as Result).code !== 0) {
                    throw resp
                }
                return (resp as Result).data
            }
            return resp as T
        })(request, {method: method, headers: new Headers()}) as Promise<T>
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Method {
    id: number
    name: string
    handler: Handler
    withContext: (opt?: Option) => Option | undefined
    from?: FromMap;
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
        name = "/" + name.replace(/^\/+|\/+$/g, "") + "/"
        for (const method of methods) {
            const key = method.name.replace(/|\/+$/g, "")
            this.methods[name + key] = method
        }
    }

    public unRegister(id: number, name: string): void {
        name = "/" + name.replace(/^\/+|\/+$/g, "") + "/"
        for (const key in this.methods) {
            if (key.startsWith(name)) {
                delete this.methods[key]
            }
        }
    }

    public async response(path: string, req: ArrayBuffer | Record<string, any>): Promise<ResponseType> {
        const method = this.methods[path]
        if (!method) {
            throw new Error(-1, "Method not found")
        }

        const val = !method.from ? req : method.from(req)
        return await this.middleware(method.handler)(val as ArrayBuffer | Data)
    }
}
