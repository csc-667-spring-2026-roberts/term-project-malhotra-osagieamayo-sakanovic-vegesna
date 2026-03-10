import pgPromise from "pg-promise";
import dotenv from "dotenv";

dotenv.config();

const connection_string = process.env["DATABASE_URL"];

if (!connection_string) {
  throw new Error("DATABASE_URL is not set in .env");
}
const pgp = pgPromise({}); 
const db = pgp(connection_string);

export default db;
