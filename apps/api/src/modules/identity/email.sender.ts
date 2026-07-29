import type { Environment } from "../../config/env.js";

export interface OtpEmail {
  email: string;
  otp: string;
  expiresInMinutes: number;
}

export interface EmailSender {
  sendOtp(message: OtpEmail): Promise<void>;
}

export class MailtrapEmailSender implements EmailSender {
  constructor(
    private readonly config: Pick<
      Environment,
      | "MAIL_FROM_EMAIL"
      | "MAIL_FROM_NAME"
      | "MAILTRAP_API_KEY"
      | "MAILTRAP_INBOX_ID"
      | "MAILTRAP_USE_SANDBOX"
    >,
  ) {}

  async sendOtp(message: OtpEmail): Promise<void> {
    const endpoint = this.config.MAILTRAP_USE_SANDBOX
      ? `https://sandbox.api.mailtrap.io/api/send/${this.config.MAILTRAP_INBOX_ID}`
      : "https://send.api.mailtrap.io/api/send";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Api-Token": this.config.MAILTRAP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "Authentication",
        from: {
          email: this.config.MAIL_FROM_EMAIL,
          name: this.config.MAIL_FROM_NAME,
        },
        subject: "Your Clinic Scheduler login code",
        text: `Your login code is ${message.otp}. It expires in ${message.expiresInMinutes} minutes.`,
        to: [{ email: message.email }],
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Mailtrap rejected the OTP email with ${response.status}`);
    }
  }
}
