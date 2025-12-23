import { BufferType, Decoder, Encoder, Option, RequestType, ResponseType } from "./rpc";
import { FromMap } from "../hbuf/data";
export interface HttpClientOption {
    decode?: Decoder;
    encode?: Encoder;
}
export declare class HttpClient {
    protected base: string;
    protected decode: Decoder;
    protected encode: Encoder;
    constructor(base: string, option?: HttpClientOption);
    request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType>;
    protected fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType>;
}
