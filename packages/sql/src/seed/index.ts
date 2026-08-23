import { PrismaClient } from "../../out/prisma/client";
import { adapter } from "..";

const prisma = new PrismaClient({ adapter });
