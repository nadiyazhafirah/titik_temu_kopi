import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { message: "Laporan lengkap hanya dapat diakses oleh Admin atau Manager." },
        { status: 403 }
      );
    }

    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");
    const method = params.get("method");

    // Filter wajib: Hanya ambil status "COMPLETED" (Selesai)
    const where: any = {
      status: "COMPLETED",
    };

    if (method) {
      where.paymentMethod = method;
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { fullName: true } },
        details: { include: { product: { include: { category: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    let gross = 0;
    let discount = 0;
    let tax = 0;
    let net = 0;

    orders.forEach((o: any) => {
      gross += Number(o.subtotal || 0);
      discount += Number(o.discount || 0);
      tax += Number(o.tax || 0);
      net += Number(o.grandTotal || 0);
    });

    const average = orders.length > 0 ? net / orders.length : 0;

    return NextResponse.json({
      orders,
      summary: {
        gross,
        discount,
        tax,
        net,
        average,
      },
    });
  } catch (error) {
    console.error("Gagal memuat laporan:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data laporan dari server." },
      { status: 500 }
    );
  }
}