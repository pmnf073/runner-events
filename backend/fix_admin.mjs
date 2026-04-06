import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const p = new PrismaClient();
const u = await p.user.update({
  where: { email: "alvercaurbanrunners@gmail.com" },
  data: { status: "active" },
});
console.log("Status updated:", u.status);
await p.$disconnect();
