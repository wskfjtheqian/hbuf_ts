/**
 * Descriptor 描述一个 HBuf 值的编解码方式（对应 Go 版 Descriptor，无 unsafe 偏移）。
 */
interface Descriptor {
    factory(): any;
    /** 元素缺失时的零值（List 元素 / Map Key/Value 的空标记场景）。 */
    zero(): any;
    /** 判断字段值是否为空（零值 / null），为空时字段不写入。 */
    isEmpty(v: any): boolean;
    /**
     * encode 将值写入 buf。id 存在时按「字段」编码（TAG | ID | VALUE），
     * 否则按「元素」编码（TAG | VALUE，空值写 1 字节空标记）。
     */
    encode(buf: Writer, v: any, id?: number): void;
    /**
     * decode 按实际编码类型 typ 解码一个值并返回。
     * valRead=false 表示无 VALUE 字节（值保持零值）。
     * target 存在时（Data 类型）就地填充并返回该实例。
     */
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
    toJson(v: any): JsonValue;
    fromJson(json: JsonValue, target?: any): any;
    clone(val?: any, target?: any): any;
}
/** 数值基类（int / uint 系） */
declare abstract class IntBase implements Descriptor {
    protected isPtr: boolean;
    protected constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    abstract factory(): any;
    abstract fromJson(json: JsonValue, target?: any): any;
    abstract toJson(v: any): JsonValue;
    abstract zero(): any;
    protected abstract typ(): Type;
    protected abstract length(v: bigint): number;
    protected abstract writeValue(buf: Writer, v: bigint): void;
    protected abstract toBigInt(v: any): bigint;
    protected abstract fromBigInt(v: bigint): any;
    /** 元素零值空标记的 idLen（uint8 特例为 2）。 */
    protected emptyIdLen(): number;
    protected isEmptyField(v: any): boolean;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
declare class SignedInt extends IntBase {
    private bits;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    constructor(isPtr: boolean, bits: number);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
declare class SignedLong extends IntBase {
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    constructor(isPtr: boolean);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
declare class UnsignedInt extends IntBase {
    private bits;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    constructor(isPtr: boolean, bits: number);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
declare class UnsignedLong extends IntBase {
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    constructor(isPtr: boolean);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
/** Uint8 特例：值 0 恒视为空（无论可空与否）；元素零值空标记 idLen=2。 */
declare class Uint8Impl extends UnsignedInt {
    constructor(isPtr: boolean);
    protected emptyIdLen(): number;
    protected isEmptyField(v: any): boolean;
}
declare class Int8Descriptor extends SignedInt {
    constructor(isPtr?: boolean);
}
declare class Int16Descriptor extends SignedInt {
    constructor(isPtr?: boolean);
}
declare class Int32Descriptor extends SignedInt {
    constructor(isPtr?: boolean);
}
declare class Int64Descriptor extends SignedLong {
    constructor(isPtr?: boolean);
}
declare class Uint8Descriptor extends Uint8Impl {
    constructor(isPtr?: boolean);
}
declare class Uint16Descriptor extends UnsignedInt {
    constructor(isPtr?: boolean);
}
declare class Uint32Descriptor extends UnsignedInt {
    constructor(isPtr?: boolean);
}
declare class Uint64Descriptor extends UnsignedLong {
    constructor(isPtr?: boolean);
}
/** Float / Double 基类 */
declare abstract class FloatBase implements Descriptor {
    protected isPtr: boolean;
    private isDouble;
    protected constructor(isPtr: boolean | undefined, isDouble: boolean);
    clone(val?: any, target?: any): any;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    abstract zero(): any;
    protected abstract toBits(v: number): bigint;
    protected isEmptyField(v: any): boolean;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
declare class FloatDescriptor extends FloatBase {
    constructor(isPtr?: boolean);
    zero(): any;
    protected toBits(v: number): bigint;
}
declare class DoubleDescriptor extends FloatBase {
    constructor(isPtr?: boolean);
    zero(): any;
    protected toBits(v: number): bigint;
}
/** Bool：值编码在 TAG 的 valueLen 位（1=false, 2=true），无 VALUE 字节。 */
declare class BoolDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): boolean;
    fromJson(json: JsonValue, target?: any): boolean | null;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** String：UTF-8 编码为 TBytes。 */
declare class StringDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): string;
    fromJson(json: JsonValue, target?: any): string | null;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Bytes：任意字节序列。 */
declare class BytesDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): ArrayBuffer;
    fromJson(json: JsonValue, target?: any): JsonValue;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Time：42 位秒 + 30 位纳秒，固定 9 字节。TS 侧以 Date 承载（毫秒精度）。 */
declare class TimeDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): Date;
    fromJson(json: JsonValue, target?: any): Date | null;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Decimal：以 decimal.js Decimal 承载（wire 上为十进制文本）。 */
declare class DecimalDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** List：元素按「元素」规则编码（无 ID 字节）。 */
declare class ListDescriptor implements Descriptor {
    private desc;
    private isPtr;
    constructor(desc: Descriptor, isPtr?: boolean);
    clone(v?: any, target?: any): any;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Map：key/value 均按「元素」规则编码。 */
declare class MapDescriptor implements Descriptor {
    private keyDesc;
    private valueDesc;
    private isPtr;
    constructor(keyDesc: Descriptor, valueDesc: Descriptor, isPtr?: boolean);
    clone(val?: any, target?: any): any;
    factory(): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(val: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** 字段描述：描述符 + get/set 闭包（替代 Go 的 unsafe.Offsetof）。 */
type FieldDesc = {
    desc: Descriptor;
    get: (o: any) => any;
    set: (o: any, v: any) => void;
    name?: string;
};
/**
 * DataDescriptor：字段按 ID 升序编码，尾部跟 EXTENDS-BLOCK。
 */
declare class DataDescriptor implements Descriptor {
    factory: () => any;
    private fields;
    private fieldMap;
    private extends_;
    private extendMap;
    private isPtr;
    constructor(factory: () => any, fields: Map<number, FieldDesc>, extends_?: Map<number, FieldDesc>, isPtr?: boolean);
    clone(val?: any, target?: any): any;
    fromJson(json: JsonValue, target?: any): any;
    toJson(v: any): JsonValue;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/**
 * RefDescriptor：包装引用（递归结构）。TS 无 unsafe 偏移，透传目标描述符，
 * 额外处理 isPtr 语义（可空 data 元素的空标记，与 Go RefDescriptor 一致）。
 */
declare class RefDescriptor implements Descriptor {
    private isPtr;
    private cache;
    private getDesc;
    constructor(getDesc: () => Descriptor, isPtr?: boolean);
    clone(val?: any, target?: any): any;
    get desc(): Descriptor;
    factory(): any;
    toJson(v: any): JsonValue;
    fromJson(json: JsonValue, target?: any): any;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}

type JsonValue = string | number | boolean | null | undefined | JsonValue[] | {
    [key: string]: JsonValue;
};
/**
 * HBuf 值类型枚举，与 Go 版 data.go 完全一致。
 */
declare enum Type {
    TInt = 0,
    TUint = 1,
    TFloat = 2,
    TBool = 3,
    TBytes = 4,
    TList = 5,
    TMap = 6,
    TData = 7
}
/**
 * HData 接口：数据对象需实现 descriptors() 返回其描述符（由代码生成器产出）。
 */
interface HData {
    descriptors(): Descriptor;
}
/**
 * HBufError 通用错误。
 */
declare class HBufError extends Error {
    constructor(msg: string);
}
/**
 * ShortBufferError 缓冲区不足。
 */
declare class ShortBufferError extends HBufError {
    constructor(msg?: string);
}
/**
 * Writer 可增长字节缓冲区，承载编码结果。
 */
declare class Writer {
    private buf;
    private len;
    constructor(capacity?: number);
    get length(): number;
    private ensure;
    writeByte(v: number): void;
    writeBytes(b: Uint8Array): void;
    /** 返回已写入字节的视图（与内部缓冲共享，仅有效至下一次写入前）。 */
    toUint8Array(): Uint8Array;
}
/**
 * Reader 顺序读取字节缓冲区。
 */
declare class Reader {
    private buf;
    private pos;
    constructor(buf: Uint8Array);
    get position(): number;
    get remaining(): number;
    readByte(): number;
    readBytes(n: number): Uint8Array;
}
/**
 * Marshal 将数据对象编码为 HBuf 二进制。
 */
declare function Marshal(data: HData): Uint8Array;
/**
 * Unmarshal 将 HBuf 二进制解码到数据对象中。
 * desc 可选：动态描述符对象（如 RPC Result）的工厂实例自身描述符可能不完整，需显式传入。
 */
declare function Unmarshal(buf: Uint8Array, data: HData, desc?: Descriptor): void;
declare function isHData(obj: any): obj is HData;

type BufferType = ArrayBuffer | Blob;
type RequestType = BufferType | HData | undefined;
type ResponseType = BufferType | HData | undefined | void;
interface Option {
    headers: Headers;
    method: string;
    traceId?: string;
}
type Handler = (req: RequestType, opt?: Option) => Promise<ResponseType>;
type HandlerMiddleware = (next: Handler) => Handler;
type Encoder = (v: HData) => ArrayBuffer;
type Decoder = (reader: ArrayBuffer, desc: Descriptor) => HData;
type Request = (path: string, notification: boolean, req: RequestType, desc?: Descriptor, opt?: Option) => Promise<ResponseType>;
/**
 * Error RPC 错误对象（与 Result 共用 code/msg 编解码约定）。
 */
declare class Error$1 implements HData {
    constructor(code: number, msg: string);
    code: number;
    msg: string;
    descriptors(): Descriptor;
}
/**
 * Result RPC 结果包装：code/msg 与可选的 data 负载。
 * data 的编解码使用响应描述符（构造时传入，或编码时取自 data 自身）。
 */
declare class Result extends Error$1 {
    data?: HData;
    desc?: Descriptor;
    constructor(code: number, msg: string, data?: HData, desc?: Descriptor);
    descriptors(): Descriptor;
}
declare function NewJsonDecoder(): Decoder;
declare function NewJsonEncode(): Encoder;
declare function NewHBufEncode(): Encoder;
declare function NewHBufDecoder(): Decoder;
interface ClientOption {
    middleware?: HandlerMiddleware[];
}
declare class Client {
    request: Request;
    middleware: HandlerMiddleware;
    constructor(request: Request, option?: ClientOption);
    invoke<T extends ResponseType>(id: number, name: string, method: string, request: RequestType, desc?: Descriptor): Promise<T>;
}
interface Method {
    id: number;
    name: string;
    handler: Handler;
    withContext: (opt?: Option) => Option | undefined;
    desc?: Descriptor;
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
    response(path: string, req: ArrayBuffer | Uint8Array | Record<string, any>): Promise<ResponseType>;
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
    request(path: string, notification: boolean, req: RequestType, desc?: Descriptor, opt?: Option): Promise<ResponseType>;
    protected fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType>;
}
declare class FetchClient {
    protected base: string;
    protected decode: Decoder;
    protected encode: Encoder;
    constructor(base: string, option?: HttpClientOption);
    request(path: string, notification: boolean, req: RequestType, desc?: Descriptor, opt?: Option): Promise<ResponseType>;
    protected fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType>;
    $getChangeField(): string[];
}

declare enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    Ping = 3,
    Pong = 4
}
/**
 * WebSocketData WebSocket 信封：type/header/id/path/status + 异构 data 负载。
 * data 为 HData 时按其描述符编解码，否则走 JSON 透传（JsonDescriptor）。
 */
declare class WebSocketData implements HData {
    type: RpcType;
    header?: Map<string, string[]>;
    data?: ArrayBuffer | HData | void;
    id?: bigint;
    path?: string;
    status?: number;
    constructor(type: RpcType, id?: bigint, path?: string, data?: ArrayBuffer | HData);
    descriptors(): Descriptor;
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
    request(path: string, notification: boolean, req: RequestType, desc?: Descriptor, opt?: Option): Promise<ResponseType>;
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
declare function traceId(): string;

declare const _default: {
    Client: typeof Client;
    HttpClient: typeof HttpClient;
    FetchClient: typeof FetchClient;
    WebSocketClient: typeof WebSocketClient;
    Server: typeof Server;
    Result: typeof Result;
    Error: typeof Error$1;
    NewJsonDecoder: typeof NewJsonDecoder;
    NewJsonEncode: typeof NewJsonEncode;
    NewHBufDecoder: typeof NewHBufDecoder;
    NewHBufEncode: typeof NewHBufEncode;
    WebSocketData: typeof WebSocketData;
    waiting: typeof waiting;
    convertArray: typeof convertArray;
    RecordEntry: typeof RecordEntry;
    convertRecord: typeof convertRecord;
    isRecord: typeof isRecord;
    isArray: typeof isArray;
    formatDate: typeof formatDate;
    isData: typeof isData;
    Int8Descriptor: typeof Int8Descriptor;
    Int16Descriptor: typeof Int16Descriptor;
    Int32Descriptor: typeof Int32Descriptor;
    Int64Descriptor: typeof Int64Descriptor;
    Uint8Descriptor: typeof Uint8Descriptor;
    Uint16Descriptor: typeof Uint16Descriptor;
    Uint32Descriptor: typeof Uint32Descriptor;
    Uint64Descriptor: typeof Uint64Descriptor;
    FloatDescriptor: typeof FloatDescriptor;
    DoubleDescriptor: typeof DoubleDescriptor;
    BoolDescriptor: typeof BoolDescriptor;
    StringDescriptor: typeof StringDescriptor;
    BytesDescriptor: typeof BytesDescriptor;
    TimeDescriptor: typeof TimeDescriptor;
    DecimalDescriptor: typeof DecimalDescriptor;
    ListDescriptor: typeof ListDescriptor;
    MapDescriptor: typeof MapDescriptor;
    DataDescriptor: typeof DataDescriptor;
    RefDescriptor: typeof RefDescriptor;
    traceId: typeof traceId;
};

export { BoolDescriptor, type BufferType, BytesDescriptor, Client, type ClientOption, DataDescriptor, DecimalDescriptor, type Decoder, type Descriptor, DoubleDescriptor, type Encoder, Error$1 as Error, FetchClient, type FieldDesc, FloatDescriptor, HBufError, type HData, type Handler, type HandlerMiddleware, HttpClient, Int16Descriptor, Int32Descriptor, Int64Descriptor, Int8Descriptor, ListDescriptor, MapDescriptor, Marshal, type Method, NewHBufDecoder, NewHBufEncode, NewJsonDecoder, NewJsonEncode, type Option, Reader, RecordEntry, RefDescriptor, type Request, type RequestType, type ResponseType, Result, RpcType, Server, type ServerOption, ShortBufferError, StringDescriptor, TimeDescriptor, Type, Uint16Descriptor, Uint32Descriptor, Uint64Descriptor, Uint8Descriptor, Unmarshal, WebSocketClient, type WebSocketClientOption, WebSocketData, Writer, convertArray, convertRecord, _default as default, formatDate, isArray, isData, isHData, isRecord, traceId, waiting };
