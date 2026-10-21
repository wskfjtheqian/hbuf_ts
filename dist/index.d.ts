/**
 * Descriptor 描述一个 HBuf 值的编解码方式（对应 Go 版 Descriptor，无 unsafe 偏移）。
 */
interface Descriptor {
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
}
/** 数值基类（int / uint 系） */
declare abstract class IntBase implements Descriptor {
    protected isPtr: boolean;
    protected constructor(isPtr?: boolean);
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
    constructor(isPtr: boolean, bits: number);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
declare class SignedLong extends IntBase {
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
    constructor(isPtr: boolean, bits: number);
    zero(): any;
    protected typ(): Type;
    protected length(v: bigint): number;
    protected writeValue(buf: Writer, v: bigint): void;
    protected toBigInt(v: any): bigint;
    protected fromBigInt(v: bigint): any;
}
declare class UnsignedLong extends IntBase {
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
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** String：UTF-8 编码为 TBytes。 */
declare class StringDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Bytes：任意字节序列。 */
declare class BytesDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Time：42 位秒 + 30 位纳秒，固定 9 字节。TS 侧以 Date 承载（毫秒精度）。 */
declare class TimeDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/** Decimal：以字符串承载（wire 上为十进制文本）。 */
declare class DecimalDescriptor implements Descriptor {
    private isPtr;
    constructor(isPtr?: boolean);
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
};
/**
 * DataDescriptor：字段按 ID 升序编码，尾部跟 EXTENDS-BLOCK。
 */
declare class DataDescriptor implements Descriptor {
    private factory;
    private fields;
    private fieldMap;
    private extends_;
    private extendMap;
    private isPtr;
    constructor(factory: () => any, fields: Map<number, FieldDesc>, extends_?: Map<number, FieldDesc>, isPtr?: boolean);
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
    private desc;
    private isPtr;
    constructor(desc: Descriptor, isPtr?: boolean);
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
/**
 * SyncDescriptor：延迟构建描述符（对应 Go 的 sync.Once，JS 单线程直接缓存）。
 */
declare class SyncDescriptor implements Descriptor {
    private f;
    private cached?;
    constructor(f: () => Descriptor);
    Desc(): Descriptor;
    zero(): any;
    isEmpty(v: any): boolean;
    encode(buf: Writer, v: any, id?: number): void;
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any;
}
declare function NewDataDescriptor(factory: () => any, fields: Map<number, FieldDesc>, extends_?: Map<number, FieldDesc>, isPtr?: boolean): DataDescriptor;
declare function NewRefDescriptor(desc: Descriptor, isPtr?: boolean): RefDescriptor;
declare function NewListDescriptor(desc: Descriptor, isPtr?: boolean): ListDescriptor;
declare function NewMapDescriptor(keyDesc: Descriptor, valueDesc: Descriptor, isPtr?: boolean): MapDescriptor;
declare function NewInt8Descriptor(isPtr?: boolean): Int8Descriptor;
declare function NewInt16Descriptor(isPtr?: boolean): Int16Descriptor;
declare function NewInt32Descriptor(isPtr?: boolean): Int32Descriptor;
declare function NewInt64Descriptor(isPtr?: boolean): Int64Descriptor;
declare function NewUint8Descriptor(isPtr?: boolean): Uint8Descriptor;
declare function NewUint16Descriptor(isPtr?: boolean): Uint16Descriptor;
declare function NewUint32Descriptor(isPtr?: boolean): Uint32Descriptor;
declare function NewUint64Descriptor(isPtr?: boolean): Uint64Descriptor;
declare function NewFloatDescriptor(isPtr?: boolean): FloatDescriptor;
declare function NewDoubleDescriptor(isPtr?: boolean): DoubleDescriptor;
declare function NewBoolDescriptor(isPtr?: boolean): BoolDescriptor;
declare function NewStringDescriptor(isPtr?: boolean): StringDescriptor;
declare function NewBytesDescriptor(isPtr?: boolean): BytesDescriptor;
declare function NewTimeDescriptor(isPtr?: boolean): TimeDescriptor;
declare function NewDecimalDescriptor(isPtr?: boolean): DecimalDescriptor;
declare function NewSyncDescriptor(f: () => Descriptor): SyncDescriptor;

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
 */
declare function Unmarshal(buf: Uint8Array, data: HData): void;
/** 兼容旧导出：FromMap（hrpc 层使用）。 */
type FromMap = (map: Record<string, any>, tag: string) => any;
/** Data 抽象类（兼容原有 JSON codec 用法）。 */
declare abstract class Data {
    abstract toMap(tag: string): Record<string, any>;
}
declare function isHData(obj: any): obj is HData;

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
declare class Error$1 extends Data {
    constructor(code: number, msg: string);
    code: number;
    msg: string;
    toMap(tag: string): Record<string, any>;
}
declare class Result extends Error$1 {
    data?: Data;
    from?: FromMap;
    constructor(code: number, msg: string, data?: Data, from?: FromMap);
    toMap(tag: string): Record<string, any>;
    fromMap(map: Record<string, any>, tag: string): Result;
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
    SyncDescriptor: typeof SyncDescriptor;
    NewInt8Descriptor: typeof NewInt8Descriptor;
    NewInt16Descriptor: typeof NewInt16Descriptor;
    NewInt32Descriptor: typeof NewInt32Descriptor;
    NewInt64Descriptor: typeof NewInt64Descriptor;
    NewUint8Descriptor: typeof NewUint8Descriptor;
    NewUint16Descriptor: typeof NewUint16Descriptor;
    NewUint32Descriptor: typeof NewUint32Descriptor;
    NewUint64Descriptor: typeof NewUint64Descriptor;
    NewFloatDescriptor: typeof NewFloatDescriptor;
    NewDoubleDescriptor: typeof NewDoubleDescriptor;
    NewBoolDescriptor: typeof NewBoolDescriptor;
    NewStringDescriptor: typeof NewStringDescriptor;
    NewBytesDescriptor: typeof NewBytesDescriptor;
    NewTimeDescriptor: typeof NewTimeDescriptor;
    NewDecimalDescriptor: typeof NewDecimalDescriptor;
    NewListDescriptor: typeof NewListDescriptor;
    NewMapDescriptor: typeof NewMapDescriptor;
    NewDataDescriptor: typeof NewDataDescriptor;
    NewRefDescriptor: typeof NewRefDescriptor;
    NewSyncDescriptor: typeof NewSyncDescriptor;
};

export { BoolDescriptor, type BufferType, BytesDescriptor, Client, type ClientOption, Data, DataDescriptor, DecimalDescriptor, type Decoder, DoubleDescriptor, type Encoder, Error$1 as Error, type FieldDesc, FloatDescriptor, type FromMap, type Descriptor as HBufDescriptor, HBufError, type HData, type Handler, type HandlerMiddleware, HttpClient, Int16Descriptor, Int32Descriptor, Int64Descriptor, Int8Descriptor, ListDescriptor, MapDescriptor, Marshal, type Method, NewBoolDescriptor, NewBytesDescriptor, NewDataDescriptor, NewDecimalDescriptor, NewDoubleDescriptor, NewFloatDescriptor, NewHBufDecoder, NewHBufEncode, NewInt16Descriptor, NewInt32Descriptor, NewInt64Descriptor, NewInt8Descriptor, NewJsonDecoder, NewJsonEncode, NewListDescriptor, NewMapDescriptor, NewRefDescriptor, NewStringDescriptor, NewSyncDescriptor, NewTimeDescriptor, NewUint16Descriptor, NewUint32Descriptor, NewUint64Descriptor, NewUint8Descriptor, type Option, Reader, RecordEntry, RefDescriptor, type Request, type RequestType, type ResponseType, Result, RpcType, Server, type ServerOption, ShortBufferError, StringDescriptor, SyncDescriptor, TimeDescriptor, Type, Uint16Descriptor, Uint32Descriptor, Uint64Descriptor, Uint8Descriptor, Unmarshal, WebSocketClient, type WebSocketClientOption, WebSocketData, Writer, convertArray, convertRecord, _default as default, formatDate, isArray, isData, isHData, isRecord, waiting };
