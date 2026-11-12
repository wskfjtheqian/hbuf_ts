import {FetchClient, HttpClient} from "./hrpc/http";
import {WebSocketClient, WebSocketData} from "./hrpc/websocket";
import {installRpcDevtools} from "./hrpc/devtools";
import {
    Client,
    Error,
    NewHBufDecoder,
    NewHBufEncode,
    NewJsonDecoder,
    NewJsonEncode,
    Result,
    Server,
} from "./hrpc/rpc";
import {
    BoolDescriptor,
    BytesDescriptor,
    DataDescriptor,
    DecimalDescriptor,
    DoubleDescriptor,
    FloatDescriptor,
    Int8Descriptor,
    Int16Descriptor,
    Int32Descriptor,
    Int64Descriptor,
    ListDescriptor,
    MapDescriptor,
    RefDescriptor,
    StringDescriptor,
    TimeDescriptor,
    Uint8Descriptor,
    Uint16Descriptor,
    Uint32Descriptor,
    Uint64Descriptor,
} from "./hbuf/descriptor";
import {
    convertArray,
    convertRecord,
    formatDate,
    formatDuration,
    isArray,
    isData,
    isRecord,
    RecordEntry,
    waiting,
    traceId, convertMap
} from "./utils/tools";

export {
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error,
    NewJsonDecoder,
    NewJsonEncode,
    NewHBufDecoder,
    NewHBufEncode,
    WebSocketData,
    installRpcDevtools,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    convertMap,
    isRecord,
    isArray,
    formatDate,
    formatDuration,
    isData,
    traceId,
    Int8Descriptor,
    Int16Descriptor,
    Int32Descriptor,
    Int64Descriptor,
    Uint8Descriptor,
    Uint16Descriptor,
    Uint32Descriptor,
    Uint64Descriptor,
    FloatDescriptor,
    DoubleDescriptor,
    BoolDescriptor,
    StringDescriptor,
    BytesDescriptor,
    TimeDescriptor,
    DecimalDescriptor,
    ListDescriptor,
    MapDescriptor,
    DataDescriptor,
    RefDescriptor,
};

export default {
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error,
    NewJsonDecoder,
    NewJsonEncode,
    NewHBufDecoder,
    NewHBufEncode,
    WebSocketData,
    installRpcDevtools,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    convertMap,
    traceId,
    isRecord,
    isArray,
    formatDate,
    formatDuration,
    isData,
    Int8Descriptor,
    Int16Descriptor,
    Int32Descriptor,
    Int64Descriptor,
    Uint8Descriptor,
    Uint16Descriptor,
    Uint32Descriptor,
    Uint64Descriptor,
    FloatDescriptor,
    DoubleDescriptor,
    BoolDescriptor,
    StringDescriptor,
    BytesDescriptor,
    TimeDescriptor,
    DecimalDescriptor,
    ListDescriptor,
    MapDescriptor,
    DataDescriptor,
    RefDescriptor,
}


// ===== type exports =====
export type {
    BufferType,
    RequestType,
    ResponseType,
    Option,
    Handler,
    HandlerMiddleware,
    Encoder,
    Decoder,
    Request,
    Method,
    ClientOption,
    ServerOption,
} from "./hrpc/rpc";

export type {
    HbufRpcLogEntry,
} from "./hrpc/devtools";

export type {
    RpcType,
    WebSocketClientOption,
} from "./hrpc/websocket";

export type {
    HData,
} from "./hbuf/data";

export type {
    Descriptor,
    FieldDesc,
} from "./hbuf/descriptor";

export {
    Type,
    Marshal,
    Unmarshal,
    Writer,
    Reader,
    HBufError,
    ShortBufferError,
    isHData,
} from "./hbuf/data";
