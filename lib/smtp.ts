import net from "node:net";
import tls from "node:tls";
import { getAppSettings } from "@/lib/app-settings";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  user: string;
  password: string;
  from: string;
  replyTo?: string;
  timeoutMs: number;
};

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpResponse = {
  code: number;
  raw: string;
};

export async function hasSmtpConfig() {
  const settings = await getAppSettings();
  return Boolean(settings.smtpHost && process.env.SMTP_USER && process.env.SMTP_PASSWORD && settings.smtpFrom);
}

export async function requireSmtpConfig(): Promise<SmtpConfig> {
  const settings = await getAppSettings();
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!settings.smtpHost || !user || !password || !settings.smtpFrom) {
    throw new Error("Missing SMTP configuration. Expected SMTP host/from in admin settings plus SMTP_USER and SMTP_PASSWORD in environment.");
  }

  return {
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    startTls: !settings.smtpSecure && settings.smtpStartTls,
    user,
    password,
    from: settings.smtpFrom,
    replyTo: settings.smtpReplyTo || undefined,
    timeoutMs: settings.smtpTimeoutMs
  };
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function encodeBody(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function escapeData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";
  private waiter: { resolve: (response: SmtpResponse) => void; reject: (error: Error) => void } | null = null;

  constructor(private readonly config: SmtpConfig) {}

  async connect() {
    this.socket = await this.createSocket();
    this.attachSocket(this.socket);
    await this.readResponse([220]);
    await this.command(`EHLO ${process.env.VERCEL_URL || "localhost"}`, [250]);

    if (this.config.startTls) {
      await this.command("STARTTLS", [220]);
      this.socket.removeAllListeners();
      this.socket = await this.upgradeToTls(this.socket);
      this.buffer = "";
      this.waiter = null;
      this.attachSocket(this.socket);
      await this.command(`EHLO ${process.env.VERCEL_URL || "localhost"}`, [250]);
    }
  }

  async authenticate() {
    await this.command("AUTH LOGIN", [334]);
    await this.command(Buffer.from(this.config.user, "utf8").toString("base64"), [334]);
    await this.command(Buffer.from(this.config.password, "utf8").toString("base64"), [235]);
  }

  async send(message: MailMessage) {
    const fromAddress = extractAddress(this.config.from);
    await this.command(`MAIL FROM:<${fromAddress}>`, [250]);
    await this.command(`RCPT TO:<${message.to}>`, [250, 251]);
    await this.command("DATA", [354]);
    await this.writeData(this.renderMessage(message));
    await this.readResponse([250]);
  }

  async quit() {
    if (!this.socket || this.socket.destroyed) return;

    try {
      await this.command("QUIT", [221]);
    } finally {
      this.socket.end();
    }
  }

  private createSocket() {
    return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
      const socket = this.config.secure
        ? tls.connect({ host: this.config.host, port: this.config.port, servername: this.config.host })
        : net.connect({ host: this.config.host, port: this.config.port });

      socket.once(this.config.secure ? "secureConnect" : "connect", () => resolve(socket));
      socket.once("error", reject);
    });
  }

  private upgradeToTls(socket: net.Socket | tls.TLSSocket) {
    return new Promise<tls.TLSSocket>((resolve, reject) => {
      const secureSocket = tls.connect({ socket, servername: this.config.host });
      secureSocket.once("secureConnect", () => resolve(secureSocket));
      secureSocket.once("error", reject);
    });
  }

  private attachSocket(socket: net.Socket | tls.TLSSocket) {
    socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
      this.flushResponse();
    });
    socket.on("error", (error) => this.waiter?.reject(error));
  }

  private flushResponse() {
    if (!this.waiter) return;

    const lines = this.buffer.split("\r\n");
    if (lines.length < 2) return;

    let consumed = 0;
    const responseLines: string[] = [];
    for (const line of lines.slice(0, -1)) {
      consumed += line.length + 2;
      responseLines.push(line);
      if (/^\d{3} /.test(line)) {
        const raw = responseLines.join("\n");
        const code = Number.parseInt(line.slice(0, 3), 10);
        const waiter = this.waiter;
        this.waiter = null;
        this.buffer = this.buffer.slice(consumed);
        waiter.resolve({ code, raw });
        return;
      }
    }
  }

  private readResponse(expectedCodes: number[]) {
    return new Promise<SmtpResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiter = null;
        reject(new Error("SMTP response timed out."));
      }, this.config.timeoutMs);

      this.waiter = {
        resolve: (response) => {
          clearTimeout(timeout);
          if (!expectedCodes.includes(response.code)) {
            reject(new Error(`SMTP responded with ${response.code}: ${response.raw}`));
            return;
          }

          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      };
      this.flushResponse();
    });
  }

  private async command(command: string, expectedCodes: number[]) {
    if (!this.socket) throw new Error("SMTP socket is not connected.");
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expectedCodes);
  }

  private async writeData(data: string) {
    if (!this.socket) throw new Error("SMTP socket is not connected.");
    this.socket.write(`${escapeData(data)}\r\n.\r\n`);
  }

  private renderMessage(message: MailMessage) {
    const boundary = `gurken-${crypto.randomUUID()}`;
    const headers = [
      `From: ${this.config.from}`,
      `To: ${message.to}`,
      `Subject: ${encodeHeader(message.subject)}`,
      "MIME-Version: 1.0",
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@gurken.family>`
    ];

    if (this.config.replyTo) headers.push(`Reply-To: ${this.config.replyTo}`);

    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBody(message.text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBody(message.html || message.text.replace(/\n/g, "<br />")),
      `--${boundary}--`
    ];

    return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  }
}

export async function sendMail(message: MailMessage) {
  const connection = new SmtpConnection(await requireSmtpConfig());
  try {
    await connection.connect();
    await connection.authenticate();
    await connection.send(message);
  } finally {
    await connection.quit();
  }
}
