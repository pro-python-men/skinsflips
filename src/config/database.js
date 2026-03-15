import pkg from "pg";
import { getConfig } from "./env.js";

const { Pool } = pkg;

const config = getConfig();

const pool = new Pool(
  config.database.url
    ? {
        connectionString: config.database.url,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined
      }
    : {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined
      }
);

export default pool;
