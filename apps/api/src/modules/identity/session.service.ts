import { SignJWT, jwtVerify } from "jose";

const algorithm = "HS256";

export class SessionService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly ttlSeconds: number,
    private readonly issuer: string,
    private readonly audience: string,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async create(accountId: string): Promise<string> {
    return new SignJWT()
      .setProtectedHeader({ alg: algorithm, typ: "JWT" })
      .setSubject(accountId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.ttlSeconds}s`)
      .sign(this.key);
  }

  async resolve(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [algorithm],
        audience: this.audience,
        issuer: this.issuer,
      });

      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
