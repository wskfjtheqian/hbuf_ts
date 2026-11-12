import {test} from "node:test";
import assert from "node:assert";
import Decimal from "decimal.js";
import {formatDate, formatDuration} from "../src";

test("formatDate: 默认格式 YYYY-MM-DD", () => {
    assert.strictEqual(formatDate(new Date(2026, 10, 6)), "2026-11-06")
})

test("formatDate: 补零与不补零格式符", () => {
    const d = new Date(2026, 0, 6, 9, 5, 3)
    assert.strictEqual(formatDate(d, "YYYY-MM-DD HH:mm:ss"), "2026-01-06 09:05:03")
    assert.strictEqual(formatDate(d, "YYYY-M-D H:m:s"), "2026-1-6 9:5:3")
})

test("formatDate: 毫秒格式符 S / SS / SSS", () => {
    const d = new Date(2026, 10, 6, 9, 5, 3, 5)
    assert.strictEqual(formatDate(d, "ss.SSS"), "03.005")
    assert.strictEqual(formatDate(d, "ss.SS"), "03.00")
    assert.strictEqual(formatDate(d, "ss.S"), "03.5")
    // 三位毫秒：SS 取百分秒（舍去个位），不丢百位
    const d2 = new Date(2026, 10, 6, 9, 5, 3, 123)
    assert.strictEqual(formatDate(d2, "SSS"), "123")
    assert.strictEqual(formatDate(d2, "SS"), "12")
    assert.strictEqual(formatDate(d2, "S"), "123")
})

test("formatDate: 年份补零到 4 位", () => {
    assert.strictEqual(formatDate(new Date(999, 0, 1)), "0999-01-01")
})

test("formatDate: 纯日期字符串（Safari 兼容）", () => {
    assert.strictEqual(formatDate("2026-11-06", "YYYY/MM/DD"), "2026/11/06")
    assert.strictEqual(formatDate("2026-1-6"), "2026-01-06")
})

test("formatDate: ISO 字符串与 Date 对象解析一致", () => {
    const iso = "2026-11-06T09:05:03.005Z"
    const fmt = "YYYY-MM-DD HH:mm:ss.SSS"
    assert.strictEqual(formatDate(iso, fmt), formatDate(new Date(iso), fmt))
})

test("formatDate: 时间戳输入与 Date 对象一致", () => {
    const ts = Date.UTC(2026, 10, 6, 1, 5, 3)
    assert.strictEqual(formatDate(ts, "YYYY-MM-DD HH:mm:ss"), formatDate(new Date(ts), "YYYY-MM-DD HH:mm:ss"))
})

test("formatDate: 非法输入返回空字符串", () => {
    assert.strictEqual(formatDate("abc"), "")
    assert.strictEqual(formatDate("not a date", "YYYY-MM-DD"), "")
    assert.strictEqual(formatDate(new Date(NaN)), "")
    assert.strictEqual(formatDate(NaN), "")
})

test("formatDate: 空格式参数走默认格式", () => {
    assert.strictEqual(formatDate(new Date(2026, 10, 6), ""), "2026-11-06")
})

test("formatDate: 非格式符字符原样保留", () => {
    const d = new Date(2026, 10, 6, 9, 5, 3)
    assert.strictEqual(formatDate(d, "YYYY年MM月DD日 HH点mm分ss秒"), "2026年11月06日 09点05分03秒")
})

test("formatDuration: 基础时分秒格式化", () => {
    assert.strictEqual(formatDuration(0), "00:00:00")
    assert.strictEqual(formatDuration(59), "00:00:59")
    assert.strictEqual(formatDuration(61), "00:01:01")
    assert.strictEqual(formatDuration(3599), "00:59:59")
    assert.strictEqual(formatDuration(3600), "01:00:00")
    assert.strictEqual(formatDuration(86399), "23:59:59")
})

test("formatDuration: 小数秒向下取整，不出现 60", () => {
    assert.strictEqual(formatDuration(59.9), "00:00:59")
    assert.strictEqual(formatDuration(3599.9), "00:59:59")
    assert.strictEqual(formatDuration(0.5), "00:00:00")
})

test("formatDuration: 超过一天显示为 XdHH:MM:SS", () => {
    assert.strictEqual(formatDuration(86400), "1d00:00:00")
    assert.strictEqual(formatDuration(90000), "1d01:00:00")
    assert.strictEqual(formatDuration(90061), "1d01:01:01")
    assert.strictEqual(formatDuration(172805), "2d00:00:05")
})

test("formatDuration: 非法输入返回 00:00:00", () => {
    assert.strictEqual(formatDuration(null), "00:00:00")
    assert.strictEqual(formatDuration(undefined), "00:00:00")
    assert.strictEqual(formatDuration(NaN), "00:00:00")
    assert.strictEqual(formatDuration(Infinity), "00:00:00")
    assert.strictEqual(formatDuration(-60), "00:00:00")
})

test("formatDuration: Decimal 输入", () => {
    assert.strictEqual(formatDuration(new Decimal(61.7)), "00:01:01")
    assert.strictEqual(formatDuration(new Decimal(90000)), "1d01:00:00")
})
