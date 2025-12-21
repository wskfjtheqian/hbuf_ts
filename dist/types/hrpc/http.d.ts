import { BufferType, Context, RequestMiddleware } from "./rpc";
export interface HttpClientOption {
    middleware?: RequestMiddleware[];
}
export declare class HttpClient {
    base: string;
    middleware: RequestMiddleware;
    constructor(base: string, option?: HttpClientOption);
    request(path: string, notification: boolean, callback: () => BufferType, ctx?: Context): Promise<ArrayBuffer>;
}
