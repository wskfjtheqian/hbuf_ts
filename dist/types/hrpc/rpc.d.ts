import { Data } from "../hbuf/data";
export type BufferType = ArrayBuffer | Blob;
export type RequestType = BufferType | Data;
export type ResponseType = BufferType | Data;
export declare class Context {
    headers: Headers;
    method: string;
    constructor(method: string, headers: Headers);
}
export type Handler = (req: RequestType, ctx?: Context) => Promise<ResponseType>;
export type HandlerMiddleware = (next: Handler) => Handler;
export type Encoder = (v: Data, tag: string) => ArrayBuffer;
export type Decoder = (reader: ArrayBuffer, tag: string) => Data;
export type Request = (path: string, notification: boolean, callback: () => BufferType, ctx?: Context) => Promise<ArrayBuffer>;
export type RequestMiddleware = (next: Request) => Request;
export interface Error {
    code: number;
    msg: string;
}
export interface Result extends Error {
    data: any;
}
export interface ClientOption {
    decode?: Decoder;
    encode?: Encoder;
    middleware?: HandlerMiddleware[];
}
export declare class Client {
    request: Request;
    decode: Decoder;
    encode: Encoder;
    middleware: HandlerMiddleware;
    constructor(request: Request, option?: ClientOption);
    Invoke(id: Number, name: string, method: string, tag: string, request: RequestType, retType: "data" | "buffer"): Promise<ResponseType>;
}
