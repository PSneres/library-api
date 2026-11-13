import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
    level: isDevelopment ? "debug" : "info",
    transport: {
        targets: [
            ...(isDevelopment ? [{
                target: "pino-pretty",
                level: "debug",
                options: {
                    colorize: true,
                    translateTime: "SYS:standard"
                }
            }] : []),
            {
                target: "pino/file",
                level: isDevelopment ? "debug" : "info",
                options: {
                    destination: "./logs/app.log",
                    mkdir: true
                }
            }
        ]
    }
});