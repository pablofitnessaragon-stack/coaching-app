import { describe, expect, it } from "vitest";
import { faltanParaGrasaMarina, grasaMarina } from "../grasa";

describe("% de grasa con la fórmula de la Marina", () => {
  it("hombre: 178 cm, cintura 85, cuello 38", () => {
    // cintura − cuello = 47 → log10 = 1,672098 ; log10(178) = 2,250420
    // divisor = 1,0324 − 0,19077 × 1,672098 + 0,15456 × 2,250420
    //         = 1,0324 − 0,318986 + 0,347825 = 1,061239
    // 495 / 1,061239 − 450 = 466,436 − 450 = 16,44 %
    const r = grasaMarina({ sexo: "hombre", alturaCm: 178, cinturaCm: 85, cuelloCm: 38 })!;
    expect(r.valor).toBeCloseTo(16.44, 2);
    expect(r.pasos.at(-1)).toBe("495 / 1,0612 − 450 = 16,4 %");
  });

  it("mujer: 165 cm, cintura 72, cadera 98, cuello 33", () => {
    // cintura + cadera − cuello = 137 → log10 = 2,136721 ; log10(165) = 2,217484
    // divisor = 1,29579 − 0,35004 × 2,136721 + 0,22100 × 2,217484
    //         = 1,29579 − 0,747938 + 0,490064 = 1,037916
    // 495 / 1,037916 − 450 = 476,917 − 450 = 26,92 %
    const r = grasaMarina({ sexo: "mujer", alturaCm: 165, cinturaCm: 72, caderaCm: 98, cuelloCm: 33 })!;
    expect(r.valor).toBeCloseTo(26.92, 2);
  });

  it("no calcula si faltan medidas y dice cuáles", () => {
    expect(grasaMarina({ sexo: "mujer", alturaCm: 165, cinturaCm: 72, cuelloCm: 33 })).toBeNull();
    expect(faltanParaGrasaMarina({ sexo: "mujer", alturaCm: 165, cinturaCm: 72 })).toEqual(["cuello", "cadera"]);
    // Al hombre no le hace falta la cadera
    expect(faltanParaGrasaMarina({ sexo: "hombre", alturaCm: 178, cinturaCm: 85, cuelloCm: 38 })).toEqual([]);
  });

  it("descarta medidas imposibles (cuello mayor que la cintura o resultado fuera de 3-60 %)", () => {
    expect(grasaMarina({ sexo: "hombre", alturaCm: 178, cinturaCm: 38, cuelloCm: 40 })).toBeNull();
    // cintura 160, cuello 30 → resta 130 → da ~63 % → no tiene sentido
    expect(grasaMarina({ sexo: "hombre", alturaCm: 150, cinturaCm: 160, cuelloCm: 30 })).toBeNull();
  });
});
