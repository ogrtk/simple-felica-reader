import { FelicaReaderRcS300 } from "@/src/lib/FelicaReaderRcS300";
import { test } from "vitest";
import { type Mock, beforeEach, describe, expect, vi } from "vitest";

// sleep の待機時間をなくす
vi.spyOn(await import("@/src/lib/utils"), "sleep").mockResolvedValue(undefined);
// fake USBDeviceの生成ヘルパー
function createFakeUSBDevice(simulatedResponse: number[] = []): USBDevice {
  return {
    // USBDevice の各メソッドは非同期処理を模倣
    open: vi.fn(async () => {}),
    opened: true,
    selectConfiguration: vi.fn(async (confValue: number) => {}),
    claimInterface: vi.fn(async (interfaceNum: number) => {}),
    releaseInterface: vi.fn(async (interfaceNum: number) => {}),
    close: vi.fn(async () => {}),
    transferOut: vi.fn(
      async (
        endpoint: number,
        data: Uint8Array,
      ): Promise<USBOutTransferResult> => ({
        bytesWritten: data.length,
        status: "ok",
      }),
    ),
    transferIn: vi.fn(async (endpoint: number, length: number) => ({
      // simulatedResponse を元に DataView を返す
      data: new DataView(new Uint8Array(simulatedResponse).buffer),
    })),
    // getUsbConfigSet() で参照される configuration プロパティ
    configuration: {
      configurationValue: 1,
      // 配列の index 1 を使用するため、index0 はダミー
      interfaces: [
        {},
        {
          interfaceNumber: 2,
          alternate: {
            endpoints: [
              { direction: "in", endpointNumber: 3, packetSize: 64 },
              { direction: "out", endpointNumber: 4, packetSize: 64 },
            ],
          },
        },
      ],
    },
  } as unknown as USBDevice;
}

describe("FelicaReaderRcS300", () => {
  const mockUSBDevice = createFakeUSBDevice();
  const rcs300Reader = new FelicaReaderRcS300(mockUSBDevice, false); // isDebug: false
  // privateメソッドのmock
  rcs300Reader["recvUsb"] = vi.fn(rcs300Reader["recvUsb"].bind(rcs300Reader));
  rcs300Reader["sendUsb"] = vi.fn(rcs300Reader["sendUsb"].bind(rcs300Reader));
  rcs300Reader["wrapCTXIns"] = vi.fn(
    rcs300Reader["wrapCTXIns"].bind(rcs300Reader),
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("openDevice", () => {
    test("デバイスをオープンし、初期化コマンドを実行", async () => {
      /** action */
      await rcs300Reader.open();

      /** assert */
      // USBDevice の open, selectConfiguration, claimInterface が呼ばれているか確認
      expect(mockUSBDevice.open).toHaveBeenCalled();
      expect(mockUSBDevice.selectConfiguration).toHaveBeenCalledWith(
        mockUSBDevice.configuration?.configurationValue,
      );
      expect(mockUSBDevice.claimInterface).toHaveBeenCalledWith(
        mockUSBDevice.configuration?.interfaces[1].interfaceNumber,
      );
      // 内部で送受信処理が呼ばれている（transferOut/transferIn）ことも確認
      expect(mockUSBDevice.transferOut).toHaveBeenCalled();
      expect(mockUSBDevice.transferIn).toHaveBeenCalled();
      expect(rcs300Reader["sendUsb"]).toHaveBeenCalledTimes(4);
      expect(rcs300Reader["recvUsb"]).toHaveBeenCalledTimes(4);
    });
  });

  describe("closeDevice", () => {
    test("デバイスをクローズし、リソースを開放", async () => {
      /** action */
      await rcs300Reader.close();

      /** assert */
      expect(mockUSBDevice.transferOut).toHaveBeenCalled();
      expect(mockUSBDevice.releaseInterface).toHaveBeenCalledWith(
        mockUSBDevice.configuration?.interfaces[1].interfaceNumber,
      );
      expect(mockUSBDevice.close).toHaveBeenCalled();
      expect(rcs300Reader["sendUsb"]).toHaveBeenCalledTimes(2);
      expect(rcs300Reader["recvUsb"]).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUsbConfigSet（異常系のみ）", () => {
    test("configuration が取得できない場合に例外発生", () => {
      /** arrange */
      const fakeDeviceNoConf = { ...mockUSBDevice, configuration: undefined };

      /** action & assert */
      expect(
        () => new FelicaReaderRcS300(fakeDeviceNoConf as USBDevice, false),
      ).toThrow("configurationがありません");
    });

    test("input endpointが取得できない場合に例外発生", () => {
      /** arrange */
      const fakeDeviceNoIn = {
        ...mockUSBDevice,
        configuration: {
          ...mockUSBDevice.configuration,
          interfaces: mockUSBDevice.configuration?.interfaces.map(
            (iface, index) => {
              // configurationValue と一致するインターフェイスのみ変更する
              if (index === mockUSBDevice.configuration?.configurationValue) {
                return {
                  ...iface,
                  alternate: {
                    ...iface.alternate,
                    endpoints: iface.alternate.endpoints.filter(
                      (ep: USBEndpoint) => ep.direction !== "in",
                    ),
                  },
                };
              }
              return iface;
            },
          ),
        },
      } as USBDevice;

      /** action & assert */
      expect(() => new FelicaReaderRcS300(fakeDeviceNoIn, false)).toThrow(
        "入力USBエンドポイントが取得できませんでした",
      );
    });

    test("output endpointが取得できない場合に例外発生", () => {
      /** arrange */
      const fakeDeviceNoOut = {
        ...mockUSBDevice,
        configuration: {
          ...mockUSBDevice.configuration,
          interfaces: mockUSBDevice.configuration?.interfaces.map(
            (iface, index) => {
              if (index === mockUSBDevice.configuration?.configurationValue) {
                return {
                  ...iface,
                  alternate: {
                    ...iface.alternate,
                    endpoints: iface.alternate.endpoints.filter(
                      (ep: USBEndpoint) => ep.direction !== "out",
                    ),
                  },
                };
              }
              return iface;
            },
          ),
        },
      } as USBDevice;

      /** action & assert */
      expect(() => new FelicaReaderRcS300(fakeDeviceNoOut, false)).toThrow(
        "出力USBエンドポイントが取得できませんでした",
      );
    });
  });

  describe("wrapCTXIns", () => {
    test("正常系", async () => {
      /** arrange */
      // テスト用の felicaRequest（例として [16, 32, 48]）
      const felicaRequest = [16, 32, 48];

      /** action */
      // private メソッドなので、as any を使ってアクセス
      const result = await rcs300Reader["wrapCTXIns"](felicaRequest);

      /** assert */
      // felicaRequest の長さは 3 のため、
      // (3 >> 8) & 0xff は 0, 3 & 0xff は 3 となる
      // よって期待される配列は:
      // [communicateThruEX の先頭配列, 0, 3, felicaRequest の要素, communicateThruEXFooter の配列]
      expect(result).toEqual([
        0xff, // communicateThruEX
        0x50,
        0x00,
        0x01,
        0x00,
        0x00, // felicaRequest の長さを2バイトで表現
        0x03,
        16, // felicaRequest の内容
        32,
        48,
        0x00, // communicateThruEXFooter
        0x00,
        0x00,
      ]);
    });
  });

  describe("unwrapCTXResponse", () => {
    test("正常系", () => {
      /** arrange */
      // 例: [0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20]
      // 0x97 at index 2, length = arr[3] = 0x04,
      // 全データ部分 = [0x00, 0x05, 0x10, 0x20] → responseCode = 0x05, data = [0x10, 0x20]
      const arr = new Uint8Array([
        0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20, 0x99,
      ]);
      const dv = new DataView(arr.buffer);

      /** action */
      const result = rcs300Reader["unwrapCTXResponse"]({ data: dv });

      /** assert */
      expect(result).toEqual({
        length: 4,
        responseCode: 0x05,
        data: [0x10, 0x20],
      });
    });

    test("cTXResponse.data がundefinedの場合、undefinedを返す", () => {
      /** action */
      const result = rcs300Reader["unwrapCTXResponse"]({ data: undefined });

      /** assert */
      expect(result).toBeUndefined();
    });

    test("データに 0x97 がない場合、undefinedを返す", () => {
      /** arrange */
      // DataView に 0x97 を含まない配列を用意
      const arr = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
      const dv = new DataView(arr.buffer);

      /** action */
      const result = rcs300Reader["unwrapCTXResponse"]({ data: dv });

      /** assert */
      expect(result).toBeUndefined();
    });
  });

  describe("operateFeliCa", () => {
    test("正常系：各privateメソッドの実行(wrapCTXIns, sendUsb, recvUsb, unwrapCTXResponse)", async () => {
      /** arrange */
      // モック: wrapCTXIns を任意の Uint8Array を返すように設定
      (rcs300Reader["wrapCTXIns"] as Mock).mockResolvedValueOnce(
        new Uint8Array([0x01, 0x02, 0x03]),
      );
      // モック: sendUsb は何もしない
      (rcs300Reader["sendUsb"] as Mock).mockResolvedValueOnce(undefined);
      // モック: recvUsb を呼び出すと、fake DataView を返す
      // 作成するデータ: [0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20]
      const fakeArr = new Uint8Array([
        0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20,
      ]);
      const fakeDV = new DataView(fakeArr.buffer);
      (rcs300Reader["recvUsb"] as Mock).mockResolvedValueOnce({ data: fakeDV });

      /** action */
      const result = await rcs300Reader.operateFelica(
        [0x0a, 0x0b],
        "TestOperation",
      );

      /** assert */
      expect(result).toEqual({
        length: 4,
        responseCode: 0x05,
        data: [0x10, 0x20],
      });
    });
  });

  describe("isOpened", () => {
    test("デバイスのオープン状態が取得できる", async () => {
      /** arrange */
      const mockUSBDevice = createFakeUSBDevice();
      const reader = new FelicaReaderRcS300(mockUSBDevice);

      /** assert */
      expect(reader.isOpened).toBe(true);
    });
  });

  describe("デバッグモード", () => {
    test("console.logが出力される", async () => {
      /** arrange */
      const logSpy = vi.spyOn(console, "log");
      const mockUSBDevice = createFakeUSBDevice();
      const readerDebugMode = new FelicaReaderRcS300(mockUSBDevice, true); // isDebug: true
      readerDebugMode["recvUsb"] = vi.fn(
        readerDebugMode["recvUsb"].bind(readerDebugMode),
      );
      readerDebugMode["sendUsb"] = vi.fn(
        readerDebugMode["sendUsb"].bind(readerDebugMode),
      );

      /** action */
      await readerDebugMode.close();

      /** assert */
      expect(logSpy).toHaveBeenCalledTimes(4);
    });
  });
});
