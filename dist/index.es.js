class u {
}
let l = class extends u {
  constructor(t, e) {
    super(), this.code = t, this.msg = e;
  }
  toMap(t) {
    return this;
  }
};
class i extends l {
  constructor(t, e, r, s) {
    super(t, e), this.data = r, this.from = s;
  }
  toMap(t) {
    return {
      ...super.toMap(t),
      data: this.data?.toMap(t)
    };
  }
  fromMap(t, e) {
    return new i(
      t.code,
      t.msg,
      this.from?.call(this, t.data, e)
    );
  }
}
function w() {
  const o = new TextDecoder("utf-8");
  return (t, e, r) => {
    const s = o.decode(t);
    return e(JSON.parse(s), r);
  };
}
function m() {
  const o = new TextEncoder();
  return (t, e) => {
    const r = JSON.stringify(t.toMap(e));
    return o.encode(r).buffer;
  };
}
class p {
  constructor(t, e) {
    this.request = t, this.middleware = (r) => {
      for (let s = (e?.middleware?.length ?? 0) - 1; s >= 0; s--)
        r = e.middleware[s](r);
      return r;
    };
  }
  invoke(t, e, r, s, n, c) {
    return e = e.replace(/^\/+|\/+$/g, "") + "/", this.middleware(async (h, d) => {
      const f = new i(0, "ok", void 0, c), a = await this.request(e + r, !0, h, s, c && f.fromMap.bind(f), d);
      if (c) {
        if (a.code !== 0)
          throw a;
        return a.data;
      }
      return a;
    })(n, { method: r, headers: new Headers() });
  }
}
class g {
  constructor(t) {
    this.decode = t?.decode ?? w(), this.encode = t?.encode ?? m(), this.methods = {}, this.middleware = (e) => {
      for (let r = (t?.middleware?.length ?? 0) - 1; r >= 0; r--)
        e = t.middleware[r](e);
      return e;
    };
  }
  register(t, e, r) {
    e = e.replace(/^\/+|\/+$/g, "") + "/";
    for (const s of r) {
      const n = s.name.replace(/|\/+$/g, "");
      this.methods[e + n] = s;
    }
  }
  async response(t, e) {
    const r = this.methods[t];
    if (!r)
      throw new l(-1, "Method not found");
    const s = r.from ? r.from(e, r.tag?.length > 0 ? "I" + r.tag : "") : e;
    return await this.middleware(r.handler)(s);
  }
}
class y {
  constructor(t, e) {
    this.base = t.replace(/^\/+|\/+$/g, "") + "/", this.decode = e?.decode ?? w(), this.encode = e?.encode ?? m();
  }
  async request(t, e, r, s, n, c) {
    const h = r instanceof u ? this.encode(r, (s?.length ?? 0) > 0 ? "I" + s : "") : r, d = await this.fetch(t, h, c);
    return n ? this.decode(d instanceof Blob ? await d.arrayBuffer() : d, n, s) : d;
  }
  async fetch(t, e, r) {
    const s = await fetch(this.base + t, {
      method: "POST",
      body: e,
      headers: r?.headers
    });
    if (s.ok)
      return s.arrayBuffer();
    throw new Error(`HTTP Error: ${s.status} ${s.statusText}`);
  }
}
const E = {
  Data: u,
  Client: p,
  HttpClient: y,
  Server: g,
  Error: l,
  Result: i
};
export {
  E as default
};
