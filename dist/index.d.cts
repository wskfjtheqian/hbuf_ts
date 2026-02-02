type FromMap = (map: Record<string, any>, tag: string) => Data;
interface Descriptor {
}
declare abstract class Data {
    abstract toMap(tag: string): Record<string, any>;
}

type BufferType = ArrayBuffer | Blob;
type RequestType = BufferType | Data | undefined;
type ResponseType = BufferType | Data | undefined | void;
interface Option {
    headers: Headers;
    method: string;
}
type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>;
type HandlerMiddleware = (next: Handler) => Handler;
type Encoder = (v: Data, tag: string) => ArrayBuffer;
type Decoder = (reader: ArrayBuffer, from: FromMap, tag: string) => Data;
type Request = (path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option) => Promise<ResponseType>;
declare class Error extends Data {
    constructor(code: number, msg: string);
    code: number;
    msg: string;
    toMap(tag: string): Record<string, any>;
}
declare class Result extends Error {
    data?: Data;
    from?: FromMap;
    constructor(code: number, msg: string, data?: Data, from?: FromMap);
    toMap(tag: string): Record<string, any>;
    fromMap(map: Record<string, any>, tag: string): Result;
}
declare function NewJsonDecoder(): Decoder;
declare function NewJsonEncode(): Encoder;
interface ClientOption {
    middleware?: HandlerMiddleware[];
}
declare class Client {
    request: Request;
    middleware: HandlerMiddleware;
    constructor(request: Request, option?: ClientOption);
    invoke<T extends ResponseType>(id: number, name: string, method: string, tag: string, request: RequestType, from?: FromMap): Promise<T>;
}
interface Method {
    id: number;
    name: string;
    handler: Handler;
    withContext: (opt?: Option) => Option | undefined;
    from?: FromMap;
    tag: string;
}
interface ServerOption {
    decode?: Decoder;
    encode?: Encoder;
    middleware?: HandlerMiddleware[];
}
declare class Server {
    middleware: HandlerMiddleware;
    decode: Decoder;
    encode: Encoder;
    methods: Record<string, Method>;
    constructor(option?: ServerOption);
    register(id: number, name: string, methods: Method[]): void;
    unRegister(id: number, name: string): void;
    response(path: string, req: ArrayBuffer | Record<string, any>): Promise<ResponseType>;
}

interface HttpClientOption {
    decode?: Decoder;
    encode?: Encoder;
}
declare class HttpClient {
    protected base: string;
    protected decode: Decoder;
    protected encode: Encoder;
    constructor(base: string, option?: HttpClientOption);
    request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType>;
    protected fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType>;
}

declare enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    Ping = 3,
    Pong = 4
}
declare class WebSocketData {
    type: RpcType;
    header?: Record<string, string[]>;
    data?: ArrayBuffer | Data | void;
    id?: bigint;
    path?: string;
    status?: number;
    constructor(type: RpcType, id?: bigint, path?: string, data?: ArrayBuffer | Data);
    toMap(tag: string): Record<string, any>;
    static fromMap(map: Record<string, any>, tag: string): WebSocketData;
}
declare class FetchPromise {
    resolve: (value: WebSocketData | PromiseLike<WebSocketData>) => void;
    reject: (reason?: any) => void;
    constructor(resolve: (value: (PromiseLike<WebSocketData> | WebSocketData)) => void, reject: (reason?: any) => void);
}
interface WebSocketClientOption {
    readTimeout?: number;
    heartbeat?: number;
    decode?: Decoder;
    encode?: Encoder;
}
declare class WebSocketClient {
    protected baseUrl: string;
    protected socket?: WebSocket;
    protected requestId: bigint;
    protected requestMap: Map<bigint, FetchPromise>;
    protected server?: Server;
    protected readTimeout: number;
    protected heartbeat: number;
    protected interval: NodeJS.Timeout | null;
    protected headTimeout: boolean;
    protected decode: Decoder;
    protected encode: Encoder;
    onclose?: ((code: string) => any) | null;
    constructor(baseUrl: string, server?: Server, option?: WebSocketClientOption);
    request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType>;
    connect(protocols?: string | string[]): Promise<void>;
    close(): void;
    private onMessage;
    private onRequest;
    private onHeartbeat;
}

declare function waiting(time: number): Promise<void>;
declare function convertArray<T, E>(list: T[] | null, call: (item: T) => E): E[] | null;
declare class RecordEntry<T extends keyof any, E> {
    get val(): E;
    get key(): T;
    private _key;
    private _val;
    constructor(key: T, val: E);
}
declare function convertRecord<T extends keyof any, E, A extends keyof any, B>(record: Record<T, E> | null, call: (key: T, val: E) => RecordEntry<A, B>): Record<A, B> | null;
declare function isRecord(o: any): boolean;
declare function isArray(o: any): boolean;
declare function formatDate(date: Date | string | number, format?: string): string;
declare function isData(obj: any): boolean;

declare const _default: {
    Data: typeof Data;
    Client: typeof Client;
    HttpClient: typeof HttpClient;
    WebSocketClient: typeof WebSocketClient;
    Server: typeof Server;
    Result: typeof Result;
    Error: typeof Error;
    NewJsonDecoder: typeof NewJsonDecoder;
    NewJsonEncode: typeof NewJsonEncode;
    WebSocketData: typeof WebSocketData;
    waiting: typeof waiting;
    convertArray: typeof convertArray;
    RecordEntry: typeof RecordEntry;
    convertRecord: typeof convertRecord;
    isRecord: typeof isRecord;
    isArray: typeof isArray;
    formatDate: typeof formatDate;
    isData: typeof isData;
};

export { type BufferType, Client, type ClientOption, Data, type Decoder, type Descriptor, type Encoder, Error, type FromMap, type Handler, type HandlerMiddleware, HttpClient, type Method, NewJsonDecoder, NewJsonEncode, type Option, RecordEntry, type Request, type RequestType, type ResponseType, Result, RpcType, Server, type ServerOption, WebSocketClient, type WebSocketClientOption, WebSocketData, convertArray, convertRecord, _default as default, formatDate, isArray, isData, isRecord, waiting };
