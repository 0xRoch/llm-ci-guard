type LogMethod = (message: string, metadata?: unknown) => void;

const createLogMethod =
  (method: "info" | "error" | "warn"): LogMethod =>
  (message, metadata) => {
    if (metadata !== undefined) {
      console[method](message, metadata);
      return;
    }

    console[method](message);
  };

export const logger = {
  info: createLogMethod("info"),
  warn: createLogMethod("warn"),
  error: createLogMethod("error"),
};
