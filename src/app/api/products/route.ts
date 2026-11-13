import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  categoryId: z.number().int().positive(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.string().default("cup"),
});
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ products });
}
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  try {
    const input = productSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: input,
      include: { category: true },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Data produk tidak valid atau kode sudah digunakan." },
      { status: 400 },
    );
  }
}
