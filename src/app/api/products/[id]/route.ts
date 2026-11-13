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

// PUT: Untuk Edit Produk berdasarkan ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

  try {
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json({ message: "ID produk tidak valid." }, { status: 400 });
    }

    const input = productSchema.parse(await request.json());

    const product = await prisma.product.update({
      where: { id: productId },
      data: input,
      include: { category: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal memperbarui produk. Data tidak valid atau kode sudah digunakan." },
      { status: 400 }
    );
  }
}

// DELETE: Untuk Menghapus Produk berdasarkan ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

  try {
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json({ message: "ID produk tidak valid." }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ message: "Produk berhasil dihapus." });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal menghapus produk. Produk mungkin tidak ditemukan." },
      { status: 400 }
    );
  }
}