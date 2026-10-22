import {test} from "node:test";
import assert from "node:assert";
import {
    BoolDescriptor,
    BytesDescriptor,
    DataDescriptor,
    DecimalDescriptor,
    Descriptor,
    DoubleDescriptor,
    FieldDesc,
    FloatDescriptor,
    HData,
    Int32Descriptor,
    Int64Descriptor,
    ListDescriptor,
    MapDescriptor,
    RefDescriptor,
    StringDescriptor,
    SyncDescriptor,
    TimeDescriptor,
    Uint8Descriptor,
    Uint64Descriptor,
} from "../src";

// ===================== 测试数据类 =====================

class JSubTs implements HData {
    s1: bigint = 0n
    s2: string = ""

    descriptors(): Descriptor {
        return jSubDesc
    }
}

const jSubDesc = new DataDescriptor(
    () => new JSubTs(),
    new Map<number, FieldDesc>([
        [1, {name: "s1", desc: new Int64Descriptor(), get: (o: JSubTs) => o.s1, set: (o: JSubTs, v) => o.s1 = v}],
        [2, {name: "s2", desc: new StringDescriptor(), get: (o: JSubTs) => o.s2, set: (o: JSubTs, v) => o.s2 = v}],
    ]),
)

class JDataTs implements HData {
    f1: bigint = 0n               // int64
    f2: bigint | null = null      // int64?
    f3: string = ""
    f4: boolean = false
    f5: number = 0                // uint8
    f6: number = 0                // double
    f7: Date | null = null        // date
    f8: string = ""               // decimal
    f9: Uint8Array = new Uint8Array(0)
    f10: bigint[] = []            // int64[]
    f11: Map<string, string> = new Map()
    f12: JSubTs = new JSubTs()    // 非可空引用
    f13: JSubTs | null = null     // 可空引用

    descriptors(): Descriptor {
        return jDataDesc
    }
}

const jDataDesc = new DataDescriptor(
    () => new JDataTs(),
    new Map<number, FieldDesc>([
        [1, {name: "f1", desc: new Int64Descriptor(), get: (o: JDataTs) => o.f1, set: (o: JDataTs, v) => o.f1 = v}],
        [2, {name: "f2", desc: new Int64Descriptor(true), get: (o: JDataTs) => o.f2, set: (o: JDataTs, v) => o.f2 = v}],
        [3, {name: "f3", desc: new StringDescriptor(), get: (o: JDataTs) => o.f3, set: (o: JDataTs, v) => o.f3 = v}],
        [4, {name: "f4", desc: new BoolDescriptor(), get: (o: JDataTs) => o.f4, set: (o: JDataTs, v) => o.f4 = v}],
        [5, {name: "f5", desc: new Uint8Descriptor(), get: (o: JDataTs) => o.f5, set: (o: JDataTs, v) => o.f5 = v}],
        [6, {name: "f6", desc: new DoubleDescriptor(), get: (o: JDataTs) => o.f6, set: (o: JDataTs, v) => o.f6 = v}],
        [7, {name: "f7", desc: new TimeDescriptor(), get: (o: JDataTs) => o.f7, set: (o: JDataTs, v) => o.f7 = v}],
        [8, {name: "f8", desc: new DecimalDescriptor(), get: (o: JDataTs) => o.f8, set: (o: JDataTs, v) => o.f8 = v}],
        [9, {name: "f9", desc: new BytesDescriptor(), get: (o: JDataTs) => o.f9, set: (o: JDataTs, v) => o.f9 = v}],
        [10, {name: "f10", desc: new ListDescriptor(new Int64Descriptor()), get: (o: JDataTs) => o.f10, set: (o: JDataTs, v) => o.f10 = v}],
        [11, {name: "f11", desc: new MapDescriptor(new StringDescriptor(), new StringDescriptor()), get: (o: JDataTs) => o.f11, set: (o: JDataTs, v) => o.f11 = v}],
        [12, {name: "f12", desc: new RefDescriptor(jSubDesc), get: (o: JDataTs) => o.f12, set: (o: JDataTs, v) => o.f12 = v}],
        [13, {name: "f13", desc: new RefDescriptor(jSubDesc, true), get: (o: JDataTs) => o.f13, set: (o: JDataTs, v) => o.f13 = v}],
    ]),
)

function buildJData(): JDataTs {
    const v = new JDataTs()
    v.f1 = 1234567890123456789n
    v.f2 = -42n
    v.f3 = "hello"
    v.f4 = true
    v.f5 = 255
    v.f6 = 3.5
    v.f7 = new Date("2026-10-21T12:34:56.789Z")
    v.f8 = "12345.6789"
    v.f9 = new Uint8Array([0x01, 0x02, 0x03])
    v.f10 = [1n, -2n, 0n]
    v.f11 = new Map([["k1", "v1"]])
    v.f12 = Object.assign(new JSubTs(), {s1: 7n, s2: "sub"})
    v.f13 = Object.assign(new JSubTs(), {s1: 8n, s2: "ptr"})
    return v
}

// ===================== 测试 =====================

test("标量 toJson/fromJson", () => {
    const i64 = new Int64Descriptor()
    assert.strictEqual(i64.toJson(1234567890123456789n), "1234567890123456789")
    assert.strictEqual(i64.fromJson("1234567890123456789"), 1234567890123456789n)
    assert.strictEqual(i64.fromJson(42), 42n)
    assert.strictEqual(i64.fromJson(null), 0n)
    assert.strictEqual(new Int64Descriptor(true).fromJson(null), null)

    const u64 = new Uint64Descriptor()
    assert.strictEqual(u64.toJson(18446744073709551615n), "18446744073709551615")
    assert.strictEqual(u64.fromJson("18446744073709551615"), 18446744073709551615n)

    assert.strictEqual(new Int32Descriptor().fromJson("42"), 42)
    assert.strictEqual(new DoubleDescriptor().fromJson("3.5"), 3.5)
    assert.strictEqual(new FloatDescriptor().toJson(3.14159265), Math.fround(3.14159265))

    assert.strictEqual(new BoolDescriptor().fromJson("true"), true)
    assert.strictEqual(new BoolDescriptor().fromJson(null), false)

    assert.strictEqual(new StringDescriptor().fromJson(123), "123")
    assert.strictEqual(new StringDescriptor().fromJson(null), "")
    assert.strictEqual(new StringDescriptor(true).fromJson(null), null)

    const t = new Date("2026-10-21T12:34:56.789Z")
    assert.strictEqual(new TimeDescriptor().toJson(t), String(t.getTime()))
    assert.strictEqual(new TimeDescriptor().fromJson(String(t.getTime())).getTime(), t.getTime())
    assert.strictEqual(new TimeDescriptor(true).fromJson(null), null)

    assert.strictEqual(new DecimalDescriptor().fromJson("123.45").toString(), "123.45")
    assert.strictEqual(new DecimalDescriptor().fromJson(null).toString(), "0")
    assert.strictEqual(new DecimalDescriptor(true).fromJson(null), null)

    // bytes 原样透传
    const b = new Uint8Array([1, 2, 3])
    assert.strictEqual(new BytesDescriptor().toJson(b), b)
    assert.strictEqual(new BytesDescriptor().fromJson(b), b)
})

test("toJson: 全类型字段 JSON 结构", () => {
    const json = jDataDesc.toJson(buildJData()) as Record<string, any>
    assert.strictEqual(json.f1, "1234567890123456789")
    assert.strictEqual(json.f2, "-42")
    assert.strictEqual(json.f3, "hello")
    assert.strictEqual(json.f4, true)
    assert.strictEqual(json.f5, 255)
    assert.strictEqual(json.f6, 3.5)
    assert.strictEqual(json.f7, String(new Date("2026-10-21T12:34:56.789Z").getTime()))
    assert.strictEqual(json.f8, "12345.6789")
    assert.deepStrictEqual(json.f9, new Uint8Array([0x01, 0x02, 0x03]))
    assert.deepStrictEqual(json.f10, ["1", "-2", "0"])
    assert.deepStrictEqual(json.f11, {k1: "v1"})
    assert.deepStrictEqual(json.f12, {s1: "7", s2: "sub"})
    assert.deepStrictEqual(json.f13, {s1: "8", s2: "ptr"})
})

test("fromJson: JSON 还原全类型", () => {
    const json = {
        f1: "1234567890123456789",
        f2: "-42",
        f3: "hello",
        f4: true,
        f5: 255,
        f6: 3.5,
        f7: String(new Date("2026-10-21T12:34:56.789Z").getTime()),
        f8: "12345.6789",
        f9: new Uint8Array([0x01, 0x02, 0x03]),
        f10: ["1", "-2", "0"],
        f11: {k1: "v1"},
        f12: {s1: "7", s2: "sub"},
        f13: {s1: "8", s2: "ptr"},
    }
    const v = jDataDesc.fromJson(json) as JDataTs
    assert.strictEqual(v.f1, 1234567890123456789n)
    assert.strictEqual(v.f2, -42n)
    assert.strictEqual(v.f3, "hello")
    assert.strictEqual(v.f4, true)
    assert.strictEqual(v.f5, 255)
    assert.strictEqual(v.f6, 3.5)
    assert.strictEqual(v.f7!.getTime(), new Date("2026-10-21T12:34:56.789Z").getTime())
    assert.strictEqual(String(v.f8), "12345.6789")
    assert.deepStrictEqual(v.f9, new Uint8Array([0x01, 0x02, 0x03]))
    assert.deepStrictEqual(v.f10, [1n, -2n, 0n])
    assert.deepStrictEqual(Array.from(v.f11.entries()), [["k1", "v1"]])
    assert.strictEqual(v.f12.s1, 7n)
    assert.strictEqual(v.f12.s2, "sub")
    assert.strictEqual(v.f13!.s1, 8n)
    assert.strictEqual(v.f13!.s2, "ptr")
})

test("round-trip: toJson -> fromJson 语义一致", () => {
    const src = buildJData()
    const dst = jDataDesc.fromJson(jDataDesc.toJson(src)) as JDataTs
    assert.strictEqual(dst.f1, src.f1)
    assert.strictEqual(dst.f2, src.f2)
    assert.strictEqual(dst.f3, src.f3)
    assert.strictEqual(dst.f4, src.f4)
    assert.strictEqual(dst.f5, src.f5)
    assert.strictEqual(dst.f6, src.f6)
    assert.strictEqual(dst.f7!.getTime(), src.f7!.getTime())
    assert.strictEqual(String(dst.f8), String(src.f8))
    assert.deepStrictEqual(dst.f9, src.f9)
    assert.deepStrictEqual(dst.f10, src.f10)
    assert.deepStrictEqual(Array.from(dst.f11.entries()), Array.from(src.f11.entries()))
    assert.deepStrictEqual(dst.f12, src.f12)
    assert.deepStrictEqual(dst.f13, src.f13)
})

test("fromJson: 缺失字段零值与可空字段 null", () => {
    const v = jDataDesc.fromJson({}) as JDataTs
    assert.strictEqual(v.f1, 0n)
    assert.strictEqual(v.f2, null)
    assert.strictEqual(v.f3, "")
    assert.strictEqual(v.f4, false)
    assert.strictEqual(v.f5, 0)
    assert.strictEqual(v.f6, 0)
    assert.strictEqual(v.f7, null)        // 零时间恒用 null 表示
    assert.strictEqual(String(v.f8), "0")
    assert.strictEqual(v.f9, undefined)   // bytes 原样透传
    assert.deepStrictEqual(v.f10, [])
    assert.strictEqual(v.f11.size, 0)
    assert.strictEqual(v.f12.s1, 0n)      // 非可空引用 -> 零值实例
    assert.strictEqual(v.f13, null)       // 可空引用 -> null

    const v2 = jDataDesc.fromJson({f2: null, f13: null}) as JDataTs
    assert.strictEqual(v2.f2, null)
    assert.strictEqual(v2.f13, null)

    const v3 = jDataDesc.fromJson({f12: null}) as JDataTs
    assert.strictEqual(v3.f12.s1, 0n)     // 非可空引用 null -> 零值实例
})

test("toJson/fromJson: null 容器与 null 引用", () => {
    const v = new JDataTs()
    const json = jDataDesc.toJson(v) as Record<string, any>
    assert.strictEqual(json.f2, null)   // 可空标量 null -> null（JSON.stringify 保留 null，undefined 会被删键）
    assert.deepStrictEqual(json.f10, [])
    assert.deepStrictEqual(json.f11, {})
    assert.strictEqual(json.f13, null)       // 可空引用 null -> null

    // 容器级 null
    assert.strictEqual(new ListDescriptor(new Int64Descriptor(), true).toJson(null), null)
    assert.strictEqual(new MapDescriptor(new StringDescriptor(), new StringDescriptor(), true).toJson(null), null)
    assert.strictEqual(jDataDesc.toJson(null), null)

    // 容器级 fromJson
    assert.strictEqual(new ListDescriptor(new Int64Descriptor(), true).fromJson(null), null)
    assert.deepStrictEqual(new ListDescriptor(new Int64Descriptor()).fromJson(null), [])
    assert.strictEqual(new MapDescriptor(new StringDescriptor(), new StringDescriptor(), true).fromJson(null), null)
    assert.deepStrictEqual(new MapDescriptor(new StringDescriptor(), new StringDescriptor()).fromJson(null), new Map())

    // 非可空 data fromJson(null) -> 零值实例
    const z = jDataDesc.fromJson(null) as JDataTs
    assert.strictEqual(z.f1, 0n)
})

test("toJson/fromJson: 递归结构（SyncDescriptor）", () => {
    const nodeDesc: Descriptor = new SyncDescriptor(() => new DataDescriptor(
        () => new NodeTs(),
        new Map<number, FieldDesc>([
            [1, {name: "name", desc: new StringDescriptor(), get: (o: NodeTs) => o.name, set: (o: NodeTs, v) => o.name = v}],
            [2, {name: "children", desc: new ListDescriptor(new RefDescriptor(nodeDesc, true)), get: (o: NodeTs) => o.children, set: (o: NodeTs, v) => o.children = v}],
        ]),
    ))

    class NodeTs implements HData {
        name: string = ""
        children: (NodeTs | null)[] = []

        descriptors(): Descriptor {
            return nodeDesc
        }
    }

    const c = Object.assign(new NodeTs(), {name: "c"})
    const b = Object.assign(new NodeTs(), {name: "b", children: [c]})
    const a = Object.assign(new NodeTs(), {name: "a", children: [null, b]})

    const json = nodeDesc.toJson(a)
    assert.deepStrictEqual(json, {
        name: "a",
        children: [null, {name: "b", children: [{name: "c", children: []}]}],
    })

    const dst = nodeDesc.fromJson(json) as NodeTs
    assert.strictEqual(dst.name, "a")
    assert.strictEqual(dst.children.length, 2)
    assert.strictEqual(dst.children[0], null)
    assert.strictEqual(dst.children[1]!.name, "b")
    assert.strictEqual(dst.children[1]!.children[0].name, "c")
})

test("fromJson: 未知字段忽略", () => {
    const v = jDataDesc.fromJson({f1: "5", unknown: 123, nested: {a: 1}}) as JDataTs
    assert.strictEqual(v.f1, 5n)
    assert.strictEqual(v.f2, null)
})

test("toJson/fromJson: map 键类型还原", () => {
    const desc = new MapDescriptor(new Int64Descriptor(), new StringDescriptor())
    const m = new Map([[9223372036854775807n, "max"], [-1n, "neg"]])
    const json = desc.toJson(m) as Record<string, string>
    assert.deepStrictEqual(json, {"9223372036854775807": "max", "-1": "neg"})

    const back = desc.fromJson(json) as Map<bigint, string>
    assert.strictEqual(back.size, 2)
    assert.strictEqual(back.get(9223372036854775807n), "max")
    assert.strictEqual(back.get(-1n), "neg")
})

test("toJson/fromJson: map 可空值元素", () => {
    const desc = new MapDescriptor(new StringDescriptor(), new Int64Descriptor(true))
    const m = new Map([["a", null], ["b", 5n]])
    const json = desc.toJson(m) as Record<string, any>
    assert.strictEqual(json.a, null)
    assert.strictEqual(json.b, "5")

    const back = desc.fromJson({a: null, b: "5"}) as Map<string, bigint | null>
    assert.strictEqual(back.get("a"), null)
    assert.strictEqual(back.get("b"), 5n)
})

