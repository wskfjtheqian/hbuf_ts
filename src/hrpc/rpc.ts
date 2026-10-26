import {HBufError, HData, isHData, JsonValue, Marshal, Reader, Type, Unmarshal, Writer} from "../hbuf/data";
import {
    DataDescriptor,
    Descriptor,
    FieldDesc,
    Int32Descriptor,
    Int64Descriptor,
    ListDescriptor,
    MapDescriptor,
    RefDescriptor,
    StringDescriptor,
    Uint8Descriptor
} from "../hbuf/descriptor";

export type BufferType = ArrayBuffer | Blob
export type RequestType = BufferType | HData | undefined
export type ResponseType = BufferType | HData | undefined | void

export interface Option {
    headers: Headers
    method: string
    traceId?: string
}

export type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>

// HandlerMiddleware 用于对 Handler 进行中间件处理。
export type HandlerMiddleware = (next: Handler) => Handler

// Encoder 编码器：将 HData 按描述符编码为二进制。
export type Encoder = (v: HData) => ArrayBuffer

// Decoder 解码器：按数据描述符将二进制解码为 HData 实例。
export type Decoder = (reader: ArrayBuffer, desc: Descriptor) => HData

export type Request = (path: string, notification: boolean, req: RequestType, desc?: Descriptor, opt?: Option) => Promise<ResponseType>


/**
 * Error RPC 错误对象（与 Result 共用 code/msg 编解码约定）。
 */
export class Error implements HData {
    constructor(code: number, msg: string) {
        this.code = code;
        this.msg = msg;
    }

    code: number
    msg: string

    descriptors(): Descriptor {
        return errorDesc
    }
}

/**
 * Result RPC 结果包装：code/msg 与可选的 data 负载。
 * data 的编解码使用响应描述符（构造时传入，或编码时取自 data 自身）。
 */
export class Result extends Error {
    data?: HData
    desc?: Descriptor;

    constructor(code: number, msg: string, data?: HData, desc?: Descriptor) {
        super(code, msg);
        this.data = data;
        this.desc = desc;
    }

    descriptors(): Descriptor {
        const dataDesc = this.desc ?? (isHData(this.data) ? this.data.descriptors() : undefined)
        return NewResultDesc(dataDesc)
    }
}

const errorDesc: DataDescriptor = new DataDescriptor(
    () => new Error(0, ""),
    new Map<number, FieldDesc>([
        [1, {
            name: "code",
            desc: new Int32Descriptor(),
            get: (o: Error) => o.code,
            set: (o: Error, v: number) => o.code = v
        }],
        [2, {
            name: "msg",
            desc: new StringDescriptor(),
            get: (o: Error) => o.msg,
            set: (o: Error, v: string) => o.msg = v
        }],
    ]),
)

/**111
 * NewResultDesc 构造 Result 的描述符：code/msg 与可选的 data 负载。
 * dataDesc 缺失时（无负载的错误结果）不包含 data 字段。
 */
export function NewResultDesc(dataDesc?: Descriptor): DataDescriptor {
    const fields = new Map<number, FieldDesc>([
        [1, {
            name: "code",
            desc: new Int32Descriptor(),
            get: (o: Result) => o.code,
            set: (o: Result, v: number) => o.code = v
        }],
        [2, {
            name: "msg",
            desc: new StringDescriptor(),
            get: (o: Result) => o.msg,
            set: (o: Result, v: string) => o.msg = v
        }],
    ])
    if (dataDesc) {
        fields.set(3, {
            name: "data",
                desc: new RefDescriptor(() => dataDesc, true),
            get: (o: Result) => o.data,
            set: (o: Result, v: any) => o.data = v
        })
    }
    return new DataDescriptor(
        () => new Result(0, ""),
        fields,
    )
}

/**
 * JsonDescriptor JSON 透传描述符：值在 JSON 编解码中原样透传。
 * 仅用于 JSON 编解码路径（如 WebSocket 信封的异构 data 字段），不支持二进制编解码。
 */
export class JsonDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): any {
        return null
    }

    fromJson(json: JsonValue): any {
        if (json == null) {
            return this.isPtr ? null : undefined
        }
        return json
    }

    toJson(v: any): JsonValue {
        return v == null ? null : v
    }

    zero(): any {
        return null
    }

    isEmpty(v: any): boolean {
        return v == null
    }

    encode(buf: Writer, v: any, id?: number): void {
        throw new HBufError("json descriptor: encode not supported")
    }

    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        throw new HBufError("json descriptor: decode not supported")
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// NewJsonDecoder JSON 解码器：buffer → desc.fromJson。
export function NewJsonDecoder(): Decoder {
    const decoder = new TextDecoder('utf-8');
    return (buffer: ArrayBuffer, desc: Descriptor): HData => {
        const str = decoder.decode(buffer);
        return desc.fromJson(JSON.parse(str))
    }
}

// NewJsonEncode JSON 编码器：v.descriptors().toJson。
export function NewJsonEncode(): Encoder {
    const encoder = new TextEncoder();
    return (v: HData): ArrayBuffer => {
        const str = JSON.stringify(v.descriptors().toJson(v))
        return encoder.encode(str).buffer
    }
}

// NewHBufEncode HBuf 二进制编码器。
export function NewHBufEncode(): Encoder {
    return (v: HData): ArrayBuffer => {
        return Marshal(v).slice().buffer
    }
}

// NewHBufDecoder HBuf 二进制解码器：由描述符工厂创建实例并就地填充。
export function NewHBufDecoder(): Decoder {
    return (buffer: ArrayBuffer, desc: Descriptor): HData => {
        const data = desc.factory()
        // 显式传入 desc：动态描述符对象（如 Result）的工厂实例自身描述符不完整
        Unmarshal(new Uint8Array(buffer), data, desc)
        return data
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

    public invoke<T extends ResponseType>(id: number, name: string, method: string, request: RequestType, desc?: Descriptor): Promise<T> {
        name = name.replace(/^\/+|\/+$/g, "") + "/"
        return this.middleware(async (req: RequestType, opt?: Option): Promise<ResponseType> => {
            const resp = await this.request(name + method, desc == null, req, desc, opt)
            if (desc) {
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
    desc?: Descriptor;
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

    public async response(path: string, req: ArrayBuffer | Uint8Array | Record<string, any>): Promise<ResponseType> {
        // path 归一化：与 register 的 "/name/method" 键一致（兼容无前导斜杠的传输层路径）
        path = "/" + path.replace(/^\/+|\/+$/g, "")
        const method = this.methods[path]
        if (!method) {
            throw new Error(-1, "Method not found")
        }

        let val: RequestType = req as ArrayBuffer
        if (method.desc) {
            // 二进制（含 Uint8Array/Buffer）走解码器；JSON 对象直接 fromJson
            if (req instanceof ArrayBuffer || req instanceof Uint8Array) {
                const buf: ArrayBuffer = req instanceof ArrayBuffer
                    ? req
                    : req.buffer.slice(req.byteOffset, req.byteOffset + req.byteLength) as ArrayBuffer
                val = this.decode(buf, method.desc)
            } else {
                val = method.desc.fromJson(req)
            }
        }
        return await this.middleware(method.handler)(val)
    }
}
