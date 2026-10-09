// Trusted per-call original-service context. The owning app supplies its own
// actual account values; no public HTTP parser, shared owner or defaults here.
export class OriginalAccountContext {
  #userId;
  #appVersion;
  #userLabel;

  constructor(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)
        || !Number.isSafeInteger(value.userId) || value.userId <= 0) {
      throw new RangeError("original account context requires an actual positive integer userId");
    }
    for (const name of ["appVersion", "userLabel"]) {
      if (typeof value[name] !== "string" || !value[name].trim()) {
        throw new RangeError(`original account context requires actual ${name}`);
      }
    }
    this.#userId = value.userId;
    this.#appVersion = value.appVersion;
    this.#userLabel = value.userLabel;
    Object.freeze(this);
  }

  get userId() { return this.#userId; }
  get appVersion() { return this.#appVersion; }
  get userLabel() { return this.#userLabel; }
}

/** Accept only a context explicitly constructed by the trusted caller. */
export function originalAccountContext(value) {
  if (value === null || value === undefined) return null;
  if (!(value instanceof OriginalAccountContext)) {
    throw new RangeError("accountContext requires a trusted OriginalAccountContext");
  }
  return value;
}
