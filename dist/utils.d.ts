export declare function hexToAscii(hexString: string): string;
export declare function arrayToHex(argData: Uint8Array, trim?: boolean): string;
export declare function binArrayToHex(argData: DataView | undefined): string;
export declare function dataViewToUint8Array(argData: DataView): Uint8Array;
export declare function sleep(msec: number): Promise<unknown>;
/**
 * 16進数文字列をバイト配列に変換する。
 */
export declare function hexStringToByteArray(hexString: string): number[];
