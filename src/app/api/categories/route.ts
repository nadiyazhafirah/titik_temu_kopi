import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}
