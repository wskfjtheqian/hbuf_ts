import {isHData} from "../hbuf/data";
import {Error as RpcError, Handler, HandlerMiddleware, Option, RequestType, ResponseType} from "./rpc";

// RPC debug log entry dispatched via CustomEvent for the Chrome DevTools extension
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
    // Request headers recorded after response arrives (e.g., X-Trace-Id appended by transport layer)
    reqHeaders?: Record<string, string>
    // Request lifecycle status: "pending" when dispatched, "done" when resolved or rejected
    status: "pending" | "done"
}

let logSeq = 0

function bytesToHex(buf: ArrayBuffer, max = 64): string {
    const u8 = new Uint8Array(buf)
    const n = Math.min(u8.length, max)
    let s = ""
    for (let i = 0; i < n; i++) {
        s += u8[i].toString(16).padStart(2, "0")
    }
    return u8.length > max ? s + "..." : s
}

// Convert request/response payload into a plain JSON-serializable structure
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

// Convert Headers instance into a plain record object
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
        // Dispatch single log entry immediately on request start and completion
        w.dispatchEvent(new CustomEvent("__hbuf_rpc_log__", {detail: item}))
    }
}

// Debug middleware: dispatches real-time RPC lifecycle events for the DevTools extension
export function devtoolsMiddleware(transport: "http" | "websocket"): HandlerMiddleware {
    return (next: Handler): Handler => {
        return async (req: RequestType, opt?: Option): Promise<ResponseType> => {
            const start = performance.now()
            const id = ++logSeq
            const baseEntry: HbufRpcLogEntry = {
                id,
                ts: Date.now(),
                transport,
                path: (opt?.path ?? opt?.method ?? ""),
                notification: opt?.notification ?? false,
                traceId: opt?.traceId,
                req: toJson(req),
                status: "pending",
            }
            // Emit pending entry before calling next()
            dispatchLog(baseEntry)

            try {
                const resp = await next(req, opt)
                dispatchLog({
                    ...baseEntry,
                    resp: toJson(resp),
                    reqHeaders: headersToRecord(opt?.headers),
                    duration: Math.round(performance.now() - start),
                    status: "done",
                })
                return resp
            } catch (e: any) {
                dispatchLog({
                    ...baseEntry,
                    resp: isHData(e) ? toJson(e) : undefined,
                    reqHeaders: headersToRecord(opt?.headers),
                    duration: Math.round(performance.now() - start),
                    error: e instanceof RpcError ? e.msg : (e?.message ?? String(e)),
                    status: "done",
                })
                throw e
            }
        }
    }
}
