/**
 * 16進数文字列（空白が含まれていても可）を、対応するASCII文字列に変換
 * @param hexString
 * @returns
 */
export declare function hexToAscii(hexString: string): string;
/**
 * Uint8Array（バイト配列）内の各値を16進数の文字列に変換し、各値ごとにスペースを付与して連結
 * @param argData
 * @param trim
 * @returns
 */
export declare function arrayToHex(argData: Uint8Array, trim?: boolean): string;
/**
 * DataView に含まれるバイナリデータを、16進数の文字列（各バイトごとにスペース付き）に変換
 * @param argData
 * @returns
 */
export declare function binArrayToHex(argData: DataView | undefined): string;
/**
 * DataView の内容を新たな Uint8Array にコピーして返します。
 * @param argData
 * @returns
 */
export declare function dataViewToUint8Array(argData: DataView): Uint8Array;
/**
 * 16進数文字列をバイト配列に変換する。
 */
export declare function hexStringToByteArray(hexString: string): number[];
/**
 * sleep
 * @param msec
 * @returns
 */
export declare function sleep(msec: number): Promise<unknown>;
