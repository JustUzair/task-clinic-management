import type { Redis } from "@upstash/redis";

export interface OtpChallenge {
  accountId: string;
  email: string;
  hashedOtp: string;
}

export interface OtpStore {
  consumeChallenge(key: string): Promise<OtpChallenge | null>;
  delete(key: string): Promise<void>;
  getChallenge(key: string): Promise<OtpChallenge | null>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  setChallenge(
    key: string,
    challenge: OtpChallenge,
    ttlSeconds: number,
  ): Promise<void>;
}

export class UpstashOtpStore implements OtpStore {
  constructor(private readonly client: Redis) {}

  async consumeChallenge(key: string): Promise<OtpChallenge | null> {
    return this.client.getdel<OtpChallenge>(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getChallenge(key: string): Promise<OtpChallenge | null> {
    return this.client.get<OtpChallenge>(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return value;
  }

  async setChallenge(
    key: string,
    challenge: OtpChallenge,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, challenge, { ex: ttlSeconds });
  }
}
