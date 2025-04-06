import { FelicaReaderRcS300 } from "./FelicaReaderRcS300";
import type {
  FelicaOperationResult,
  IFelicaReader,
  IFelicaReaderConstructor,
} from "./IFelicaReader";
import { arrayToHex, hexStringToByteArray } from "./utils";

// FeliCaリーダーの型番情報
type FelicaReaderModelInfo = {
  vendorId: number;
  productId: number;
  readerClass: IFelicaReaderConstructor;
};

// 対応のFeliCaリーダー機器
export const felicaReaderModels = {
  "RC-S300/S": {
    vendorId: 1356,
    productId: 3528,
    readerClass: FelicaReaderRcS300,
  },
  "RC-S300/P": {
    vendorId: 1356,
    productId: 3529,
    readerClass: FelicaReaderRcS300,
  },
} as const satisfies Record<string, FelicaReaderModelInfo>;

// 対応のFeliCaリーダー機器型番のリテラル型
export type FelicaReaderModelName = keyof typeof felicaReaderModels;

// Pollingの戻り値型
export type FelicaPollingResult = {
  idm: string;
  systemCode: string;
};

// RequestServiceの戻り値型
export type FelicaRequestServiceResult = {
  idm: string;
  nodeCount: string;
  nodeKeyVerList: string;
};

// ReadWithoutEncryptionの戻り値型
export type FelicaReadWithoutEncryptionResult = {
  idm: string;
  statusFlag1: string;
  statusFlag2: string;
  blockSize: string;
  blockData: string;
};

export class FelicaService {
  /**
   * FeliCaリーダー機器への接続
   * @param readerFilter 接続を許可する機器の型番リスト
   * @param debugEnabled デバッグを有効にする
   * @returns
   */
  public static async connectFelicaReader(
    readerFilter: FelicaReaderModelName[] = [],
    debugEnabled = false,
  ): Promise<FelicaService | undefined> {
    // 結果セット（取得できたUSBデバイスと型番）
    let resultSet:
      | { usbDevice: USBDevice; modelName: FelicaReaderModelName }
      | undefined = undefined;

    // 許可可能な型番フィルタ（指定が無い場合は、本モジュールで定義する全型番を対象とする）
    const allReaders = Object.keys(
      felicaReaderModels,
    ) as FelicaReaderModelName[];
    const acceptableReaders =
      readerFilter && readerFilter.length > 0
        ? allReaders.filter((modelName) => readerFilter.includes(modelName))
        : allReaders;

    // 設定済のUSBDeviceインスタンス取得
    // （設定済デバイスが取得できない場合、結果セットはundefined）
    const connectedDevices = await navigator.usb.getDevices();
    if (connectedDevices.length > 0) {
      for (const device of connectedDevices) {
        const modelFound = acceptableReaders.find(
          (acceptableReader) =>
            device.vendorId === felicaReaderModels[acceptableReader].vendorId &&
            device.productId === felicaReaderModels[acceptableReader].productId,
        );
        if (modelFound) {
          resultSet = { usbDevice: device, modelName: modelFound };
          break;
        }
      }
    }

    // USB機器をペアリングフローから選択しデバイスのUSBDeviceインスタンス取得
    if (!resultSet) {
      let device: USBDevice;
      const deviceFilters = readerFilter.map((acceptableReader) => ({
        vendorId: felicaReaderModels[acceptableReader].vendorId,
        productId: felicaReaderModels[acceptableReader].productId,
      }));
      try {
        device = await navigator.usb.requestDevice({
          filters: deviceFilters,
        });
      } catch (e: unknown) {
        // 取得できない場合、DOMExceptionがスローされる
        if (e instanceof DOMException) return undefined;
        // その他のエラー
        throw e;
      }

      resultSet = {
        usbDevice: device,
        modelName: acceptableReaders.find(
          (acceptableReader) =>
            device.vendorId === felicaReaderModels[acceptableReader].vendorId &&
            device.productId === felicaReaderModels[acceptableReader].productId,
        ) as FelicaReaderModelName,
      };
    }

    const felicaReader: IFelicaReader = new felicaReaderModels[
      resultSet.modelName
    ].readerClass(resultSet.usbDevice, debugEnabled);

    const felicaService = new FelicaService(felicaReader);
    return felicaService;
  }

  /**
   * コンストラクタ
   * @param felicaReader
   */
  protected constructor(public felicaReader: IFelicaReader) {}

  /**
   * デバイスのオープン
   * @returns
   */
  public async openDevice() {
    // デバイスのopen実行
    await this.felicaReader.open();
  }

  /**
   * デバイスのクローズ
   * @returns
   */
  public async closeDevice() {
    // デバイスのclose実行
    await this.felicaReader.close();
  }

  /**
   * Felica のポーリング操作を実行し、IDm とシステムコードを返す。
   */
  public async polling(
    timeoutPerRun = 100,
  ): Promise<FelicaPollingResult | undefined> {
    const pollingCommand = [0x00, 0xff, 0xff, 0x01, 0x00]; // ポーリング コマンド
    const response = await this.felicaOperation(
      pollingCommand,
      timeoutPerRun,
      "Polling",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      systemCode: arrayToHex(new Uint8Array(response.data.slice(16, 18)), true),
    };
  }

  /**
   * Felica の RequestService 操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param nodeCodeList ノードコードの配列（各コードは数値）
   */
  public async requestService(
    idm: string,
    nodeCodeList: number[],
  ): Promise<FelicaRequestServiceResult | undefined> {
    const timeoutPerRun = 100;
    const codeCommand = [0x02];
    if (
      nodeCodeList.length % 2 !== 0 ||
      nodeCodeList.length < 2 ||
      nodeCodeList.length > 64
    ) {
      throw new Error("ノードコードリストの桁数が不適切です");
    }
    const nodeCount = nodeCodeList.length / 2;
    const idmByteArray = hexStringToByteArray(idm);
    const command = codeCommand
      .concat(idmByteArray)
      .concat([nodeCount])
      .concat(nodeCodeList);
    const response = await this.felicaOperation(
      command,
      timeoutPerRun,
      "RequestService",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      nodeCount: arrayToHex(new Uint8Array(response.data.slice(8, 9))),
      nodeKeyVerList: arrayToHex(new Uint8Array(response.data.slice(9))),
    };
  }

  /**
   * Felica の暗号化無しデータ読み取り操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param params 各サービスに対するパラメータの配列
   */
  public async readWithoutEncryption(
    idm: string,
    params: Array<{
      serviceCode: string;
      blockListParam: {
        accessMode: "normal" | "purse-cashback";
        blockNoStart: number;
        blockNoEnd: number;
      };
    }>,
  ): Promise<FelicaReadWithoutEncryptionResult | undefined> {
    const timeoutPerRun = 100;
    if (params.length === 0 || params.length > 16) {
      throw new Error(
        "paramsが不正です。対象のサービスは1〜16個の範囲で指定してください",
      );
    }
    const commandCode = [0x06];
    const idmByteArray = hexStringToByteArray(idm);
    const serviceCount = [params.length];
    const { totalBlockCount, blockList, serviceCodeList } = params.reduce(
      (acc, cur) => {
        if (cur.serviceCode.length !== 4) {
          throw new Error(
            `サービスコードリストの桁数が不適切です:${cur.serviceCode}`,
          );
        }
        acc.serviceCodeList.push(...hexStringToByteArray(cur.serviceCode));
        acc.blockList.push(...this.constructBlockList(cur.blockListParam, 0));
        acc.totalBlockCount +=
          cur.blockListParam.blockNoEnd - cur.blockListParam.blockNoStart + 1;
        return acc;
      },
      {
        totalBlockCount: 0,
        blockList: [] as number[],
        serviceCodeList: [] as number[],
      },
    );

    const readCommand = commandCode
      .concat(idmByteArray)
      .concat(serviceCount)
      .concat(serviceCodeList)
      .concat([totalBlockCount])
      .concat(blockList);
    const response = await this.felicaOperation(
      readCommand,
      timeoutPerRun,
      "ReadWithoutEncryption",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      statusFlag1: arrayToHex(new Uint8Array(response.data.slice(8, 9))),
      statusFlag2: arrayToHex(new Uint8Array(response.data.slice(9, 10))),
      blockSize: arrayToHex(new Uint8Array(response.data.slice(10, 11))),
      blockData: arrayToHex(new Uint8Array(response.data.slice(11)), true),
    };
  }

  /**
   * Felica コマンドをラップし、送受信、レスポンスの解析までを行う。
   */
  private async felicaOperation(
    felicaCommand: number[],
    timeout: number,
    description: string,
  ): Promise<FelicaOperationResult> {
    const felicaRequest = this.constructFelicaRequest(felicaCommand, timeout);
    // デバイスのfelicaコマンド実行
    const result = await this.felicaReader.operateFelica(
      felicaRequest,
      description,
    );
    return result;
  }

  private constructFelicaRequest(
    felicaCommand: number[],
    timeout: number,
  ): number[] {
    const felicaHeader = [0x5f, 0x46, 0x04];
    const felicaOption = [0x95, 0x82];
    const felicaTimeout = timeout * 1000; // マイクロ秒（リトルエンディアン）

    const felicaCommandLength = felicaCommand.length + 1;
    const felicaReq: number[] = [...felicaHeader];
    felicaReq.push(
      felicaTimeout & 0xff,
      (felicaTimeout >> 8) & 0xff,
      (felicaTimeout >> 16) & 0xff,
      (felicaTimeout >> 24) & 0xff,
    );
    felicaReq.push(...felicaOption);
    felicaReq.push(
      (felicaCommandLength >> 8) & 0xff,
      felicaCommandLength & 0xff,
    );
    felicaReq.push(felicaCommandLength);
    felicaReq.push(...felicaCommand);

    return felicaReq;
  }

  /**
   * ブロックリストを構成する。
   * @param param ブロック範囲とアクセスモード
   * @param serviceListOrder サービスリスト内の順序
   */
  private constructBlockList(
    param: {
      accessMode: "normal" | "purse-cashback";
      blockNoStart: number;
      blockNoEnd: number;
    },
    serviceListOrder: number,
  ): number[] {
    if (param.blockNoEnd > 0xffff) throw new Error("blockCountが不正です");
    if (serviceListOrder > 0xff) throw new Error("serviceListOrderが不正です");
    const blockSize = param.blockNoEnd > 0xff ? 3 : 2;
    let d0 = 0;
    if (blockSize === 2) d0 += 0b10000000;
    if (param.accessMode === "purse-cashback") d0 += 0b00010000;
    d0 += serviceListOrder;
    const result: number[] = [];
    for (let i = param.blockNoStart; i <= param.blockNoEnd; i++) {
      const blkListElement = new Uint8Array(blockSize);
      blkListElement[0] = d0;
      blkListElement[1] = i & 0xff;
      if (blockSize === 3) {
        blkListElement[2] = (i >> 8) & 0xff;
      }
      result.push(...blkListElement);
    }
    return result;
  }
}
