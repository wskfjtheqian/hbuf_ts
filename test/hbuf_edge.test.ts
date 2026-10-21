import {test} from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import {
    DataDescriptor,
    Descriptor,
    FieldDesc,
    HData,
    Marshal,
    Unmarshal,
    NewDataDescriptor,
    NewInt8Descriptor,
    NewInt16Descriptor,
    NewInt32Descriptor,
    NewInt64Descriptor,
    NewUint8Descriptor,
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
    NewRefDescriptor,
    NewSyncDescriptor,
} from "../src";

const golden = JSON.parse(fs.readFileSync(new URL("./golden_edge.json", import.meta.url), "utf-8")) as Record<string, string>

function bytesToHex(b: Uint8Array): string {
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
}

function deepEq(a: any, b: any, path = "$"): void {
    if (a === b) return
    if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) return
    if (a == null || b == null) {
        assert.strictEqual(a, b, path)
        return
    }
    if (typeof a !== typeof b) {
        assert.strictEqual(typeof a, typeof b, path + " typeof")
        return
    }
    if (a instanceof Date && b instanceof Date) {
        assert.strictEqual(a.getTime(), b.getTime(), path)
        return
    }
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        assert.strictEqual(a.length, b.length, path + " len")
        for (let i = 0; i < a.length; i++) {
            assert.strictEqual(a[i], b[i], path + "[" + i + "]")
        }
        return
    }
    if (a instanceof Map && b instanceof Map) {
        assert.strictEqual(a.size, b.size, path + " size")
        for (const [k, v] of a) {
            assert.ok(b.has(k), path + " key " + k)
            deepEq(v, b.get(k), path + "[" + k + "]")
        }
        return
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        assert.strictEqual(a.length, b.length, path + " len")
        for (let i = 0; i < a.length; i++) {
            deepEq(a[i], b[i], path + "[" + i + "]")
        }
        return
    }
    if (typeof a === "object") {
        for (const k of Object.keys(a)) {
            deepEq(a[k], b[k], path + "." + k)
        }
        return
    }
    assert.strictEqual(a, b, path)
}

// ================= 1. 单元素 map（字节序确定） =================

class HBufSubTestTs implements HData {
    a1: bigint = 0n
    a2: bigint | null = null
    descriptors(): Descriptor {
        return hbSubDesc
    }
}

const hbSubDesc: DataDescriptor = NewDataDescriptor(
    () => new HBufSubTestTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewInt64Descriptor(), get: (o: HBufSubTestTs) => o.a1, set: (o: HBufSubTestTs, v) => o.a1 = v}],
        [2, {desc: NewInt64Descriptor(true), get: (o: HBufSubTestTs) => o.a2, set: (o: HBufSubTestTs, v) => o.a2 = v}],
    ]),
)

function sub(a1: bigint, a2: bigint | null): HBufSubTestTs {
    const s = new HBufSubTestTs()
    s.a1 = a1
    s.a2 = a2
    return s
}

class MapSingleTestTs implements HData {
    v1: Map<bigint, number> = new Map()
    v2: Map<bigint, bigint> = new Map()
    v3: Map<string, string> = new Map()
    v4: Map<bigint, number | null> = new Map()
    v5: Map<bigint, number> = new Map()
    v6: Map<bigint, HBufSubTestTs> = new Map()
    v7: Map<string, HBufSubTestTs | null> = new Map()
    v8: Map<bigint, number> = new Map()
    v9: Map<bigint, number> = new Map()
    v10: Map<string, Date | null> = new Map()
    v11: Map<bigint, string> = new Map()
    v12: Map<string, Uint8Array | null> = new Map()
    v13: Map<string, Date | null> = new Map()
    descriptors(): Descriptor {
        return mapSingleDesc
    }
}

const mapSingleDesc: DataDescriptor = NewDataDescriptor(
    () => new MapSingleTestTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewMapDescriptor(NewInt64Descriptor(), NewInt8Descriptor(), false), get: (o: MapSingleTestTs) => o.v1, set: (o: MapSingleTestTs, v) => o.v1 = v}],
        [2, {desc: NewMapDescriptor(NewInt64Descriptor(), NewInt64Descriptor(), false), get: (o: MapSingleTestTs) => o.v2, set: (o: MapSingleTestTs, v) => o.v2 = v}],
        [3, {desc: NewMapDescriptor(NewStringDescriptor(), NewStringDescriptor(), false), get: (o: MapSingleTestTs) => o.v3, set: (o: MapSingleTestTs, v) => o.v3 = v}],
        [4, {desc: NewMapDescriptor(NewInt64Descriptor(), NewInt8Descriptor(true), false), get: (o: MapSingleTestTs) => o.v4, set: (o: MapSingleTestTs, v) => o.v4 = v}],
        [5, {desc: NewMapDescriptor(NewInt64Descriptor(), NewUint8Descriptor(), false), get: (o: MapSingleTestTs) => o.v5, set: (o: MapSingleTestTs, v) => o.v5 = v}],
        [6, {desc: NewMapDescriptor(NewInt64Descriptor(), NewRefDescriptor(hbSubDesc), false), get: (o: MapSingleTestTs) => o.v6, set: (o: MapSingleTestTs, v) => o.v6 = v}],
        [7, {desc: NewMapDescriptor(NewStringDescriptor(), NewRefDescriptor(hbSubDesc, true), false), get: (o: MapSingleTestTs) => o.v7, set: (o: MapSingleTestTs, v) => o.v7 = v}],
        [8, {desc: NewMapDescriptor(NewInt64Descriptor(), NewDoubleDescriptor(), false), get: (o: MapSingleTestTs) => o.v8, set: (o: MapSingleTestTs, v) => o.v8 = v}],
        [9, {desc: NewMapDescriptor(NewInt64Descriptor(), NewFloatDescriptor(), false), get: (o: MapSingleTestTs) => o.v9, set: (o: MapSingleTestTs, v) => o.v9 = v}],
        [10, {desc: NewMapDescriptor(NewStringDescriptor(), NewTimeDescriptor(), false), get: (o: MapSingleTestTs) => o.v10, set: (o: MapSingleTestTs, v) => o.v10 = v}],
        [11, {desc: NewMapDescriptor(NewInt64Descriptor(), NewDecimalDescriptor(), false), get: (o: MapSingleTestTs) => o.v11, set: (o: MapSingleTestTs, v) => o.v11 = v}],
        [12, {desc: NewMapDescriptor(NewStringDescriptor(), NewBytesDescriptor(), false), get: (o: MapSingleTestTs) => o.v12, set: (o: MapSingleTestTs, v) => o.v12 = v}],
        [13, {desc: NewMapDescriptor(NewStringDescriptor(), NewTimeDescriptor(), false), get: (o: MapSingleTestTs) => o.v13, set: (o: MapSingleTestTs, v) => o.v13 = v}],
    ]),
)

function buildMapSingle(): MapSingleTestTs {
    const v = new MapSingleTestTs()
    v.v1 = new Map([[9223372036854775807n, -128]])
    v.v2 = new Map([[-9223372036854775808n, 9223372036854775807n]])
    v.v3 = new Map([["", ""]]) // 空串 key + 空串 value
    v.v4 = new Map([[1n, null]]) // nil 值元素
    v.v5 = new Map([[9223372036854775807n, 0]]) // uint8 零值（idLen=2 特例）
    v.v6 = new Map([[-9223372036854775808n, sub(0n, null)]]) // 零值 data 值
    v.v7 = new Map([["k", null]]) // nil 指针 data 值
    v.v8 = new Map([[1n, -0]]) // -0.0 位模式
    v.v9 = new Map([[1n, Math.fround(-0)]])
    v.v10 = new Map([["t", null]]) // 零值时间
    v.v11 = new Map([[1n, "0"]]) // decimal 零值
    v.v12 = new Map([["b", null]]) // nil bytes 值元素（与 Go 一致：空标记 -> 解码回 null）
    v.v13 = new Map([["t", new Date(1234567890987)]]) // 整毫秒时间
    return v
}

// ================= 2. 2 字节 ID =================

class Id2ByteTestTs implements HData {
    v1: bigint = 0n
    v2: string = ""
    v3: number | null = null
    v4: boolean = false
    v5: Uint8Array = new Uint8Array(0)
    descriptors(): Descriptor {
        return id2ByteDesc
    }
}

const id2ByteDesc: DataDescriptor = NewDataDescriptor(
    () => new Id2ByteTestTs(),
    new Map<number, FieldDesc>([
        [256, {desc: NewInt64Descriptor(), get: (o: Id2ByteTestTs) => o.v1, set: (o: Id2ByteTestTs, v) => o.v1 = v}],
        [300, {desc: NewStringDescriptor(), get: (o: Id2ByteTestTs) => o.v2, set: (o: Id2ByteTestTs, v) => o.v2 = v}],
        [65535, {desc: NewInt32Descriptor(true), get: (o: Id2ByteTestTs) => o.v3, set: (o: Id2ByteTestTs, v) => o.v3 = v}],
        [257, {desc: NewBoolDescriptor(), get: (o: Id2ByteTestTs) => o.v4, set: (o: Id2ByteTestTs, v) => o.v4 = v}],
        [500, {desc: NewBytesDescriptor(), get: (o: Id2ByteTestTs) => o.v5, set: (o: Id2ByteTestTs, v) => o.v5 = v}],
    ]),
)

function buildId2Byte(): Id2ByteTestTs {
    const v = new Id2ByteTestTs()
    v.v1 = 9223372036854775807n
    v.v2 = "hello 2-byte id"
    v.v3 = 123
    v.v4 = true
    v.v5 = new Uint8Array([1, 2, 3])
    return v
}

// ================= 3. 变长整数边界 =================

class IntBoundaryTestTs implements HData {
    v1: bigint = 0n
    v2: bigint = 0n
    v3: bigint = 0n
    v4: bigint = 0n
    v5: bigint = 0n
    v6: bigint = 0n
    v7: bigint = 0n
    v8: bigint = 0n
    v9: bigint = 0n
    v10: bigint = 0n
    v11: bigint = 0n
    v12: bigint = 0n
    v13: bigint = 0n
    v14: bigint = 0n
    v15: bigint = 0n
    v16: bigint = 0n
    v17: bigint = 0n
    v18: bigint = 0n
    v19: bigint = 0n
    v20: bigint = 0n
    v21: bigint = 0n
    v22: bigint = 0n
    v23: bigint = 0n
    v24: bigint = 0n
    v25: bigint = 0n
    v26: bigint = 0n
    v27: bigint = 0n
    v28: bigint = 0n
    v29: bigint = 0n
    v30: bigint = 0n
    v31: bigint = 0n
    v32: bigint = 0n
    v33: bigint = 0n
    v34: bigint = 0n
    v35: bigint = 0n
    v36: bigint = 0n
    v37: bigint = 0n
    descriptors(): Descriptor {
        return intBoundaryDesc
    }
}

const intBoundaryFields = new Map<number, FieldDesc>()
for (let i = 1; i <= 29; i++) {
    intBoundaryFields.set(i, {desc: NewInt64Descriptor(), get: (o: IntBoundaryTestTs) => (o as any)["v" + i], set: (o: IntBoundaryTestTs, v) => (o as any)["v" + i] = v})
}
for (let i = 30; i <= 37; i++) {
    intBoundaryFields.set(i, {desc: NewUint64Descriptor(), get: (o: IntBoundaryTestTs) => (o as any)["v" + i], set: (o: IntBoundaryTestTs, v) => (o as any)["v" + i] = v})
}

const intBoundaryDesc: DataDescriptor = NewDataDescriptor(() => new IntBoundaryTestTs(), intBoundaryFields)

const INT_BOUNDARY_VALUES: [number, bigint][] = [
    [1, 0n], [2, 127n], [3, 128n], [4, -1n], [5, -128n], [6, -129n], [7, 255n], [8, 256n],
    [9, -255n], [10, -256n], [11, -257n], [12, 32767n], [13, 32768n], [14, -32767n], [15, -32768n], [16, -32769n],
    [17, 65535n], [18, 65536n], [19, 16777215n], [20, 16777216n], [21, -16777216n], [22, -16777217n],
    [23, 4294967295n], [24, 4294967296n], [25, -4294967296n], [26, -4294967297n],
    [27, 281474976710655n], [28, 9223372036854775807n], [29, -9223372036854775808n],
    [30, 18446744073709551615n], [31, 9223372036854775808n], [32, 9223372036854775807n],
    [33, 4294967296n], [34, 65536n], [35, 256n], [36, 1n], [37, 72057594037927935n],
]

function buildIntBoundary(): IntBoundaryTestTs {
    const v = new IntBoundaryTestTs()
    for (const [i, val] of INT_BOUNDARY_VALUES) {
        ;(v as any)["v" + i] = val
    }
    return v
}

// ================= 4. 大 count（>255 元素） =================

class BigListTestTs implements HData {
    v1: number[] = []
    v2: number[] = []
    v3: string[] = []
    v4: (number | null)[] = []
    descriptors(): Descriptor {
        return bigListDesc
    }
}

const bigListDesc: DataDescriptor = NewDataDescriptor(
    () => new BigListTestTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewListDescriptor(NewInt16Descriptor(), false), get: (o: BigListTestTs) => o.v1, set: (o: BigListTestTs, v) => o.v1 = v}],
        [2, {desc: NewListDescriptor(NewUint8Descriptor(), false), get: (o: BigListTestTs) => o.v2, set: (o: BigListTestTs, v) => o.v2 = v}],
        [3, {desc: NewListDescriptor(NewStringDescriptor(), false), get: (o: BigListTestTs) => o.v3, set: (o: BigListTestTs, v) => o.v3 = v}],
        [4, {desc: NewListDescriptor(NewInt8Descriptor(true), false), get: (o: BigListTestTs) => o.v4, set: (o: BigListTestTs, v) => o.v4 = v}],
    ]),
)

function buildBigList(): BigListTestTs {
    const v = new BigListTestTs()
    v.v1 = Array.from({length: 256}, (_, i) => i)
    v.v2 = Array.from({length: 300}, (_, i) => i % 256)
    v.v3 = Array.from({length: 300}, (_, i) => "s".repeat(i % 10))
    v.v4 = Array.from({length: 300}, (_, i) => (i % 2 === 0 ? null : -128))
    return v
}

// ================= 5. 深层递归嵌套 =================

const deepDesc: Descriptor = NewSyncDescriptor(() => NewDataDescriptor(
    () => new DeepTestTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewListDescriptor(NewRefDescriptor(deepDesc, true), false), get: (o: DeepTestTs) => o.v1, set: (o: DeepTestTs, v) => o.v1 = v}],
        [3, {desc: NewRefDescriptor(deepDesc, true), get: (o: DeepTestTs) => o.v3, set: (o: DeepTestTs, v) => o.v3 = v}],
    ]),
))

class DeepTestTs implements HData {
    v1: (DeepTestTs | null)[] = []
    v3: DeepTestTs | null = null
    descriptors(): Descriptor {
        return deepDesc
    }
}

function buildDeep(): DeepTestTs {
    const d3 = new DeepTestTs()
    const d2 = new DeepTestTs()
    d2.v1 = [null, d3, new DeepTestTs()]
    const d1 = new DeepTestTs()
    d1.v1 = [d2, null]
    d1.v3 = d3
    return d1
}

// ================= 6. 浮点特殊值 =================

class FloatSpecTestTs implements HData {
    v1: number = 0
    v2: number = 0
    v3: number = 0
    v4: number = 0
    v5: number = 0
    v6: number = 0
    v7: number | null = null
    v8: number | null = null
    v9: number = 0
    v10: number = 0
    descriptors(): Descriptor {
        return floatSpecDesc
    }
}

const floatSpecDesc: DataDescriptor = NewDataDescriptor(
    () => new FloatSpecTestTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewFloatDescriptor(), get: (o: FloatSpecTestTs) => o.v1, set: (o: FloatSpecTestTs, v) => o.v1 = v}],
        [2, {desc: NewDoubleDescriptor(), get: (o: FloatSpecTestTs) => o.v2, set: (o: FloatSpecTestTs, v) => o.v2 = v}],
        [3, {desc: NewFloatDescriptor(), get: (o: FloatSpecTestTs) => o.v3, set: (o: FloatSpecTestTs, v) => o.v3 = v}],
        [4, {desc: NewDoubleDescriptor(), get: (o: FloatSpecTestTs) => o.v4, set: (o: FloatSpecTestTs, v) => o.v4 = v}],
        [5, {desc: NewFloatDescriptor(), get: (o: FloatSpecTestTs) => o.v5, set: (o: FloatSpecTestTs, v) => o.v5 = v}],
        [6, {desc: NewDoubleDescriptor(), get: (o: FloatSpecTestTs) => o.v6, set: (o: FloatSpecTestTs, v) => o.v6 = v}],
        [7, {desc: NewFloatDescriptor(true), get: (o: FloatSpecTestTs) => o.v7, set: (o: FloatSpecTestTs, v) => o.v7 = v}],
        [8, {desc: NewDoubleDescriptor(true), get: (o: FloatSpecTestTs) => o.v8, set: (o: FloatSpecTestTs, v) => o.v8 = v}],
        [9, {desc: NewFloatDescriptor(), get: (o: FloatSpecTestTs) => o.v9, set: (o: FloatSpecTestTs, v) => o.v9 = v}],
        [10, {desc: NewDoubleDescriptor(), get: (o: FloatSpecTestTs) => o.v10, set: (o: FloatSpecTestTs, v) => o.v10 = v}],
    ]),
)

function buildFloatSpec(): FloatSpecTestTs {
    const v = new FloatSpecTestTs()
    v.v1 = NaN
    v.v2 = NaN
    v.v3 = Infinity
    v.v4 = Infinity
    v.v5 = -Infinity
    v.v6 = -Infinity
    v.v7 = Infinity
    v.v8 = -Infinity
    v.v9 = -0
    v.v10 = -0
    return v
}

// ================= 测试 =================

test("边界: 单元素 map 字节级与 Go 一致（含 nil 值/零值/空串 key）", () => {
    assert.strictEqual(bytesToHex(Marshal(buildMapSingle())), golden["map_single"])
})

test("边界: 2 字节 ID（256/300/65535/257/500）字节级与 Go 一致", () => {
    assert.strictEqual(bytesToHex(Marshal(buildId2Byte())), golden["id2byte"])
})

test("边界: 变长整数 1~8 字节边界值字节级与 Go 一致", () => {
    assert.strictEqual(bytesToHex(Marshal(buildIntBoundary())), golden["int_boundary"])
})

test("边界: 大 count（>255 元素列表）字节级与 Go 一致", () => {
    assert.strictEqual(bytesToHex(Marshal(buildBigList())), golden["big_list"])
})

test("边界: 深层递归嵌套（SyncDescriptor）字节级与 Go 一致", () => {
    assert.strictEqual(bytesToHex(Marshal(buildDeep())), golden["deep"])
})

test("边界: 浮点特殊值 NaN/±Inf/-0 字节级与 Go 一致", () => {
    assert.strictEqual(bytesToHex(Marshal(buildFloatSpec())), golden["float_spec"])
})

test("边界: 全部场景 round-trip 语义一致", () => {
    for (const [name, build] of [
        ["map_single", buildMapSingle],
        ["id2byte", buildId2Byte],
        ["int_boundary", buildIntBoundary],
        ["big_list", buildBigList],
        ["deep", buildDeep],
        ["float_spec", buildFloatSpec],
    ] as [string, () => HData][]) {
        const src = build()
        const dst = build()
        Unmarshal(Marshal(src), dst)
        deepEq(dst, src, name)
    }
})

test("边界: float_spec 解码 NaN/±Inf 精确语义（字段级 -0 与 Go 一致省略）", () => {
    const dst = new FloatSpecTestTs()
    Unmarshal(new Uint8Array(Marshal(buildFloatSpec())), dst)
    assert.ok(Number.isNaN(dst.v1) && Number.isNaN(dst.v2), "NaN 保持")
    assert.strictEqual(dst.v3, Infinity)
    assert.strictEqual(dst.v5, -Infinity)
    assert.ok(dst.v7 === Infinity && dst.v8 === -Infinity, "可空指针 Inf 保持")
    // 字段级 -0 与 Go 一致：isEmpty 用 v === 0 判空（-0 命中），省略后解码回 +0
    assert.ok(Object.is(dst.v9, 0) && Object.is(dst.v10, 0), "字段级 -0 省略（与 Go 一致）")
})

test("边界: map 元素 -0 位模式保真（元素分支按位模式判断）", () => {
    const dst = new MapSingleTestTs()
    Unmarshal(new Uint8Array(Marshal(buildMapSingle())), dst)
    assert.ok(Object.is(dst.v8.get(1n), -0), "f64 map 值 -0 保真")
    assert.ok(Object.is(dst.v9.get(1n), -0), "f32 map 值 -0 保真")
})
