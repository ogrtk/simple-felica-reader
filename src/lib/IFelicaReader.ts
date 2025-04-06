/** FeliCa操作の結果 */
export type FelicaOperationResult =
  | {
      length: number;
      responseCode: number;
      data: number[];
    }
  | undefined;

/**
 * FeliCaリーダーのインターフェイス
 */
export interface IFelicaReader {
  open(): Promise<void>;
  close(): Promise<void>;
  operateFelica(
    felicaCommand: number[],
    description: string,
  ): Promise<FelicaOperationResult>;
  get isOpened(): boolean;
  get vendorId(): number;
  get productId(): number;
}

/**
 * FeliCaリーダーのインターフェイス（コンストラクタ型）
 */
export type IFelicaReaderConstructor = {
  new (device: USBDevice, debugEnabled?: boolean): IFelicaReader;
};
