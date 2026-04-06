const logger = {
  info: (msg, meta = {}) => console.log(`info: ${msg}`, JSON.stringify(meta)),
  warn: (msg, meta = {}) => console.warn(`warn: ${msg}`, JSON.stringify(meta)),
  error: (msg, meta = {}) => console.error(`error: ${msg}`, JSON.stringify(meta)),
  debug: (msg, meta = {}) => console.log(`debug: ${msg}`, JSON.stringify(meta))
};

export default logger;
