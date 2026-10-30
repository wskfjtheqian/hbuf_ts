import {test} from "node:test";
import assert from "node:assert";
import {
    DataDescriptor,
    Descriptor,
    FieldDesc,
    HData,
    Int64Descriptor,
    StringDescriptor,
    BoolDescriptor,
    Uint8Descriptor,
    DoubleDescriptor,
    TimeDescriptor,
    DecimalDescriptor,
    BytesDescriptor,
    ListDescriptor,
    MapDescriptor,
} from "../src";

// ===================== 测试数据类（覆盖全类型；嵌套 data 直接使用 DataDescriptor） =====================

class CSubTs implements HData {
    s1: bigint = 0n
    s2: string = ""

    descriptors(): Descriptor {
        return cSubDesc
    }
}

const cSubDesc: DataDescriptor = new DataDescriptor(
    () => new CSubTs(),
    new Map<number, FieldDesc>([
        [1, {name: "s1", desc: new Int64Descriptor(), get: (o: CSubTs) => o.s1, set: (o: CSubTs, v) => o.s1 = v}],
        [2, {name: "s2", desc: new StringDescriptor(), get: (o: CSubTs) => o.s2, set: (o: CSubTs, v) => o.s2 = v}],
    ]),
)

/** 可空嵌套 data */
const cSubDescPtr: DataDescriptor = new DataDescriptor(
    () => new CSubTs(),
    new Map<number, FieldDesc>([
        [1, {name: "s1", desc: new Int64Descriptor(), get: (o: CSubTs) => o.s1, set: (o: CSubTs, v) => o.s1 = v}],
        [2, {name: "s2", desc: new StringDescriptor(), get: (o: CSubTs) => o.s2, set: (o: CSubTs, v) => o.s2 = v}],
    ]),
    new Map(),
    true,
)

class CDataTs implements HData {
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
    f12: CSubTs = new CSubTs()
    f13: CSubTs | null = null
    f14: (bigint | null)[] = []
    f15: CSubTs[] = []

    descriptors(): Descriptor {
        return cDataDesc
    }
}

const cDataDesc: DataDescriptor = new DataDescriptor(
    () => new CDataTs(),
    new Map<number, FieldDesc>([
        [1, {name: "f1", desc: new Int64Descriptor(), get: (o: CDataTs) => o.f1, set: (o: CDataTs, v) => o.f1 = v}],
        [2, {name: "f2", desc: new Int64Descriptor(true), get: (o: CDataTs) => o.f2, set: (o: CDataTs, v) => o.f2 = v}],
        [3, {name: "f3", desc: new StringDescriptor(), get: (o: CDataTs) => o.f3, set: (o: CDataTs, v) => o.f3 = v}],
        [4, {name: "f4", desc: new BoolDescriptor(), get: (o: CDataTs) => o.f4, set: (o: CDataTs, v) => o.f4 = v}],
        [5, {name: "f5", desc: new Uint8Descriptor(), get: (o: CDataTs) => o.f5, set: (o: CDataTs, v) => o.f5 = v}],
        [6, {name: "f6", desc: new DoubleDescriptor(), get: (o: CDataTs) => o.f6, set: (o: CDataTs, v) => o.f6 = v}],
        [7, {name: "f7", desc: new TimeDescriptor(), get: (o: CDataTs) => o.f7, set: (o: CDataTs, v) => o.f7 = v}],
        [8, {name: "f8", desc: new DecimalDescriptor(), get: (o: CDataTs) => o.f8, set: (o: CDataTs, v) => o.f8 = v}],
        [9, {name: "f9", desc: new BytesDescriptor(), get: (o: CDataTs) => o.f9, set: (o: CDataTs, v) => o.f9 = v}],
        [10, {
            name: "f10",
            desc: new ListDescriptor(new Int64Descriptor()),
            get: (o: CDataTs) => o.f10,
            set: (o: CDataTs, v) => o.f10 = v
        }],
        [11, {
            name: "f11",
            desc: new MapDescriptor(new StringDescriptor(), new StringDescriptor()),
            get: (o: CDataTs) => o.f11,
            set: (o: CDataTs, v) => o.f11 = v
        }],
        [12, {name: "f12", desc: cSubDesc, get: (o: CDataTs) => o.f12, set: (o: CDataTs, v) => o.f12 = v}],
        [13, {name: "f13", desc: cSubDescPtr, get: (o: CDataTs) => o.f13, set: (o: CDataTs, v) => o.f13 = v}],
        [14, {
            name: "f14",
            desc: new ListDescriptor(new Int64Descriptor(true)),
            get: (o: CDataTs) => o.f14,
            set: (o: CDataTs, v) => o.f14 = v
        }],
        [15, {
            name: "f15",
            desc: new ListDescriptor(cSubDesc),
            get: (o: CDataTs) => o.f15,
            set: (o: CDataTs, v) => o.f15 = v
        }],
    ]),
)

function buildCloneData(): CDataTs {
    const v = new CDataTs()
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
    v.f12 = Object.assign(new CSubTs(), {s1: 7n, s2: "sub"})
    v.f13 = Object.assign(new CSubTs(), {s1: 8n, s2: "ptr"})
    v.f14 = [null, 5n]
    v.f15 = [
        Object.assign(new CSubTs(), {s1: 1n, s2: "a"}),
        Object.assign(new CSubTs(), {s1: 2n, s2: "b"}),
    ]
    return v
}

// ===================== 测试 =====================

test("clone: 全类型深拷贝，值与源一致", () => {
    const src = buildCloneData()
    const dst = cDataDesc.clone(src) as CDataTs

    // 不可变标量
    assert.strictEqual(dst.f1, src.f1)
    assert.strictEqual(dst.f2, src.f2)
    assert.strictEqual(dst.f3, src.f3)
    assert.strictEqual(dst.f4, src.f4)
    assert.strictEqual(dst.f5, src.f5)
    assert.strictEqual(dst.f6, src.f6)
    assert.strictEqual(dst.f8, src.f8)

    // Time / Bytes：值一致
    assert.strictEqual(dst.f7!.getTime(), src.f7!.getTime())
    assert.deepStrictEqual(Array.from(dst.f9), Array.from(src.f9))

    // 容器 / 嵌套 data：值一致且实例独立
    assert.notStrictEqual(dst.f10, src.f10)
    assert.deepStrictEqual(dst.f10, src.f10)
    assert.notStrictEqual(dst.f11, src.f11)
    assert.deepStrictEqual(Array.from(dst.f11.entries()), Array.from(src.f11.entries()))
    assert.notStrictEqual(dst.f12, src.f12)
    assert.deepStrictEqual(dst.f12, src.f12)
    assert.notStrictEqual(dst.f13, src.f13)
    assert.deepStrictEqual(dst.f13, src.f13)
    assert.notStrictEqual(dst.f14, src.f14)
    assert.deepStrictEqual(dst.f14, src.f14)
    assert.notStrictEqual(dst.f15, src.f15)
    assert.deepStrictEqual(dst.f15, src.f15)
    for (let i = 0; i < dst.f15.length; i++) {
        assert.notStrictEqual(dst.f15[i], src.f15[i])
    }
})

test("clone: 修改副本不影响原值", () => {
    const src = buildCloneData()
    const dst = cDataDesc.clone(src) as CDataTs

    dst.f10[0] = 999n
    dst.f10.push(888n)
    dst.f11.set("k2", "v2")
    dst.f12.s1 = 123n
    dst.f12.s2 = "mutated"
    dst.f15[0].s1 = 321n

    assert.deepStrictEqual(src.f10, [1n, -2n, 0n, 300n])
    assert.deepStrictEqual(Array.from(src.f11.entries()), [["k1", "v1"]])
    assert.strictEqual(src.f12.s1, 7n)
    assert.strictEqual(src.f12.s2, "sub")
    assert.strictEqual(src.f15[0].s1, 1n)
})

test("clone: null 输入返回 null", () => {
    assert.strictEqual(cDataDesc.clone(null), null)
    assert.strictEqual(cSubDescPtr.clone(null), null)
    assert.strictEqual(new ListDescriptor(new Int64Descriptor()).clone(null), null)
    assert.strictEqual(new ListDescriptor(new Int64Descriptor(), true).clone(null), null)
    assert.strictEqual(new MapDescriptor(new StringDescriptor(), new StringDescriptor()).clone(null), null)
})

test("clone: List/Map 元素级深拷贝", () => {
    // 嵌套 list
    const listDesc = new ListDescriptor(new ListDescriptor(new Int64Descriptor()))
    const l = [[1n, 2n], [3n]]
    const lc = listDesc.clone(l)
    assert.notStrictEqual(lc, l)
    assert.notStrictEqual(lc[0], l[0])
    assert.deepStrictEqual(lc, l)

    // 空 list 克隆为空 list（非 null）
    assert.deepStrictEqual(listDesc.clone([]), [])

    // map 值元素为嵌套 data
    const mapDesc = new MapDescriptor(new Int64Descriptor(), cSubDesc)
    const m = new Map([[1n, Object.assign(new CSubTs(), {s1: 10n, s2: "x"})]])
    const mc = mapDesc.clone(m)
    assert.notStrictEqual(mc, m)
    assert.strictEqual(mc.size, 1)
    assert.strictEqual(mc.get(1n).s1, 10n)
    assert.strictEqual(mc.get(1n).s2, "x")
    assert.notStrictEqual(mc.get(1n), m.get(1n))
})

test("clone: extends 字段克隆", () => {
    class BaseTs implements HData {
        a: bigint = 0n

        descriptors(): Descriptor {
            return baseDesc
        }
    }

    class ExtTs extends BaseTs {
        b: string = ""
    }

    const baseDesc = new DataDescriptor(
        () => new ExtTs(),
        new Map<number, FieldDesc>([
            [1, {name: "a", desc: new Int64Descriptor(), get: (o: BaseTs) => o.a, set: (o: BaseTs, v) => o.a = v}],
        ]),
        new Map<number, FieldDesc>([
            [2, {name: "b", desc: new StringDescriptor(), get: (o: ExtTs) => o.b, set: (o: ExtTs, v) => o.b = v}],
        ]),
    )

    const v = new ExtTs()
    v.a = 9n
    v.b = "ext"
    const dst = baseDesc.clone(v) as ExtTs
    assert.ok(dst instanceof ExtTs)
    assert.notStrictEqual(dst, v)
    assert.strictEqual(dst.a, 9n)
    assert.strictEqual(dst.b, "ext")
})
