import {
  arrayToHex,
  binArrayToHex,
  dataViewToUint8Array,
  hexStringToByteArray,
  hexToAscii,
  sleep,
} from "@/src/lib/utils"; // 実際のモジュールパスに置き換えてください
import { describe, expect, it } from "vitest";

describe("hexToAscii", () => {
  it("should convert a hex string with spaces to ASCII", () => {
    const input = "48 65 6C 6C 6F"; // "Hello"
    expect(hexToAscii(input)).toBe("Hello");
  });

  it("should convert a hex string without spaces to ASCII", () => {
    const input = "48656C6C6F"; // "Hello"
    expect(hexToAscii(input)).toBe("Hello");
  });

  it("should throw error for hex string with odd length", () => {
    const input = "48656C6C6"; // 奇数文字数
    expect(() => hexToAscii(input)).toThrow(
      "Invalid hex string: length must be even.",
    );
  });

  it("should throw error for invalid hex pair", () => {
    const input = "48 65 ZZ"; // ZZ は無効な16進数
    expect(() => hexToAscii(input)).toThrow("Invalid hex pair: ZZ");
  });
});

describe("arrayToHex", () => {
  const arr = new Uint8Array([0, 15, 255]);

  it("should convert Uint8Array to hex string with spaces", () => {
    // 各バイトは2桁の大文字16進数に変換され、間にスペースが挿入される（末尾にもスペース）
    expect(arrayToHex(arr)).toBe("00 0F FF ");
  });

  it("should convert Uint8Array to hex string without spaces when trim is true", () => {
    expect(arrayToHex(arr, true)).toBe("000FFF");
  });
});

describe("binArrayToHex", () => {
  it("should return empty string when DataView is undefined", () => {
    expect(binArrayToHex(undefined)).toBe("");
  });

  it("should convert DataView to hex string with spaces", () => {
    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    view.setUint8(0, 0);
    view.setUint8(1, 15);
    view.setUint8(2, 255);
    expect(binArrayToHex(view)).toBe("00 0F FF ");
  });
});

describe("dataViewToUint8Array", () => {
  it("should convert DataView to Uint8Array correctly", () => {
    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint8(1, 2);
    view.setUint8(2, 3);
    const result = dataViewToUint8Array(view);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe("sleep", () => {
  it("should wait approximately the given time", async () => {
    const start = Date.now();
    await sleep(50); // 50ミリ秒待機
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});

describe("hexStringToByteArray", () => {
  it("should convert a valid hex string to a byte array", () => {
    // "48656C6C6F" → [72, 101, 108, 108, 111] (Hello)
    expect(hexStringToByteArray("48656C6C6F")).toEqual([
      72, 101, 108, 108, 111,
    ]);
  });

  it("should throw error for hex string with odd length", () => {
    // 正規表現 /^([0-9a-fA-F]{2})+$/ にマッチしないのでエラー
    expect(() => hexStringToByteArray("48656C6C6")).toThrow(
      "Invalid input. The string must be hexadecimal characters.",
    );
  });

  it("should throw error for hex string with invalid characters", () => {
    expect(() => hexStringToByteArray("ZZ")).toThrow(
      "Invalid input. The string must be hexadecimal characters.",
    );
  });
});
