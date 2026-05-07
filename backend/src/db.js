import dotenv from "dotenv";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

dotenv.config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
});

export default prisma;
