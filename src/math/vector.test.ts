import { describe, it, expect } from "vitest";
import {
  dotProduct,
  magnitude,
  cosineSimilarity,
  normalize,
} from "./vector.js";

describe("Vector Mathematics Engine", () => {
  describe("dotProduct", () => {
    it("should calculate correct dot product for 2D and 3D vectors", () => {
      expect(dotProduct([1, 2], [3, 4])).toBe(11); // 1*3 + 2*4 = 11
      expect(dotProduct([1, 0, -1], [2, 3, 4])).toBe(-2); // 1*2 + 0*3 + (-1)*4 = -2
    });

    it("should throw error if dimensions do not match", () => {
      expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow(
        "Dimension mismatch: vector A has 2 dimensions, but vector B has 3 dimensions"
      );
    });

    it("should throw error for empty vectors", () => {
      expect(() => dotProduct([], [])).toThrow("Vectors must not be empty");
    });
  });

  describe("magnitude (L2 Norm)", () => {
    it("should calculate correct Euclidean norm", () => {
      expect(magnitude([3, 4])).toBe(5); // sqrt(9 + 16) = 5
      expect(magnitude([0, 0, 0])).toBe(0);
      expect(magnitude([1, 0, 0])).toBe(1);
    });

    it("should throw error for empty vector", () => {
      expect(() => magnitude([])).toThrow("Vector must not be empty");
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1.0 for vectors pointing in the exact same direction", () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6]; // b is simply 2 * a
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    });

    it("should return 0.0 for orthogonal (unrelated) vectors", () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it("should return -1.0 for diametrically opposite vectors", () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it("should throw error when comparing against a zero-magnitude vector", () => {
      expect(() => cosineSimilarity([0, 0, 0], [1, 2, 3])).toThrow(
        "Cannot compute cosine similarity for a zero-magnitude vector"
      );
    });
  });

  describe("normalize & the Dot Product Equivalence", () => {
    it("should produce a vector with unit magnitude (1.0)", () => {
      const v = [3, 4];
      const normalized = normalize(v);

      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
      expect(magnitude(normalized)).toBeCloseTo(1.0, 5);
    });

    it("proves that dotProduct of normalized vectors EQUALS cosineSimilarity", () => {
      const v1 = [4, 2, 7, 1];
      const v2 = [1, 5, 2, 9];

      const rawCosine = cosineSimilarity(v1, v2);

      const norm1 = normalize(v1);
      const norm2 = normalize(v2);
      const dotOfNorms = dotProduct(norm1, norm2);

      // This confirms why database search on normalized vectors is so fast!
      expect(dotOfNorms).toBeCloseTo(rawCosine, 5);
    });

    it("should throw error when normalizing zero-vector", () => {
      expect(() => normalize([0, 0, 0])).toThrow(
        "Cannot normalize a zero-magnitude vector"
      );
    });
  });
});
