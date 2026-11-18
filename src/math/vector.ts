/**
 * Vector Mathematics Engine
 *
 * Implements fundamental linear algebra operations required for
 * dense embedding similarity search and vector normalization.
 */

/**
 * Validates that two vectors have matching, non-zero dimensions.
 */
function assertMatchingDimensions(a: number[], b: number[]): void {
  if (a.length === 0 || b.length === 0) {
    throw new Error("Vectors must not be empty");
  }
  if (a.length !== b.length) {
    throw new Error(
      `Dimension mismatch: vector A has ${a.length} dimensions, but vector B has ${b.length} dimensions`
    );
  }
}

/**
 * Calculates the dot product (inner product) of two vectors: sum(A[i] * B[i])
 */
export function dotProduct(a: number[], b: number[]): number {
  assertMatchingDimensions(a, b);

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculates the Euclidean (L2) norm of a vector: sqrt(sum(v[i]^2))
 */
export function magnitude(a: number[]): number {
  if (a.length === 0) {
    throw new Error("Vector must not be empty");
  }

  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    sumSquares += a[i] * a[i];
  }
  return Math.sqrt(sumSquares);
}

/**
 * Calculates the cosine similarity between two vectors:
 * cos(theta) = (A . B) / (||A|| * ||B||)
 *
 * Range: [-1.0, 1.0]
 * - 1.0: Vectors point in identical direction
 * - 0.0: Vectors are orthogonal (unrelated)
 * - -1.0: Vectors point in opposite directions
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  assertMatchingDimensions(a, b);

  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    throw new Error("Cannot compute cosine similarity for a zero-magnitude vector");
  }

  const dot = dotProduct(a, b);
  const similarity = dot / (magA * magB);

  // Clamp floating point rounding anomalies into [-1, 1]
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Normalizes a vector to unit length (L2 norm = 1.0).
 * Unit normalization allows cosine similarity to be calculated
 * as a simple dot product, dramatically accelerating database search.
 */
export function normalize(a: number[]): number[] {
  const mag = magnitude(a);
  if (mag === 0) {
    throw new Error("Cannot normalize a zero-magnitude vector");
  }

  const result = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] / mag;
  }
  return result;
}
