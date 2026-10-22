import {Descriptor} from "./descriptor";
import {DecodeType} from "./decoder";

export type JsonValue = string | number | boolean | null | undefined | JsonValue[] | { [key: string]: JsonValue }

/**
 * HBuf 值类型枚举，与 Go 版 data.go 完全一致。
 */
export enum Type {
    TInt = 0,
    TUint = 1,
    TFloat = 2,
    TBool = 3,
    TBytes = 4,
    TList = 5,
    TMap = 6,
    TData = 7,
}

/**
 * HData 接口：数据对象需实现 descriptors() 返回其描述符（由代码生成器产出）。
 */
export interface HData {
    descriptors(): Descriptor
}

/**
 * HBufError 通用错误。
 */
export class HBufError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "HBufError"
    }
}

/**
 * ShortBufferError 缓冲区不足。
 */
export class ShortBufferError extends HBufError {
    constructor(msg = "hbuf: short buffer") {
        super(msg);
        this.name = "ShortBufferError"
    }
}

/**
 * Writer 可增长字节缓冲区，承载编码结果。
 */
export class Writer {
    private buf: Uint8Array
    private len = 0

    constructor(capacity = 128) {
        this.buf = new Uint8Array(capacity)
    }

    public get length(): number {
        return this.len
    }

    private ensure(extra: number): void {
        if (this.len + extra <= this.buf.length) {
            return
        }
        let cap = this.buf.length * 2
        while (cap < this.len + extra) {
            cap *= 2
        }
        const next = new Uint8Array(cap)
        next.set(this.buf.subarray(0, this.len))
        this.buf = next
    }

    public writeByte(v: number): void {
        this.ensure(1)
        this.buf[this.len++] = v
    }

    public writeBytes(b: Uint8Array): void {
        this.ensure(b.length)
        this.buf.set(b, this.len)
        this.len += b.length
    }

    /** 返回已写入字节的视图（与内部缓冲共享，仅有效至下一次写入前）。 */
    public toUint8Array(): Uint8Array {
        return this.buf.subarray(0, this.len)
    }
}

/**
 * Reader 顺序读取字节缓冲区。
 */
export class Reader {
    private buf: Uint8Array
    private pos = 0

    constructor(buf: Uint8Array) {
        this.buf = buf
    }

    public get position(): number {
        return this.pos
    }

    public get remaining(): number {
        return this.buf.length - this.pos
    }

    public readByte(): number {
        if (this.pos >= this.buf.length) {
            throw new ShortBufferError()
        }
        return this.buf[this.pos++]
    }

    public readBytes(n: number): Uint8Array {
        if (this.remaining < n) {
            throw new ShortBufferError()
        }
        const ret = this.buf.subarray(this.pos, this.pos + n)
        this.pos += n
        return ret
    }
}

/**
 * Marshal 将数据对象编码为 HBuf 二进制。
 */
export function Marshal(data: HData): Uint8Array {
    const buf = new Writer(128)
    data.descriptors().encode(buf, data, undefined)
    return buf.toUint8Array()
}

/**
 * Unmarshal 将 HBuf 二进制解码到数据对象中。
 */
export function Unmarshal(buf: Uint8Array, data: HData): void {
    if (buf.length === 0) {
        return
    }
    const reader = new Reader(buf)
    const {typ, valueLen} = DecodeType(reader)
    data.descriptors().decode(reader, typ, true, valueLen, data)
}

/** 兼容旧导出：FromMap（hrpc 层使用）。 */
export type FromMap = (map: Record<string, any>) => any

/** Data 抽象类（兼容原有 JSON codec 用法）。 */
export abstract class Data {
    public abstract toMap(): Record<string, any>;
}

export function isHData(obj: any): obj is HData {
    return obj && typeof obj.descriptors === 'function'
}
