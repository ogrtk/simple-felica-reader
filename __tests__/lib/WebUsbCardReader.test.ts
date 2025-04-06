// WebUsbCardReader.test.ts
import { FelicaService } from "@/src/lib/FelicaService";
import type { IFelicaReader } from "@/src/lib/IFelicaReader";
import {
  type ReadServiceParam,
  WebUsbCardReader,
} from "@/src/lib/WebUsbCardReader";
import { sleep } from "@/src/lib/utils";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";

// モジュールのモック化
vi.mock("@/src/lib/FelicaService");
vi.mock("@/src/lib/utils", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

describe("WebUsbCardReader", () => {
  // テスト内で使用するダミーの FelicaService を定義
  let fakeFelicaService: FelicaService;

  // 各テスト実行前にダミーの FelicaService を初期化・リセットする
  beforeEach(() => {
    fakeFelicaService = {
      openDevice: vi.fn().mockResolvedValue(undefined),
      polling: vi.fn(),
      closeDevice: vi.fn().mockResolvedValue(undefined),
      requestService: vi.fn(),
      readWithoutEncryption: vi.fn(),
      felicaReader: { isOpened: false },
    } as unknown as FelicaService;

    vi.clearAllMocks();
  });

  // connect メソッドのテスト
  describe("connect", () => {
    test("FelicaService が利用可能な場合、インスタンスを返す", async () => {
      // FelicaService.connectFelicaReader が fakeFelicaService を返すようにモック設定
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      // connect 経由でインスタンスを取得
      const reader = await WebUsbCardReader.connect([], false);
      expect(reader).toBeDefined();
      expect(reader?.felicaService).toBe(fakeFelicaService);
    });

    test("FelicaService が利用できない場合、undefined を返す", async () => {
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(undefined);
      const reader = await WebUsbCardReader.connect([], false);
      expect(reader).toBeUndefined();
    });
  });

  // polling メソッドのテスト
  describe("polling", () => {
    test("正常に polling 応答が得られる場合、その応答を返す", async () => {
      let callCount = 0;
      // polling 呼び出しごとにカウントし、2回目で成功するようにモック実装
      (fakeFelicaService.polling as Mock).mockImplementation(() => {
        callCount++;
        return callCount === 2
          ? Promise.resolve({ idm: "sampleIdm" })
          : Promise.resolve(undefined);
      });
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      const response = await reader.polling(3);
      expect(response).toEqual({ idm: "sampleIdm" });
      // openDevice と closeDevice が 2 回ずつ呼ばれることを確認
      expect(fakeFelicaService.openDevice).toHaveBeenCalledTimes(2);
      expect(fakeFelicaService.closeDevice).toHaveBeenCalledTimes(2);
      // 1回 sleep が呼ばれている（1回目の polling 失敗時）
      expect(sleep).toHaveBeenCalledTimes(1);
    });

    test("エラー発生時、例外を投げ、デバイスがクローズされる", async () => {
      (fakeFelicaService.polling as Mock).mockRejectedValue(
        new Error("Polling error"),
      );
      // デバイスが開いている状態をシミュレーション
      fakeFelicaService.felicaReader = { isOpened: true } as IFelicaReader;
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      await expect(reader.polling(1)).rejects.toThrow("Polling error");
      // エラー発生時に必ず closeDevice が呼ばれることを確認
      expect(fakeFelicaService.closeDevice).toHaveBeenCalled();
    });
  });

  // requestService メソッドのテスト
  describe("requestService", () => {
    test("正常な polling 応答が得られる場合、サービス結果を返す", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue({
        idm: "sampleIdm",
      });
      (fakeFelicaService.requestService as Mock).mockResolvedValue({
        service: "result",
      });
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      const result = await reader.requestService([1, 2, 3]);
      expect(result).toEqual({ service: "result" });
      expect(fakeFelicaService.openDevice).toHaveBeenCalled();
      expect(fakeFelicaService.closeDevice).toHaveBeenCalled();
      expect(fakeFelicaService.requestService).toHaveBeenCalledWith(
        "sampleIdm",
        [1, 2, 3],
      );
    });

    test("polling が undefined を返す場合、undefined を返す", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue(undefined);
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      const result = await reader.requestService([1, 2, 3]);
      expect(result).toBeUndefined();
      // polling 失敗時には、openDevice と closeDevice が最大試行回数分（10 回）呼ばれることを確認
      expect(fakeFelicaService.openDevice).toHaveBeenCalledTimes(10);
      expect(fakeFelicaService.closeDevice).toHaveBeenCalledTimes(10);
    });

    test("エラー発生時、例外を投げ、デバイスがクローズされる", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue({
        idm: "sampleIdm",
      });
      (fakeFelicaService.requestService as Mock).mockRejectedValue(
        new Error("Request error"),
      );
      fakeFelicaService.felicaReader = { isOpened: true } as IFelicaReader;
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      await expect(reader.requestService([1])).rejects.toThrow("Request error");
      expect(fakeFelicaService.closeDevice).toHaveBeenCalled();
    });
  });

  // readWithoutEncryption メソッドのテスト
  describe("readWithoutEncryption", () => {
    test("正常な polling 応答が得られる場合、読み取り結果を返す", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue({
        idm: "sampleIdm",
      });
      const params: ReadServiceParam[] = [
        {
          serviceCode: "0009",
          blockListParam: {
            accessMode: "normal",
            blockNoStart: 0,
            blockNoEnd: 1,
          },
        },
      ];
      (fakeFelicaService.readWithoutEncryption as Mock).mockResolvedValue({
        data: "readData",
      });
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      const result = await reader.readWithoutEncryption(params);
      expect(result).toEqual({ data: "readData" });
      expect(fakeFelicaService.openDevice).toHaveBeenCalled();
      expect(fakeFelicaService.closeDevice).toHaveBeenCalled();
      expect(fakeFelicaService.readWithoutEncryption).toHaveBeenCalledWith(
        "sampleIdm",
        params,
      );
    });

    test("polling が undefined を返す場合、undefined を返す", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue(undefined);
      const params: ReadServiceParam[] = [
        {
          serviceCode: "0009",
          blockListParam: {
            accessMode: "normal",
            blockNoStart: 0,
            blockNoEnd: 1,
          },
        },
      ];
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      const result = await reader.readWithoutEncryption(params);
      expect(result).toBeUndefined();
      // polling 失敗時には、openDevice と closeDevice が最大試行回数分（10 回）呼ばれることを確認
      expect(fakeFelicaService.openDevice).toHaveBeenCalledTimes(10);
      expect(fakeFelicaService.closeDevice).toHaveBeenCalledTimes(10);
    });

    test("エラー発生時、例外を投げ、デバイスがクローズされる", async () => {
      (fakeFelicaService.polling as Mock).mockResolvedValue({
        idm: "sampleIdm",
      });
      (fakeFelicaService.readWithoutEncryption as Mock).mockRejectedValue(
        new Error("Read error"),
      );
      fakeFelicaService.felicaReader = { isOpened: true } as IFelicaReader;
      const params: ReadServiceParam[] = [
        {
          serviceCode: "0009",
          blockListParam: {
            accessMode: "normal",
            blockNoStart: 0,
            blockNoEnd: 1,
          },
        },
      ];
      (FelicaService.connectFelicaReader as Mock).mockResolvedValue(
        fakeFelicaService,
      );
      const reader = await WebUsbCardReader.connect([], false);
      if (!reader) throw new Error("Reader is undefined");
      await expect(reader.readWithoutEncryption(params)).rejects.toThrow(
        "Read error",
      );
      expect(fakeFelicaService.closeDevice).toHaveBeenCalled();
    });
  });
});
