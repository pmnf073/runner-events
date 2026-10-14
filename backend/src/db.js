import dotenv from "dotenv";
import pkg from "@prisma/client";
const { PrismaClient, Prisma } = pkg;

dotenv.config();

// Money columns are Decimal(10,2) in the database. Send them to the frontend as
// JSON numbers (as before the Float -> Decimal change), not as strings.
Prisma.Decimal.prototype.toJSON = function toJSON() {
  return this.toNumber();
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
});

export default prisma;
