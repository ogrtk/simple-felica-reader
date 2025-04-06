import { FelicaService } from "@/src/lib/FelicaService";
import { arrayToHex } from "@/src/lib/utils";
import { test } from "vitest";
import { beforeEach, describe, expect, vi } from "vitest";
// sleep の待機時間をなくす
vi.spyOn(await import("../../src/lib/utils"), "sleep").mockResolvedValue(undefined);
// Mock 用の USBDevice
class MockUSBDevice {
    vendorId;
    productId;
    opened = false;
    constructor(vendorId = 1356, productId = 3528) {
        this.vendorId = vendorId;
        this.productId = productId;
    }
    configuration = {
        configurationValue: 1,
        interfaces: [
            {},
            {
                alternate: {
                    endpoints: [
                        { direction: "in", endpointNumber: 1, packetSize: 64 },
                        { direction: "out", endpointNumber: 2, packetSize: 64 },
                    ],
                },
                interfaceNumber: 0,
            },
        ],
    };
    open = vi.fn(async () => {
        this.opened = true;
    });
    close = vi.fn(async () => {
        this.opened = false;
    });
    transferIn = vi.fn(async (_endpoint, length) => ({
        data: new DataView(new ArrayBuffer(length)),
    }));
    transferOut = vi.fn(async (_endpoint, _data) => { });
    selectConfiguration = vi.fn(async (_configValue) => { });
    claimInterface = vi.fn(async (_interfaceNumber) => { });
    releaseInterface = vi.fn(async (_interfaceNumber) => { });
}
// Mock 用の navigator.usb
vi.stubGlobal("navigator", {
    usb: {
        getDevices: vi.fn(async () => []),
        requestDevice: vi.fn(),
    },
});
// vi.mock("@ogrtk/shared/kintone-utils", async () => {
//   const actual = await vi.importActual<
//     typeof import("@ogrtk/shared/kintone-utils")
//   >("@ogrtk/shared/kintone-utils");
//   return {
//     ...actual,
//     restorePluginConfig: vi.fn(),
//   };
// });
vi.mock("@/src/lib/FelicaReaderRcS300", async () => {
    const actual = await vi.importActual("@/src/lib/FelicaReaderRcS300");
    return {
        ...actual,
        FelicaReaderRcS300: class extends actual.FelicaReaderRcS300 {
            constructor(device, debugEnabled = false) {
                super(device, debugEnabled);
                // このインスタンスの operateFelica を spy 化
                vi.spyOn(this, "operateFelica");
            }
        },
    };
});
describe("connect", () => {
    test("動作対象の設定済機器あり(1356,3528) RC-S300/S", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([
            new MockUSBDevice(1357, 3529),
            new MockUSBDevice(1356, 3528),
        ]);
        /** action */
        const service = await FelicaService.connectFelicaReader();
        /** assert */
        expect(service).toBeDefined();
        expect(service?.felicaReader.vendorId).toBe(1356);
        expect(service?.felicaReader.productId).toBe(3528);
    });
    test("動作対象の設定済機器あり(1356,3529) RC-S300/P", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([
            new MockUSBDevice(1357, 3528),
            new MockUSBDevice(1356, 3529),
        ]);
        /** action */
        const reader = await FelicaService.connectFelicaReader();
        /** assert */
        expect(reader).toBeDefined();
        expect(reader?.felicaReader.vendorId).toBe(1356);
        expect(reader?.felicaReader.productId).toBe(3529);
    });
    test("動作対象の設定済機器あり(1356,3529) RC-S300/P、フィルタあり", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([
            new MockUSBDevice(1357, 3528),
            new MockUSBDevice(1356, 3529),
        ]);
        /** action */
        const reader = await FelicaService.connectFelicaReader(["RC-S300/P"]);
        /** assert */
        expect(reader).toBeDefined();
        expect(reader?.felicaReader.vendorId).toBe(1356);
        expect(reader?.felicaReader.productId).toBe(3529);
    });
    test("動作対象の設定済機器無し、リクエスト時に機器あり", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([
            new MockUSBDevice(1357, 3528),
            new MockUSBDevice(1356, 3530),
        ]);
        navigator.usb.requestDevice.mockResolvedValueOnce(new MockUSBDevice());
        /** action */
        const service = await FelicaService.connectFelicaReader();
        /** assert */
        expect(navigator.usb.requestDevice).toHaveBeenCalledWith({
            filters: [],
        });
        expect(service).toBeDefined();
        expect(service?.felicaReader.vendorId).toBe(1356);
        expect(service?.felicaReader.productId).toBe(3528);
    });
    test("動作対象の設定済機器無し、リクエスト時に機器あり、フィルタあり", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([
            new MockUSBDevice(1357, 3528),
            new MockUSBDevice(1356, 3530),
        ]);
        navigator.usb.requestDevice.mockResolvedValueOnce(new MockUSBDevice());
        /** action */
        const service = await FelicaService.connectFelicaReader(["RC-S300/S"]);
        /** assert */
        expect(navigator.usb.requestDevice).toHaveBeenCalledWith({
            filters: [],
        });
        expect(service).toBeDefined();
        expect(service?.felicaReader.vendorId).toBe(1356);
        expect(service?.felicaReader.productId).toBe(3528);
    });
    test("動作対象の設定済機器無し、リクエスト時に機器無し(DomException)", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([]);
        navigator.usb.requestDevice.mockImplementationOnce(async () => {
            throw new DOMException("dom exception");
        });
        /** action & assert */
        const service = await FelicaService.connectFelicaReader();
        expect(navigator.usb.requestDevice).toHaveBeenCalledWith({
            filters: [],
        });
        expect(service).not.toBeDefined();
    });
    test("動作対象の設定済機器無し、リクエスト時に機器無し(その他Exception)", async () => {
        /** arrange */
        navigator.usb.getDevices.mockResolvedValueOnce([]);
        navigator.usb.requestDevice.mockImplementationOnce(async () => {
            throw new Error("some error");
        });
        /** action & assert */
        await expect(() => FelicaService.connectFelicaReader()).rejects.toThrow("some error");
        expect(navigator.usb.requestDevice).toHaveBeenCalledWith({
            filters: [],
        });
    });
});
describe("FelicaService", async () => {
    const mockUSBDevice = new MockUSBDevice();
    navigator.usb.getDevices.mockResolvedValue([mockUSBDevice]);
    const service = await FelicaService.connectFelicaReader();
    if (!service)
        throw new Error("テスト時に例外発生：FelicaServiceの初期化に失敗");
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe("openDevice", () => {
        test("デバイスをオープンし、初期化コマンドを実行", async () => {
            /** action */
            await service.openDevice();
            /** assert */
            // USBDevice の open が呼ばれているか確認
            expect(mockUSBDevice.open).toHaveBeenCalledOnce();
        });
    });
    describe("closeDevice", () => {
        test("デバイスをクローズし、リソースを開放", async () => {
            /** action */
            await service.closeDevice();
            /** assert */
            // USBDevice の close が呼ばれているか確認
            expect(mockUSBDevice.close).toHaveBeenCalledOnce();
        });
    });
    describe("polling", () => {
        test("正常系：ポーリング結果を返す", async () => {
            /** arrange */
            // polling() 内ではoperateFelica を呼ぶため
            // stub 化して、ダミーのレスポンスを返す
            const dummyResponse = {
                length: 20,
                responseCode: 0x00,
                // 先頭 8 バイト: IDm, 16～17 バイト: systemCode
                data: [
                    0x01,
                    0x02,
                    0x03,
                    0x04,
                    0x05,
                    0x06,
                    0x07,
                    0x08, // idm
                    0x09,
                    0x0a,
                    0x0b,
                    0x0c,
                    0x0d,
                    0x0e,
                    0x0f,
                    0x10, // filler
                    0xaa,
                    0xbb, // systemCode
                    0xcc,
                    0xdd, // extra
                ],
            };
            // インスタンス上の private メソッド felicaOperation を上書き
            service.felicaReader.operateFelica.mockResolvedValue(dummyResponse);
            /** action */
            const result = await service.polling(1);
            /** assert */
            expect(service.felicaReader.operateFelica).toHaveBeenCalledWith([
                0x5f,
                0x46,
                0x04, //felicaリクエストヘッダ
                0xe8,
                0x03,
                0x00,
                0x00, //タイムアウト
                0x95,
                0x82, // 固定値
                0x00,
                0x06, // データ長
                0x06, // コマンド長 + 1を付加
                0x00,
                0xff,
                0xff,
                0x01,
                0x00, // pollingコマンド
            ], "Polling");
            expect(result).toEqual({
                idm: "0102030405060708",
                systemCode: "AABB",
            });
        });
        test("ポーリング結果がundefinedのとき、undefinedを返す", async () => {
            /** arrange */
            service.felicaReader.operateFelica.mockResolvedValue(undefined);
            /** action */
            const result = await service.polling(100);
            /** assert */
            expect(result).toBeUndefined();
        });
    });
    describe("requestService", () => {
        test("正常系：FeliCaのサービス情報を応答する", async () => {
            /** arrange */
            const dummyResponse = {
                length: 15,
                responseCode: 0x00,
                data: [
                    0x01,
                    0x02,
                    0x03,
                    0x04,
                    0x05,
                    0x06,
                    0x07,
                    0x08, // idm
                    0x09, // nodeCount (1 バイト)
                    0x0a,
                    0x0b,
                    0x0c,
                    0x0d, // nodeKeyVerList (残り)
                ],
            };
            service.felicaReader.operateFelica.mockResolvedValue(dummyResponse);
            // nodeCodeList は長さが偶数（かつ 2～64 の範囲）でなければならない
            const nodeCodeList = [0x11, 0x12];
            /** action */
            const result = await service.requestService("0102030405060708", nodeCodeList);
            /** assert */
            expect(result).toEqual({
                idm: "0102030405060708",
                nodeCount: "09 ",
                nodeKeyVerList: "0A 0B 0C 0D ",
            });
        });
        test("不正な長さのnodeCodeListを指定（要素無し）時、例外発生", async () => {
            /** action & assert */
            await expect(service.requestService("0102030405060708", [])).rejects.toThrow("ノードコードリストの桁数が不適切です");
        });
        test("不正な長さのnodeCodeListを指定（要素数が2で割り切れない）時、例外発生", async () => {
            /** action & assert */
            await expect(service.requestService("0102030405060708", [0x11, 0x11, 0x11])).rejects.toThrow("ノードコードリストの桁数が不適切です");
        });
        test("不正な長さのnodeCodeListを指定（64より長い）時、例外発生", async () => {
            /** action & assert */
            // 66個のコード（長さ 66 は 64 を超える）
            const longNodeCodeList = new Array(66).fill(0);
            await expect(service.requestService("0102030405060708", longNodeCodeList)).rejects.toThrow("ノードコードリストの桁数が不適切です");
        });
        test("felicaOperationがundefinedを返す場合、undefinedを返す", async () => {
            /** arrange */
            service.felicaReader.operateFelica.mockResolvedValue(undefined);
            // nodeCodeList は長さが偶数（かつ 2～64 の範囲）でなければならない
            const nodeCodeList = [0x11, 0x12];
            /** action */
            const result = await service.requestService("0102030405060708", nodeCodeList);
            /** assert */
            expect(result).not.toBeDefined();
        });
    });
    describe("readWithoutEncryption", () => {
        test("正常系（単一ブロック）", async () => {
            // ダミーのレスポンスデータを用意
            const dummyResponse = {
                length: 20,
                responseCode: 0x00,
                data: [
                    0x41,
                    0x42,
                    0x43,
                    0x44,
                    0x45,
                    0x46,
                    0x47,
                    0x48, // idm: "4142434445464748"
                    0x31, // statusFlag1
                    0x32, // statusFlag2
                    0x33, // blockSize
                    0x34,
                    0x35,
                    0x36,
                    0x37, // blockData (partial example)
                ],
            };
            // stub: felicaOperation を上書き
            service.felicaReader.operateFelica.mockResolvedValue(dummyResponse);
            const params = [
                {
                    serviceCode: "1234",
                    blockListParam: {
                        accessMode: "normal",
                        blockNoStart: 1,
                        blockNoEnd: 1,
                    },
                },
            ];
            const result = await service.readWithoutEncryption("4142434445464748", params);
            expect(result).toEqual({
                idm: "4142434445464748",
                statusFlag1: arrayToHex(new Uint8Array(dummyResponse.data.slice(8, 9))),
                statusFlag2: arrayToHex(new Uint8Array(dummyResponse.data.slice(9, 10))),
                blockSize: arrayToHex(new Uint8Array(dummyResponse.data.slice(10, 11))),
                blockData: arrayToHex(new Uint8Array(dummyResponse.data.slice(11)), true),
            });
        });
        test("正常系（複数ブロック）", async () => {
            /** arrange */
            const dummyResponse = {
                length: 25,
                responseCode: 0x00,
                data: [
                    0x01,
                    0x02,
                    0x03,
                    0x04,
                    0x05,
                    0x06,
                    0x07,
                    0x08, // idm
                    0x09, // statusFlag1
                    0x0a, // statusFlag2
                    0x0b, // blockSize
                    // blockData: 14 バイト分（任意の値）
                    0x0c,
                    0x0d,
                    0x0e,
                    0x0f,
                    0x10,
                    0x11,
                    0x12,
                    0x13,
                    0x14,
                    0x15,
                    0x16,
                    0x17,
                    0x18,
                    0x19,
                ],
            };
            service.felicaReader.operateFelica.mockResolvedValue(dummyResponse);
            const params = [
                {
                    serviceCode: "1234",
                    blockListParam: {
                        accessMode: "normal",
                        blockNoStart: 1,
                        blockNoEnd: 2,
                    },
                },
            ];
            /** action */
            const result = await service.readWithoutEncryption("0102030405060708", params);
            /** assert */
            expect(result).toEqual({
                idm: "0102030405060708",
                statusFlag1: "09 ",
                statusFlag2: "0A ",
                blockSize: "0B ",
                blockData: arrayToHex(new Uint8Array(dummyResponse.data.slice(11)), true),
            });
        });
        test("paramsの長さが0の場合に例外発生", async () => {
            /** action & assert */
            await expect(service.readWithoutEncryption("0102030405060708", [])).rejects.toThrow("paramsが不正です。対象のサービスは1〜16個の範囲で指定してください");
        });
        test("paramsの長さが16より大きい場合に例外発生", async () => {
            /** arrange */
            const params = new Array(17).fill({
                serviceCode: "1234",
                blockListParam: {
                    accessMode: "normal",
                    blockNoStart: 1,
                    blockNoEnd: 2,
                },
            });
            /** action & assert */
            await expect(service.readWithoutEncryption("0102030405060708", params)).rejects.toThrow("paramsが不正です。対象のサービスは1〜16個の範囲で指定してください");
        });
        test("serviceCode が 4桁文字列ではないと例外発生", async () => {
            /** arrange */
            const params = [
                {
                    serviceCode: "123", // 不正な長さ
                    blockListParam: {
                        accessMode: "normal",
                        blockNoStart: 1,
                        blockNoEnd: 2,
                    },
                },
            ];
            /** action & assert */
            await expect(service.readWithoutEncryption("0102030405060708", params)).rejects.toThrow("サービスコードリストの桁数が不適切です:123");
        });
        test("felicaOperationがundefinedを返す場合、undefinedを返す", async () => {
            /** arrange */
            // stub: felicaOperation を上書き
            service.felicaReader.operateFelica.mockResolvedValue(undefined);
            const params = [
                {
                    serviceCode: "1234",
                    blockListParam: {
                        accessMode: "normal",
                        blockNoStart: 1,
                        blockNoEnd: 1,
                    },
                },
            ];
            /** action */
            const result = await service.readWithoutEncryption("4142434445464748", params);
            /** assert */
            expect(result).not.toBeDefined();
        });
    });
    describe("constructBlockList", () => {
        test("正常に応答(blockNoEnd <= 0xff)", () => {
            /** arrange */
            const param = {
                accessMode: "normal",
                blockNoStart: 1,
                blockNoEnd: 3,
            };
            /** action */
            const result = service["constructBlockList"](param, 0);
            /** assert */
            // 2バイトの場合、先頭バイトは 0b10000000 + serviceListOrder (ここでは 0)
            // 期待値: [0x80, 1, 0x80, 2, 0x80, 3]
            expect(result).toEqual([0x80, 1, 0x80, 2, 0x80, 3]);
        });
        test("正常に応答(blockNoEnd > 0xff)", () => {
            /** arrange */
            // ここでは、blockNoStart と blockNoEnd の値を、0xff より大きく、かつ 0xffff 以下に設定する
            const param = {
                accessMode: "normal",
                blockNoStart: 0x100,
                blockNoEnd: 0x102,
            };
            /** action */
            const result = service["constructBlockList"](param, 0);
            /** assert */
            // blockSize は 3 となるため、各ブロックは3バイトずつ
            // 先頭バイト: 0b10000000 (0x80) + serviceListOrder (ここでは 0)
            // 2 番目のバイト: 下位バイト, 3 番目のバイト: 上位バイト (0x100 => 0x00, 0x01など)
            // 期待値例:
            // blockNoStart = 0x100 → 0x80, 0x00, 0x01
            // blockNoStart + 1 = 0x101 → 0x80, 0x01, 0x01
            // blockNoStart + 2 = 0x102 → 0x80, 0x02, 0x01
            expect(result).toEqual([
                0x00, 0x00, 0x01, 0x00, 0x01, 0x01, 0x00, 0x02, 0x01,
            ]);
        });
        test("正常系：accessMode: purse-cashback", () => {
            /** arrange */
            const param = {
                accessMode: "purse-cashback",
                blockNoStart: 1,
                blockNoEnd: 3, // 3 < 0xff なので blockSize = 2
            };
            /** action */
            const result = service["constructBlockList"](param, 0);
            /** assert */
            // d0 = 0 (初期値) -> if (blockSize===2) なら +0x80 -> d0 = 0x80
            // さらに accessModeが "purse-cashback" なら +0x10 -> d0 = 0x90
            // 期待値: 各ブロック: [0x90, blockNo]
            expect(result).toEqual([0x90, 1, 0x90, 2, 0x90, 3]);
        });
        test("blockNoEnd が 0xffff より大きい場合に例外発生", () => {
            /** arrange */
            const param = {
                accessMode: "normal",
                blockNoStart: 1,
                blockNoEnd: 0x10000,
            };
            /** action & assert */
            expect(() => service["constructBlockList"](param, 0)).toThrow("blockCountが不正です");
        });
        test("serviceListOrder が 0xff より大きい場合に例外発生", () => {
            /** arrange */
            const param = {
                accessMode: "normal",
                blockNoStart: 1,
                blockNoEnd: 3,
            };
            /** action & assert */
            expect(() => service["constructBlockList"](param, 0x100)).toThrow("serviceListOrderが不正です");
        });
    });
    // describe("getUsbConfigSet（異常系のみ）", () => {
    //   test("configuration が取得できない場合に例外発生", () => {
    //     /** arrange */
    //     const fakeDeviceNoConf = { ...mockUSBDevice, configuration: undefined };
    //     const serviceNoConf = new FelicaService(
    //       fakeDeviceNoConf as USBDevice,
    //       false,
    //     );
    //     /** action & assert */
    //     expect(() => serviceNoConf["getUsbConfigSet"]()).toThrow(
    //       "configurationがありません",
    //     );
    //   });
    //   test("input endpointが取得できない場合に例外発生", () => {
    //     /** arrange */
    //     const fakeDeviceNoIn = {
    //       ...mockUSBDevice,
    //       configuration: {
    //         ...mockUSBDevice.configuration,
    //         interfaces: mockUSBDevice.configuration?.interfaces.map(
    //           (iface, index) => {
    //             // configurationValue と一致するインターフェイスのみ変更する
    //             if (index === mockUSBDevice.configuration?.configurationValue) {
    //               return {
    //                 ...iface,
    //                 alternate: {
    //                   ...iface.alternate,
    //                   endpoints: iface.alternate.endpoints.filter(
    //                     (ep: USBEndpoint) => ep.direction !== "in",
    //                   ),
    //                 },
    //               };
    //             }
    //             return iface;
    //           },
    //         ),
    //       },
    //     } as USBDevice;
    //     const serviceNoIn = new FelicaService(fakeDeviceNoIn, false);
    //     /** action & assert */
    //     expect(() => serviceNoIn["getUsbConfigSet"]()).toThrow(
    //       "入力USBエンドポイントが取得できませんでした",
    //     );
    //   });
    //   test("output endpointが取得できない場合に例外発生", () => {
    //     /** arrange */
    //     const fakeDeviceNoOut = {
    //       ...mockUSBDevice,
    //       configuration: {
    //         ...mockUSBDevice.configuration,
    //         interfaces: mockUSBDevice.configuration?.interfaces.map(
    //           (iface, index) => {
    //             if (index === mockUSBDevice.configuration?.configurationValue) {
    //               return {
    //                 ...iface,
    //                 alternate: {
    //                   ...iface.alternate,
    //                   endpoints: iface.alternate.endpoints.filter(
    //                     (ep: USBEndpoint) => ep.direction !== "out",
    //                   ),
    //                 },
    //               };
    //             }
    //             return iface;
    //           },
    //         ),
    //       },
    //     } as USBDevice;
    //     const serviceNoOut = new FelicaService(fakeDeviceNoOut, false);
    //     /** action & assert */
    //     expect(() => serviceNoOut["getUsbConfigSet"]()).toThrow(
    //       "出力USBエンドポイントが取得できませんでした",
    //     );
    //   });
    // });
    // describe("wrapCTXIns", () => {
    //   test("正常系", async () => {
    //     const felicaCommand = [0x01, 0x02, 0x03, 0x04, 0x05];
    //     const timeout = 100; // 100ミリ秒
    //     // 計算: wrapCTXIns では
    //     // communicateThruEX: 5バイト
    //     // + 2バイト (felicaReqLen)
    //     // + felicaReq: felicaHeader (3) + 4(timeout) + felicaOption (2) + 2 (コマンド長の2バイト) + 1 (コマンド長) + felicaCommand.length (5)
    //     // = 3+4+2+2+1+5 = 17 バイト
    //     // + communicateThruEXFooter: 3バイト
    //     // 合計 = 5 + 2 + 17 + 3 = 27 バイト
    //     /** action */
    //     const result = await service["wrapCTXIns"](felicaCommand, timeout);
    //     /** assert */
    //     expect(result).toBeInstanceOf(Uint8Array);
    //     expect(result.length).toBe(27);
    //   });
    // });
    // describe("unwrapCTXResponse", () => {
    //   test("正常系", () => {
    //     /** arrange */
    //     // 例: [0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20]
    //     // 0x97 at index 2, length = arr[3] = 0x04,
    //     // 全データ部分 = [0x00, 0x05, 0x10, 0x20] → responseCode = 0x05, data = [0x10, 0x20]
    //     const arr = new Uint8Array([
    //       0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20, 0x99,
    //     ]);
    //     const dv = new DataView(arr.buffer);
    //     /** action */
    //     const result = service["unwrapCTXResponse"]({ data: dv });
    //     /** assert */
    //     expect(result).toEqual({
    //       length: 4,
    //       responseCode: 0x05,
    //       data: [0x10, 0x20],
    //     });
    //   });
    //   test("cTXResponse.data がundefinedの場合、undefinedを返す", () => {
    //     /** action */
    //     const result = service["unwrapCTXResponse"]({ data: undefined });
    //     /** assert */
    //     expect(result).toBeUndefined();
    //   });
    //   test("データに 0x97 がない場合、undefinedを返す", () => {
    //     /** arrange */
    //     // DataView に 0x97 を含まない配列を用意
    //     const arr = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
    //     const dv = new DataView(arr.buffer);
    //     /** action */
    //     const result = service["unwrapCTXResponse"]({ data: dv });
    //     /** assert */
    //     expect(result).toBeUndefined();
    //   });
    // });
    // describe("felicaOperation", () => {
    //   test("正常系：各privateメソッドの実行(wrapCTXIns, sendUsb, recvUsb, unwrapCTXResponse)", async () => {
    //     /** arrange */
    //     // // モック: wrapCTXIns を任意の Uint8Array を返すように設定
    //     // (service["wrapCTXIns"] as Mock).mockResolvedValueOnce(
    //     //   new Uint8Array([0x01, 0x02, 0x03]),
    //     // );
    //     // // モック: sendUsb は何もしない
    //     // (service["sendUsb"] as Mock).mockResolvedValueOnce(undefined);
    //     // // モック: recvUsb を呼び出すと、fake DataView を返す
    //     // // 作成するデータ: [0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20]
    //     // const fakeArr = new Uint8Array([
    //     //   0x11, 0x22, 0x97, 0x04, 0x00, 0x05, 0x10, 0x20,
    //     // ]);
    //     // const fakeDV = new DataView(fakeArr.buffer);
    //     // (service["recvUsb"] as Mock).mockResolvedValueOnce({ data: fakeDV });
    //     /** action */
    //     console.log(
    //       (service["felicaOperation"] as Mock)
    //         .getMockImplementation()
    //         ?.toString(),
    //     );
    //     const result = await service["felicaOperation"](
    //       [0x0a, 0x0b],
    //       100,
    //       "TestOperation",
    //     );
    //     /** assert */
    //     expect(result).toEqual({
    //       length: 4,
    //       responseCode: 0x05,
    //       data: [0x10, 0x20],
    //     });
    //   });
    // });
    // describe("デバッグモード", () => {
    //   test("console.logが出力される", async () => {
    //     /** arrange */
    //     const logSpy = vi.spyOn(console, "log");
    //     const mockUSBDevice = createFakeUSBDevice();
    //     const serviceDebugMode = new FelicaService(mockUSBDevice, true); // isDebug: true
    //     serviceDebugMode["recvUsb"] = vi.fn(
    //       serviceDebugMode["recvUsb"].bind(serviceDebugMode),
    //     );
    //     serviceDebugMode["sendUsb"] = vi.fn(
    //       serviceDebugMode["sendUsb"].bind(serviceDebugMode),
    //     );
    //     /** action */
    //     await serviceDebugMode.closeDevice();
    //     /** assert */
    //     expect(logSpy).toHaveBeenCalledTimes(4);
    //   });
    // });
});
