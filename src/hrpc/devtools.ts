import {isHData} from "../hbuf/data";
import {Client, Error as RpcError, Handler, ResponseType} from "./rpc";

// 一条 RPC 调试记录，会写入 window.__HBUF_RPC_LOG__ 供 Chrome 扩展读取
export interface HbufRpcLogEntry {
    id: number
    ts: number
    transport: string
    path: string
    notification: boolean
    traceId?: string
    req?: any
    resp?: any
    duration?: number
    error?: string
    // reqHeaders 请求头：响应回来后记录（传输层如 FetchClient 会把 X-Trace-Id 等追加进 opt.headers）
    reqHeaders?: Record<string, string>
    // status 请求状态：pending 已发送待响应（next 前写入），done 已收到响应/失败（next 后更新同一条目）
    status: "pending" | "done"
}

declare global {
    interface Window {
        __HBUF_RPC_LOG__?: HbufRpcLogEntry[]
    }
}

const MAX_ENTRIES = 300
let logSeq = 0

function logList(): HbufRpcLogEntry[] {
    const w = globalThis as any
    if (!w.__HBUF_RPC_LOG__) {
        w.__HBUF_RPC_LOG__ = []
    }
    return w.__HBUF_RPC_LOG__
}

function bytesToHex(buf: ArrayBuffer, max = 64): string {
    const u8 = new Uint8Array(buf)
    const n = Math.min(u8.length, max)
    let s = ""
    for (let i = 0; i < n; i++) {
        s += u8[i].toString(16).padStart(2, "0")
    }
    return u8.length > max ? s + "..." : s
}

// 将响应/请求转成可展示结构：HData 走 descriptor.toJson（带字段名）
function toJson(v: any): any {
    if (isHData(v)) {
        try {
            return v.descriptors().toJson(v)
        } catch (e) {
            return {__toJsonError__: String(e)}
        }
    }
    if (v instanceof ArrayBuffer) {
        return {__bytes__: v.byteLength, __hex__: bytesToHex(v)}
    }
    if (v instanceof Blob) {
        return {__blob__: v.size}
    }
    if (v instanceof RpcError) {
        return {code: v.code, msg: v.msg}
    }
    return v ?? null
}

// Headers 实例转普通对象（记录请求头，JSON 可序列化；无内容时返回 undefined）
function headersToRecord(headers?: Headers): Record<string, string> | undefined {
    if (!headers) return undefined
    const out: Record<string, string> = {}
    try {
        headers.forEach((value, key) => {
            out[key] = value
        })
    } catch (e) {
        return undefined
    }
    return Object.keys(out).length > 0 ? out : undefined
}

function dispatchLog(item: HbufRpcLogEntry): void {
    const w = globalThis as any
    if (typeof w.dispatchEvent === "function") {
        // detail 携带单条日志：新增与更新都通知扩展，桥据此即时推送（不等轮询）
        w.dispatchEvent(new CustomEvent("__hbuf_rpc_log__", {detail: item}))
    }
}

// 请求发出时写入 pending 条目（next 之前），返回条目 id；响应回来后用 updateLog 更新同一条目
function pushLog(entry: Omit<HbufRpcLogEntry, "id" | "ts">): number {
    const item: HbufRpcLogEntry = {...entry, id: ++logSeq, ts: Date.now()}
    const list = logList()
    list.unshift(item)
    if (list.length > MAX_ENTRIES) {
        list.length = MAX_ENTRIES
    }
    dispatchLog(item)
    return item.id
}

// 响应回来（或失败）后更新已有条目：只改数据与状态，ts 保持请求发出时刻，列表顺序稳定
function updateLog(id: number, patch: Partial<HbufRpcLogEntry>): void {
    const list = logList()
    const item = list.find((e) => e.id === id)
    if (!item) return
    Object.assign(item, patch)
    dispatchLog(item)
}

/**
 * 安装 RPC 调试埋点：包装 client.middleware，记录所有 invoke 调用到 window.__HBUF_RPC_LOG__。
 * 中间件位于整个中间件链最外层，记录的是含用户中间件处理的总耗时。
 * 返回卸载函数，恢复原始 middleware。
 *
 * @param client    已构造的 Client 实例（HTTP 或 WebSocket 传输均可）
 * @param transport "http" 或 "websocket"，仅用于面板徽标展示
 * @param base      展示用 URL 前缀，如 "http://localhost:8080/api/"；WebSocket 传 ""
 */
export function installRpcDevtools(client: Client, transport: "http" | "websocket", base = ""): () => void {
    const raw = client.middleware.bind(client)
    client.middleware = (next: Handler): Handler => {
        return raw(async (req, opt): Promise<ResponseType> => {
            const start = performance.now()
            // next 之前先写入请求日志（pending），异步响应回来后更新同一条目
            const id = pushLog({
                transport,
                path: base + (opt?.path ?? opt?.method ?? ""),
                notification: opt?.notification ?? false,
                traceId: opt?.traceId,
                req: toJson(req),
                status: "pending",
            })
            try {
                const resp = await next(req, opt)
                updateLog(id, {
                    resp: toJson(resp),
                    reqHeaders: headersToRecord(opt?.headers),
                    duration: Math.round(performance.now() - start),
                    status: "done",
                })
                return resp
            } catch (e: any) {
                updateLog(id, {
                    resp: isHData(e) ? toJson(e) : undefined,
                    reqHeaders: headersToRecord(opt?.headers),
                    duration: Math.round(performance.now() - start),
                    error: e instanceof RpcError ? e.msg : (e?.message ?? String(e)),
                    status: "done",
                })
                throw e
            }
        })
    }
    return () => {
        client.middleware = raw
    }
}
