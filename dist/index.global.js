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
    Client: () => Client,
    Data: () => Data,
    Error: () => Error2,
    FetchClient: () => FetchClient,
    HttpClient: () => HttpClient,
    NewJsonDecoder: () => NewJsonDecoder,
    NewJsonEncode: () => NewJsonEncode,
    RecordEntry: () => RecordEntry,
    Result: () => Result,
    Server: () => Server,
    WebSocketClient: () => WebSocketClient,
    WebSocketData: () => WebSocketData,
    convertArray: () => convertArray,
    convertRecord: () => convertRecord,
    default: () => index_default,
    formatDate: () => formatDate,
    isArray: () => isArray,
    isData: () => isData,
    isRecord: () => isRecord,
    waiting: () => waiting
  });

  // src/hbuf/data.ts
  var Data = class {
  };

  // src/hrpc/rpc.ts
  var Error2 = class extends Data {
    constructor(code, msg) {
      super();
      this.code = code;
      this.msg = msg;
    }
    toMap(tag) {
      return this;
    }
  };
  var Result = class _Result extends Error2 {
    constructor(code, msg, data, from) {
      super(code, msg);
      this.data = data;
      this.from = from;
    }
    toMap(tag) {
      return {
        ...super.toMap(tag),
        data: this.data?.toMap(tag)
      };
    }
    fromMap(map, tag) {
      return new _Result(
        map.code,
        map.msg,
        map.data && this.from?.call(this, map.data, tag)
      );
    }
  };
  function NewJsonDecoder() {
    const decoder = new TextDecoder("utf-8");
    return (buffer, from, tag) => {
      const str = decoder.decode(buffer);
      return from(JSON.parse(str), tag);
    };
  }
  function NewJsonEncode() {
    const encoder = new TextEncoder();
    return (v, tag) => {
      const str = JSON.stringify(v.toMap(tag));
      return encoder.encode(str).buffer;
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
    invoke(id, name, method, tag, request, from) {
      name = name.replace(/^\/+|\/+$/g, "") + "/";
      return this.middleware(async (req, opt) => {
        const result = new Result(0, "ok", void 0, from);
        const resp = await this.request(name + method, from == null, req, tag, from && result.fromMap.bind(result), opt);
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
      const val = !method.from ? req : method.from(req, method.tag?.length > 0 ? "I" + method.tag : "");
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
    async request(path, notification, req, tag, from, opt) {
      const body = isData(req) ? this.encode(req, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req;
      const resp = await this.fetch(path, body, opt);
      if (from) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, from, tag);
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
    async request(path, notification, req, tag, from, opt) {
      const body = isData(req) ? this.encode(req, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req;
      const resp = await this.fetch(path, body, opt);
      if (from) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, from, tag);
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
    toMap(tag) {
      return {
        type: this.type,
        header: this.header,
        id: this.id?.toString(),
        path: this.path,
        status: this.status,
        data: this.data
      };
    }
    static fromMap(map, tag) {
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
    async request(path, notification, req, tag, from, opt) {
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
      const body = this.encode(data, (tag?.length ?? 0) > 0 ? "I" + tag : "");
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
        return from(data.data, tag);
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
      const response = this.decode(buffer, WebSocketData.fromMap, "");
      if (response.type == 1 /* Response */) {
        if (response.status == 200) {
          this.requestMap.get(response.id)?.resolve(response);
        } else {
          this.requestMap.get(response.id)?.reject(`Error: ${response.status}`);
        }
      } else if (response.type == 3 /* Ping */) {
        const data = new WebSocketData(4 /* Pong */);
        this.socket?.send(this.encode(data, ""));
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
      this.socket?.send(this.encode(data, (request.path?.length ?? 0) > 0 ? "I" + request.path : ""));
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
        this.socket.send(this.encode(data, ""));
        this.headTimeout = true;
      }
    }
  };

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
    WebSocketData,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    isRecord,
    isArray,
    formatDate,
    isData
  };
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map