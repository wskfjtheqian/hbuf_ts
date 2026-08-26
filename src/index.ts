import {FetchClient, HttpClient} from "./hrpc/http";
import {WebSocketClient, WebSocketData} from "./hrpc/websocket";
import {Client, Error, NewJsonDecoder, NewJsonEncode, Result, Server} from "./hrpc/rpc";
import {Data} from "./hbuf/data";
import {convertArray, convertRecord, formatDate, isArray, isData, isRecord, RecordEntry, waiting, traceId} from "./utils/tools";


export {
    Data,
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error,
    NewJsonDecoder,
    NewJsonEncode,
    WebSocketData,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    isRecord,
    isArray,
    formatDate,
    isData,
    traceId,
};

export default {
    Data,
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error,
    NewJsonDecoder,
    NewJsonEncode,
    WebSocketData,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    isRecord,
    isArray,
    formatDate,
    isData,
    traceId,
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
    RpcType,
    WebSocketClientOption,
} from "./hrpc/websocket";

export type {
    FromMap,
    Descriptor,
} from "./hbuf/data";


