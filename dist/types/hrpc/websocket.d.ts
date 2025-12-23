import { Decoder, Encoder, Option, RequestType, ResponseType, Server } from "./rpc";
import { Data, FromMap } from "../hbuf/data";
export declare enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    AuthSuccess = 3,
    AuthFailure = 4,
    Ping = 5,
    Pong = 6
}
export declare class WebSocketData {
    type: RpcType;
    header: Record<string, string[]>;
    data?: ArrayBuffer | Data;
    id: number;
    path: string;
    status: number;
    constructor(type: RpcType, id: number, path: string, data?: ArrayBuffer | Data);
    toMap(tag: string): Record<string, any>;
    static fromMap(map: Record<string, any>, tag: string): WebSocketData;
}
declare class FetchPromise {
    resolve: (value: WebSocketData | PromiseLike<WebSocketData>) => void;
    reject: (reason?: any) => void;
    constructor(resolve: (value: (PromiseLike<WebSocketData> | WebSocketData)) => void, reject: (reason?: any) => void);
}
export interface WebSocketClientOption {
    readTimeout?: number;
    heartbeat?: number;
    decode?: Decoder;
    encode?: Encoder;
}
export declare class WebSocketClient {
    protected baseUrl: string;
    protected socket?: WebSocket;
    protected requestId: number;
    protected requestMap: Map<number, FetchPromise>;
    protected server?: Server;
    protected readTimeout: number;
    protected heartbeat: number;
    protected interval: number | null;
    protected headTimeout: boolean;
    protected decode: Decoder;
    protected encode: Encoder;
    onclose?: ((code: string) => any) | null;
    constructor(baseUrl: string, server?: Server, option?: WebSocketClientOption);
    request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType>;
    connect(params?: Record<string, string[]>): Promise<void>;
    close(): void;
    private onMessage;
    private onRequest;
}
export {};
