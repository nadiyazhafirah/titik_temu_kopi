import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (!["PROCESSING", "COMPLETED", "CANCELLED"].includes(body.status)) {
    return NextResponse.json(
      { message: "Status tidak valid." },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: Number(id) },
        include: { details: true },
      });

      if (!current) {
        throw new Error("NOT_FOUND");
      }

      // Mencegah perubahan jika sudah dibatalkan atau sudah selesai
      if (current.status === "CANCELLED" && body.status !== "CANCELLED") {
        throw new Error("INVALID_TRANSITION");
      }
      if (current.status === "COMPLETED" && body.status !== "COMPLETED") {
        throw new Error("INVALID_TRANSITION");
      }

      // Jika status diubah menjadi CANCELLED, kembalikan stok produk
      if (body.status === "CANCELLED" && current.status !== "CANCELLED") {
        for (const item of current.details) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id: Number(id) },
        data: { status: body.status },
      });
    });

    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json(
      { message: e.message || "Status tidak dapat diperbarui." },
      { status: 400 }
    );
  }
}