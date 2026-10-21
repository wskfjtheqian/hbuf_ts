import {HBufError, Reader, ShortBufferError, Type} from "./data";

/**
 * DecodeType 读取并解析一个 TAG 字节。
 * 返回 {typ, idLen, valueLen}，其中 valueLen 为实际值长度（TAG 位域值 + 1）。
 */
export function DecodeType(reader: Reader): {typ: Type, idLen: number, valueLen: number} {
    const b = reader.readByte()
    return {
        typ: b >> 5 & 0b111,
        valueLen: (b >> 2 & 0b111) + 1,
        idLen: b & 0b11,
    }
}

/**
 * DecodeId 按 idLen 读取小端序 ID：0 = 无 ID，1 = 1 字节，2 = 2 字节。
 */
export function DecodeId(reader: Reader, idLen: number): number {
    switch (idLen) {
        case 0:
            return 0
        case 1:
            return reader.readByte()
        case 2:
            return reader.readByte() | reader.readByte() << 8
    }
    throw new ShortBufferError()
}

/**
 * DecodeInt64 读取 valueLen 字节的有符号变长整数，以最高字节做符号扩展。
 */
export function DecodeInt64(reader: Reader, valueLen: number): bigint {
    if (valueLen === 0 || valueLen > 8) {
        throw new ShortBufferError()
    }
    let val = 0n
    for (let i = 0; i < valueLen; i++) {
        val |= BigInt(reader.readByte()) << BigInt(i * 8)
    }
    return BigInt.asIntN(valueLen * 8, val)
}

/**
 * DecodeUint64 读取 valueLen 字节的无符号变长整数。
 */
export function DecodeUint64(reader: Reader, valueLen: number): bigint {
    if (valueLen === 0 || valueLen > 8) {
        throw new ShortBufferError()
    }
    let val = 0n
    for (let i = 0; i < valueLen; i++) {
        val |= BigInt(reader.readByte()) << BigInt(i * 8)
    }
    return val
}

/**
 * DecodeTime 从固定 9 字节中还原（42 位秒 + 30 位纳秒）。
 */
export function DecodeTime(reader: Reader): {secs: bigint, nsec: number} {
    let low64 = 0n
    for (let i = 0; i < 8; i++) {
        low64 |= BigInt(reader.readByte()) << BigInt(i * 8)
    }
    const high8 = BigInt(reader.readByte())
    const nsec = Number(low64 & 0x3FFFFFFFn)
    const secs = (high8 << 34n) | (low64 >> 30n)
    return {secs, nsec}
}

/**
 * SkipValue 根据类型和 valueLen 跳过一段 value。
 * 调用约定：只有当 value 确实存在时才调用（即 idLen > 0）。
 */
export function SkipValue(reader: Reader, typ: Type, valueLen: number): void {
    switch (typ) {
        case Type.TInt:
        case Type.TUint:
        case Type.TFloat:
            reader.readBytes(valueLen)
            return
        case Type.TBool:
            return
        case Type.TBytes: {
            const size = DecodeUint64(reader, valueLen)
            reader.readBytes(Number(size))
            return
        }
        case Type.TList: {
            const count = DecodeUint64(reader, valueLen)
            for (let i = 0n; i < count; i++) {
                const {typ: elemTyp, idLen: elemIdLen, valueLen: elemValLen} = DecodeType(reader)
                // 元素编码为 TAG | VALUE（无 ID 字节），idLen == 1 表示元素有值
                if (elemIdLen === 1) {
                    SkipValue(reader, elemTyp, elemValLen)
                }
            }
            return
        }
        case Type.TMap: {
            const count = DecodeUint64(reader, valueLen)
            for (let i = 0n; i < count; i++) {
                // key（TAG | VALUE，无 ID 字节，idLen == 1 表示有值）
                const k = DecodeType(reader)
                if (k.idLen === 1) {
                    SkipValue(reader, k.typ, k.valueLen)
                }
                // value（TAG | VALUE，无 ID 字节，idLen == 1 表示有值）
                const v = DecodeType(reader)
                if (v.idLen === 1) {
                    SkipValue(reader, v.typ, v.valueLen)
                }
            }
            return
        }
        case Type.TData: {
            SkipDataBody(reader, valueLen)
            const {idLen: eIdLen, valueLen: eValLen} = DecodeType(reader)
            if (eIdLen === 0) {
                return
            }
            SkipDataBody(reader, eValLen)
            return
        }
    }
    throw new HBufError("hbuf: unknown type")
}

/**
 * SkipDataBody 跳过 Data 的字段部分（COUNT | FIELD*）。
 */
function SkipDataBody(reader: Reader, valueLen: number): void {
    const count = DecodeUint64(reader, valueLen)
    for (let i = 0n; i < count; i++) {
        const {typ, idLen, valueLen: vLen} = DecodeType(reader)
        if (idLen > 0) {
            reader.readBytes(idLen)
            SkipValue(reader, typ, vLen)
        }
    }
}
