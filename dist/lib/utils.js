function s(t) {
  const r = t.replace(/\s+/g, "");
  if (r.length % 2 !== 0)
    throw new Error("Invalid hex string: length must be even.");
  let e = "";
  for (let i = 0; i < r.length; i += 2) {
    const n = r.slice(i, i + 2), o = Number.parseInt(n, 16);
    if (Number.isNaN(o))
      throw new Error(`Invalid hex pair: ${n}`);
    e += String.fromCharCode(o);
  }
  return e;
}
function l(t, r = !1) {
  let e = "";
  for (const i of t) {
    let n = i.toString(16);
    n = i < 16 ? `0${n}` : n, e += `${n.toUpperCase()} `;
  }
  return r ? e.replaceAll(" ", "") : e;
}
function a(t) {
  if (!t) return "";
  let r = "";
  for (let e = 0; e < t.byteLength; e++) {
    const i = t.getUint8(e);
    let n = i.toString(16);
    n = i < 16 ? `0${n}` : n, r += `${n.toUpperCase()} `;
  }
  return r;
}
function c(t) {
  const r = new Uint8Array(t.byteLength);
  for (let e = 0; e < t.byteLength; e++)
    r[e] = t.getUint8(e);
  return r;
}
function u(t) {
  if (!/^([0-9a-fA-F]{2})+$/.test(t))
    throw new Error(
      "Invalid input. The string must be hexadecimal characters."
    );
  const r = [];
  for (let e = 0; e < t.length; e += 2)
    r.push(Number.parseInt(t.slice(e, e + 2), 16));
  return r;
}
async function f(t) {
  return new Promise((r) => setTimeout(r, t));
}
export {
  l as arrayToHex,
  a as binArrayToHex,
  c as dataViewToUint8Array,
  u as hexStringToByteArray,
  s as hexToAscii,
  f as sleep
};
