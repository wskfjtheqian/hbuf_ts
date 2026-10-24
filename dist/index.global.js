"use strict";
var hbuf = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BoolDescriptor: () => BoolDescriptor,
    BytesDescriptor: () => BytesDescriptor,
    Client: () => Client,
    DataDescriptor: () => DataDescriptor,
    DecimalDescriptor: () => DecimalDescriptor,
    DoubleDescriptor: () => DoubleDescriptor,
    Error: () => Error2,
    FetchClient: () => FetchClient,
    FloatDescriptor: () => FloatDescriptor,
    HBufError: () => HBufError,
    HttpClient: () => HttpClient,
    Int16Descriptor: () => Int16Descriptor,
    Int32Descriptor: () => Int32Descriptor,
    Int64Descriptor: () => Int64Descriptor,
    Int8Descriptor: () => Int8Descriptor,
    ListDescriptor: () => ListDescriptor,
    MapDescriptor: () => MapDescriptor,
    Marshal: () => Marshal,
    NewHBufDecoder: () => NewHBufDecoder,
    NewHBufEncode: () => NewHBufEncode,
    NewJsonDecoder: () => NewJsonDecoder,
    NewJsonEncode: () => NewJsonEncode,
    Reader: () => Reader2,
    RecordEntry: () => RecordEntry,
    RefDescriptor: () => RefDescriptor,
    Result: () => Result,
    Server: () => Server,
    ShortBufferError: () => ShortBufferError,
    StringDescriptor: () => StringDescriptor,
    SyncDescriptor: () => SyncDescriptor,
    TimeDescriptor: () => TimeDescriptor,
    Type: () => Type,
    Uint16Descriptor: () => Uint16Descriptor,
    Uint32Descriptor: () => Uint32Descriptor,
    Uint64Descriptor: () => Uint64Descriptor,
    Uint8Descriptor: () => Uint8Descriptor,
    Unmarshal: () => Unmarshal,
    WebSocketClient: () => WebSocketClient,
    WebSocketData: () => WebSocketData,
    Writer: () => Writer,
    convertArray: () => convertArray,
    convertRecord: () => convertRecord,
    default: () => index_default,
    formatDate: () => formatDate,
    isArray: () => isArray,
    isData: () => isData,
    isHData: () => isHData,
    isRecord: () => isRecord,
    traceId: () => traceId,
    waiting: () => waiting
  });

  // src/hbuf/decoder.ts
  function DecodeType(reader) {
    const b = reader.readByte();
    return {
      typ: b >> 5 & 7,
      valueLen: (b >> 2 & 7) + 1,
      idLen: b & 3
    };
  }
  function DecodeId(reader, idLen) {
    switch (idLen) {
      case 0:
        return 0;
      case 1:
        return reader.readByte();
      case 2:
        return reader.readByte() | reader.readByte() << 8;
    }
    throw new ShortBufferError();
  }
  function DecodeInt64(reader, valueLen) {
    if (valueLen === 0 || valueLen > 8) {
      throw new ShortBufferError();
    }
    let val = 0n;
    for (let i = 0; i < valueLen; i++) {
      val |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    return BigInt.asIntN(valueLen * 8, val);
  }
  function DecodeUint64(reader, valueLen) {
    if (valueLen === 0 || valueLen > 8) {
      throw new ShortBufferError();
    }
    let val = 0n;
    for (let i = 0; i < valueLen; i++) {
      val |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    return val;
  }
  function DecodeTime(reader) {
    let low64 = 0n;
    for (let i = 0; i < 8; i++) {
      low64 |= BigInt(reader.readByte()) << BigInt(i * 8);
    }
    const high8 = BigInt(reader.readByte());
    const nsec = Number(low64 & 0x3FFFFFFFn);
    const secs = high8 << 34n | low64 >> 30n;
    return { secs, nsec };
  }
  function SkipValue(reader, typ, valueLen) {
    switch (typ) {
      case 0 /* TInt */:
      case 1 /* TUint */:
      case 2 /* TFloat */:
        reader.readBytes(valueLen);
        return;
      case 3 /* TBool */:
        return;
      case 4 /* TBytes */: {
        const size = DecodeUint64(reader, valueLen);
        reader.readBytes(Number(size));
        return;
      }
      case 5 /* TList */: {
        const count = DecodeUint64(reader, valueLen);
        for (let i = 0n; i < count; i++) {
          const { typ: elemTyp, idLen: elemIdLen, valueLen: elemValLen } = DecodeType(reader);
          if (elemIdLen === 1) {
            SkipValue(reader, elemTyp, elemValLen);
          }
        }
        return;
      }
      case 6 /* TMap */: {
        const count = DecodeUint64(reader, valueLen);
        for (let i = 0n; i < count; i++) {
          const k = DecodeType(reader);
          if (k.idLen === 1) {
            SkipValue(reader, k.typ, k.valueLen);
          }
          const v = DecodeType(reader);
          if (v.idLen === 1) {
            SkipValue(reader, v.typ, v.valueLen);
          }
        }
        return;
      }
      case 7 /* TData */: {
        SkipDataBody(reader, valueLen);
        const { idLen: eIdLen, valueLen: eValLen } = DecodeType(reader);
        if (eIdLen === 0) {
          return;
        }
        SkipDataBody(reader, eValLen);
        return;
      }
    }
    throw new HBufError("hbuf: unknown type");
  }
  function SkipDataBody(reader, valueLen) {
    const count = DecodeUint64(reader, valueLen);
    for (let i = 0n; i < count; i++) {
      const { typ, idLen, valueLen: vLen } = DecodeType(reader);
      if (idLen > 0) {
        reader.readBytes(idLen);
        SkipValue(reader, typ, vLen);
      }
    }
  }

  // src/hbuf/data.ts
  var Type = /* @__PURE__ */ ((Type3) => {
    Type3[Type3["TInt"] = 0] = "TInt";
    Type3[Type3["TUint"] = 1] = "TUint";
    Type3[Type3["TFloat"] = 2] = "TFloat";
    Type3[Type3["TBool"] = 3] = "TBool";
    Type3[Type3["TBytes"] = 4] = "TBytes";
    Type3[Type3["TList"] = 5] = "TList";
    Type3[Type3["TMap"] = 6] = "TMap";
    Type3[Type3["TData"] = 7] = "TData";
    return Type3;
  })(Type || {});
  var HBufError = class extends Error {
    constructor(msg) {
      super(msg);
      this.name = "HBufError";
    }
  };
  var ShortBufferError = class extends HBufError {
    constructor(msg = "hbuf: short buffer") {
      super(msg);
      this.name = "ShortBufferError";
    }
  };
  var Writer = class {
    constructor(capacity = 128) {
      this.len = 0;
      this.buf = new Uint8Array(capacity);
    }
    get length() {
      return this.len;
    }
    ensure(extra) {
      if (this.len + extra <= this.buf.length) {
        return;
      }
      let cap = this.buf.length * 2;
      while (cap < this.len + extra) {
        cap *= 2;
      }
      const next = new Uint8Array(cap);
      next.set(this.buf.subarray(0, this.len));
      this.buf = next;
    }
    writeByte(v) {
      this.ensure(1);
      this.buf[this.len++] = v;
    }
    writeBytes(b) {
      this.ensure(b.length);
      this.buf.set(b, this.len);
      this.len += b.length;
    }
    /** 返回已写入字节的视图（与内部缓冲共享，仅有效至下一次写入前）。 */
    toUint8Array() {
      return this.buf.subarray(0, this.len);
    }
  };
  var Reader2 = class {
    constructor(buf) {
      this.pos = 0;
      this.buf = buf;
    }
    get position() {
      return this.pos;
    }
    get remaining() {
      return this.buf.length - this.pos;
    }
    readByte() {
      if (this.pos >= this.buf.length) {
        throw new ShortBufferError();
      }
      return this.buf[this.pos++];
    }
    readBytes(n) {
      if (this.remaining < n) {
        throw new ShortBufferError();
      }
      const ret = this.buf.subarray(this.pos, this.pos + n);
      this.pos += n;
      return ret;
    }
  };
  function Marshal(data) {
    const buf = new Writer(128);
    data.descriptors().encode(buf, data, void 0);
    return buf.toUint8Array();
  }
  function Unmarshal(buf, data, desc) {
    if (buf.length === 0) {
      return;
    }
    const reader = new Reader2(buf);
    const { typ, valueLen } = DecodeType(reader);
    const d = desc ?? data.descriptors();
    d.decode(reader, typ, true, valueLen, data);
  }
  function isHData(obj) {
    return obj && typeof obj.descriptors === "function";
  }

  // src/hbuf/encoder.ts
  function WriterType(buf, typ, idLen, valueLen) {
    buf.writeByte((typ & 7) << 5 | (valueLen - 1 & 7) << 2 | idLen & 3);
  }
  function LengthId(id) {
    return id <= 255 ? 1 : 2;
  }
  function WriterId(buf, id) {
    if (id <= 255) {
      buf.writeByte(id);
    } else {
      buf.writeByte(id & 255);
      buf.writeByte(id >> 8 & 255);
    }
  }
  function LengthInt(v) {
    if (v >= -0x80n && v < 0x80n) {
      return 1;
    } else if (v >= -0x8000n && v < 0x8000n) {
      return 2;
    } else if (v >= -0x800000n && v < 0x800000n) {
      return 3;
    } else if (v >= -0x80000000n && v < 0x80000000n) {
      return 4;
    } else if (v >= -0x8000000000n && v < 0x8000000000n) {
      return 5;
    } else if (v >= -0x800000000000n && v < 0x800000000000n) {
      return 6;
    } else if (v >= -0x80000000000000n && v < 0x80000000000000n) {
      return 7;
    } else {
      return 8;
    }
  }
  function LengthUint(v) {
    if (v <= 0xFFn) {
      return 1;
    } else if (v <= 0xFFFFn) {
      return 2;
    } else if (v <= 0xFFFFFFn) {
      return 3;
    } else if (v <= 0xFFFFFFFFn) {
      return 4;
    } else if (v <= 0xFFFFFFFFFFn) {
      return 5;
    } else if (v <= 0xFFFFFFFFFFFFn) {
      return 6;
    } else if (v <= 0xFFFFFFFFFFFFFFn) {
      return 7;
    } else {
      return 8;
    }
  }
  function WriterInt64(buf, v) {
    const len = LengthInt(v);
    let val = BigInt.asIntN(len * 8, v);
    for (let i = 0; i < len; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
  }
  function EncodeUint64(buf, v) {
    const len = LengthUint(v);
    let val = v;
    for (let i = 0; i < len; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
  }
  function EncodeTime(buf, secs, nsec) {
    const low64 = (secs & 0x3FFFFFFFFn) << 30n | BigInt(nsec) & 0x3FFFFFFFn;
    const high8 = Number(secs >> 34n);
    let val = low64;
    for (let i = 0; i < 8; i++) {
      buf.writeByte(Number(val & 0xFFn));
      val >>= 8n;
    }
    buf.writeByte(high8);
  }

  // node_modules/decimal.js/decimal.mjs
  var EXP_LIMIT = 9e15;
  var MAX_DIGITS = 1e9;
  var NUMERALS = "0123456789abcdef";
  var LN10 = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058";
  var PI = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789";
  var DEFAULTS = {
    // These values must be integers within the stated ranges (inclusive).
    // Most of these values can be changed at run-time using the `Decimal.config` method.
    // The maximum number of significant digits of the result of a calculation or base conversion.
    // E.g. `Decimal.config({ precision: 20 });`
    precision: 20,
    // 1 to MAX_DIGITS
    // The rounding mode used when rounding to `precision`.
    //
    // ROUND_UP         0 Away from zero.
    // ROUND_DOWN       1 Towards zero.
    // ROUND_CEIL       2 Towards +Infinity.
    // ROUND_FLOOR      3 Towards -Infinity.
    // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    //
    // E.g.
    // `Decimal.rounding = 4;`
    // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
    rounding: 4,
    // 0 to 8
    // The modulo mode used when calculating the modulus: a mod n.
    // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
    // The remainder (r) is calculated as: r = a - n * q.
    //
    // UP         0 The remainder is positive if the dividend is negative, else is negative.
    // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
    // FLOOR      3 The remainder has the same sign as the divisor (Python %).
    // HALF_EVEN  6 The IEEE 754 remainder function.
    // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
    //
    // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
    // division (9) are commonly used for the modulus operation. The other rounding modes can also
    // be used, but they may not give useful results.
    modulo: 1,
    // 0 to 9
    // The exponent value at and beneath which `toString` returns exponential notation.
    // JavaScript numbers: -7
    toExpNeg: -7,
    // 0 to -EXP_LIMIT
    // The exponent value at and above which `toString` returns exponential notation.
    // JavaScript numbers: 21
    toExpPos: 21,
    // 0 to EXP_LIMIT
    // The minimum exponent value, beneath which underflow to zero occurs.
    // JavaScript numbers: -324  (5e-324)
    minE: -EXP_LIMIT,
    // -1 to -EXP_LIMIT
    // The maximum exponent value, above which overflow to Infinity occurs.
    // JavaScript numbers: 308  (1.7976931348623157e+308)
    maxE: EXP_LIMIT,
    // 1 to EXP_LIMIT
    // Whether to use cryptographically-secure random number generation, if available.
    crypto: false
    // true/false
  };
  var inexact;
  var quadrant;
  var external = true;
  var decimalError = "[DecimalError] ";
  var invalidArgument = decimalError + "Invalid argument: ";
  var precisionLimitExceeded = decimalError + "Precision limit exceeded";
  var cryptoUnavailable = decimalError + "crypto unavailable";
  var tag = "[object Decimal]";
  var mathfloor = Math.floor;
  var mathpow = Math.pow;
  var isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i;
  var isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i;
  var isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i;
  var isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
  var BASE = 1e7;
  var LOG_BASE = 7;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var LN10_PRECISION = LN10.length - 1;
  var PI_PRECISION = PI.length - 1;
  var P = { toStringTag: tag };
  P.absoluteValue = P.abs = function() {
    var x = new this.constructor(this);
    if (x.s < 0) x.s = 1;
    return finalise(x);
  };
  P.ceil = function() {
    return finalise(new this.constructor(this), this.e + 1, 2);
  };
  P.clampedTo = P.clamp = function(min2, max2) {
    var k, x = this, Ctor = x.constructor;
    min2 = new Ctor(min2);
    max2 = new Ctor(max2);
    if (!min2.s || !max2.s) return new Ctor(NaN);
    if (min2.gt(max2)) throw Error(invalidArgument + max2);
    k = x.cmp(min2);
    return k < 0 ? min2 : x.cmp(max2) > 0 ? max2 : new Ctor(x);
  };
  P.comparedTo = P.cmp = function(y) {
    var i, j, xdL, ydL, x = this, xd = x.d, yd = (y = new x.constructor(y)).d, xs = x.s, ys = y.s;
    if (!xd || !yd) {
      return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
    }
    if (!xd[0] || !yd[0]) return xd[0] ? xs : yd[0] ? -ys : 0;
    if (xs !== ys) return xs;
    if (x.e !== y.e) return x.e > y.e ^ xs < 0 ? 1 : -1;
    xdL = xd.length;
    ydL = yd.length;
    for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
      if (xd[i] !== yd[i]) return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
    }
    return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
  };
  P.cosine = P.cos = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.d) return new Ctor(NaN);
    if (!x.d[0]) return new Ctor(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = cosine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
  };
  P.cubeRoot = P.cbrt = function() {
    var e, m, n, r, rep, s, sd, t, t3, t3plusx, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    external = false;
    s = x.s * mathpow(x.s * x, 1 / 3);
    if (!s || Math.abs(s) == 1 / 0) {
      n = digitsToString(x.d);
      e = x.e;
      if (s = (e - n.length + 1) % 3) n += s == 1 || s == -2 ? "0" : "00";
      s = mathpow(n, 1 / 3);
      e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
      r.s = x.s;
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      t3 = t.times(t).times(t);
      t3plusx = t3.plus(x);
      r = divide(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.decimalPlaces = P.dp = function() {
    var w, d = this.d, n = NaN;
    if (d) {
      w = d.length - 1;
      n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;
      w = d[w];
      if (w) for (; w % 10 == 0; w /= 10) n--;
      if (n < 0) n = 0;
    }
    return n;
  };
  P.dividedBy = P.div = function(y) {
    return divide(this, new this.constructor(y));
  };
  P.dividedToIntegerBy = P.divToInt = function(y) {
    var x = this, Ctor = x.constructor;
    return finalise(divide(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
  };
  P.equals = P.eq = function(y) {
    return this.cmp(y) === 0;
  };
  P.floor = function() {
    return finalise(new this.constructor(this), this.e + 1, 3);
  };
  P.greaterThan = P.gt = function(y) {
    return this.cmp(y) > 0;
  };
  P.greaterThanOrEqualTo = P.gte = function(y) {
    var k = this.cmp(y);
    return k == 1 || k === 0;
  };
  P.hyperbolicCosine = P.cosh = function() {
    var k, n, pr, rm, len, x = this, Ctor = x.constructor, one = new Ctor(1);
    if (!x.isFinite()) return new Ctor(x.s ? 1 / 0 : NaN);
    if (x.isZero()) return one;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      n = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      n = "2.3283064365386962890625e-10";
    }
    x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);
    var cosh2_x, i = k, d8 = new Ctor(8);
    for (; i--; ) {
      cosh2_x = x.times(x);
      x = one.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
    }
    return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.hyperbolicSine = P.sinh = function() {
    var k, pr, rm, len, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
    Ctor.rounding = 1;
    len = x.d.length;
    if (len < 3) {
      x = taylorSeries(Ctor, 2, x, x, true);
    } else {
      k = 1.4 * Math.sqrt(len);
      k = k > 16 ? 16 : k | 0;
      x = x.times(1 / tinyPow(5, k));
      x = taylorSeries(Ctor, 2, x, x, true);
      var sinh2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
      for (; k--; ) {
        sinh2_x = x.times(x);
        x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
      }
    }
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(x, pr, rm, true);
  };
  P.hyperbolicTangent = P.tanh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(x.s);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 7;
    Ctor.rounding = 1;
    return divide(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
  };
  P.inverseCosine = P.acos = function() {
    var x = this, Ctor = x.constructor, k = x.abs().cmp(1), pr = Ctor.precision, rm = Ctor.rounding;
    if (k !== -1) {
      return k === 0 ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0) : new Ctor(NaN);
    }
    if (x.isZero()) return getPi(Ctor, pr + 4, rm).times(0.5);
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = new Ctor(1).minus(x).div(x.plus(1)).sqrt().atan();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(2);
  };
  P.inverseHyperbolicCosine = P.acosh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (x.lte(1)) return new Ctor(x.eq(1) ? 0 : NaN);
    if (!x.isFinite()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).minus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicSine = P.asinh = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite() || x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
    Ctor.rounding = 1;
    external = false;
    x = x.times(x).plus(1).sqrt().plus(x);
    external = true;
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.ln();
  };
  P.inverseHyperbolicTangent = P.atanh = function() {
    var pr, rm, wpr, xsd, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.e >= 0) return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    xsd = x.sd();
    if (Math.max(xsd, pr) < 2 * -x.e - 1) return finalise(new Ctor(x), pr, rm, true);
    Ctor.precision = wpr = xsd - x.e;
    x = divide(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);
    Ctor.precision = pr + 4;
    Ctor.rounding = 1;
    x = x.ln();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(0.5);
  };
  P.inverseSine = P.asin = function() {
    var halfPi, k, pr, rm, x = this, Ctor = x.constructor;
    if (x.isZero()) return new Ctor(x);
    k = x.abs().cmp(1);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (k !== -1) {
      if (k === 0) {
        halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
        halfPi.s = x.s;
        return halfPi;
      }
      return new Ctor(NaN);
    }
    Ctor.precision = pr + 6;
    Ctor.rounding = 1;
    x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return x.times(2);
  };
  P.inverseTangent = P.atan = function() {
    var i, j, k, n, px, t, r, wpr, x2, x = this, Ctor = x.constructor, pr = Ctor.precision, rm = Ctor.rounding;
    if (!x.isFinite()) {
      if (!x.s) return new Ctor(NaN);
      if (pr + 4 <= PI_PRECISION) {
        r = getPi(Ctor, pr + 4, rm).times(0.5);
        r.s = x.s;
        return r;
      }
    } else if (x.isZero()) {
      return new Ctor(x);
    } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
      r = getPi(Ctor, pr + 4, rm).times(0.25);
      r.s = x.s;
      return r;
    }
    Ctor.precision = wpr = pr + 10;
    Ctor.rounding = 1;
    k = Math.min(28, wpr / LOG_BASE + 2 | 0);
    for (i = k; i; --i) x = x.div(x.times(x).plus(1).sqrt().plus(1));
    external = false;
    j = Math.ceil(wpr / LOG_BASE);
    n = 1;
    x2 = x.times(x);
    r = new Ctor(x);
    px = x;
    for (; i !== -1; ) {
      px = px.times(x2);
      t = r.minus(px.div(n += 2));
      px = px.times(x2);
      r = t.plus(px.div(n += 2));
      if (r.d[j] !== void 0) for (i = j; r.d[i] === t.d[i] && i--; ) ;
    }
    if (k) r = r.times(2 << k - 1);
    external = true;
    return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
  };
  P.isFinite = function() {
    return !!this.d;
  };
  P.isInteger = P.isInt = function() {
    return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
  };
  P.isNaN = function() {
    return !this.s;
  };
  P.isNegative = P.isNeg = function() {
    return this.s < 0;
  };
  P.isPositive = P.isPos = function() {
    return this.s > 0;
  };
  P.isZero = function() {
    return !!this.d && this.d[0] === 0;
  };
  P.lessThan = P.lt = function(y) {
    return this.cmp(y) < 0;
  };
  P.lessThanOrEqualTo = P.lte = function(y) {
    return this.cmp(y) < 1;
  };
  P.logarithm = P.log = function(base) {
    var isBase10, d, denominator, k, inf, num, sd, r, arg = this, Ctor = arg.constructor, pr = Ctor.precision, rm = Ctor.rounding, guard = 5;
    if (base == null) {
      base = new Ctor(10);
      isBase10 = true;
    } else {
      base = new Ctor(base);
      d = base.d;
      if (base.s < 0 || !d || !d[0] || base.eq(1)) return new Ctor(NaN);
      isBase10 = base.eq(10);
    }
    d = arg.d;
    if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
      return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
    }
    if (isBase10) {
      if (d.length > 1) {
        inf = true;
      } else {
        for (k = d[0]; k % 10 === 0; ) k /= 10;
        inf = k !== 1;
      }
    }
    external = false;
    sd = pr + guard;
    num = naturalLogarithm(arg, sd);
    denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
    r = divide(num, denominator, sd, 1);
    if (checkRoundingDigits(r.d, k = pr, rm)) {
      do {
        sd += 10;
        num = naturalLogarithm(arg, sd);
        denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
        r = divide(num, denominator, sd, 1);
        if (!inf) {
          if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
            r = finalise(r, pr + 1, 0);
          }
          break;
        }
      } while (checkRoundingDigits(r.d, k += 10, rm));
    }
    external = true;
    return finalise(r, pr, rm);
  };
  P.minus = P.sub = function(y) {
    var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s) y = new Ctor(NaN);
      else if (x.d) y.s = -y.s;
      else y = new Ctor(y.d || x.s !== y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.plus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (yd[0]) y.s = -y.s;
      else if (xd[0]) y = new Ctor(x);
      else return new Ctor(rm === 3 ? -0 : 0);
      return external ? finalise(y, pr, rm) : y;
    }
    e = mathfloor(y.e / LOG_BASE);
    xe = mathfloor(x.e / LOG_BASE);
    xd = xd.slice();
    k = xe - e;
    if (k) {
      xLTy = k < 0;
      if (xLTy) {
        d = xd;
        k = -k;
        len = yd.length;
      } else {
        d = yd;
        e = xe;
        len = xd.length;
      }
      i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;
      if (k > i) {
        k = i;
        d.length = 1;
      }
      d.reverse();
      for (i = k; i--; ) d.push(0);
      d.reverse();
    } else {
      i = xd.length;
      len = yd.length;
      xLTy = i < len;
      if (xLTy) len = i;
      for (i = 0; i < len; i++) {
        if (xd[i] != yd[i]) {
          xLTy = xd[i] < yd[i];
          break;
        }
      }
      k = 0;
    }
    if (xLTy) {
      d = xd;
      xd = yd;
      yd = d;
      y.s = -y.s;
    }
    len = xd.length;
    for (i = yd.length - len; i > 0; --i) xd[len++] = 0;
    for (i = yd.length; i > k; ) {
      if (xd[--i] < yd[i]) {
        for (j = i; j && xd[--j] === 0; ) xd[j] = BASE - 1;
        --xd[j];
        xd[i] += BASE;
      }
      xd[i] -= yd[i];
    }
    for (; xd[--len] === 0; ) xd.pop();
    for (; xd[0] === 0; xd.shift()) --e;
    if (!xd[0]) return new Ctor(rm === 3 ? -0 : 0);
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.modulo = P.mod = function(y) {
    var q, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.s || y.d && !y.d[0]) return new Ctor(NaN);
    if (!y.d || x.d && !x.d[0]) {
      return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
    }
    external = false;
    if (Ctor.modulo == 9) {
      q = divide(x, y.abs(), 0, 3, 1);
      q.s *= y.s;
    } else {
      q = divide(x, y, 0, Ctor.modulo, 1);
    }
    q = q.times(y);
    external = true;
    return x.minus(q);
  };
  P.naturalExponential = P.exp = function() {
    return naturalExponential(this);
  };
  P.naturalLogarithm = P.ln = function() {
    return naturalLogarithm(this);
  };
  P.negated = P.neg = function() {
    var x = new this.constructor(this);
    x.s = -x.s;
    return finalise(x);
  };
  P.plus = P.add = function(y) {
    var carry, d, e, i, k, len, pr, rm, xd, yd, x = this, Ctor = x.constructor;
    y = new Ctor(y);
    if (!x.d || !y.d) {
      if (!x.s || !y.s) y = new Ctor(NaN);
      else if (!x.d) y = new Ctor(y.d || x.s === y.s ? x : NaN);
      return y;
    }
    if (x.s != y.s) {
      y.s = -y.s;
      return x.minus(y);
    }
    xd = x.d;
    yd = y.d;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (!xd[0] || !yd[0]) {
      if (!yd[0]) y = new Ctor(x);
      return external ? finalise(y, pr, rm) : y;
    }
    k = mathfloor(x.e / LOG_BASE);
    e = mathfloor(y.e / LOG_BASE);
    xd = xd.slice();
    i = k - e;
    if (i) {
      if (i < 0) {
        d = xd;
        i = -i;
        len = yd.length;
      } else {
        d = yd;
        e = k;
        len = xd.length;
      }
      k = Math.ceil(pr / LOG_BASE);
      len = k > len ? k + 1 : len + 1;
      if (i > len) {
        i = len;
        d.length = 1;
      }
      d.reverse();
      for (; i--; ) d.push(0);
      d.reverse();
    }
    len = xd.length;
    i = yd.length;
    if (len - i < 0) {
      i = len;
      d = yd;
      yd = xd;
      xd = d;
    }
    for (carry = 0; i; ) {
      carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
      xd[i] %= BASE;
    }
    if (carry) {
      xd.unshift(carry);
      ++e;
    }
    for (len = xd.length; xd[--len] == 0; ) xd.pop();
    y.d = xd;
    y.e = getBase10Exponent(xd, e);
    return external ? finalise(y, pr, rm) : y;
  };
  P.precision = P.sd = function(z) {
    var k, x = this;
    if (z !== void 0 && z !== !!z && z !== 1 && z !== 0) throw Error(invalidArgument + z);
    if (x.d) {
      k = getPrecision(x.d);
      if (z && x.e + 1 > k) k = x.e + 1;
    } else {
      k = NaN;
    }
    return k;
  };
  P.round = function() {
    var x = this, Ctor = x.constructor;
    return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
  };
  P.sine = P.sin = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
    Ctor.rounding = 1;
    x = sine(Ctor, toLessThanHalfPi(Ctor, x));
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
  };
  P.squareRoot = P.sqrt = function() {
    var m, n, sd, r, rep, t, x = this, d = x.d, e = x.e, s = x.s, Ctor = x.constructor;
    if (s !== 1 || !d || !d[0]) {
      return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
    }
    external = false;
    s = Math.sqrt(+x);
    if (s == 0 || s == 1 / 0) {
      n = digitsToString(d);
      if ((n.length + e) % 2 == 0) n += "0";
      s = Math.sqrt(n);
      e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);
      if (s == 1 / 0) {
        n = "5e" + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf("e") + 1) + e;
      }
      r = new Ctor(n);
    } else {
      r = new Ctor(s.toString());
    }
    sd = (e = Ctor.precision) + 3;
    for (; ; ) {
      t = r;
      r = t.plus(divide(x, t, sd + 2, 1)).times(0.5);
      if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
        n = n.slice(sd - 3, sd + 1);
        if (n == "9999" || !rep && n == "4999") {
          if (!rep) {
            finalise(t, e + 1, 0);
            if (t.times(t).eq(x)) {
              r = t;
              break;
            }
          }
          sd += 4;
          rep = 1;
        } else {
          if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
            finalise(r, e + 1, 1);
            m = !r.times(r).eq(x);
          }
          break;
        }
      }
    }
    external = true;
    return finalise(r, e, Ctor.rounding, m);
  };
  P.tangent = P.tan = function() {
    var pr, rm, x = this, Ctor = x.constructor;
    if (!x.isFinite()) return new Ctor(NaN);
    if (x.isZero()) return new Ctor(x);
    pr = Ctor.precision;
    rm = Ctor.rounding;
    Ctor.precision = pr + 10;
    Ctor.rounding = 1;
    x = x.sin();
    x.s = 1;
    x = divide(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);
    Ctor.precision = pr;
    Ctor.rounding = rm;
    return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
  };
  P.times = P.mul = function(y) {
    var carry, e, i, k, r, rL, t, xdL, ydL, x = this, Ctor = x.constructor, xd = x.d, yd = (y = new Ctor(y)).d;
    y.s *= x.s;
    if (!xd || !xd[0] || !yd || !yd[0]) {
      return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd ? NaN : !xd || !yd ? y.s / 0 : y.s * 0);
    }
    e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
    xdL = xd.length;
    ydL = yd.length;
    if (xdL < ydL) {
      r = xd;
      xd = yd;
      yd = r;
      rL = xdL;
      xdL = ydL;
      ydL = rL;
    }
    r = [];
    rL = xdL + ydL;
    for (i = rL; i--; ) r.push(0);
    for (i = ydL; --i >= 0; ) {
      carry = 0;
      for (k = xdL + i; k > i; ) {
        t = r[k] + yd[i] * xd[k - i - 1] + carry;
        r[k--] = t % BASE | 0;
        carry = t / BASE | 0;
      }
      r[k] = (r[k] + carry) % BASE | 0;
    }
    for (; !r[--rL]; ) r.pop();
    if (carry) ++e;
    else r.shift();
    y.d = r;
    y.e = getBase10Exponent(r, e);
    return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
  };
  P.toBinary = function(sd, rm) {
    return toStringBinary(this, 2, sd, rm);
  };
  P.toDecimalPlaces = P.toDP = function(dp, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (dp === void 0) return x;
    checkInt32(dp, 0, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
    return finalise(x, dp + x.e + 1, rm);
  };
  P.toExponential = function(dp, rm) {
    var str, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x, true);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), dp + 1, rm);
      str = finiteToString(x, true, dp + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFixed = function(dp, rm) {
    var str, y, x = this, Ctor = x.constructor;
    if (dp === void 0) {
      str = finiteToString(x);
    } else {
      checkInt32(dp, 0, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      y = finalise(new Ctor(x), dp + x.e + 1, rm);
      str = finiteToString(y, false, dp + y.e + 1);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toFraction = function(maxD) {
    var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r, x = this, xd = x.d, Ctor = x.constructor;
    if (!xd) return new Ctor(x);
    n1 = d0 = new Ctor(1);
    d1 = n0 = new Ctor(0);
    d = new Ctor(d1);
    e = d.e = getPrecision(xd) - x.e - 1;
    k = e % LOG_BASE;
    d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);
    if (maxD == null) {
      maxD = e > 0 ? d : n1;
    } else {
      n = new Ctor(maxD);
      if (!n.isInt() || n.lt(n1)) throw Error(invalidArgument + n);
      maxD = n.gt(d) ? e > 0 ? d : n1 : n;
    }
    external = false;
    n = new Ctor(digitsToString(xd));
    pr = Ctor.precision;
    Ctor.precision = e = xd.length * LOG_BASE * 2;
    for (; ; ) {
      q = divide(n, d, 0, 1, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.cmp(maxD) == 1) break;
      d0 = d1;
      d1 = d2;
      d2 = n1;
      n1 = n0.plus(q.times(d2));
      n0 = d2;
      d2 = d;
      d = n.minus(q.times(d2));
      n = d2;
    }
    d2 = divide(maxD.minus(d0), d1, 0, 1, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    r = divide(n1, d1, e, 1).minus(x).abs().cmp(divide(n0, d0, e, 1).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];
    Ctor.precision = pr;
    external = true;
    return r;
  };
  P.toHexadecimal = P.toHex = function(sd, rm) {
    return toStringBinary(this, 16, sd, rm);
  };
  P.toNearest = function(y, rm) {
    var x = this, Ctor = x.constructor;
    x = new Ctor(x);
    if (y == null) {
      if (!x.d) return x;
      y = new Ctor(1);
      rm = Ctor.rounding;
    } else {
      y = new Ctor(y);
      if (rm === void 0) {
        rm = Ctor.rounding;
      } else {
        checkInt32(rm, 0, 8);
      }
      if (!x.d) return y.s ? x : y;
      if (!y.d) {
        if (y.s) y.s = x.s;
        return y;
      }
    }
    if (y.d[0]) {
      external = false;
      x = divide(x, y, 0, rm, 1).times(y);
      external = true;
      finalise(x);
    } else {
      y.s = x.s;
      x = y;
    }
    return x;
  };
  P.toNumber = function() {
    return +this;
  };
  P.toOctal = function(sd, rm) {
    return toStringBinary(this, 8, sd, rm);
  };
  P.toPower = P.pow = function(y) {
    var e, k, pr, r, rm, s, x = this, Ctor = x.constructor, yn = +(y = new Ctor(y));
    if (!x.d || !y.d || !x.d[0] || !y.d[0]) return new Ctor(mathpow(+x, yn));
    x = new Ctor(x);
    if (x.eq(1)) return x;
    pr = Ctor.precision;
    rm = Ctor.rounding;
    if (y.eq(1)) return finalise(x, pr, rm);
    e = mathfloor(y.e / LOG_BASE);
    if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
      r = intPow(Ctor, x, k, pr);
      return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
    }
    s = x.s;
    if (s < 0) {
      if (e < y.d.length - 1) return new Ctor(NaN);
      if ((y.d[e] & 1) == 0) s = 1;
      if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
        x.s = s;
        return x;
      }
    }
    k = mathpow(+x, yn);
    e = k == 0 || !isFinite(k) ? mathfloor(yn * (Math.log("0." + digitsToString(x.d)) / Math.LN10 + x.e + 1)) : new Ctor(k + "").e;
    if (e > Ctor.maxE + 1 || e < Ctor.minE - 1) return new Ctor(e > 0 ? s / 0 : 0);
    external = false;
    Ctor.rounding = x.s = 1;
    k = Math.min(12, (e + "").length);
    r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);
    if (r.d) {
      r = finalise(r, pr + 5, 1);
      if (checkRoundingDigits(r.d, pr, rm)) {
        e = pr + 10;
        r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);
        if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
          r = finalise(r, pr + 1, 0);
        }
      }
    }
    r.s = s;
    external = true;
    Ctor.rounding = rm;
    return finalise(r, pr, rm);
  };
  P.toPrecision = function(sd, rm) {
    var str, x = this, Ctor = x.constructor;
    if (sd === void 0) {
      str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
      x = finalise(new Ctor(x), sd, rm);
      str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
    }
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.toSignificantDigits = P.toSD = function(sd, rm) {
    var x = this, Ctor = x.constructor;
    if (sd === void 0) {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    } else {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
    }
    return finalise(new Ctor(x), sd, rm);
  };
  P.toString = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() && !x.isZero() ? "-" + str : str;
  };
  P.truncated = P.trunc = function() {
    return finalise(new this.constructor(this), this.e + 1, 1);
  };
  P.valueOf = P.toJSON = function() {
    var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
    return x.isNeg() ? "-" + str : str;
  };
  function digitsToString(d) {
    var i, k, ws, indexOfLastWord = d.length - 1, str = "", w = d[0];
    if (indexOfLastWord > 0) {
      str += w;
      for (i = 1; i < indexOfLastWord; i++) {
        ws = d[i] + "";
        k = LOG_BASE - ws.length;
        if (k) str += getZeroString(k);
        str += ws;
      }
      w = d[i];
      ws = w + "";
      k = LOG_BASE - ws.length;
      if (k) str += getZeroString(k);
    } else if (w === 0) {
      return "0";
    }
    for (; w % 10 === 0; ) w /= 10;
    return str + w;
  }
  function checkInt32(i, min2, max2) {
    if (i !== ~~i || i < min2 || i > max2) {
      throw Error(invalidArgument + i);
    }
  }
  function checkRoundingDigits(d, i, rm, repeating) {
    var di, k, r, rd;
    for (k = d[0]; k >= 10; k /= 10) --i;
    if (--i < 0) {
      i += LOG_BASE;
      di = 0;
    } else {
      di = Math.ceil((i + 1) / LOG_BASE);
      i %= LOG_BASE;
    }
    k = mathpow(10, LOG_BASE - i);
    rd = d[di] % k | 0;
    if (repeating == null) {
      if (i < 3) {
        if (i == 0) rd = rd / 100 | 0;
        else if (i == 1) rd = rd / 10 | 0;
        r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 5e4 || rd == 0;
      } else {
        r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 || (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
      }
    } else {
      if (i < 4) {
        if (i == 0) rd = rd / 1e3 | 0;
        else if (i == 1) rd = rd / 100 | 0;
        else if (i == 2) rd = rd / 10 | 0;
        r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
      } else {
        r = ((repeating || rm < 4) && rd + 1 == k || !repeating && rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 1e3 | 0) == mathpow(10, i - 3) - 1;
      }
    }
    return r;
  }
  function convertBase(str, baseIn, baseOut) {
    var j, arr = [0], arrL, i = 0, strL = str.length;
    for (; i < strL; ) {
      for (arrL = arr.length; arrL--; ) arr[arrL] *= baseIn;
      arr[0] += NUMERALS.indexOf(str.charAt(i++));
      for (j = 0; j < arr.length; j++) {
        if (arr[j] > baseOut - 1) {
          if (arr[j + 1] === void 0) arr[j + 1] = 0;
          arr[j + 1] += arr[j] / baseOut | 0;
          arr[j] %= baseOut;
        }
      }
    }
    return arr.reverse();
  }
  function cosine(Ctor, x) {
    var k, len, y;
    if (x.isZero()) return x;
    len = x.d.length;
    if (len < 32) {
      k = Math.ceil(len / 3);
      y = (1 / tinyPow(4, k)).toString();
    } else {
      k = 16;
      y = "2.3283064365386962890625e-10";
    }
    Ctor.precision += k;
    x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));
    for (var i = k; i--; ) {
      var cos2x = x.times(x);
      x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
    }
    Ctor.precision -= k;
    return x;
  }
  var divide = /* @__PURE__ */ (function() {
    function multiplyInteger(x, k, base) {
      var temp, carry = 0, i = x.length;
      for (x = x.slice(); i--; ) {
        temp = x[i] * k + carry;
        x[i] = temp % base | 0;
        carry = temp / base | 0;
      }
      if (carry) x.unshift(carry);
      return x;
    }
    function compare(a, b, aL, bL) {
      var i, r;
      if (aL != bL) {
        r = aL > bL ? 1 : -1;
      } else {
        for (i = r = 0; i < aL; i++) {
          if (a[i] != b[i]) {
            r = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }
      return r;
    }
    function subtract(a, b, aL, base) {
      var i = 0;
      for (; aL--; ) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base + a[aL] - b[aL];
      }
      for (; !a[0] && a.length > 1; ) a.shift();
    }
    return function(x, y, pr, rm, dp, base) {
      var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0, yL, yz, Ctor = x.constructor, sign2 = x.s == y.s ? 1 : -1, xd = x.d, yd = y.d;
      if (!xd || !xd[0] || !yd || !yd[0]) {
        return new Ctor(
          // Return NaN if either NaN, or both Infinity or 0.
          !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN : (
            // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
            xd && xd[0] == 0 || !yd ? sign2 * 0 : sign2 / 0
          )
        );
      }
      if (base) {
        logBase = 1;
        e = x.e - y.e;
      } else {
        base = BASE;
        logBase = LOG_BASE;
        e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
      }
      yL = yd.length;
      xL = xd.length;
      q = new Ctor(sign2);
      qd = q.d = [];
      for (i = 0; yd[i] == (xd[i] || 0); i++) ;
      if (yd[i] > (xd[i] || 0)) e--;
      if (pr == null) {
        sd = pr = Ctor.precision;
        rm = Ctor.rounding;
      } else if (dp) {
        sd = pr + (x.e - y.e) + 1;
      } else {
        sd = pr;
      }
      if (sd < 0) {
        qd.push(1);
        more = true;
      } else {
        sd = sd / logBase + 2 | 0;
        i = 0;
        if (yL == 1) {
          k = 0;
          yd = yd[0];
          sd++;
          for (; (i < xL || k) && sd--; i++) {
            t = k * base + (xd[i] || 0);
            qd[i] = t / yd | 0;
            k = t % yd | 0;
          }
          more = k || i < xL;
        } else {
          k = base / (yd[0] + 1) | 0;
          if (k > 1) {
            yd = multiplyInteger(yd, k, base);
            xd = multiplyInteger(xd, k, base);
            yL = yd.length;
            xL = xd.length;
          }
          xi = yL;
          rem = xd.slice(0, yL);
          remL = rem.length;
          for (; remL < yL; ) rem[remL++] = 0;
          yz = yd.slice();
          yz.unshift(0);
          yd0 = yd[0];
          if (yd[1] >= base / 2) ++yd0;
          do {
            k = 0;
            cmp = compare(yd, rem, yL, remL);
            if (cmp < 0) {
              rem0 = rem[0];
              if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
              k = rem0 / yd0 | 0;
              if (k > 1) {
                if (k >= base) k = base - 1;
                prod = multiplyInteger(yd, k, base);
                prodL = prod.length;
                remL = rem.length;
                cmp = compare(prod, rem, prodL, remL);
                if (cmp == 1) {
                  k--;
                  subtract(prod, yL < prodL ? yz : yd, prodL, base);
                }
              } else {
                if (k == 0) cmp = k = 1;
                prod = yd.slice();
              }
              prodL = prod.length;
              if (prodL < remL) prod.unshift(0);
              subtract(rem, prod, remL, base);
              if (cmp == -1) {
                remL = rem.length;
                cmp = compare(yd, rem, yL, remL);
                if (cmp < 1) {
                  k++;
                  subtract(rem, yL < remL ? yz : yd, remL, base);
                }
              }
              remL = rem.length;
            } else if (cmp === 0) {
              k++;
              rem = [0];
            }
            qd[i++] = k;
            if (cmp && rem[0]) {
              rem[remL++] = xd[xi] || 0;
            } else {
              rem = [xd[xi]];
              remL = 1;
            }
          } while ((xi++ < xL || rem[0] !== void 0) && sd--);
          more = rem[0] !== void 0;
        }
        if (!qd[0]) qd.shift();
      }
      if (logBase == 1) {
        q.e = e;
        inexact = more;
      } else {
        for (i = 1, k = qd[0]; k >= 10; k /= 10) i++;
        q.e = i + e * logBase - 1;
        finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
      }
      return q;
    };
  })();
  function finalise(x, sd, rm, isTruncated) {
    var digits, i, j, k, rd, roundUp, w, xd, xdi, Ctor = x.constructor;
    out: if (sd != null) {
      xd = x.d;
      if (!xd) return x;
      for (digits = 1, k = xd[0]; k >= 10; k /= 10) digits++;
      i = sd - digits;
      if (i < 0) {
        i += LOG_BASE;
        j = sd;
        w = xd[xdi = 0];
        rd = w / mathpow(10, digits - j - 1) % 10 | 0;
      } else {
        xdi = Math.ceil((i + 1) / LOG_BASE);
        k = xd.length;
        if (xdi >= k) {
          if (isTruncated) {
            for (; k++ <= xdi; ) xd.push(0);
            w = rd = 0;
            digits = 1;
            i %= LOG_BASE;
            j = i - LOG_BASE + 1;
          } else {
            break out;
          }
        } else {
          w = k = xd[xdi];
          for (digits = 1; k >= 10; k /= 10) digits++;
          i %= LOG_BASE;
          j = i - LOG_BASE + digits;
          rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
        }
      }
      isTruncated = isTruncated || sd < 0 || xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));
      roundUp = rm < 4 ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
      (i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
      if (sd < 1 || !xd[0]) {
        xd.length = 0;
        if (roundUp) {
          sd -= x.e + 1;
          xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
          x.e = -sd || 0;
        } else {
          xd[0] = x.e = 0;
        }
        return x;
      }
      if (i == 0) {
        xd.length = xdi;
        k = 1;
        xdi--;
      } else {
        xd.length = xdi + 1;
        k = mathpow(10, LOG_BASE - i);
        xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
      }
      if (roundUp) {
        for (; ; ) {
          if (xdi == 0) {
            for (i = 1, j = xd[0]; j >= 10; j /= 10) i++;
            j = xd[0] += k;
            for (k = 1; j >= 10; j /= 10) k++;
            if (i != k) {
              x.e++;
              if (xd[0] == BASE) xd[0] = 1;
            }
            break;
          } else {
            xd[xdi] += k;
            if (xd[xdi] != BASE) break;
            xd[xdi--] = 0;
            k = 1;
          }
        }
      }
      for (i = xd.length; xd[--i] === 0; ) xd.pop();
    }
    if (external) {
      if (x.e > Ctor.maxE) {
        x.d = null;
        x.e = NaN;
      } else if (x.e < Ctor.minE) {
        x.e = 0;
        x.d = [0];
      }
    }
    return x;
  }
  function finiteToString(x, isExp, sd) {
    if (!x.isFinite()) return nonFiniteToString(x);
    var k, e = x.e, str = digitsToString(x.d), len = str.length;
    if (isExp) {
      if (sd && (k = sd - len) > 0) {
        str = str.charAt(0) + "." + str.slice(1) + getZeroString(k);
      } else if (len > 1) {
        str = str.charAt(0) + "." + str.slice(1);
      }
      str = str + (x.e < 0 ? "e" : "e+") + x.e;
    } else if (e < 0) {
      str = "0." + getZeroString(-e - 1) + str;
      if (sd && (k = sd - len) > 0) str += getZeroString(k);
    } else if (e >= len) {
      str += getZeroString(e + 1 - len);
      if (sd && (k = sd - e - 1) > 0) str = str + "." + getZeroString(k);
    } else {
      if ((k = e + 1) < len) str = str.slice(0, k) + "." + str.slice(k);
      if (sd && (k = sd - len) > 0) {
        if (e + 1 === len) str += ".";
        str += getZeroString(k);
      }
    }
    return str;
  }
  function getBase10Exponent(digits, e) {
    var w = digits[0];
    for (e *= LOG_BASE; w >= 10; w /= 10) e++;
    return e;
  }
  function getLn10(Ctor, sd, pr) {
    if (sd > LN10_PRECISION) {
      external = true;
      if (pr) Ctor.precision = pr;
      throw Error(precisionLimitExceeded);
    }
    return finalise(new Ctor(LN10), sd, 1, true);
  }
  function getPi(Ctor, sd, rm) {
    if (sd > PI_PRECISION) throw Error(precisionLimitExceeded);
    return finalise(new Ctor(PI), sd, rm, true);
  }
  function getPrecision(digits) {
    var w = digits.length - 1, len = w * LOG_BASE + 1;
    w = digits[w];
    if (w) {
      for (; w % 10 == 0; w /= 10) len--;
      for (w = digits[0]; w >= 10; w /= 10) len++;
    }
    return len;
  }
  function getZeroString(k) {
    var zs = "";
    for (; k--; ) zs += "0";
    return zs;
  }
  function intPow(Ctor, x, n, pr) {
    var isTruncated, r = new Ctor(1), k = Math.ceil(pr / LOG_BASE + 4);
    external = false;
    for (; ; ) {
      if (n % 2) {
        r = r.times(x);
        if (truncate(r.d, k)) isTruncated = true;
      }
      n = mathfloor(n / 2);
      if (n === 0) {
        n = r.d.length - 1;
        if (isTruncated && r.d[n] === 0) ++r.d[n];
        break;
      }
      x = x.times(x);
      truncate(x.d, k);
    }
    external = true;
    return r;
  }
  function isOdd(n) {
    return n.d[n.d.length - 1] & 1;
  }
  function maxOrMin(Ctor, args, n) {
    var k, y, x = new Ctor(args[0]), i = 0;
    for (; ++i < args.length; ) {
      y = new Ctor(args[i]);
      if (!y.s) {
        x = y;
        break;
      }
      k = x.cmp(y);
      if (k === n || k === 0 && x.s === n) {
        x = y;
      }
    }
    return x;
  }
  function naturalExponential(x, sd) {
    var denominator, guard, j, pow2, sum2, t, wpr, rep = 0, i = 0, k = 0, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (!x.d || !x.d[0] || x.e > 17) {
      return new Ctor(x.d ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0 : x.s ? x.s < 0 ? 0 : x : 0 / 0);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    t = new Ctor(0.03125);
    while (x.e > -2) {
      x = x.times(t);
      k += 5;
    }
    guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
    wpr += guard;
    denominator = pow2 = sum2 = new Ctor(1);
    Ctor.precision = wpr;
    for (; ; ) {
      pow2 = finalise(pow2.times(x), wpr, 1);
      denominator = denominator.times(++i);
      t = sum2.plus(divide(pow2, denominator, wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
        j = k;
        while (j--) sum2 = finalise(sum2.times(sum2), wpr, 1);
        if (sd == null) {
          if (rep < 3 && checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += 10;
            denominator = pow2 = t = new Ctor(1);
            i = 0;
            rep++;
          } else {
            return finalise(sum2, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum2;
        }
      }
      sum2 = t;
    }
  }
  function naturalLogarithm(y, sd) {
    var c, c0, denominator, e, numerator, rep, sum2, t, wpr, x1, x2, n = 1, guard = 10, x = y, xd = x.d, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
    if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
      return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
    }
    if (sd == null) {
      external = false;
      wpr = pr;
    } else {
      wpr = sd;
    }
    Ctor.precision = wpr += guard;
    c = digitsToString(xd);
    c0 = c.charAt(0);
    if (Math.abs(e = x.e) < 15e14) {
      while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
        x = x.times(y);
        c = digitsToString(x.d);
        c0 = c.charAt(0);
        n++;
      }
      e = x.e;
      if (c0 > 1) {
        x = new Ctor("0." + c);
        e++;
      } else {
        x = new Ctor(c0 + "." + c.slice(1));
      }
    } else {
      t = getLn10(Ctor, wpr + 2, pr).times(e + "");
      x = naturalLogarithm(new Ctor(c0 + "." + c.slice(1)), wpr - guard).plus(t);
      Ctor.precision = pr;
      return sd == null ? finalise(x, pr, rm, external = true) : x;
    }
    x1 = x;
    sum2 = numerator = x = divide(x.minus(1), x.plus(1), wpr, 1);
    x2 = finalise(x.times(x), wpr, 1);
    denominator = 3;
    for (; ; ) {
      numerator = finalise(numerator.times(x2), wpr, 1);
      t = sum2.plus(divide(numerator, new Ctor(denominator), wpr, 1));
      if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
        sum2 = sum2.times(2);
        if (e !== 0) sum2 = sum2.plus(getLn10(Ctor, wpr + 2, pr).times(e + ""));
        sum2 = divide(sum2, new Ctor(n), wpr, 1);
        if (sd == null) {
          if (checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
            Ctor.precision = wpr += guard;
            t = numerator = x = divide(x1.minus(1), x1.plus(1), wpr, 1);
            x2 = finalise(x.times(x), wpr, 1);
            denominator = rep = 1;
          } else {
            return finalise(sum2, Ctor.precision = pr, rm, external = true);
          }
        } else {
          Ctor.precision = pr;
          return sum2;
        }
      }
      sum2 = t;
      denominator += 2;
    }
  }
  function nonFiniteToString(x) {
    return String(x.s * x.s / 0);
  }
  function parseDecimal(x, str) {
    var e, i, len;
    if ((e = str.indexOf(".")) > -1) str = str.replace(".", "");
    if ((i = str.search(/e/i)) > 0) {
      if (e < 0) e = i;
      e += +str.slice(i + 1);
      str = str.substring(0, i);
    } else if (e < 0) {
      e = str.length;
    }
    for (i = 0; str.charCodeAt(i) === 48; i++) ;
    for (len = str.length; str.charCodeAt(len - 1) === 48; --len) ;
    str = str.slice(i, len);
    if (str) {
      len -= i;
      x.e = e = e - i - 1;
      x.d = [];
      i = (e + 1) % LOG_BASE;
      if (e < 0) i += LOG_BASE;
      if (i < len) {
        if (i) x.d.push(+str.slice(0, i));
        for (len -= LOG_BASE; i < len; ) x.d.push(+str.slice(i, i += LOG_BASE));
        str = str.slice(i);
        i = LOG_BASE - str.length;
      } else {
        i -= len;
      }
      for (; i--; ) str += "0";
      x.d.push(+str);
      if (external) {
        if (x.e > x.constructor.maxE) {
          x.d = null;
          x.e = NaN;
        } else if (x.e < x.constructor.minE) {
          x.e = 0;
          x.d = [0];
        }
      }
    } else {
      x.e = 0;
      x.d = [0];
    }
    return x;
  }
  function parseOther(x, str) {
    var base, Ctor, divisor, i, isFloat, len, p, xd, xe;
    if (str.indexOf("_") > -1) {
      str = str.replace(/(\d)_(?=\d)/g, "$1");
      if (isDecimal.test(str)) return parseDecimal(x, str);
    } else if (str === "Infinity" || str === "NaN") {
      if (!+str) x.s = NaN;
      x.e = NaN;
      x.d = null;
      return x;
    }
    if (isHex.test(str)) {
      base = 16;
      str = str.toLowerCase();
    } else if (isBinary.test(str)) {
      base = 2;
    } else if (isOctal.test(str)) {
      base = 8;
    } else {
      throw Error(invalidArgument + str);
    }
    i = str.search(/p/i);
    if (i > 0) {
      p = +str.slice(i + 1);
      str = str.substring(2, i);
    } else {
      str = str.slice(2);
    }
    i = str.indexOf(".");
    isFloat = i >= 0;
    Ctor = x.constructor;
    if (isFloat) {
      str = str.replace(".", "");
      len = str.length;
      i = len - i;
      divisor = intPow(Ctor, new Ctor(base), i, i * 2);
    }
    xd = convertBase(str, base, BASE);
    xe = xd.length - 1;
    for (i = xe; xd[i] === 0; --i) xd.pop();
    if (i < 0) return new Ctor(x.s * 0);
    x.e = getBase10Exponent(xd, xe);
    x.d = xd;
    external = false;
    if (isFloat) x = divide(x, divisor, len * 4);
    if (p) x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
    external = true;
    return x;
  }
  function sine(Ctor, x) {
    var k, len = x.d.length;
    if (len < 3) {
      return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
    }
    k = 1.4 * Math.sqrt(len);
    k = k > 16 ? 16 : k | 0;
    x = x.times(1 / tinyPow(5, k));
    x = taylorSeries(Ctor, 2, x, x);
    var sin2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
    for (; k--; ) {
      sin2_x = x.times(x);
      x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
    }
    return x;
  }
  function taylorSeries(Ctor, n, x, y, isHyperbolic) {
    var j, t, u, x2, i = 1, pr = Ctor.precision, k = Math.ceil(pr / LOG_BASE);
    external = false;
    x2 = x.times(x);
    u = new Ctor(y);
    for (; ; ) {
      t = divide(u.times(x2), new Ctor(n++ * n++), pr, 1);
      u = isHyperbolic ? y.plus(t) : y.minus(t);
      y = divide(t.times(x2), new Ctor(n++ * n++), pr, 1);
      t = u.plus(y);
      if (t.d[k] !== void 0) {
        for (j = k; t.d[j] === u.d[j] && j--; ) ;
        if (j == -1) break;
      }
      j = u;
      u = y;
      y = t;
      t = j;
      i++;
    }
    external = true;
    t.d.length = k + 1;
    return t;
  }
  function tinyPow(b, e) {
    var n = b;
    while (--e) n *= b;
    return n;
  }
  function toLessThanHalfPi(Ctor, x) {
    var t, isNeg = x.s < 0, pi = getPi(Ctor, Ctor.precision, 1), halfPi = pi.times(0.5);
    x = x.abs();
    if (x.lte(halfPi)) {
      quadrant = isNeg ? 4 : 1;
      return x;
    }
    t = x.divToInt(pi);
    if (t.isZero()) {
      quadrant = isNeg ? 3 : 2;
    } else {
      x = x.minus(t.times(pi));
      if (x.lte(halfPi)) {
        quadrant = isOdd(t) ? isNeg ? 2 : 3 : isNeg ? 4 : 1;
        return x;
      }
      quadrant = isOdd(t) ? isNeg ? 1 : 4 : isNeg ? 3 : 2;
    }
    return x.minus(pi).abs();
  }
  function toStringBinary(x, baseOut, sd, rm) {
    var base, e, i, k, len, roundUp, str, xd, y, Ctor = x.constructor, isExp = sd !== void 0;
    if (isExp) {
      checkInt32(sd, 1, MAX_DIGITS);
      if (rm === void 0) rm = Ctor.rounding;
      else checkInt32(rm, 0, 8);
    } else {
      sd = Ctor.precision;
      rm = Ctor.rounding;
    }
    if (!x.isFinite()) {
      str = nonFiniteToString(x);
    } else {
      str = finiteToString(x);
      i = str.indexOf(".");
      if (isExp) {
        base = 2;
        if (baseOut == 16) {
          sd = sd * 4 - 3;
        } else if (baseOut == 8) {
          sd = sd * 3 - 2;
        }
      } else {
        base = baseOut;
      }
      if (i >= 0) {
        str = str.replace(".", "");
        y = new Ctor(1);
        y.e = str.length - i;
        y.d = convertBase(finiteToString(y), 10, base);
        y.e = y.d.length;
      }
      xd = convertBase(str, 10, base);
      e = len = xd.length;
      for (; xd[--len] == 0; ) xd.pop();
      if (!xd[0]) {
        str = isExp ? "0p+0" : "0";
      } else {
        if (i < 0) {
          e--;
        } else {
          x = new Ctor(x);
          x.d = xd;
          x.e = e;
          x = divide(x, y, sd, rm, 0, base);
          xd = x.d;
          e = x.e;
          roundUp = inexact;
        }
        i = xd[sd];
        k = base / 2;
        roundUp = roundUp || xd[sd + 1] !== void 0;
        roundUp = rm < 4 ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2)) : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 || rm === (x.s < 0 ? 8 : 7));
        xd.length = sd;
        if (roundUp) {
          for (; ++xd[--sd] > base - 1; ) {
            xd[sd] = 0;
            if (!sd) {
              ++e;
              xd.unshift(1);
            }
          }
        }
        for (len = xd.length; !xd[len - 1]; --len) ;
        for (i = 0, str = ""; i < len; i++) str += NUMERALS.charAt(xd[i]);
        if (isExp) {
          if (len > 1) {
            if (baseOut == 16 || baseOut == 8) {
              i = baseOut == 16 ? 4 : 3;
              for (--len; len % i; len++) str += "0";
              xd = convertBase(str, base, baseOut);
              for (len = xd.length; !xd[len - 1]; --len) ;
              for (i = 1, str = "1."; i < len; i++) str += NUMERALS.charAt(xd[i]);
            } else {
              str = str.charAt(0) + "." + str.slice(1);
            }
          }
          str = str + (e < 0 ? "p" : "p+") + e;
        } else if (e < 0) {
          for (; ++e; ) str = "0" + str;
          str = "0." + str;
        } else {
          if (++e > len) for (e -= len; e--; ) str += "0";
          else if (e < len) str = str.slice(0, e) + "." + str.slice(e);
        }
      }
      str = (baseOut == 16 ? "0x" : baseOut == 2 ? "0b" : baseOut == 8 ? "0o" : "") + str;
    }
    return x.s < 0 ? "-" + str : str;
  }
  function truncate(arr, len) {
    if (arr.length > len) {
      arr.length = len;
      return true;
    }
  }
  function abs(x) {
    return new this(x).abs();
  }
  function acos(x) {
    return new this(x).acos();
  }
  function acosh(x) {
    return new this(x).acosh();
  }
  function add(x, y) {
    return new this(x).plus(y);
  }
  function asin(x) {
    return new this(x).asin();
  }
  function asinh(x) {
    return new this(x).asinh();
  }
  function atan(x) {
    return new this(x).atan();
  }
  function atanh(x) {
    return new this(x).atanh();
  }
  function atan2(y, x) {
    y = new this(y);
    x = new this(x);
    var r, pr = this.precision, rm = this.rounding, wpr = pr + 4;
    if (!y.s || !x.s) {
      r = new this(NaN);
    } else if (!y.d && !x.d) {
      r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
      r.s = y.s;
    } else if (!x.d || y.isZero()) {
      r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
      r.s = y.s;
    } else if (!y.d || x.isZero()) {
      r = getPi(this, wpr, 1).times(0.5);
      r.s = y.s;
    } else if (x.s < 0) {
      this.precision = wpr;
      this.rounding = 1;
      r = this.atan(divide(y, x, wpr, 1));
      x = getPi(this, wpr, 1);
      this.precision = pr;
      this.rounding = rm;
      r = y.s < 0 ? r.minus(x) : r.plus(x);
    } else {
      r = this.atan(divide(y, x, wpr, 1));
    }
    return r;
  }
  function cbrt(x) {
    return new this(x).cbrt();
  }
  function ceil(x) {
    return finalise(x = new this(x), x.e + 1, 2);
  }
  function clamp(x, min2, max2) {
    return new this(x).clamp(min2, max2);
  }
  function config(obj) {
    if (!obj || typeof obj !== "object") throw Error(decimalError + "Object expected");
    var i, p, v, useDefaults = obj.defaults === true, ps = [
      "precision",
      1,
      MAX_DIGITS,
      "rounding",
      0,
      8,
      "toExpNeg",
      -EXP_LIMIT,
      0,
      "toExpPos",
      0,
      EXP_LIMIT,
      "maxE",
      0,
      EXP_LIMIT,
      "minE",
      -EXP_LIMIT,
      0,
      "modulo",
      0,
      9
    ];
    for (i = 0; i < ps.length; i += 3) {
      if (p = ps[i], useDefaults) this[p] = DEFAULTS[p];
      if ((v = obj[p]) !== void 0) {
        if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2]) this[p] = v;
        else throw Error(invalidArgument + p + ": " + v);
      }
    }
    if (p = "crypto", useDefaults) this[p] = DEFAULTS[p];
    if ((v = obj[p]) !== void 0) {
      if (v === true || v === false || v === 0 || v === 1) {
        if (v) {
          if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
            this[p] = true;
          } else {
            throw Error(cryptoUnavailable);
          }
        } else {
          this[p] = false;
        }
      } else {
        throw Error(invalidArgument + p + ": " + v);
      }
    }
    return this;
  }
  function cos(x) {
    return new this(x).cos();
  }
  function cosh(x) {
    return new this(x).cosh();
  }
  function clone(obj) {
    var i, p, ps;
    function Decimal2(v) {
      var e, i2, t, x = this;
      if (!(x instanceof Decimal2)) return new Decimal2(v);
      x.constructor = Decimal2;
      if (isDecimalInstance(v)) {
        x.s = v.s;
        if (external) {
          if (!v.d || v.e > Decimal2.maxE) {
            x.e = NaN;
            x.d = null;
          } else if (v.e < Decimal2.minE) {
            x.e = 0;
            x.d = [0];
          } else {
            x.e = v.e;
            x.d = v.d.slice();
          }
        } else {
          x.e = v.e;
          x.d = v.d ? v.d.slice() : v.d;
        }
        return;
      }
      t = typeof v;
      if (t === "number") {
        if (v === 0) {
          x.s = 1 / v < 0 ? -1 : 1;
          x.e = 0;
          x.d = [0];
          return;
        }
        if (v < 0) {
          v = -v;
          x.s = -1;
        } else {
          x.s = 1;
        }
        if (v === ~~v && v < 1e7) {
          for (e = 0, i2 = v; i2 >= 10; i2 /= 10) e++;
          if (external) {
            if (e > Decimal2.maxE) {
              x.e = NaN;
              x.d = null;
            } else if (e < Decimal2.minE) {
              x.e = 0;
              x.d = [0];
            } else {
              x.e = e;
              x.d = [v];
            }
          } else {
            x.e = e;
            x.d = [v];
          }
          return;
        }
        if (v * 0 !== 0) {
          if (!v) x.s = NaN;
          x.e = NaN;
          x.d = null;
          return;
        }
        return parseDecimal(x, v.toString());
      }
      if (t === "string") {
        if ((i2 = v.charCodeAt(0)) === 45) {
          v = v.slice(1);
          x.s = -1;
        } else {
          if (i2 === 43) v = v.slice(1);
          x.s = 1;
        }
        return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
      }
      if (t === "bigint") {
        if (v < 0) {
          v = -v;
          x.s = -1;
        } else {
          x.s = 1;
        }
        return parseDecimal(x, v.toString());
      }
      throw Error(invalidArgument + v);
    }
    Decimal2.prototype = P;
    Decimal2.ROUND_UP = 0;
    Decimal2.ROUND_DOWN = 1;
    Decimal2.ROUND_CEIL = 2;
    Decimal2.ROUND_FLOOR = 3;
    Decimal2.ROUND_HALF_UP = 4;
    Decimal2.ROUND_HALF_DOWN = 5;
    Decimal2.ROUND_HALF_EVEN = 6;
    Decimal2.ROUND_HALF_CEIL = 7;
    Decimal2.ROUND_HALF_FLOOR = 8;
    Decimal2.EUCLID = 9;
    Decimal2.config = Decimal2.set = config;
    Decimal2.clone = clone;
    Decimal2.isDecimal = isDecimalInstance;
    Decimal2.abs = abs;
    Decimal2.acos = acos;
    Decimal2.acosh = acosh;
    Decimal2.add = add;
    Decimal2.asin = asin;
    Decimal2.asinh = asinh;
    Decimal2.atan = atan;
    Decimal2.atanh = atanh;
    Decimal2.atan2 = atan2;
    Decimal2.cbrt = cbrt;
    Decimal2.ceil = ceil;
    Decimal2.clamp = clamp;
    Decimal2.cos = cos;
    Decimal2.cosh = cosh;
    Decimal2.div = div;
    Decimal2.exp = exp;
    Decimal2.floor = floor;
    Decimal2.hypot = hypot;
    Decimal2.ln = ln;
    Decimal2.log = log;
    Decimal2.log10 = log10;
    Decimal2.log2 = log2;
    Decimal2.max = max;
    Decimal2.min = min;
    Decimal2.mod = mod;
    Decimal2.mul = mul;
    Decimal2.pow = pow;
    Decimal2.random = random;
    Decimal2.round = round;
    Decimal2.sign = sign;
    Decimal2.sin = sin;
    Decimal2.sinh = sinh;
    Decimal2.sqrt = sqrt;
    Decimal2.sub = sub;
    Decimal2.sum = sum;
    Decimal2.tan = tan;
    Decimal2.tanh = tanh;
    Decimal2.trunc = trunc;
    if (obj === void 0) obj = {};
    if (obj) {
      if (obj.defaults !== true) {
        ps = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"];
        for (i = 0; i < ps.length; ) if (!obj.hasOwnProperty(p = ps[i++])) obj[p] = this[p];
      }
    }
    Decimal2.config(obj);
    return Decimal2;
  }
  function div(x, y) {
    return new this(x).div(y);
  }
  function exp(x) {
    return new this(x).exp();
  }
  function floor(x) {
    return finalise(x = new this(x), x.e + 1, 3);
  }
  function hypot() {
    var i, n, t = new this(0);
    external = false;
    for (i = 0; i < arguments.length; ) {
      n = new this(arguments[i++]);
      if (!n.d) {
        if (n.s) {
          external = true;
          return new this(1 / 0);
        }
        t = n;
      } else if (t.d) {
        t = t.plus(n.times(n));
      }
    }
    external = true;
    return t.sqrt();
  }
  function isDecimalInstance(obj) {
    return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
  }
  function ln(x) {
    return new this(x).ln();
  }
  function log(x, y) {
    return new this(x).log(y);
  }
  function log2(x) {
    return new this(x).log(2);
  }
  function log10(x) {
    return new this(x).log(10);
  }
  function max() {
    return maxOrMin(this, arguments, -1);
  }
  function min() {
    return maxOrMin(this, arguments, 1);
  }
  function mod(x, y) {
    return new this(x).mod(y);
  }
  function mul(x, y) {
    return new this(x).mul(y);
  }
  function pow(x, y) {
    return new this(x).pow(y);
  }
  function random(sd) {
    var d, e, k, n, i = 0, r = new this(1), rd = [];
    if (sd === void 0) sd = this.precision;
    else checkInt32(sd, 1, MAX_DIGITS);
    k = Math.ceil(sd / LOG_BASE);
    if (!this.crypto) {
      for (; i < k; ) rd[i++] = Math.random() * 1e7 | 0;
    } else if (crypto.getRandomValues) {
      d = crypto.getRandomValues(new Uint32Array(k));
      for (; i < k; ) {
        n = d[i];
        if (n >= 429e7) {
          d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
        } else {
          rd[i++] = n % 1e7;
        }
      }
    } else if (crypto.randomBytes) {
      d = crypto.randomBytes(k *= 4);
      for (; i < k; ) {
        n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 127) << 24);
        if (n >= 214e7) {
          crypto.randomBytes(4).copy(d, i);
        } else {
          rd.push(n % 1e7);
          i += 4;
        }
      }
      i = k / 4;
    } else {
      throw Error(cryptoUnavailable);
    }
    k = rd[--i];
    sd %= LOG_BASE;
    if (k && sd) {
      n = mathpow(10, LOG_BASE - sd);
      rd[i] = (k / n | 0) * n;
    }
    for (; rd[i] === 0; i--) rd.pop();
    if (i < 0) {
      e = 0;
      rd = [0];
    } else {
      e = -1;
      for (; rd[0] === 0; e -= LOG_BASE) rd.shift();
      for (k = 1, n = rd[0]; n >= 10; n /= 10) k++;
      if (k < LOG_BASE) e -= LOG_BASE - k;
    }
    r.e = e;
    r.d = rd;
    return r;
  }
  function round(x) {
    return finalise(x = new this(x), x.e + 1, this.rounding);
  }
  function sign(x) {
    x = new this(x);
    return x.d ? x.d[0] ? x.s : 0 * x.s : x.s || NaN;
  }
  function sin(x) {
    return new this(x).sin();
  }
  function sinh(x) {
    return new this(x).sinh();
  }
  function sqrt(x) {
    return new this(x).sqrt();
  }
  function sub(x, y) {
    return new this(x).sub(y);
  }
  function sum() {
    var i = 0, args = arguments, x = new this(args[i]);
    external = false;
    for (; x.s && ++i < args.length; ) x = x.plus(args[i]);
    external = true;
    return finalise(x, this.precision, this.rounding);
  }
  function tan(x) {
    return new this(x).tan();
  }
  function tanh(x) {
    return new this(x).tanh();
  }
  function trunc(x) {
    return finalise(x = new this(x), x.e + 1, 1);
  }
  P[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = P.toString;
  P[Symbol.toStringTag] = "Decimal";
  var Decimal = P.constructor = clone(DEFAULTS);
  LN10 = new Decimal(LN10);
  PI = new Decimal(PI);
  var decimal_default = Decimal;

  // src/hbuf/descriptor.ts
  var utf8Encoder = new TextEncoder();
  var utf8Decoder = new TextDecoder("utf-8");
  function utf8Encode(str) {
    return utf8Encoder.encode(str);
  }
  function utf8Decode(b) {
    return utf8Decoder.decode(b);
  }
  var f32View = new Float32Array(1);
  var f32Bits = new Uint32Array(f32View.buffer);
  var f64View = new Float64Array(1);
  var f64Bits = new BigUint64Array(f64View.buffer);
  function Float32Bits(v) {
    f32View[0] = v;
    return BigInt(f32Bits[0]);
  }
  function Float32FromBits(b) {
    f32Bits[0] = Number(b & 0xFFFFFFFFn);
    return f32View[0];
  }
  function Float64Bits(v) {
    f64View[0] = v;
    return f64Bits[0];
  }
  function Float64FromBits(b) {
    f64Bits[0] = b;
    return f64View[0];
  }
  function DateToTime(v) {
    const ms = v.getTime();
    return {
      secs: BigInt(Math.floor(ms / 1e3)),
      nsec: ms % 1e3 * 1e6
    };
  }
  function TimeToDate(secs, nsec) {
    return new Date(Number(secs) * 1e3 + Math.floor(nsec / 1e6));
  }
  var IntBase = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    /** 元素零值空标记的 idLen（uint8 特例为 2）。 */
    emptyIdLen() {
      return 0;
    }
    isEmptyField(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === this.zero();
    }
    isEmpty(v) {
      return this.isEmptyField(v);
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmptyField(v)) {
          return;
        }
        const val = this.toBigInt(v);
        WriterType(buf, this.typ(), LengthId(id), this.length(val));
        WriterId(buf, id);
        this.writeValue(buf, val);
      } else {
        if (v == null) {
          WriterType(buf, this.typ(), this.isPtr ? 0 : this.emptyIdLen(), 1);
          return;
        }
        const val = this.toBigInt(v);
        if (val === 0n) {
          WriterType(buf, this.typ(), this.emptyIdLen(), 1);
          return;
        }
        WriterType(buf, this.typ(), 1, this.length(val));
        this.writeValue(buf, val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? 1n : 0n;
          break;
        case 0 /* TInt */:
          val = valRead ? DecodeInt64(r, valueLen) : 0n;
          break;
        case 1 /* TUint */:
          val = valRead ? DecodeUint64(r, valueLen) : 0n;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = 0n;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = BigInt(Math.trunc(valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)));
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = 0n;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = BigInt(utf8Decode(r.readBytes(Number(size))));
          break;
        }
        default:
          throw new HBufError("invalid int type");
      }
      return this.fromBigInt(val);
    }
  };
  var SignedInt = class extends IntBase {
    constructor(isPtr, bits) {
      super(isPtr);
      this.bits = bits;
    }
    factory() {
      return 0;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "number" || typeof json === "string") {
          return Number(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v;
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    typ() {
      return 0 /* TInt */;
    }
    length(v) {
      return LengthInt(v);
    }
    writeValue(buf, v) {
      WriterInt64(buf, v);
    }
    toBigInt(v) {
      return BigInt.asIntN(this.bits, BigInt(v));
    }
    fromBigInt(v) {
      return Number(BigInt.asIntN(this.bits, v));
    }
  };
  var SignedLong = class extends IntBase {
    factory() {
      return 0n;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "number" || typeof json === "string") {
          return BigInt(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v == null ? null : v.toString();
    }
    constructor(isPtr) {
      super(isPtr);
    }
    zero() {
      return this.isPtr ? null : 0n;
    }
    typ() {
      return 0 /* TInt */;
    }
    length(v) {
      return LengthInt(v);
    }
    writeValue(buf, v) {
      WriterInt64(buf, v);
    }
    toBigInt(v) {
      return typeof v === "bigint" ? v : BigInt(v);
    }
    fromBigInt(v) {
      return BigInt.asIntN(64, v);
    }
  };
  var UnsignedInt = class extends IntBase {
    constructor(isPtr, bits) {
      super(isPtr);
      this.bits = bits;
    }
    factory() {
      return 0;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "number" || typeof json === "string") {
          return Number(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v;
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    typ() {
      return 1 /* TUint */;
    }
    length(v) {
      return LengthUint(v);
    }
    writeValue(buf, v) {
      EncodeUint64(buf, v);
    }
    toBigInt(v) {
      return BigInt.asUintN(this.bits, BigInt(v));
    }
    fromBigInt(v) {
      return Number(BigInt.asUintN(this.bits, v));
    }
  };
  var UnsignedLong = class extends IntBase {
    factory() {
      return 0n;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "number" || typeof json === "string") {
          return BigInt(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v == null ? null : v.toString();
    }
    constructor(isPtr) {
      super(isPtr);
    }
    zero() {
      return this.isPtr ? null : 0n;
    }
    typ() {
      return 1 /* TUint */;
    }
    length(v) {
      return LengthUint(v);
    }
    writeValue(buf, v) {
      EncodeUint64(buf, v);
    }
    toBigInt(v) {
      return typeof v === "bigint" ? v : BigInt(v);
    }
    fromBigInt(v) {
      return BigInt.asUintN(64, v);
    }
  };
  var Uint8Impl = class extends UnsignedInt {
    constructor(isPtr) {
      super(isPtr, 8);
    }
    emptyIdLen() {
      return 2;
    }
    isEmptyField(v) {
      return v == null || v === 0;
    }
  };
  var Int8Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 8);
    }
  };
  var Int16Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 16);
    }
  };
  var Int32Descriptor = class extends SignedInt {
    constructor(isPtr = false) {
      super(isPtr, 32);
    }
  };
  var Int64Descriptor = class extends SignedLong {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var Uint8Descriptor = class extends Uint8Impl {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var Uint16Descriptor = class extends UnsignedInt {
    constructor(isPtr = false) {
      super(isPtr, 16);
    }
  };
  var Uint32Descriptor = class extends UnsignedInt {
    constructor(isPtr = false) {
      super(isPtr, 32);
    }
  };
  var Uint64Descriptor = class extends UnsignedLong {
    constructor(isPtr = false) {
      super(isPtr);
    }
  };
  var FloatBase = class {
    constructor(isPtr = false, isDouble) {
      this.isPtr = isPtr;
      this.isDouble = isDouble;
    }
    factory() {
      return 0;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "number" || typeof json === "string") {
          return Number(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v == null ? null : this.isDouble ? v : Math.fround(v);
    }
    isEmptyField(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === 0;
    }
    isEmpty(v) {
      return this.isEmptyField(v);
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmptyField(v)) {
          return;
        }
        const val = this.toBits(v);
        WriterType(buf, 2 /* TFloat */, LengthId(id), LengthUint(val));
        WriterId(buf, id);
        EncodeUint64(buf, val);
      } else {
        if (v == null) {
          WriterType(buf, 2 /* TFloat */, 0, 1);
          return;
        }
        const val = this.toBits(v);
        if (val === 0n) {
          WriterType(buf, 2 /* TFloat */, 0, 1);
          return;
        }
        WriterType(buf, 2 /* TFloat */, 1, LengthUint(val));
        EncodeUint64(buf, val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? 1 : 0;
          break;
        case 0 /* TInt */:
          val = valRead ? Number(DecodeInt64(r, valueLen)) : 0;
          break;
        case 1 /* TUint */:
          val = valRead ? Number(DecodeUint64(r, valueLen)) : 0;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = 0;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits);
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = 0;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = Number(utf8Decode(r.readBytes(Number(size))));
          break;
        }
        default:
          throw new HBufError("invalid float type");
      }
      return this.isDouble ? val : Math.fround(val);
    }
  };
  var FloatDescriptor = class extends FloatBase {
    constructor(isPtr = false) {
      super(isPtr, false);
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    toBits(v) {
      return Float32Bits(Math.fround(v));
    }
  };
  var DoubleDescriptor = class extends FloatBase {
    constructor(isPtr = false) {
      super(isPtr, true);
    }
    zero() {
      return this.isPtr ? null : 0;
    }
    toBits(v) {
      return Float64Bits(v);
    }
  };
  var BoolDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return false;
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "boolean" || typeof json === "string") {
          return Boolean(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v;
    }
    zero() {
      return this.isPtr ? null : false;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v === false;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null || !this.isPtr && v === false) {
          return;
        }
        WriterType(buf, 3 /* TBool */, LengthId(id), v ? 2 : 1);
        WriterId(buf, id);
      } else {
        if (v == null) {
          WriterType(buf, 3 /* TBool */, 0, 1);
          return;
        }
        WriterType(buf, 3 /* TBool */, 1, v ? 2 : 1);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2;
          break;
        case 0 /* TInt */:
          val = valRead && DecodeInt64(r, valueLen) !== 0n;
          break;
        case 1 /* TUint */:
          val = valRead && DecodeUint64(r, valueLen) !== 0n;
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = false;
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) !== 0 : Float64FromBits(bits) !== 0;
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = false;
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = "true" === utf8Decode(r.readBytes(Number(size))).toLowerCase();
          break;
        }
        default:
          throw new HBufError("invalid bool type");
      }
      return val;
    }
  };
  var StringDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return "";
    }
    fromJson(json) {
      if (json !== null) {
        if (typeof json === "string" || typeof json === "number" || typeof json === "boolean") {
          return String(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v;
    }
    zero() {
      return this.isPtr ? null : "";
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        const val = utf8Encode(v);
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        const val = utf8Encode(v);
        if (val.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? "true" : "false";
          break;
        case 0 /* TInt */:
          val = valRead ? DecodeInt64(r, valueLen).toString() : "";
          break;
        case 1 /* TUint */:
          val = valRead ? DecodeUint64(r, valueLen).toString() : "";
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = "";
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = (valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString();
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = "";
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = utf8Decode(r.readBytes(Number(size)));
          break;
        }
        default:
          throw new HBufError("invalid string type");
      }
      return val;
    }
  };
  var BytesDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return new ArrayBuffer(0);
    }
    fromJson(json) {
      return json;
    }
    toJson(v) {
      return v;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(v.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.length));
        buf.writeBytes(v);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        if (v.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(v.length)));
        EncodeUint64(buf, BigInt(v.length));
        buf.writeBytes(v);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = utf8Encode(valueLen === 2 ? "true" : "false");
          break;
        case 0 /* TInt */:
          val = valRead ? utf8Encode(DecodeInt64(r, valueLen).toString()) : new Uint8Array(0);
          break;
        case 1 /* TUint */:
          val = valRead ? utf8Encode(DecodeUint64(r, valueLen).toString()) : new Uint8Array(0);
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = new Uint8Array(0);
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = utf8Encode((valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString());
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = new Uint8Array(0);
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = r.readBytes(Number(size));
          break;
        }
        default:
          throw new HBufError("invalid bytes type");
      }
      return val;
    }
  };
  var TimeDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return /* @__PURE__ */ new Date(0);
    }
    fromJson(json) {
      if (json != null) {
        if (typeof json === "number" || typeof json === "string") {
          return new Date(Number(json));
        }
      }
      return null;
    }
    toJson(v) {
      return v == null ? null : String(v.getTime());
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        WriterType(buf, 4 /* TBytes */, LengthId(id), 1);
        WriterId(buf, id);
        EncodeUint64(buf, 9n);
        const { secs, nsec } = DateToTime(v);
        EncodeTime(buf, secs, nsec);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, 1);
        EncodeUint64(buf, 9n);
        const { secs, nsec } = DateToTime(v);
        EncodeTime(buf, secs, nsec);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 4 /* TBytes */) {
        throw new HBufError("invalid time type");
      }
      if (!valRead) {
        return null;
      }
      const size = DecodeUint64(r, valueLen);
      if (size !== 9n) {
        throw new HBufError("invalid time type");
      }
      const { secs, nsec } = DecodeTime(r);
      return TimeToDate(secs, nsec);
    }
  };
  function DecimalToStr(v) {
    if (v instanceof decimal_default) {
      return v.toFixed(Math.max(0, v.decimalPlaces()));
    }
    return String(v);
  }
  var DecimalDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return new decimal_default(0);
    }
    fromJson(json) {
      if (json != null) {
        if (typeof json === "string" || typeof json === "number") {
          return new decimal_default(json);
        }
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      return v == null ? null : DecimalToStr(v);
    }
    zero() {
      return this.isPtr ? null : new decimal_default(0);
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && Number(v) === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        const val = utf8Encode(DecimalToStr(v));
        WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      } else {
        if (v == null) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        const val = utf8Encode(DecimalToStr(v));
        if (Number(v) === 0 || val.length === 0) {
          WriterType(buf, 4 /* TBytes */, 0, 1);
          return;
        }
        WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
        EncodeUint64(buf, BigInt(val.length));
        buf.writeBytes(val);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      let val;
      switch (typ) {
        case 3 /* TBool */:
          val = valueLen === 2 ? new decimal_default(1) : new decimal_default(0);
          break;
        case 0 /* TInt */:
          val = new decimal_default(valRead ? DecodeInt64(r, valueLen).toString() : "0");
          break;
        case 1 /* TUint */:
          val = new decimal_default(valRead ? DecodeUint64(r, valueLen).toString() : "0");
          break;
        case 2 /* TFloat */: {
          if (!valRead) {
            val = new decimal_default(0);
            break;
          }
          const bits = DecodeUint64(r, valueLen);
          val = new decimal_default((valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString());
          break;
        }
        case 4 /* TBytes */: {
          if (!valRead) {
            val = new decimal_default(0);
            break;
          }
          const size = DecodeUint64(r, valueLen);
          val = new decimal_default(utf8Decode(r.readBytes(Number(size))));
          break;
        }
        default:
          throw new HBufError("invalid decimal type");
      }
      return val;
    }
  };
  var ListDescriptor = class {
    constructor(desc, isPtr = false) {
      this.desc = desc;
      this.isPtr = isPtr;
    }
    factory() {
      return [];
    }
    fromJson(json) {
      if (Array.isArray(json)) {
        const list = [];
        for (const item of json) {
          list.push(this.desc.fromJson(item));
        }
        return list;
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      if (v == null) {
        return null;
      }
      const list = [];
      for (const item of v) {
        list.push(this.desc.toJson(item));
      }
      return list;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.length === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 5 /* TList */, LengthId(id), LengthUint(BigInt(v.length)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.length));
      } else {
        if (v == null) {
          WriterType(buf, 5 /* TList */, 0, 1);
          return;
        }
        if (v.length === 0) {
          WriterType(buf, 5 /* TList */, 0, 1);
          return;
        }
        WriterType(buf, 5 /* TList */, 1, LengthUint(BigInt(v.length)));
        EncodeUint64(buf, BigInt(v.length));
      }
      for (const item of v) {
        this.desc.encode(buf, item, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 5 /* TList */) {
        throw new HBufError("invalid list type");
      }
      if (!valRead) {
        return void 0;
      }
      const count = DecodeUint64(r, valueLen);
      if (count === 0n) {
        return void 0;
      }
      const list = [];
      for (let i = 0n; i < count; i++) {
        const { typ: t, idLen, valueLen: vLen } = DecodeType(r);
        if (idLen > 0) {
          list.push(this.desc.decode(r, t, idLen === 1, vLen) ?? null);
        } else {
          list.push(this.desc.zero());
        }
      }
      return list;
    }
  };
  var MapDescriptor = class {
    constructor(keyDesc, valueDesc, isPtr = false) {
      this.keyDesc = keyDesc;
      this.valueDesc = valueDesc;
      this.isPtr = isPtr;
    }
    factory() {
      return /* @__PURE__ */ new Map();
    }
    fromJson(json) {
      if (json != null) {
        const _json = json;
        const map = /* @__PURE__ */ new Map();
        for (const [k, v] of Object.entries(_json)) {
          map.set(this.keyDesc.fromJson(k), this.valueDesc.fromJson(v));
        }
        return map;
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(val) {
      if (val == null) {
        return null;
      }
      const map = {};
      for (const [k, v] of val) {
        map[String(this.keyDesc.toJson(k))] = this.valueDesc.toJson(v);
      }
      return map;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      if (v == null) {
        return true;
      }
      return !this.isPtr && v.size === 0;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (this.isEmpty(v)) {
          return;
        }
        WriterType(buf, 6 /* TMap */, LengthId(id), LengthUint(BigInt(v.size)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(v.size));
      } else {
        if (v == null) {
          WriterType(buf, 6 /* TMap */, 0, 1);
          return;
        }
        if (v.size === 0) {
          WriterType(buf, 6 /* TMap */, 0, 1);
          return;
        }
        WriterType(buf, 6 /* TMap */, 1, LengthUint(BigInt(v.size)));
        EncodeUint64(buf, BigInt(v.size));
      }
      for (const [k, val] of v) {
        this.keyDesc.encode(buf, k, void 0);
        this.valueDesc.encode(buf, val, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 6 /* TMap */) {
        throw new HBufError("invalid map type");
      }
      if (!valRead) {
        return void 0;
      }
      const count = DecodeUint64(r, valueLen);
      if (count === 0n) {
        return void 0;
      }
      const m = /* @__PURE__ */ new Map();
      for (let i = 0n; i < count; i++) {
        let { typ: t, idLen, valueLen: vLen } = DecodeType(r);
        const k = idLen > 0 ? this.keyDesc.decode(r, t, idLen === 1, vLen) ?? null : this.keyDesc.zero();
        ({ typ: t, idLen, valueLen: vLen } = DecodeType(r));
        const val = idLen > 0 ? this.valueDesc.decode(r, t, idLen === 1, vLen) ?? null : this.valueDesc.zero();
        m.set(k, val);
      }
      return m;
    }
  };
  var DataDescriptor = class {
    constructor(factory, fields, extends_ = /* @__PURE__ */ new Map(), isPtr = false) {
      this.factory = factory;
      this.isPtr = isPtr;
      this.fields = Array.from(fields, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
      this.fieldMap = fields;
      this.extends_ = Array.from(extends_, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
      this.extendMap = extends_;
    }
    fromJson(json) {
      if (json != null) {
        const ret = this.factory();
        for (const field of this.fields) {
          const _json = json;
          field.set(ret, field.desc.fromJson(_json[field.name]));
        }
        return ret;
      }
      return this.isPtr ? null : this.factory();
    }
    toJson(v) {
      if (v == null) {
        return null;
      }
      const ret = {};
      for (const field of this.fields) {
        ret[field.name] = field.desc.toJson(field.get(v));
      }
      return ret;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        let count = 0;
        for (const f of this.fields) {
          if (!f.desc.isEmpty(f.get(v))) {
            count++;
          }
        }
        WriterType(buf, 7 /* TData */, LengthId(id), LengthUint(BigInt(count)));
        WriterId(buf, id);
        EncodeUint64(buf, BigInt(count));
      } else {
        if (v == null) {
          if (this.isPtr) {
            WriterType(buf, 7 /* TData */, 0, 1);
          } else {
            WriterType(buf, 7 /* TData */, 1, 1);
            EncodeUint64(buf, 0n);
            WriterType(buf, 0 /* TInt */, 0, 1);
          }
          return;
        }
        let count = 0;
        for (const f of this.fields) {
          if (!f.desc.isEmpty(f.get(v))) {
            count++;
          }
        }
        WriterType(buf, 7 /* TData */, 1, LengthUint(BigInt(count)));
        EncodeUint64(buf, BigInt(count));
      }
      for (const f of this.fields) {
        const val = f.get(v);
        if (!f.desc.isEmpty(val)) {
          f.desc.encode(buf, val, f.id);
        }
      }
      if (this.extends_.length === 0) {
        WriterType(buf, 0 /* TInt */, 0, 1);
      } else {
        WriterType(buf, 0 /* TInt */, 1, LengthUint(BigInt(this.extends_.length)));
        EncodeUint64(buf, BigInt(this.extends_.length));
        for (const f of this.extends_) {
          const val = f.get(v);
          if (!f.desc.isEmpty(val)) {
            f.desc.encode(buf, val, f.id);
          }
        }
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      if (typ !== 7 /* TData */) {
        throw new HBufError("invalid data type");
      }
      const v = this.isPtr ? this.factory() : target ?? this.factory();
      const count = valRead ? DecodeUint64(r, valueLen) : 0n;
      for (let i = 0n; i < count; i++) {
        const { typ: t, idLen: idLen2, valueLen: vLen } = DecodeType(r);
        const id = DecodeId(r, idLen2);
        const field = this.fieldMap.get(id);
        if (field) {
          const cur = field.get(v);
          const dv = field.desc.decode(r, t, true, vLen, cur);
          if (dv !== void 0) {
            field.set(v, dv);
          }
        } else {
          SkipValue(r, t, vLen);
        }
      }
      const { idLen, valueLen: eValLen } = DecodeType(r);
      if (idLen > 0) {
        const extCount = DecodeUint64(r, eValLen);
        for (let i = 0n; i < extCount; i++) {
          const { typ: t, idLen: eIdLen, valueLen: eVLen } = DecodeType(r);
          const id = DecodeId(r, eIdLen);
          const field = this.extendMap.get(id);
          if (field) {
            const cur = field.get(v);
            const dv = field.desc.decode(r, t, true, eVLen, cur);
            if (dv !== void 0) {
              field.set(v, dv);
            }
          } else {
            SkipValue(r, t, eVLen);
          }
        }
      }
      if (count === 0n && !this.isPtr && target !== void 0) {
        return void 0;
      }
      return v;
    }
  };
  var RefDescriptor = class {
    constructor(desc, isPtr = false) {
      this.desc = desc;
      this.isPtr = isPtr;
    }
    factory() {
      return this.desc.factory();
    }
    toJson(v) {
      if (v == null) {
        return null;
      }
      return this.desc.toJson(v);
    }
    fromJson(json) {
      if (json == null && this.isPtr) {
        return null;
      }
      return this.desc.fromJson(json);
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      if (id !== void 0) {
        if (v == null) {
          return;
        }
        this.desc.encode(buf, v, id);
      } else {
        if (v == null) {
          if (this.isPtr) {
            WriterType(buf, 7 /* TData */, 0, 1);
          } else {
            this.desc.encode(buf, null, void 0);
          }
          return;
        }
        this.desc.encode(buf, v, void 0);
      }
    }
    decode(r, typ, valRead, valueLen, target) {
      return this.desc.decode(r, typ, valRead, valueLen, this.isPtr ? void 0 : target);
    }
  };
  var SyncDescriptor = class {
    constructor(f) {
      this.f = f;
    }
    factory() {
      return this.Desc().factory();
    }
    toJson(v) {
      return this.Desc().toJson(v);
    }
    fromJson(json) {
      return this.Desc().fromJson(json);
    }
    Desc() {
      if (!this.cached) {
        this.cached = this.f();
      }
      return this.cached;
    }
    zero() {
      return this.Desc().zero();
    }
    isEmpty(v) {
      return this.Desc().isEmpty(v);
    }
    encode(buf, v, id) {
      this.Desc().encode(buf, v, id);
    }
    decode(r, typ, valRead, valueLen, target) {
      return this.Desc().decode(r, typ, valRead, valueLen, target);
    }
  };

  // src/hrpc/rpc.ts
  var Error2 = class {
    constructor(code, msg) {
      this.code = code;
      this.msg = msg;
    }
    descriptors() {
      return errorDesc;
    }
  };
  var Result = class extends Error2 {
    constructor(code, msg, data, desc) {
      super(code, msg);
      this.data = data;
      this.desc = desc;
    }
    descriptors() {
      const dataDesc = this.desc ?? (isHData(this.data) ? this.data.descriptors() : void 0);
      return NewResultDesc(dataDesc);
    }
  };
  var errorDesc = new DataDescriptor(
    () => new Error2(0, ""),
    /* @__PURE__ */ new Map([
      [1, {
        name: "code",
        desc: new Int32Descriptor(),
        get: (o) => o.code,
        set: (o, v) => o.code = v
      }],
      [2, {
        name: "msg",
        desc: new StringDescriptor(),
        get: (o) => o.msg,
        set: (o, v) => o.msg = v
      }]
    ])
  );
  function NewResultDesc(dataDesc) {
    const fields = /* @__PURE__ */ new Map([
      [1, {
        name: "code",
        desc: new Int32Descriptor(),
        get: (o) => o.code,
        set: (o, v) => o.code = v
      }],
      [2, {
        name: "msg",
        desc: new StringDescriptor(),
        get: (o) => o.msg,
        set: (o, v) => o.msg = v
      }]
    ]);
    if (dataDesc) {
      fields.set(3, {
        name: "data",
        desc: new RefDescriptor(dataDesc, true),
        get: (o) => o.data,
        set: (o, v) => o.data = v
      });
    }
    return new DataDescriptor(
      () => new Result(0, ""),
      fields
    );
  }
  var JsonDescriptor = class {
    constructor(isPtr = false) {
      this.isPtr = isPtr;
    }
    factory() {
      return null;
    }
    fromJson(json) {
      if (json == null) {
        return this.isPtr ? null : void 0;
      }
      return json;
    }
    toJson(v) {
      return v == null ? null : v;
    }
    zero() {
      return null;
    }
    isEmpty(v) {
      return v == null;
    }
    encode(buf, v, id) {
      throw new HBufError("json descriptor: encode not supported");
    }
    decode(r, typ, valRead, valueLen, target) {
      throw new HBufError("json descriptor: decode not supported");
    }
  };
  function NewJsonDecoder() {
    const decoder = new TextDecoder("utf-8");
    return (buffer, desc) => {
      const str = decoder.decode(buffer);
      return desc.fromJson(JSON.parse(str));
    };
  }
  function NewJsonEncode() {
    const encoder = new TextEncoder();
    return (v) => {
      const str = JSON.stringify(v.descriptors().toJson(v));
      return encoder.encode(str).buffer;
    };
  }
  function NewHBufEncode() {
    return (v) => {
      return Marshal(v).slice().buffer;
    };
  }
  function NewHBufDecoder() {
    return (buffer, desc) => {
      const data = desc.factory();
      Unmarshal(new Uint8Array(buffer), data, desc);
      return data;
    };
  }
  var Client = class {
    constructor(request, option) {
      this.request = request;
      this.middleware = (next) => {
        for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
          next = option.middleware[i](next);
        }
        return next;
      };
    }
    invoke(id, name, method, request, desc) {
      name = name.replace(/^\/+|\/+$/g, "") + "/";
      return this.middleware(async (req, opt) => {
        const resp = await this.request(name + method, desc == null, req, desc, opt);
        if (desc) {
          if (resp.code !== 0) {
            throw resp;
          }
          return resp.data;
        }
        return resp;
      })(request, { method, headers: new Headers() });
    }
  };
  var Server = class {
    constructor(option) {
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
      this.methods = {};
      this.middleware = (next) => {
        for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
          next = option.middleware[i](next);
        }
        return next;
      };
    }
    register(id, name, methods) {
      name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
      for (const method of methods) {
        const key = method.name.replace(/|\/+$/g, "");
        this.methods[name + key] = method;
      }
    }
    unRegister(id, name) {
      name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
      for (const key in this.methods) {
        if (key.startsWith(name)) {
          delete this.methods[key];
        }
      }
    }
    async response(path, req) {
      path = "/" + path.replace(/^\/+|\/+$/g, "");
      const method = this.methods[path];
      if (!method) {
        throw new Error2(-1, "Method not found");
      }
      let val = req;
      if (method.desc) {
        if (req instanceof ArrayBuffer || req instanceof Uint8Array) {
          const buf = req instanceof ArrayBuffer ? req : req.buffer.slice(req.byteOffset, req.byteOffset + req.byteLength);
          val = this.decode(buf, method.desc);
        } else {
          val = method.desc.fromJson(req);
        }
      }
      return await this.middleware(method.handler)(val);
    }
  };

  // src/utils/tools.ts
  async function waiting(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), Math.max(time, 0));
    });
  }
  function convertArray(list, call) {
    if (null == list) {
      return null;
    }
    let ret = new Array(list.length);
    for (const key in list) {
      ret[key] = call(list[key]);
    }
    return ret;
  }
  var RecordEntry = class {
    get val() {
      return this._val;
    }
    get key() {
      return this._key;
    }
    constructor(key, val) {
      this._key = key;
      this._val = val;
    }
  };
  function convertRecord(record, call) {
    if (null == record) {
      return null;
    }
    let ret = {};
    for (const key in record) {
      let val = call(key, record[key]);
      ret[val.key] = val.val;
    }
    return ret;
  }
  function isRecord(o) {
    return Object.getPrototypeOf({}) === Object.getPrototypeOf(o);
  }
  function isArray(o) {
    return Object.getPrototypeOf([]) === Object.getPrototypeOf(o);
  }
  function formatDate(date, format) {
    if (!format) format = "YYYY-MM-DD";
    switch (typeof date) {
      case "string":
        date = new Date(date.replace(/-/g, "/"));
        break;
      case "number":
        date = new Date(date);
        break;
    }
    if (date instanceof Date) {
      const dict = {
        YYYY: date.getFullYear(),
        M: date.getMonth() + 1,
        D: date.getDate(),
        H: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds(),
        S: date.getMilliseconds(),
        MM: ("" + (date.getMonth() + 101)).substring(1),
        DD: ("" + (date.getDate() + 100)).substring(1),
        HH: ("" + (date.getHours() + 100)).substring(1),
        mm: ("" + (date.getMinutes() + 100)).substring(1),
        ss: ("" + (date.getSeconds() + 100)).substring(1),
        SS: ("" + (date.getMilliseconds() + 100)).substring(1)
      };
      return format.replace(/(YYYY|MM?|DD?|HH?|ss?|mm?|SS?)/g, function() {
        return dict[arguments[0]];
      });
    }
    return "" + date;
  }
  function isData(obj) {
    return obj && typeof obj.descriptors === "function";
  }
  var BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function traceId() {
    const milli = BigInt(Date.now());
    const randBuf = new Uint8Array(9);
    crypto.getRandomValues(randBuf);
    let random65 = 0n;
    for (let i = 0; i < 9; i++) {
      random65 = random65 << 8n | BigInt(randBuf[i]);
    }
    random65 = random65 & (1n << 65n) - 1n;
    let num = milli << 65n | random65;
    const result = new Array(18);
    const target = 62n;
    for (let i = 17; i >= 0; i--) {
      const rem = num % target;
      num = num / target;
      result[i] = BASE62_CHARS[Number(rem)];
    }
    return result.join("");
  }

  // src/hrpc/http.ts
  var HttpClient = class {
    constructor(base, option) {
      this.base = base.replace(/^\/+|\/+$/g, "") + "/";
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, desc, opt) {
      const body = isData(req) ? this.encode(req) : req;
      const resp = await this.fetch(path, body, opt);
      if (desc) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, NewResultDesc(desc));
      } else {
        return resp;
      }
    }
    async fetch(path, body, opt) {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", this.base + path);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("X-Trace-Id", opt?.traceId ?? traceId());
      xhr.send(body);
      return new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => {
          reject(new Error("Network Error"));
        };
      });
    }
  };
  var FetchClient = class {
    constructor(base, option) {
      this.base = base.replace(/^\/+|\/+$/g, "") + "/";
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, desc, opt) {
      const body = isData(req) ? this.encode(req) : req;
      const resp = await this.fetch(path, body, opt);
      if (desc) {
        return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, NewResultDesc(desc));
      } else {
        return resp;
      }
    }
    async fetch(path, body, opt) {
      const headers = opt?.headers ?? new Headers();
      headers.append("X-Trace-Id", opt?.traceId ?? traceId());
      const res = await fetch(this.base + path, {
        method: "POST",
        body,
        headers
      });
      if (res.ok) {
        return res.arrayBuffer();
      } else {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
    }
  };

  // src/hrpc/websocket.ts
  var WebSocketData = class {
    constructor(type, id, path, data) {
      this.type = type;
      this.id = id;
      this.path = path;
      this.data = data;
    }
    descriptors() {
      const dataDesc = isHData(this.data) ? this.data.descriptors() : jsonDesc;
      return webSocketDataDesc(dataDesc);
    }
  };
  var jsonDesc = new JsonDescriptor(true);
  function webSocketDataDesc(dataDesc) {
    return new DataDescriptor(
      () => new WebSocketData(0 /* Request */),
      /* @__PURE__ */ new Map([
        [1, { name: "type", desc: new Uint8Descriptor(), get: (o) => o.type, set: (o, v) => o.type = v }],
        [2, { name: "header", desc: new MapDescriptor(new StringDescriptor(), new ListDescriptor(new StringDescriptor()), true), get: (o) => o.header, set: (o, v) => o.header = v }],
        [3, { name: "id", desc: new Int64Descriptor(true), get: (o) => o.id, set: (o, v) => o.id = v }],
        [4, { name: "path", desc: new StringDescriptor(true), get: (o) => o.path, set: (o, v) => o.path = v }],
        [5, { name: "status", desc: new Int32Descriptor(true), get: (o) => o.status, set: (o, v) => o.status = v }],
        [6, { name: "data", desc: new RefDescriptor(dataDesc, true), get: (o) => o.data, set: (o, v) => o.data = v }]
      ])
    );
  }
  var FetchPromise = class {
    constructor(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }
  };
  var WebSocketClient = class {
    constructor(baseUrl, server, option) {
      this.requestId = 0n;
      this.requestMap = /* @__PURE__ */ new Map();
      this.readTimeout = 3e4;
      this.heartbeat = 3e4;
      this.interval = null;
      this.headTimeout = false;
      this.baseUrl = baseUrl;
      this.server = server;
      this.readTimeout = option?.readTimeout ?? 3e4;
      this.heartbeat = option?.heartbeat ?? 3e4;
      this.decode = option?.decode ?? NewJsonDecoder();
      this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, desc, opt) {
      this.requestId++;
      let data = new WebSocketData(
        notification ? 2 /* Notification */ : 0 /* Request */,
        this.requestId,
        path
      );
      if (opt?.headers) {
        const header = /* @__PURE__ */ new Map();
        opt.headers.forEach((value, key) => {
          header.set(key, (header.get(key) || []).concat(value));
        });
        data.header = header;
      }
      if (req instanceof Blob) {
        req = await req.arrayBuffer();
      }
      data.data = req;
      const body = this.encode(data);
      const promise = new Promise((resolve, reject) => {
        let timer;
        const p = new FetchPromise((value) => {
          if (this.requestMap.delete(data.id)) {
            clearTimeout(timer);
            resolve(value);
          }
        }, (e) => {
          if (this.requestMap.delete(data.id)) {
            clearTimeout(timer);
            reject(e);
          }
        });
        if (!notification) {
          timer = setTimeout(() => {
            if (this.requestMap.delete(data.id)) {
              reject("timeout");
            }
          }, this.readTimeout);
          this.requestMap.set(data.id, p);
        }
      });
      this.socket?.send(body);
      if (notification) {
        return;
      }
      data = await promise;
      if (desc) {
        return NewResultDesc(desc).fromJson(data.data);
      }
      return data.data;
    }
    connect(protocols) {
      let url = this.baseUrl;
      return new Promise((resolve, r) => {
        let reject = r;
        clearInterval(this.interval ?? 0);
        try {
          this.socket = new WebSocket(url, protocols);
          this.socket.onclose = (event) => {
            clearInterval(this.interval ?? 0);
            this.onclose?.call(this, event.reason);
          };
          this.socket.onerror = (event) => {
            reject?.call(this, event);
            reject = null;
          };
          this.socket.onmessage = async (event) => {
            try {
              let buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
              await this.onMessage(buffer);
            } catch (e) {
              if (e != "Method not found") {
                console.log(e);
              }
            }
          };
          this.socket.onopen = (event) => {
            this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat);
            resolve();
          };
        } catch (e) {
          reject?.call(this, e);
          reject = null;
        }
      });
    }
    close() {
      clearInterval(this.interval ?? 0);
      this.socket?.close();
    }
    async onMessage(buffer) {
      this.headTimeout = false;
      const response = this.decode(buffer, webSocketDataDesc(jsonDesc));
      if (response.type == 1 /* Response */) {
        if (response.status == 200) {
          this.requestMap.get(response.id)?.resolve(response);
        } else {
          this.requestMap.get(response.id)?.reject(`Error: ${response.status}`);
        }
      } else if (response.type == 3 /* Ping */) {
        const data = new WebSocketData(4 /* Pong */);
        this.socket?.send(this.encode(data));
      } else if (response.type == 0 /* Request */ || response.type == 2 /* Notification */) {
        await this.onRequest(response, response.type == 2 /* Notification */);
      }
    }
    async onRequest(request, broadcast) {
      if (broadcast) {
        this.server?.response(request.path, request.data);
        return;
      }
      let data = new WebSocketData(
        1 /* Response */,
        request.id,
        request.path
      );
      if (this.server) {
        let resp = await this.server?.response(request.path, request.data);
        if (resp instanceof Blob) {
          resp = await resp.arrayBuffer();
        }
        data.status = 200;
        data.data = resp instanceof ArrayBuffer ? resp : new Result(0, "ok", resp);
      } else {
        data.status = 404;
      }
      this.socket?.send(this.encode(data));
    }
    onHeartbeat() {
      if (this.socket?.OPEN) {
        if (this.headTimeout) {
          this.socket.close();
          clearInterval(this.interval ?? 0);
          this.onclose?.call(this, "timeout");
          return;
        }
        const data = new WebSocketData(3 /* Ping */);
        this.socket.send(this.encode(data));
        this.headTimeout = true;
      }
    }
  };

  // src/index.ts
  var index_default = {
    Client,
    HttpClient,
    FetchClient,
    WebSocketClient,
    Server,
    Result,
    Error: Error2,
    NewJsonDecoder,
    NewJsonEncode,
    NewHBufDecoder,
    NewHBufEncode,
    WebSocketData,
    waiting,
    convertArray,
    RecordEntry,
    convertRecord,
    isRecord,
    isArray,
    formatDate,
    isData,
    Int8Descriptor,
    Int16Descriptor,
    Int32Descriptor,
    Int64Descriptor,
    Uint8Descriptor,
    Uint16Descriptor,
    Uint32Descriptor,
    Uint64Descriptor,
    FloatDescriptor,
    DoubleDescriptor,
    BoolDescriptor,
    StringDescriptor,
    BytesDescriptor,
    TimeDescriptor,
    DecimalDescriptor,
    ListDescriptor,
    MapDescriptor,
    DataDescriptor,
    RefDescriptor,
    SyncDescriptor,
    traceId
  };
  return __toCommonJS(index_exports);
})();
/*! Bundled license information:

decimal.js/decimal.mjs:
  (*!
   *  decimal.js v10.6.0
   *  An arbitrary-precision Decimal type for JavaScript.
   *  https://github.com/MikeMcl/decimal.js
   *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
   *  MIT Licence
   *)
*/
//# sourceMappingURL=index.global.js.map