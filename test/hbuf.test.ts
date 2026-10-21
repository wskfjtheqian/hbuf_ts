import {test} from "node:test";
import assert from "node:assert";
import {
    DataDescriptor,
    Descriptor,
    FieldDesc,
    HData,
    Marshal,
    NewDataDescriptor,
    NewInt64Descriptor,
    NewStringDescriptor,
    NewBoolDescriptor,
    NewUint8Descriptor,
    NewDoubleDescriptor,
    NewTimeDescriptor,
    NewDecimalDescriptor,
    NewBytesDescriptor,
    NewListDescriptor,
    NewMapDescriptor,
    NewRefDescriptor,
    NewInt8Descriptor,
    NewUint64Descriptor,
    Unmarshal,
} from "../src";

// ===================== 测试数据类（与 Go golden 程序一致） =====================

class GSubTs implements HData {
    s1: bigint = 0n
    s2: string = ""

    descriptors(): Descriptor {
        return gSubDesc
    }
}

const gSubDesc: DataDescriptor = NewDataDescriptor(
    () => new GSubTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewInt64Descriptor(), get: (o: GSubTs) => o.s1, set: (o: GSubTs, v) => o.s1 = v}],
        [2, {desc: NewStringDescriptor(), get: (o: GSubTs) => o.s2, set: (o: GSubTs, v) => o.s2 = v}],
    ]),
)

class GDataTs implements HData {
    f1: bigint = 0n
    f2: bigint | null = null
    f3: string = ""
    f4: boolean = false
    f5: number = 0
    f6: number = 0
    f7: Date | null = null
    f8: string = ""
    f9: Uint8Array = new Uint8Array(0)
    f10: bigint[] = []
    f11: Map<string, string> = new Map()
    f12: GSubTs = new GSubTs()
    f13: GSubTs | null = null
    f14: (bigint | null)[] = []
    f15: number[] = []

    descriptors(): Descriptor {
        return gDataDesc
    }
}

const gDataDesc: DataDescriptor = NewDataDescriptor(
    () => new GDataTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewInt64Descriptor(), get: (o: GDataTs) => o.f1, set: (o: GDataTs, v) => o.f1 = v}],
        [2, {desc: NewInt64Descriptor(true), get: (o: GDataTs) => o.f2, set: (o: GDataTs, v) => o.f2 = v}],
        [3, {desc: NewStringDescriptor(), get: (o: GDataTs) => o.f3, set: (o: GDataTs, v) => o.f3 = v}],
        [4, {desc: NewBoolDescriptor(), get: (o: GDataTs) => o.f4, set: (o: GDataTs, v) => o.f4 = v}],
        [5, {desc: NewUint8Descriptor(), get: (o: GDataTs) => o.f5, set: (o: GDataTs, v) => o.f5 = v}],
        [6, {desc: NewDoubleDescriptor(), get: (o: GDataTs) => o.f6, set: (o: GDataTs, v) => o.f6 = v}],
        [7, {desc: NewTimeDescriptor(), get: (o: GDataTs) => o.f7, set: (o: GDataTs, v) => o.f7 = v}],
        [8, {desc: NewDecimalDescriptor(), get: (o: GDataTs) => o.f8, set: (o: GDataTs, v) => o.f8 = v}],
        [9, {desc: NewBytesDescriptor(), get: (o: GDataTs) => o.f9, set: (o: GDataTs, v) => o.f9 = v}],
        [10, {desc: NewListDescriptor(NewInt64Descriptor()), get: (o: GDataTs) => o.f10, set: (o: GDataTs, v) => o.f10 = v}],
        [11, {desc: NewMapDescriptor(NewStringDescriptor(), NewStringDescriptor()), get: (o: GDataTs) => o.f11, set: (o: GDataTs, v) => o.f11 = v}],
        [12, {desc: NewRefDescriptor(gSubDesc), get: (o: GDataTs) => o.f12, set: (o: GDataTs, v) => o.f12 = v}],
        [13, {desc: NewRefDescriptor(gSubDesc), get: (o: GDataTs) => o.f13, set: (o: GDataTs, v) => o.f13 = v}],
        [14, {desc: NewListDescriptor(NewInt64Descriptor(true)), get: (o: GDataTs) => o.f14, set: (o: GDataTs, v) => o.f14 = v}],
        [15, {desc: NewListDescriptor(NewUint8Descriptor()), get: (o: GDataTs) => o.f15, set: (o: GDataTs, v) => o.f15 = v}],
    ]),
)

function hexToBytes(hex: string): Uint8Array {
    const ret = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        ret[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return ret
}

function bytesToHex(b: Uint8Array): string {
    return Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("")
}

function buildGolden(): GDataTs {
    const v = new GDataTs()
    v.f1 = 1234567890123456789n
    v.f2 = -42n
    v.f3 = "hello hbuf"
    v.f4 = true
    v.f5 = 255
    v.f6 = 3.141592653589793
    v.f7 = new Date("2026-10-21T12:34:56Z")
    v.f8 = "12345.6789"
    v.f9 = new Uint8Array([0x01, 0x02, 0x03])
    v.f10 = [1n, -2n, 0n, 300n]
    v.f11 = new Map([["k1", "v1"]])
    v.f12 = Object.assign(new GSubTs(), {s1: 7n, s2: "sub"})
    v.f13 = Object.assign(new GSubTs(), {s1: 8n, s2: "ptr"})
    v.f14 = [null, 5n]
    v.f15 = [0, 1, 255]
    return v
}

// 由 Go 版 hbuf.Marshal 生成的 golden 字节
const GOLDEN_HEX = "e10f1d011581e97df41022110102d681030a68656c6c6f206862756665042105ff5d06182d4454fb210940810709000000005c2cb61a0081080a31323334352e36373839810903010203a10a04010101fe00052c01c10b0181026b3181027631e10c0201010781020373756200e10d0201010881020370747200a10e02000105a10f0322210121ff00"

// ===================== 测试 =====================

test("golden: TS 编码与 Go 字节级一致", () => {
    const buf = Marshal(buildGolden())
    assert.strictEqual(bytesToHex(buf), GOLDEN_HEX)
})

test("golden: TS 解码 Go 字节", () => {
    const v = new GDataTs()
    Unmarshal(hexToBytes(GOLDEN_HEX), v)
    assert.strictEqual(v.f1, 1234567890123456789n)
    assert.strictEqual(v.f2, -42n)
    assert.strictEqual(v.f3, "hello hbuf")
    assert.strictEqual(v.f4, true)
    assert.strictEqual(v.f5, 255)
    assert.strictEqual(v.f6, 3.141592653589793)
    assert.strictEqual(v.f7!.getTime(), Date.UTC(2026, 9, 21, 12, 34, 56))
    assert.strictEqual(v.f8, "12345.6789")
    assert.deepStrictEqual(Array.from(v.f9), [0x01, 0x02, 0x03])
    assert.deepStrictEqual(v.f10, [1n, -2n, 0n, 300n])
    assert.deepStrictEqual(Array.from(v.f11.entries()), [["k1", "v1"]])
    assert.strictEqual(v.f12.s1, 7n)
    assert.strictEqual(v.f12.s2, "sub")
    assert.strictEqual(v.f13!.s1, 8n)
    assert.strictEqual(v.f13!.s2, "ptr")
    assert.deepStrictEqual(v.f14, [null, 5n])
    assert.deepStrictEqual(v.f15, [0, 1, 255])
})

test("round-trip: 全类型往返一致", () => {
    const src = buildGolden()
    const dst = new GDataTs()
    Unmarshal(Marshal(src), dst)
    assert.deepStrictEqual(dst.f1, src.f1)
    assert.deepStrictEqual(dst.f2, src.f2)
    assert.deepStrictEqual(dst.f3, src.f3)
    assert.deepStrictEqual(dst.f4, src.f4)
    assert.deepStrictEqual(dst.f5, src.f5)
    assert.deepStrictEqual(dst.f6, src.f6)
    assert.deepStrictEqual(dst.f7, src.f7)
    assert.deepStrictEqual(dst.f8, src.f8)
    assert.deepStrictEqual(Array.from(dst.f9), Array.from(src.f9))
    assert.deepStrictEqual(dst.f10, src.f10)
    assert.deepStrictEqual(Array.from(dst.f11.entries()), Array.from(src.f11.entries()))
    assert.deepStrictEqual(dst.f12, src.f12)
    assert.deepStrictEqual(dst.f13, src.f13)
    assert.deepStrictEqual(dst.f14, src.f14)
    assert.deepStrictEqual(dst.f15, src.f15)
})

test("空值省略: 零值标量省略，非指针 data 字段仍写入空结构（与 Go 一致）", () => {
    const buf = Marshal(new GDataTs())
    assert.strictEqual(bytesToHex(buf), "e101e10c000000")
})

test("可空语义: 非 null 即写入，null 省略", () => {
    const v = new GDataTs()
    v.f2 = 0n // 可空 int64 指向 0：写入
    let buf = Marshal(v)
    assert.strictEqual(bytesToHex(buf), "e102010200e10c000000")
    const dst = new GDataTs()
    Unmarshal(buf, dst)
    assert.strictEqual(dst.f2, 0n)

    // 可空 null：省略
    v.f2 = null
    buf = Marshal(v)
    assert.strictEqual(bytesToHex(buf), "e101e10c000000")
})

test("uint8 特例: 可空 uint8 值 0 也省略", () => {
    class U8Ts implements HData {
        a: number | null = null
        b: number = 0

        descriptors(): Descriptor {
            return u8Desc
        }
    }

    const u8Desc = NewDataDescriptor(
        () => new U8Ts(),
        new Map<number, FieldDesc>([
            [1, {desc: NewUint8Descriptor(true), get: (o: U8Ts) => o.a, set: (o: U8Ts, v) => o.a = v}],
            [2, {desc: NewUint8Descriptor(), get: (o: U8Ts) => o.b, set: (o: U8Ts, v) => o.b = v}],
        ]),
    )

    const v = new U8Ts()
    v.a = 0 // 指向 0：与 Go 一致仍省略
    v.b = 0
    assert.strictEqual(bytesToHex(Marshal(v)), "e10000")

    v.a = 1
    const dst = new U8Ts()
    Unmarshal(Marshal(v), dst)
    assert.strictEqual(dst.a, 1)
})

test("跨类型兼容: int64 字段接受 TBytes 文本", () => {
    // 手工构造: TAG(TData,idLen=1,valLen=1) | 0x01 | TAG(TBytes,idLen=1,valLen=1) | ID=1 | len=3 | "123" | EXTENDS(TInt,0,1)
    const hex = "e10181010331323300"
    const v = new GDataTs()
    Unmarshal(hexToBytes(hex), v)
    assert.strictEqual(v.f1, 123n)
})

test("跨类型兼容: string 字段接受 TInt", () => {
    // TAG(TData,1,1) | 0x01 | TAG(TInt,idLen=1,valLen=2)=0x05 | ID=3 | 0x2A 0x00 | EXTENDS
    const hex = "e10105032a0000"
    const v = new GDataTs()
    Unmarshal(hexToBytes(hex), v)
    assert.strictEqual(v.f3, "42")
})

test("未知字段跳过: 含未知 ID 及未知嵌套 Data", () => {
    // 3 个字段: f1=5n(已知) + 未知 ID=99 嵌套 TData + 未知 ID=100 TInt
    const hex = "e103010105e16301e1010101010700000564010000"
    const v = new GDataTs()
    Unmarshal(hexToBytes(hex), v)
    assert.strictEqual(v.f1, 5n)
})

test("extends: 扩展字段 round-trip", () => {
    class BaseTs implements HData {
        a: bigint = 0n

        descriptors(): Descriptor {
            return baseDesc
        }
    }

    class ExtTs extends BaseTs {
        b: string = ""
    }

    const baseDesc = NewDataDescriptor(
        () => new ExtTs(),
        new Map<number, FieldDesc>([
            [1, {desc: NewInt64Descriptor(), get: (o: BaseTs) => o.a, set: (o: BaseTs, v) => o.a = v}],
        ]),
        new Map<number, FieldDesc>([
            [2, {desc: NewStringDescriptor(), get: (o: ExtTs) => o.b, set: (o: ExtTs, v) => o.b = v}],
        ]),
    )

    const v = new ExtTs()
    v.a = 9n
    v.b = "ext"
    const dst = new ExtTs()
    Unmarshal(Marshal(v), dst)
    assert.strictEqual(dst.a, 9n)
    assert.strictEqual(dst.b, "ext")
})

test("64 位大整数保真", () => {
    class BigTs implements HData {
        i: bigint = 0n
        u: bigint = 0n

        descriptors(): Descriptor {
            return bigDesc
        }
    }

    const bigDesc = NewDataDescriptor(
        () => new BigTs(),
        new Map<number, FieldDesc>([
            [1, {desc: NewInt64Descriptor(), get: (o: BigTs) => o.i, set: (o: BigTs, v) => o.i = v}],
            [2, {desc: NewUint64Descriptor(), get: (o: BigTs) => o.u, set: (o: BigTs, v) => o.u = v}],
        ]),
    )

    const v = new BigTs()
    v.i = -9223372036854775808n // int64 最小值
    v.u = 18446744073709551615n // uint64 最大值
    const dst = new BigTs()
    Unmarshal(Marshal(v), dst)
    assert.strictEqual(dst.i, -9223372036854775808n)
    assert.strictEqual(dst.u, 18446744073709551615n)
})

test("int8 溢出截断与 Go 一致", () => {
    class I8Ts implements HData {
        a: number = 0

        descriptors(): Descriptor {
            return i8Desc
        }
    }

    const i8Desc = NewDataDescriptor(
        () => new I8Ts(),
        new Map<number, FieldDesc>([
            [1, {desc: NewInt8Descriptor(), get: (o: I8Ts) => o.a, set: (o: I8Ts, v) => o.a = v}],
        ]),
    )

    const v = new I8Ts()
    v.a = 300
    const dst = new I8Ts()
    Unmarshal(Marshal(v), dst)
    assert.strictEqual(dst.a, 44)
})
