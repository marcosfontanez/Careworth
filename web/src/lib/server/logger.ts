import "server-only";

type LogFields = Record<string, string | number | boolean | undefined | null>;

function line(level: string, msg: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  const s = JSON.stringify(payload);
  if (level === "error") console.error(s);
  else if (level === "warn") console.warn(s);
  else console.log(s);
}

export const serverLog = {
  info(msg: string, fields?: LogFields) {
    line("info", msg, fields);
  },
  warn(msg: string, fields?: LogFields) {
    line("warn", msg, fields);
  },
  error(msg: string, fields?: LogFields) {
    line("error", msg, fields);
  },
};
