"use strict";
var hbuf = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BoolDescriptor: () => BoolDescriptor,
    BytesDescriptor: () => BytesDescriptor,
    Client: () => Client,
    Data: () => Data,
    DataDescriptor: () => DataDescriptor,
    DecimalDescriptor: () => DecimalDescriptor,
    DoubleDescriptor: () => DoubleDescriptor,
    Error: () => Error2,
    FetchClient: () => FetchClient,
    FloatDescriptor: () => FloatDescriptor,
    HBufError: () => HBufError,
    HttpClient: () => HttpClient,
    Int16Descriptor: () => Int16Descriptor,
    Int32Descriptor: () => Int32Descriptor,
    Int64Descriptor: () => Int64Descriptor,
    Int8Descriptor: () => Int8Descriptor,
    ListDescriptor: () => ListDescriptor,
    MapDescriptor: () => MapDescriptor,
    Marshal: () => Marshal,
    NewBoolDescriptor: () => NewBoolDescriptor,
    NewBytesDescriptor: () => NewBytesDescriptor,
    NewDataDescriptor: () => NewDataDescriptor,
    NewDecimalDescriptor: () => NewDecimalDescriptor,
    NewDoubleDescriptor: () => NewDoubleDescriptor,
    NewFloatDescriptor: () => NewFloatDescriptor,
    NewHBufDecoder: () => NewHBufDecoder,
    NewHBufEncode: () => NewHBufEncode,
    NewInt16Descriptor: () => NewInt16Descriptor,
    NewInt32Descriptor: () => NewInt32Descriptor,
    NewInt64Descriptor: () => NewInt64Descriptor,
    NewInt8Descriptor: () => NewInt8Descriptor,
    NewJsonDecoder: () => NewJsonDecoder,
    NewJsonEncode: () => NewJsonEncode,
    NewListDescriptor: () => NewListDescriptor,
    NewMapDescriptor: () => NewMapDescriptor,
    NewRefDescriptor: () => NewRefDescriptor,
    NewStringDescriptor: () => NewStringDescriptor,
    NewSyncDescriptor: () => NewSyncDescriptor,
    NewTimeDescriptor: () => NewTimeDescriptor,
    NewUint16Descriptor: () => NewUint16Descriptor,
    NewUint32Descriptor: () => NewUint32Descriptor,
    NewUint64Descriptor: () => NewUint64Descriptor,
    NewUint8Descriptor: () => NewUint8Descriptor,
    Reader: () => Reader2,
    RecordEntry: () => RecordEntry,
    RefDescriptor: () => RefDescriptor,
    Result: () => Result,
    Server: () => Server,
    ShortBufferError: () => ShortBufferError,
    StringDescriptor: () => StringDescriptor,
    SyncDescriptor: () => SyncDescriptor,
    TimeDescriptor: () => TimeDescriptor,
    Type: () => Type,
    Uint16Descriptor: () => Uint16Descriptor,
    Uint32Descriptor: () => Uint32Descriptor,
    Uint64Descriptor: () => Uint64Descriptor,
    Uint8Descriptor: () => Uint8Descriptor,
    Unmarshal: () => Unmarshal,
    WebSocketClient: () => WebSocketClient,
    WebSocketData: () => WebSocketData,
    Writer: () => Writer,
    convertArray: () => convertArray,
    convertRecord: () => convertRecord,
    default: () => index_default,
    formatDate: () => formatDate,
    isArray: () => isArray,
    isData: () => isData,
    isHData: () => isHData,
    isRecord: () => isRecord,
    traceId: () => traceId,
    waiting: () => waiting
  });

  // src/hbuf/decoder.ts
  function DecodeType(reader) {
    const b = reader.readByte();
    return {
      typ: b >> 5 & 7,
      valueLen: (b >> 2 & 7) + 1,
      idLen: b & 3
    };
  }
  function DecodeId(reader, idLen) {
    switch (idLen) {
      case 0:
        return 0;
      case 1:
        return reader.readByte();
      case 2:
        return reader.readByte() | reader.readByte() << 8;
    }
    throw new ShortBufferError();
  }
  function DecodeInt64(reader, valueLen) {
    if (valueLen === 0 || valueLen > 8) {
      throw new ShortBufferError();
    }
    let val = 0n;
    for (let i = 0; i < valueLen; i++) {
      val |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    return BigInt.asIntN(valueLen * 8, val);
  }
  function DecodeUint64(reader, valueLen) {
    if (valueLen === 0 || valueLen > 8) {
      throw new ShortBufferError();
    }
    let val = 0n;
    for (let i = 0; i < valueLen; i++) {
      val |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    return val;
  }
  function DecodeTime(reader) {
    let low64 = 0n;
    for (let i = 0; i < 8; i++) {
      low64 |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    const high8 = BigInt(reader.readByte());
    const nsec = Number(low64 & 0x3FFFFFFFn);
    const secs = high8 << 34n | low64 >> 30n;
    return { secs, nsec };
  }
  function SkipValue(reader, typ, valueLen) {
    switch (typ) {
      case 0 /* TInt */:
      case 1 /* TUint */:
      case 2 /* TFloat */:
        reader.readBytes(valueLen);
        return;
      case 3 /* TBool */:
        return;
      case 4 /* TBytes */: {
        const size = DecodeUint64(reader, valueLen);
        reader.readBytes(Number(size));
        return;
      }
      case 5 /* TList */: {
        const count = DecodeUint64(reader, valueLen);
        for (let i = 0n; i < count; i++) {
          const { typ: elemTyp, idLen: elemIdLen, valueLen: elemValLen } = DecodeType(reader);
          if (elemIdLen === 1) {
            SkipValue(reader, elemTyp, elemValLen);
          }
        }
        return;
      }
      case 6 /* TMap */: {
        const count = DecodeUint64(reader, valueLen);
        for (let i = 0n; i < count; i++) {
          const k = DecodeType(reader);
          if (k.idLen === 1) {
            SkipValue(reader, k.typ, k.valueLen);
          }
          const v = DecodeType(reader);
          if (v.idLen === 1) {
            SkipValue(reader, v.typ, v.valueLen);
          }
        }
        return;
      }
      case 7 /* TData */: {
        SkipDataBody(reader, valueLen);
        const { idLen: eIdLen, valueLen: eValLen } = DecodeType(reader);
        if (eIdLen === 0) {
          return;
        }
        SkipDataBody(reader, eValLen);
        return;
      }
    }
    throw new HBufError("hbuf: unknown type");
  }
  function SkipDataBody(reader, valueLen) {
    const count = DecodeUint64(reader, valueLen);
    for (let i = 0n; i < count; i++) {
      const { typ, idLen, valueLen: vLen } = DecodeType(reader);
      if (idLen > 0) {
        reader.readBytes(idLen);
        SkipValue(reader, typ, vLen);
      }
    }
  }

  // src/hbuf/data.ts
  var Type = /* @__PURE__ */ ((Type2) => {
    Type2[Type2["TInt"] = 0] = "TInt";
    Type2[Type2["TUint"] = 1] = "TUint";
    Type2[Type2["TFloat"] = 2] = "TFloat";
    Type2[Type2["TBool"] = 3] = "TBool";
    Type2[Type2["TBytes"] = 4] = "TBytes";
    Type2[Type2["TList"] = 5] = "TList";
    Type2[Type2["TMap"] = 6] = "TMap";
    Type2[Type2["TData"] = 7] = "TData";
    return Type2;
  })(Type || {});
  var HBufError = class extends Error {
    constructor(msg) {
      super(msg);
      this.name = "HBufError";
    }
  };
  var ShortBufferError = class extends HBufError {
    constructor(msg = "hbuf: short buffer") {
      super(msg);
      this.name = "ShortBufferError";
    }
  };
  var Writer = class {
    constructor(capacity = 128) {
      this.len = 0;
      this.buf = new Uint8Array(capacity);
    }
    get length() {
      return this.len;
    }
    ensure(extra) {
      if (this.len + extra <= this.buf.length) {
        return;
      }
      let cap = this.buf.length * 2;
      while (cap < this.len + extra) {
        cap *= 2;
      }
      const next = new Uint8Array(cap);
      next.set(this.buf.subarray(0, this.len));
      this.buf = next;
    }
    writeByte(v) {
      this.ensure(1);
      this.buf[this.len++] = v;
    }
    writeBytes(b) {
      this.ensure(b.length);
      this.buf.set(b, this.len);
      this.len += b.length;
    }
    /** 返回已写入字节的视图（与内部缓冲共享，仅有效至下一次写入前）。 */
    toUint8Array() {
      return this.buf.subarray(0, this.len);
    }
  };
  var Reader2 = class {
    constructor(buf) {
      this.pos = 0;
      this.buf = buf;
    }
    get position() {
      return this.pos;
    }
    get remaining() {
      return this.buf.length - this.pos;
    }
    readByte() {
      if (this.pos >= this.buf.length) {
        throw new ShortBufferError();
      }
      return this.buf[this.pos++];
    }
    readBytes(n) {
      if (this.remaining < n) {
        throw new ShortBufferError();
      }
      const ret = this.buf.subarray(this.pos, this.pos + n);
      this.pos += n;
      return ret;
    }
  };
  function Marshal(data) {
    const buf = new Writer(128);
    data.descriptors().encode(buf, data, void 0);
    return buf.toUint8Array();
  }
  function Unmarshal(buf, data) {
    if (buf.length === 0) {
      return;
    }
    const reader = new Reader2(buf);
    const { typ, valueLen } = DecodeType(reader);
    data.descriptors().decode(reader, typ, true, valueLen, data);
  }
  var Data = class {
  };
  function isHData(obj) {
    return obj && typeof obj.descriptors === "function";
  }

  // src/hrpc/rpc.ts
  var Error2 = class extends Data {
    constructor(code, msg) {
      super();
      this.code = code;
      this.msg = msg;
    }
    toMap() {
      return this;
    }
  };
  var Result = class _Result extends Error2 {
    constructor(code, msg, data, from) {
      super(code, msg);
      this.data = data;
      this.from = from;
    }
    toMap() {
      return {
        ...super.toMap(),
        data: this.data?.toMap()
      };
    }
    fromMap(map) {
      return new _Result(
        map.code,
        map.msg,
        map.data && this.from?.call(this, map.data)
      );
    }
  };
  function NewJsonDecoder() {
    const decoder = new TextDecoder("utf-8");
    return (buffer, from) => {
      const str = decoder.decode(buffer);
      return from(JSON.parse(str));
    };
  }
  function NewJsonEncode() {
    const encoder = new TextEncoder();
    return (v) => {
      const str = JSON.stringify(v.toMap());
      return encoder.encode(str).buffer;
    };
  }
  function NewHBufEncode() {
    return (v) => {
      return Marshal(v).slice().buffer;
    };
  }
  function NewHBufDecoder() {
    return (buffer, from) => {
      const data = from({});
      Unmarshal(new Uint8Array(buffer), data);
      return data;
    };
  }
  var Client = class {
    constructor(request, option) {
      this.request = request;
      this.middleware = (next) => {
        for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
          next = option.middleware[i](next);
        }
        return next;
      };
    }
    invoke(id, name, method, request, from) {
      name = name.replace(/^\/+|\/+$/g, "") + "/";
      return this.middleware(async (req, opt) => {
        const result = new Result(0, "ok", void 0, from);
        const resp = await this.request(name + method, from == null, req, from && result.fromMap.bind(result), opt);
        if (from) {
          if (resp.code !== 0) {
            throw resp;
          }
          return resp.data;
        }
        return resp;
      })(request, { method, headers: new Headers() });
    }
  };
  var Server = class {
    constructor(option) {
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
      this.methods = {};
      this.middleware = (next) => {
        for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
          next = option.middleware[i](next);
        }
        return next;
      };
    }
    register(id, name, methods) {
      name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
      for (const method of methods) {
        const key = method.name.replace(/|\/+$/g, "");
        this.methods[name + key] = method;
      }
    }
    unRegister(id, name) {
      name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
      for (const key in this.methods) {
        if (key.startsWith(name)) {
          delete this.methods[key];
        }
      }
    }
    async response(path, req) {
      const method = this.methods[path];
      if (!method) {
        throw new Error2(-1, "Method not found");
      }
      const val = !method.from ? req : method.from(req);
      return await this.middleware(method.handler)(val);
    }
  };

  // src/utils/tools.ts
  async function waiting(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), Math.max(time, 0));
    });
  }
  function convertArray(list, call) {
    if (null == list) {
      return null;
    }
    let ret = new Array(list.length);
    for (const key in list) {
      ret[key] = call(list[key]);
    }
    return ret;
  }
  var RecordEntry = class {
    get val() {
      return this._val;
    }
    get key() {
      return this._key;
    }
    constructor(key, val) {
      this._key = key;
      this._val = val;
    }
  };
  function convertRecord(record, call) {
    if (null == record) {
      return null;
    }
    let ret = {};
    for (const key in record) {
      let val = call(key, record[key]);
      ret[val.key] = val.val;
    }
    return ret;
  }
  function isRecord(o) {
    return Object.getPrototypeOf({}) === Object.getPrototypeOf(o);
  }
  function isArray(o) {
    return Object.getPrototypeOf([]) === Object.getPrototypeOf(o);
  }
  function formatDate(date, format) {
    if (!format) format = "YYYY-MM-DD";
    switch (typeof date) {
      case "string":
        date = new Date(date.replace(/-/g, "/"));
        break;
      case "number":
        date = new Date(date);
        break;
    }
    if (date instanceof Date) {
      const dict = {
        YYYY: date.getFullYear(),
        M: date.getMonth() + 1,
        D: date.getDate(),
        H: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds(),
        S: date.getMilliseconds(),
        MM: ("" + (date.getMonth() + 101)).substring(1),
        DD: ("" + (date.getDate() + 100)).substring(1),
        HH: ("" + (date.getHours() + 100)).substring(1),
        mm: ("" + (date.getMinutes() + 100)).substring(1),
        ss: ("" + (date.getSeconds() + 100)).substring(1),
        SS: ("" + (date.getMilliseconds() + 100)).substring(1)
      };
      return format.replace(/(YYYY|MM?|DD?|HH?|ss?|mm?|SS?)/g, function() {
        return dict[arguments[0]];
      });
    }
    return "" + date;
  }
  function isData(obj) {
    return obj && typeof obj.toMap === "function";
  }
  var BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function traceId() {
    const milli = BigInt(Date.now());
    const randBuf = new Uint8Array(9);
    window.crypto.getRandomValues(randBuf);
    let random65 = 0n;
    for (let i = 0; i < 9; i++) {
      random65 = random65 << 8n | BigInt(randBuf[i]);
    }
    random65 = random65 & (1n << 65n) - 1n;
    let num = milli << 65n | random65;
    const result = new Array(18);
    const target = 62n;
    for (let i = 17; i >= 0; i--) {
      const rem = num % target;
      num = num / target;
      result[i] = BASE62_CHARS[Number(rem)];
    }
    return result.join("");
  }

  // src/hrpc/http.ts
  var HttpClient = class {
    constructor(base, option) {
      this.base = base.replace(/^\/+|\/+$/g, "") + "/";
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, from, opt) {
      const body = isData(req) ? this.encode(req) : req;
      const resp = await this.fetch(path, body, opt);
      if (from) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, from);
      } else {
        return resp;
      }
    }
    async fetch(path, body, opt) {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", this.base + path);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("X-Trace-Id", opt?.traceId ?? traceId());
      xhr.send(body);
      return new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => {
          reject(new Error("Network Error"));
        };
      });
    }
  };
  var FetchClient = class {
    constructor(base, option) {
      this.base = base.replace(/^\/+|\/+$/g, "") + "/";
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, from, opt) {
      const body = isData(req) ? this.encode(req) : req;
      const resp = await this.fetch(path, body, opt);
      if (from) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, from);
      } else {
        return resp;
      }
    }
    async fetch(path, body, opt) {
      const headers = opt?.headers ?? new Headers();
      headers.append("X-Trace-Id", opt?.traceId ?? traceId());
      const res = await fetch(this.base + path, {
        method: "POST",
        body,
        headers
      });
      if (res.ok) {
        return res.arrayBuffer();
      } else {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
    }
  };

  // src/hrpc/websocket.ts
  var WebSocketData = class _WebSocketData {
    constructor(type, id, path, data) {
      this.type = type;
      this.id = id;
      this.path = path;
    }
    toMap() {
      return {
        type: this.type,
        header: this.header,
        id: this.id?.toString(),
        path: this.path,
        status: this.status,
        data: this.data
      };
    }
    static fromMap(map) {
      const ret = new _WebSocketData(
        map.type,
        map.id === void 0 ? void 0 : BigInt(map.id),
        map.path
      );
      ret.header = map.header;
      ret.status = map.status;
      ret.data = map.data;
      return ret;
    }
  };
  var FetchPromise = class {
    constructor(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }
  };
  var WebSocketClient = class {
    constructor(baseUrl, server, option) {
      this.requestId = 0n;
      this.requestMap = /* @__PURE__ */ new Map();
      this.readTimeout = 3e4;
      this.heartbeat = 3e4;
      this.interval = null;
      this.headTimeout = false;
      this.baseUrl = baseUrl;
      this.server = server;
      this.readTimeout = option?.readTimeout ?? 3e4;
      this.heartbeat = option?.heartbeat ?? 3e4;
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, from, opt) {
      this.requestId++;
      let data = new WebSocketData(
        notification ? 2 /* Notification */ : 0 /* Request */,
        this.requestId,
        path
      );
      if (opt?.headers) {
        data.header = {};
        opt.headers.forEach((value, key, parent) => {
          data.header[key] = (data.header[key] || []).concat(value);
        });
      }
      if (req instanceof Blob) {
        req = await req.arrayBuffer();
      }
      data.data = req;
      const body = this.encode(data);
      const promise = new Promise((resolve, reject) => {
        let promise2 = new FetchPromise((value) => {
          if (this.requestMap.delete(data.id)) {
            resolve(value);
          }
        }, (e) => {
          if (this.requestMap.delete(data.id)) {
            reject(e);
          }
        });
        if (!notification) {
          setTimeout(() => {
            reject("timeout");
          }, this.readTimeout);
          this.requestMap.set(data.id, promise2);
        }
      });
      this.socket?.send(body);
      if (notification) {
        return;
      }
      data = await promise;
      if (from) {
        return from(data.data);
      }
      return data.data;
    }
    connect(protocols) {
      let url = this.baseUrl;
      return new Promise((resolve, r) => {
        let reject = r;
        clearInterval(this.interval ?? 0);
        try {
          this.socket = new WebSocket(url, protocols);
          this.socket.onclose = (event) => {
            clearInterval(this.interval ?? 0);
            this.onclose?.call(this, event.reason);
          };
          this.socket.onerror = (event) => {
            reject?.call(this, event);
            reject = null;
          };
          this.socket.onmessage = async (event) => {
            try {
              let data = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
              await this.onMessage(data);
            } catch (e) {
              if (e != "Method not found") {
                console.log(e);
              }
            }
          };
          this.socket.onopen = (event) => {
            this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat);
            resolve();
          };
        } catch (e) {
          reject?.call(this, e);
          reject = null;
        }
      });
    }
    close() {
      clearInterval(this.interval ?? 0);
      this.socket?.close();
    }
    async onMessage(buffer) {
      this.headTimeout = false;
      const response = this.decode(buffer, WebSocketData.fromMap);
      if (response.type == 1 /* Response */) {
        if (response.status == 200) {
          this.requestMap.get(response.id)?.resolve(response);
        } else {
          this.requestMap.get(response.id)?.reject(`Error: ${response.status}`);
        }
      } else if (response.type == 3 /* Ping */) {
        const data = new WebSocketData(4 /* Pong */);
        this.socket?.send(this.encode(data));
      } else if (response.type == 0 /* Request */ || response.type == 2 /* Notification */) {
        await this.onRequest(response, response.type == 2 /* Notification */);
      }
    }
    async onRequest(request, broadcast) {
      if (broadcast) {
        this.server?.response(request.path, request.data);
        return;
      }
      let data = new WebSocketData(
        1 /* Response */,
        request.id,
        request.path
      );
      if (this.server) {
        let resp = await this.server?.response(request.path, request.data);
        if (resp instanceof Blob) {
          resp = await resp.arrayBuffer();
        }
        data.data = resp;
      } else {
        data.status = 404;
      }
      this.socket?.send(this.encode(data));
    }
    onHeartbeat() {
      if (this.socket?.OPEN) {
        if (this.headTimeout) {
          this.socket.close();
          clearInterval(this.interval ?? 0);
          this.onclose?.call(this, "timeout");
          return;
        }
        const data = new WebSocketData(3 /* Ping */);
        this.socket.send(this.encode(data));
        this.headTimeout = true;
      }
    }
  };

  // src/hbuf/encoder.ts
  function WriterType(buf, typ, idLen, valueLen) {
    buf.writeByte((typ & 7) << 5 | (valueLen - 1 & 7) << 2 | idLen & 3);
  }
  function LengthId(id) {
    return id <= 255 ? 1 : 2;
  }
  function WriterId(buf, id) {
    if (id <= 255) {
      buf.writeByte(id);
    } else {
      buf.writeByte(id & 255);
      buf.writeByte(id >> 8 & 255);
    }
  }
  function LengthInt(v) {
    if (v >= -0x80n && v < 0x80n) {
      return 1;
    } else if (v >= -0x8000n && v < 0x8000n) {
      return 2;
    } else if (v >= -0x800000n && v < 0x800000n) {
      return 3;
    } else if (v >= -0x80000000n && v < 0x80000000n) {
      return 4;
    } else if (v >= -0x8000000000n && v < 0x8000000000n) {
      return 5;
    } else if (v >= -0x800000000000n && v < 0x800000000000n) {
      return 6;
    } else if (v >= -0x80000000000000n && v < 0x80000000000000n) {
      return 7;
    } else {
      return 8;
    }
  }
  function LengthUint(v) {
    if (v <= 0xFFn) {
      return 1;
    } else if (v <= 0xFFFFn) {
      return 2;
    } else if (v <= 0xFFFFFFn) {
      return 3;
    } else if (v <= 0xFFFFFFFFn) {
      return 4;
    } else if (v <= 0xFFFFFFFFFFn) {
      return 5;
    } else if (v <= 0xFFFFFFFFFFFFn) {
      return 6;
    } else if (v <= 0xFFFFFFFFFFFFFFn) {
      return 7;
    } else {
      return 8;
    }
  }
  function WriterInt64(buf, v) {
    const len = LengthInt(v);
    let val = BigInt.asIntN(len * 8, v);
    for (let i = 0; i < len; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
  }
  function EncodeUint64(buf, v) {
    const len = LengthUint(v);
    let val = v;
    for (let i = 0; i < len; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
  }
  function EncodeTime(buf, secs, nsec) {
    const low64 = (secs & 0x3FFFFFFFFn) << 30n | BigInt(nsec) & 0x3FFFFFFFn;
    const high8 = Number(secs >> 34n);
    let val = low64;
    for (let i = 0; i < 8; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
    buf.writeByte(high8);
  }

  // src/hbuf/descriptor.ts
  var utf8Encoder = new TextEncoder();
  var utf8Decoder = new TextDecoder("utf-8");
  function utf8Encode(str) {
    return utf8Encoder.encode(str);
  }
  function utf8Decode(b) {
    return utf8Decoder.decode(b);
  }
  var f32View = new Float32Array(1);
  var f32Bits = new Uint32Array(f32View.buffer);
  var f64View = new Float64Array(1);
  var f64Bits = new BigUint64Array(f64View.buffer);
  function Float32Bits(v) {
    f32View[0] = v;
    return BigInt(f32Bits[0]);
  }
  function Float32FromBits(b) {
    f32Bits[0] = Number(b & 0xFFFFFFFFn);
    return f32View[0];
  }
  function Float64Bits(v) {
    f64View[0] = v;
    return f64Bits[0];
  }
  function Float64FromBits(b) {
    f64Bits[0] = b;
    return f64View[0];
  }
  function DateToTime(v) {
    const ms = v.getTime();
    return {
      secs: BigInt(Math.floor(ms / 1e3)),
      nsec: ms % 1e3 * 1e6
    };
  }
  function TimeToDate(secs, nsec) {
    return new Date(Number(secs) * 1e3 + Math.floor(nsec / 1e6));
  }
  var IntBase = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    /** 元素零值空标记的 idLen（uint8 特例为 2）。 */
    emptyIdLen() {
      return 0;
    }
    isEmptyField(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === this.zero();
    }
    isEmpty(v) {
      return this.isEmptyField(v);
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmptyField(v)) {
          return;
        }
        const val = this.toBigInt(v);
        WriterType(buf, this.typ(), LengthId(id), this.length(val));
        WriterId(buf, id);
        this.writeValue(buf, val);
      } else {
        if (v == null) {
          WriterType(buf, this.typ(), this.isPtr ? 0 : this.emptyIdLen(), 1);
          return;
        }
        const val = this.toBigInt(v);
        if (val === 0n) {
          WriterType(buf, this.typ(), this.emptyIdLen(), 1);
          return;
        }
        WriterType(buf, this.typ(), 1, this.length(val));
        this.writeValue(buf, val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? 1n : 0n;
          break;
        case 0 /* TInt */:
          val = valRead ? DecodeInt64(r, valueLen) : 0n;
          break;
        case 1 /* TUint */:
          val = valRead ? DecodeUint64(r, valueLen) : 0n;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = 0n;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = BigInt(Math.trunc(valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)));
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = 0n;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = BigInt(utf8Decode(r.readBytes(Number(size))));
          break;
        }
        default:
          throw new HBufError("invalid int type");
      }
      return this.fromBigInt(val);
    }
  };
  var SignedInt = class extends IntBase {
    constructor(isPtr, bits) {
      super(isPtr);
      this.bits = bits;
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    typ() {
      return 0 /* TInt */;
    }
    length(v) {
      return LengthInt(v);
    }
    writeValue(buf, v) {
      WriterInt64(buf, v);
    }
    toBigInt(v) {
      return BigInt.asIntN(this.bits, BigInt(v));
    }
    fromBigInt(v) {
      return Number(BigInt.asIntN(this.bits, v));
    }
  };
  var SignedLong = class extends IntBase {
    constructor(isPtr) {
      super(isPtr);
    }
    zero() {
      return this.isPtr ? null : 0n;
    }
    typ() {
      return 0 /* TInt */;
    }
    length(v) {
      return LengthInt(v);
    }
    writeValue(buf, v) {
      WriterInt64(buf, v);
    }
    toBigInt(v) {
      return typeof v === "bigint" ? v : BigInt(v);
    }
    fromBigInt(v) {
      return BigInt.asIntN(64, v);
    }
  };
  var UnsignedInt = class extends IntBase {
    constructor(isPtr, bits) {
      super(isPtr);
      this.bits = bits;
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    typ() {
      return 1 /* TUint */;
    }
    length(v) {
      return LengthUint(v);
    }
    writeValue(buf, v) {
      EncodeUint64(buf, v);
    }
    toBigInt(v) {
      return BigInt.asUintN(this.bits, BigInt(v));
    }
    fromBigInt(v) {
      return Number(BigInt.asUintN(this.bits, v));
    }
  };
  var UnsignedLong = class extends IntBase {
    constructor(isPtr) {
      super(isPtr);
    }
    zero() {
      return this.isPtr ? null : 0n;
    }
    typ() {
      return 1 /* TUint */;
    }
    length(v) {
      return LengthUint(v);
    }
    writeValue(buf, v) {
      EncodeUint64(buf, v);
    }
    toBigInt(v) {
      return typeof v === "bigint" ? v : BigInt(v);
    }
    fromBigInt(v) {
      return BigInt.asUintN(64, v);
    }
  };
  var Uint8Impl = class extends UnsignedInt {
    constructor(isPtr) {
      super(isPtr, 8);
    }
    emptyIdLen() {
      return 2;
    }
    isEmptyField(v) {
      return v == null || v === 0;
    }
  };
  var Int8Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 8);
    }
  };
  var Int16Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 16);
    }
  };
  var Int32Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 32);
    }
  };
  var Int64Descriptor = class extends SignedLong {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var Uint8Descriptor = class extends Uint8Impl {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var Uint16Descriptor = class extends UnsignedInt {
    constructor(isPtr = false) {
      super(isPtr, 16);
    }
  };
  var Uint32Descriptor = class extends UnsignedInt {
    constructor(isPtr = false) {
      super(isPtr, 32);
    }
  };
  var Uint64Descriptor = class extends UnsignedLong {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var FloatBase = class {
    constructor(isPtr = false, isDouble) {
      this.isPtr = isPtr;
      this.isDouble = isDouble;
    }
    isEmptyField(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === 0;
    }
    isEmpty(v) {
      return this.isEmptyField(v);
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmptyField(v)) {
          return;
        }
        const val = this.toBits(v);
        WriterType(buf, 2 /* TFloat */, LengthId(id), LengthUint(val));
        WriterId(buf, id);
        EncodeUint64(buf, val);
      } else {
        if (v == null) {
          WriterType(buf, 2 /* TFloat */, 0, 1);
          return;
        }
        const val = this.toBits(v);
        if (val === 0n) {
          WriterType(buf, 2 /* TFloat */, 0, 1);
          return;
        }
        WriterType(buf, 2 /* TFloat */, 1, LengthUint(val));
        EncodeUint64(buf, val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? 1 : 0;
          break;
        case 0 /* TInt */:
          val = valRead ? Number(DecodeInt64(r, valueLen)) : 0;
          break;
        case 1 /* TUint */:
          val = valRead ? Number(DecodeUint64(r, valueLen)) : 0;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = 0;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits);
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = 0;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = Number(utf8Decode(r.readBytes(Number(size))));
          break;
        }
        default:
          throw new HBufError("invalid float type");
      }
      return this.isDouble ? val : Math.fround(val);
    }
  };
  var FloatDescriptor = class extends FloatBase {
    constructor(isPtr = false) {
      super(isPtr, false);
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    toBits(v) {
      return Float32Bits(Math.fround(v));
    }
  };
  var DoubleDescriptor = class extends FloatBase {
    constructor(isPtr = false) {
      super(isPtr, true);
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    toBits(v) {
      return Float64Bits(v);
    }
  };
  var BoolDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    zero() {
      return this.isPtr ? null : false;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === false;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null || !this.isPtr && v === false) {
          return;
        }
        WriterType(buf, 3 /* TBool */, LengthId(id), v ? 2 : 1);
        WriterId(buf, id);
      } else {
        if (v == null) {
          WriterType(buf, 3 /* TBool */, 0, 1);
          return;
        }
        WriterType(buf, 3 /* TBool */, 1, v ? 2 : 1);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2;
          break;
        case 0 /* TInt */:
          val = valRead && DecodeInt64(r, valueLen) !== 0n;
          break;
        case 1 /* TUint */:
          val = valRead && DecodeUint64(r, valueLen) !== 0n;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = false;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) !== 0 : Float64FromBits(bits) !== 0;
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = false;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = "true" === utf8Decode(r.readBytes(Number(size))).toLowerCase();
          break;
        }
        default:
          throw new HBufError("invalid bool type");
      }
      return val;
    }
  };
  var StringDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    zero() {
      return this.isPtr ? null : "";
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        const val = utf8Encode(v);
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        const val = utf8Encode(v);
        if (val.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? "true" : "false";
          break;
        case 0 /* TInt */:
          val = valRead ? DecodeInt64(r, valueLen).toString() : "";
          break;
        case 1 /* TUint */:
          val = valRead ? DecodeUint64(r, valueLen).toString() : "";
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = "";
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = (valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString();
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = "";
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = utf8Decode(r.readBytes(Number(size)));
          break;
        }
        default:
          throw new HBufError("invalid string type");
      }
      return val;
    }
  };
  var BytesDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(v.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.length));
        buf.writeBytes(v);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        if (v.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(v.length)));
        EncodeUint64(buf, BigInt(v.length));
        buf.writeBytes(v);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = utf8Encode(valueLen === 2 ? "true" : "false");
          break;
        case 0 /* TInt */:
          val = valRead ? utf8Encode(DecodeInt64(r, valueLen).toString()) : new Uint8Array(0);
          break;
        case 1 /* TUint */:
          val = valRead ? utf8Encode(DecodeUint64(r, valueLen).toString()) : new Uint8Array(0);
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = new Uint8Array(0);
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = utf8Encode((valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString());
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = new Uint8Array(0);
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = r.readBytes(Number(size));
          break;
        }
        default:
          throw new HBufError("invalid bytes type");
      }
      return val;
    }
  };
  var TimeDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        WriterType(buf, 4 /* TBytes */, LengthId(id), 1);
        WriterId(buf, id);
        EncodeUint64(buf, 9n);
        const { secs, nsec } = DateToTime(v);
        EncodeTime(buf, secs, nsec);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, 1);
        EncodeUint64(buf, 9n);
        const { secs, nsec } = DateToTime(v);
        EncodeTime(buf, secs, nsec);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 4 /* TBytes */) {
        throw new HBufError("invalid time type");
      }
      if (!valRead) {
        return null;
      }
      const size = DecodeUint64(r, valueLen);
      if (size !== 9n) {
        throw new HBufError("invalid time type");
      }
      const { secs, nsec } = DecodeTime(r);
      return TimeToDate(secs, nsec);
    }
  };
  var DecimalDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    zero() {
      return this.isPtr ? null : "0";
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && Number(v) === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        const val = utf8Encode(v);
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        const val = utf8Encode(v);
        if (Number(v) === 0 || val.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? "1" : "0";
          break;
        case 0 /* TInt */:
          val = valRead ? DecodeInt64(r, valueLen).toString() : "0";
          break;
        case 1 /* TUint */:
          val = valRead ? DecodeUint64(r, valueLen).toString() : "0";
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = "0";
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = (valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString();
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = "0";
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = utf8Decode(r.readBytes(Number(size)));
          break;
        }
        default:
          throw new HBufError("invalid decimal type");
      }
      return val;
    }
  };
  var ListDescriptor = class {
    constructor(desc, isPtr = false) {
      this.desc = desc;
      this.isPtr = isPtr;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 5 /* TList */, LengthId(id), LengthUint(BigInt(v.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.length));
      } else {
        if (v == null) {
          WriterType(buf, 5 /* TList */, 0, 1);
          return;
        }
        if (v.length === 0) {
          WriterType(buf, 5 /* TList */, 0, 1);
          return;
        }
        WriterType(buf, 5 /* TList */, 1, LengthUint(BigInt(v.length)));
        EncodeUint64(buf, BigInt(v.length));
      }
      for (const item of v) {
        this.desc.encode(buf, item, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 5 /* TList */) {
        throw new HBufError("invalid list type");
      }
      if (!valRead) {
        return void 0;
      }
      const count = DecodeUint64(r, valueLen);
      if (count === 0n) {
        return void 0;
      }
      const list = [];
      for (let i = 0n; i < count; i++) {
        const { typ: t, idLen, valueLen: vLen } = DecodeType(r);
        if (idLen > 0) {
          list.push(this.desc.decode(r, t, idLen === 1, vLen) ?? null);
        } else {
          list.push(this.desc.zero());
        }
      }
      return list;
    }
  };
  var MapDescriptor = class {
    constructor(keyDesc, valueDesc, isPtr = false) {
      this.keyDesc = keyDesc;
      this.valueDesc = valueDesc;
      this.isPtr = isPtr;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.size === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 6 /* TMap */, LengthId(id), LengthUint(BigInt(v.size)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.size));
      } else {
        if (v == null) {
          WriterType(buf, 6 /* TMap */, 0, 1);
          return;
        }
        if (v.size === 0) {
          WriterType(buf, 6 /* TMap */, 0, 1);
          return;
        }
        WriterType(buf, 6 /* TMap */, 1, LengthUint(BigInt(v.size)));
        EncodeUint64(buf, BigInt(v.size));
      }
      for (const [k, val] of v) {
        this.keyDesc.encode(buf, k, void 0);
        this.valueDesc.encode(buf, val, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 6 /* TMap */) {
        throw new HBufError("invalid map type");
      }
      if (!valRead) {
        return void 0;
      }
      const count = DecodeUint64(r, valueLen);
      if (count === 0n) {
        return void 0;
      }
      const m = /* @__PURE__ */ new Map();
      for (let i = 0n; i < count; i++) {
        let { typ: t, idLen, valueLen: vLen } = DecodeType(r);
        const k = idLen > 0 ? this.keyDesc.decode(r, t, idLen === 1, vLen) ?? null : this.keyDesc.zero();
        ({ typ: t, idLen, valueLen: vLen } = DecodeType(r));
        const val = idLen > 0 ? this.valueDesc.decode(r, t, idLen === 1, vLen) ?? null : this.valueDesc.zero();
        m.set(k, val);
      }
      return m;
    }
  };
  var DataDescriptor = class {
    constructor(factory, fields, extends_ = /* @__PURE__ */ new Map(), isPtr = false) {
      this.factory = factory;
      this.isPtr = isPtr;
      this.fields = Array.from(fields, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
      this.fieldMap = fields;
      this.extends_ = Array.from(extends_, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
      this.extendMap = extends_;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        let count = 0;
        for (const f of this.fields) {
          if (!f.desc.isEmpty(f.get(v))) {
            count++;
          }
        }
        WriterType(buf, 7 /* TData */, LengthId(id), LengthUint(BigInt(count)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(count));
      } else {
        if (v == null) {
          if (this.isPtr) {
            WriterType(buf, 7 /* TData */, 0, 1);
          } else {
            WriterType(buf, 7 /* TData */, 1, 1);
            EncodeUint64(buf, 0n);
            WriterType(buf, 0 /* TInt */, 0, 1);
          }
          return;
        }
        let count = 0;
        for (const f of this.fields) {
          if (!f.desc.isEmpty(f.get(v))) {
            count++;
          }
        }
        WriterType(buf, 7 /* TData */, 1, LengthUint(BigInt(count)));
        EncodeUint64(buf, BigInt(count));
      }
      for (const f of this.fields) {
        const val = f.get(v);
        if (!f.desc.isEmpty(val)) {
          f.desc.encode(buf, val, f.id);
        }
      }
      if (this.extends_.length === 0) {
        WriterType(buf, 0 /* TInt */, 0, 1);
      } else {
        WriterType(buf, 0 /* TInt */, 1, LengthUint(BigInt(this.extends_.length)));
        EncodeUint64(buf, BigInt(this.extends_.length));
        for (const f of this.extends_) {
          const val = f.get(v);
          if (!f.desc.isEmpty(val)) {
            f.desc.encode(buf, val, f.id);
          }
        }
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 7 /* TData */) {
        throw new HBufError("invalid data type");
      }
      const v = this.isPtr ? this.factory() : target ?? this.factory();
      const count = valRead ? DecodeUint64(r, valueLen) : 0n;
      for (let i = 0n; i < count; i++) {
        const { typ: t, idLen: idLen2, valueLen: vLen } = DecodeType(r);
        const id = DecodeId(r, idLen2);
        const field = this.fieldMap.get(id);
        if (field) {
          const cur = field.get(v);
          const dv = field.desc.decode(r, t, true, vLen, cur);
          if (dv !== void 0) {
            field.set(v, dv);
          }
        } else {
          SkipValue(r, t, vLen);
        }
      }
      const { idLen, valueLen: eValLen } = DecodeType(r);
      if (idLen > 0) {
        const extCount = DecodeUint64(r, eValLen);
        for (let i = 0n; i < extCount; i++) {
          const { typ: t, idLen: eIdLen, valueLen: eVLen } = DecodeType(r);
          const id = DecodeId(r, eIdLen);
          const field = this.extendMap.get(id);
          if (field) {
            const cur = field.get(v);
            const dv = field.desc.decode(r, t, true, eVLen, cur);
            if (dv !== void 0) {
              field.set(v, dv);
            }
          } else {
            SkipValue(r, t, eVLen);
          }
        }
      }
      if (count === 0n && !this.isPtr && target !== void 0) {
        return void 0;
      }
      return v;
    }
  };
  var RefDescriptor = class {
    constructor(desc, isPtr = false) {
      this.desc = desc;
      this.isPtr = isPtr;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        this.desc.encode(buf, v, id);
      } else {
        if (v == null) {
          if (this.isPtr) {
            WriterType(buf, 7 /* TData */, 0, 1);
          } else {
            this.desc.encode(buf, null, void 0);
          }
          return;
        }
        this.desc.encode(buf, v, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      return this.desc.decode(r, typ, valRead, valueLen, this.isPtr ? void 0 : target);
    }
  };
  var SyncDescriptor = class {
    constructor(f) {
      this.f = f;
    }
    Desc() {
      if (!this.cached) {
        this.cached = this.f();
      }
      return this.cached;
    }
    zero() {
      return this.Desc().zero();
    }
    isEmpty(v) {
      return this.Desc().isEmpty(v);
    }
    encode(buf, v, id) {
      this.Desc().encode(buf, v, id);
    }
    decode(r, typ, valRead, valueLen, target) {
      return this.Desc().decode(r, typ, valRead, valueLen, target);
    }
  };
  function NewDataDescriptor(factory, fields, extends_, isPtr) {
    return new DataDescriptor(factory, fields, extends_ ?? /* @__PURE__ */ new Map(), isPtr ?? false);
  }
  function NewRefDescriptor(desc, isPtr = false) {
    return new RefDescriptor(desc, isPtr);
  }
  function NewListDescriptor(desc, isPtr = false) {
    return new ListDescriptor(desc, isPtr);
  }
  function NewMapDescriptor(keyDesc, valueDesc, isPtr = false) {
    return new MapDescriptor(keyDesc, valueDesc, isPtr);
  }
  function NewInt8Descriptor(isPtr = false) {
    return new Int8Descriptor(isPtr);
  }
  function NewInt16Descriptor(isPtr = false) {
    return new Int16Descriptor(isPtr);
  }
  function NewInt32Descriptor(isPtr = false) {
    return new Int32Descriptor(isPtr);
  }
  function NewInt64Descriptor(isPtr = false) {
    return new Int64Descriptor(isPtr);
  }
  function NewUint8Descriptor(isPtr = false) {
    return new Uint8Descriptor(isPtr);
  }
  function NewUint16Descriptor(isPtr = false) {
    return new Uint16Descriptor(isPtr);
  }
  function NewUint32Descriptor(isPtr = false) {
    return new Uint32Descriptor(isPtr);
  }
  function NewUint64Descriptor(isPtr = false) {
    return new Uint64Descriptor(isPtr);
  }
  function NewFloatDescriptor(isPtr = false) {
    return new FloatDescriptor(isPtr);
  }
  function NewDoubleDescriptor(isPtr = false) {
    return new DoubleDescriptor(isPtr);
  }
  function NewBoolDescriptor(isPtr = false) {
    return new BoolDescriptor(isPtr);
  }
  function NewStringDescriptor(isPtr = false) {
    return new StringDescriptor(isPtr);
  }
  function NewBytesDescriptor(isPtr = false) {
    return new BytesDescriptor(isPtr);
  }
  function NewTimeDescriptor(isPtr = false) {
    return new TimeDescriptor(isPtr);
  }
  function NewDecimalDescriptor(isPtr = false) {
    return new DecimalDescriptor(isPtr);
  }
  function NewSyncDescriptor(f) {
    return new SyncDescriptor(f);
  }

  // src/index.ts
  var index_default = {
    Data,
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error: Error2,
    NewJsonDecoder,
    NewJsonEncode,
    NewHBufDecoder,
    NewHBufEncode,
    WebSocketData,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    isRecord,
    isArray,
    formatDate,
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
    SyncDescriptor,
    NewInt8Descriptor,
    NewInt16Descriptor,
    NewInt32Descriptor,
    NewInt64Descriptor,
    NewUint8Descriptor,
    NewUint16Descriptor,
    NewUint32Descriptor,
    NewUint64Descriptor,
    NewFloatDescriptor,
    NewDoubleDescriptor,
    NewBoolDescriptor,
    NewStringDescriptor,
    NewBytesDescriptor,
    NewTimeDescriptor,
    NewDecimalDescriptor,
    NewListDescriptor,
    NewMapDescriptor,
    NewDataDescriptor,
    NewRefDescriptor,
    NewSyncDescriptor,
    traceId
  };
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map