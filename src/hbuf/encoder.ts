import {Type, Writer} from "./data";

/**
 * WriterType 写入一个 TAG 字节。
 * 布局（与 Go 版一致）：bit 7 6 5 = 类型，bit 4 3 2 = 值长度 - 1，bit 1 0 = ID 长度。
 */
export function WriterType(buf: Writer, typ: Type, idLen: number, valueLen: number): void {
    buf.writeByte((typ & 0b111) << 5 | ((valueLen - 1) & 0b111) << 2 | idLen & 0b11)
}

/**
 * LengthId 计算 ID 占用的字节数：id <= 0xFF 时 1 字节，否则 2 字节。
 */
export function LengthId(id: number): number {
    return id <= 0xFF ? 1 : 2
}

/**
 * WriterId 以小端序写入 1~2 字节的 uint16 ID。
 */
export function WriterId(buf: Writer, id: number): void {
    if (id <= 0xFF) {
        buf.writeByte(id)
    } else {
        buf.writeByte(id & 0xFF)
        buf.writeByte(id >> 8 & 0xFF)
    }
}

/**
 * LengthInt 返回有符号整数按实际大小编码所需的字节数（1~8）。
 */
export function LengthInt(v: bigint): number {
    if (v >= -0x80n && v < 0x80n) {
        return 1
    } else if (v >= -0x8000n && v < 0x8000n) {
        return 2
    } else if (v >= -0x800000n && v < 0x800000n) {
        return 3
    } else if (v >= -0x80000000n && v < 0x80000000n) {
        return 4
    } else if (v >= -0x8000000000n && v < 0x8000000000n) {
        return 5
    } else if (v >= -0x800000000000n && v < 0x800000000000n) {
        return 6
    } else if (v >= -0x80000000000000n && v < 0x80000000000000n) {
        return 7
    } else {
        return 8
    }
}

/**
 * LengthUint 返回无符号整数按实际大小编码所需的字节数（1~8）。
 */
export function LengthUint(v: bigint): number {
    if (v <= 0xFFn) {
        return 1
    } else if (v <= 0xFFFFn) {
        return 2
    } else if (v <= 0xFFFFFFn) {
        return 3
    } else if (v <= 0xFFFFFFFFn) {
        return 4
    } else if (v <= 0xFFFFFFFFFFn) {
        return 5
    } else if (v <= 0xFFFFFFFFFFFFn) {
        return 6
    } else if (v <= 0xFFFFFFFFFFFFFFn) {
        return 7
    } else {
        return 8
    }
}

/**
 * WriterInt64 以小端序写入有符号变长整数（1~8 字节，多余高位省略）。
 */
export function WriterInt64(buf: Writer, v: bigint): void {
    const len = LengthInt(v)
    let val = BigInt.asIntN(len * 8, v)
    for (let i = 0; i < len; i++) {
        buf.writeByte(Number(val & 0xFFn))
        val >>= 8n
    }
}

/**
 * EncodeUint64 以小端序写入无符号变长整数（1~8 字节，高位 0 字节省略）。
 */
export function EncodeUint64(buf: Writer, v: bigint): void {
    const len = LengthUint(v)
    let val = v
    for (let i = 0; i < len; i++) {
        buf.writeByte(Number(val & 0xFFn))
        val >>= 8n
    }
}

/**
 * EncodeTime 将时间编码为（42 位秒 + 30 位纳秒）的 72 位大整数，并以小端序写入固定 9 字节。
 * 与 Go 版位域拼接完全一致：low64 = (secs & 0x3FFFFFFFF) << 30 | (nsec & 0x3FFFFFFF)，
 * high8 = secs >> 34。
 */
export function EncodeTime(buf: Writer, secs: bigint, nsec: number): void {
    const low64 = ((secs & 0x3FFFFFFFFn) << 30n) | (BigInt(nsec) & 0x3FFFFFFFn)
    const high8 = Number(secs >> 34n)

    let val = low64
    for (let i = 0; i < 8; i++) {
        buf.writeByte(Number(val & 0xFFn))
        val >>= 8n
    }
    buf.writeByte(high8)
}
