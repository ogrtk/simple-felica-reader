export function hexToAscii(hexString: string): string {
  // スペースを削除して16進数の文字列を連結
  const cleanHexString = hexString.replace(/\s+/g, "");

  // 奇数長の16進数は無効
  if (cleanHexString.length % 2 !== 0) {
    throw new Error("Invalid hex string: length must be even.");
  }

  // 16進数を2文字ずつ分割してASCII文字に変換
  let asciiString = "";
  for (let i = 0; i < cleanHexString.length; i += 2) {
    const hexPair = cleanHexString.slice(i, i + 2); // 2文字を切り出し
    const asciiValue = Number.parseInt(hexPair, 16);

    // 無効な16進数が含まれている場合エラーをスロー
    if (Number.isNaN(asciiValue)) {
      throw new Error(`Invalid hex pair: ${hexPair}`);
    }

    asciiString += String.fromCharCode(asciiValue);
  }

  return asciiString;
}

export function arrayToHex(argData: Uint8Array, trim = false): string {
  let retVal = "";
  for (const val of argData) {
    let str = val.toString(16);
    // 0～F の桁合わせ
    str = val < 0x10 ? `0${str}` : str;
    retVal += `${str.toUpperCase()} `;
  }
  return trim ? retVal.replaceAll(" ", "") : retVal;
}

export function binArrayToHex(argData: DataView | undefined): string {
  if (!argData) return "";
  let retVal = "";
  for (let idx = 0; idx < argData.byteLength; idx++) {
    const bt = argData.getUint8(idx);
    let str = bt.toString(16);
    str = bt < 0x10 ? `0${str}` : str;
    retVal += `${str.toUpperCase()} `;
  }
  return retVal;
}

export function dataViewToUint8Array(argData: DataView): Uint8Array {
  const retVal = new Uint8Array(argData.byteLength);
  for (let i = 0; i < argData.byteLength; i++) {
    retVal[i] = argData.getUint8(i);
  }
  return retVal;
}

export async function sleep(msec: number) {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

/**
 * 16進数文字列をバイト配列に変換する。
 */
export function hexStringToByteArray(hexString: string): number[] {
  if (!/^([0-9a-fA-F]{2})+$/.test(hexString)) {
    throw new Error(
      "Invalid input. The string must be hexadecimal characters.",
    );
  }
  const byteArray: number[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray.push(Number.parseInt(hexString.slice(i, i + 2), 16));
  }
  return byteArray;
}
