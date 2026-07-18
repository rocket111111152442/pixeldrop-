import tls from "node:tls";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

type SmtpResponse = {
  code: number;
  message: string;
};

const EMAIL_RE = /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/;
const SMTP_TIMEOUT_MS = 15_000;

function getMailConfig(): MailConfig | null {
  const user =
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.EMAIL_SERVER_USER ||
    "";
  const rawPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_APP_PASSWORD ||
    process.env.EMAIL_SERVER_PASSWORD ||
    "";
  if (!user || !rawPass) return null;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "465");
  const pass = host.includes("gmail.com")
    ? rawPass.replace(/\s+/g, "")
    : rawPass;
  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    `PebbleDrop <${user}>`;

  return { host, port, user, pass, from };
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]/g, " ").trim().slice(0, 500);
}

function sanitizeAddress(value: string) {
  const clean = sanitizeHeader(value).toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new Error("INVALID_EMAIL_ADDRESS");
  return clean;
}

function normalizeBody(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\r\n")
    .replace(/^\./gm, "..");
}

function buildMessage(payload: MailPayload, config: MailConfig) {
  const to = sanitizeAddress(payload.to);
  const subject = sanitizeHeader(payload.subject);
  const from = sanitizeHeader(config.from);
  const body = payload.html || payload.text;
  const contentType = payload.html ? "text/html" : "text/plain";

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}; charset=UTF-8`,
    "Content-Transfer-Encoding: 8bit",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${normalizeBody(body)}`;
}

function connect(config: MailConfig) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
      rejectUnauthorized: true,
    });
    const onError = (error: Error) => reject(error);
    socket.setTimeout(SMTP_TIMEOUT_MS, () => {
      socket.destroy(new Error("SMTP_TIMEOUT"));
    });
    socket.once("error", onError);
    socket.once("secureConnect", () => {
      socket.off("error", onError);
      resolve(socket);
    });
  });
}

function createReader(socket: tls.TLSSocket) {
  let buffer = "";
  const queue: string[] = [];
  let pendingResolve: ((line: string) => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  function fail(error: Error) {
    if (!pendingReject) return;
    const reject = pendingReject;
    pendingResolve = null;
    pendingReject = null;
    reject(error);
  }

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let index = buffer.indexOf("\n");
    while (index !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, "");
      buffer = buffer.slice(index + 1);
      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        pendingReject = null;
        resolve(line);
      } else {
        queue.push(line);
      }
      index = buffer.indexOf("\n");
    }
  });
  socket.on("error", fail);
  socket.on("close", () => fail(new Error("SMTP_CLOSED")));

  function nextLine() {
    if (queue.length > 0) return Promise.resolve(queue.shift() as string);
    return new Promise<string>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
    });
  }

  async function readResponse(): Promise<SmtpResponse> {
    const lines: string[] = [];
    let code = 0;
    while (lines.length < 40) {
      const line = await nextLine();
      lines.push(line);
      const match = line.match(/^(\d{3})([ -])/);
      if (!match) continue;
      code = Number(match[1]);
      if (match[2] === " ") {
        return { code, message: lines.join("\n") };
      }
    }
    throw new Error("SMTP_BAD_RESPONSE");
  }

  return { readResponse };
}

async function expectResponse(
  response: Promise<SmtpResponse>,
  expected: number[],
) {
  const result = await response;
  if (!expected.includes(result.code)) {
    throw new Error(`SMTP_${result.code}`);
  }
  return result;
}

async function command(
  socket: tls.TLSSocket,
  reader: ReturnType<typeof createReader>,
  line: string,
  expected: number[],
) {
  socket.write(`${line}\r\n`);
  return expectResponse(reader.readResponse(), expected);
}

export function isMailConfigured(): boolean {
  return getMailConfig() !== null;
}

export async function sendMail(payload: MailPayload) {
  const config = getMailConfig();
  if (!config) throw new Error("MAIL_NOT_CONFIGURED");

  const socket = await connect(config);
  const reader = createReader(socket);
  try {
    await expectResponse(reader.readResponse(), [220]);
    await command(socket, reader, "EHLO pixeldrop.app", [250]);
    await command(socket, reader, "AUTH LOGIN", [334]);
    await command(
      socket,
      reader,
      Buffer.from(config.user, "utf8").toString("base64"),
      [334],
    );
    await command(
      socket,
      reader,
      Buffer.from(config.pass, "utf8").toString("base64"),
      [235],
    );
    await command(socket, reader, `MAIL FROM:<${sanitizeAddress(config.user)}>`, [250]);
    await command(socket, reader, `RCPT TO:<${sanitizeAddress(payload.to)}>`, [250, 251]);
    await command(socket, reader, "DATA", [354]);
    socket.write(`${buildMessage(payload, config)}\r\n.\r\n`);
    await expectResponse(reader.readResponse(), [250]);
    await command(socket, reader, "QUIT", [221]);
  } finally {
    socket.end();
  }
}
