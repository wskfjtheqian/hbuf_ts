import { Data, FromMap } from "../hbuf/data";
export type BufferType = ArrayBuffer | Blob;
export type RequestType = BufferType | Data | undefined;
export type ResponseType = BufferType | Data | undefined;
export interface Option {
    headers: Headers;
    method: string;
}
export type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>;
export type HandlerMiddleware = (next: Handler) => Handler;
export type Encoder = (v: Data, tag: string) => ArrayBuffer;
export type Decoder = (reader: ArrayBuffer, from: FromMap, tag: string) => Data;
export type Request = (path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option) => Promise<ResponseType>;
export declare class Error extends Data {
    constructor(code: number, msg: string);
    code: number;
    msg: string;
    toMap(tag: string): Record<string, any>;
}
export declare class Result extends Error {
    data?: Data;
    from?: FromMap;
    constructor(code: number, msg: string, data?: Data, from?: FromMap);
    toMap(tag: string): Record<string, any>;
    fromMap(map: Record<string, any>, tag: string): Result;
}
export declare function NewJsonDecoder(): Decoder;
export declare function NewJsonEncode(): Encoder;
export interface ClientOption {
    middleware?: HandlerMiddleware[];
}
export declare class Client {
    request: Request;
    middleware: HandlerMiddleware;
    constructor(request: Request, option?: ClientOption);
    invoke(id: number, name: string, method: string, tag: string, request: RequestType, from?: FromMap): Promise<ResponseType>;
}
export interface Method {
    id: number;
    name: string;
    handler: Handler;
    withContext: (opt: Option) => Option;
    from: FromMap;
    tag: string;
}
export interface ServerOption {
    decode?: Decoder;
    encode?: Encoder;
    middleware?: HandlerMiddleware[];
}
export declare class Server {
    middleware: HandlerMiddleware;
    decode: Decoder;
    encode: Encoder;
    methods: Record<string, Method>;
    constructor(option?: ServerOption);
    register(id: number, name: string, methods: Method[]): void;
    response(path: string, req: ArrayBuffer | Record<string, any>): Promise<ResponseType>;
}
