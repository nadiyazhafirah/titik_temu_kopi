import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  orderType: z.enum(["DINE_IN","TAKEAWAY"]),
  tableNumber: z.string().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH","QRIS","BANK_TRANSFER","DEBIT"]),
  amountPaid: z.number().nonnegative(),
  status: z.enum(["PROCESSING", "COMPLETED", "CANCELLED"]).optional().default("COMPLETED"), // Ditambahkan agar status bisa diatur dinamis
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), note: z.string().max(255).optional() })).min(1)
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const where: any = {};
  if (!["ADMIN","MANAGER"].includes(user.role)) where.userId = user.id;
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) };
  const orders = await prisma.order.findMany({ where, include: { user: { select: { fullName: true } }, details: { include: { product: { include: { category: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    if (input.orderType === "DINE_IN" && !input.tableNumber?.trim()) return NextResponse.json({ message: "Nomor meja wajib diisi untuk dine-in." }, { status: 400 });
    const productIds = [...new Set(input.items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) return NextResponse.json({ message: "Ada menu yang tidak tersedia." }, { status: 400 });
    const productMap = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) return NextResponse.json({ message: `Stok ${product.name} tidak mencukupi.` }, { status: 400 });
      subtotal += Number(product.price) * item.quantity;
    }
    const discount = Math.min(input.discount, subtotal);
    const tax = Math.round((subtotal - discount) * 0.1);
    const grandTotal = subtotal - discount + tax;
    if (input.paymentMethod === "CASH" && input.amountPaid < grandTotal) return NextResponse.json({ message: "Uang pembayaran kurang dari total tagihan." }, { status: 400 });
    const now = new Date();
    const invoicePrefix = `INV-POS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    const order = await prisma.$transaction(async tx => {
      const latest = await tx.order.count({ where: { invoiceNumber: { startsWith: invoicePrefix } } });
      const invoiceNumber = `${invoicePrefix}-${String(latest + 1).padStart(4,"0")}`;
      for (const item of input.items) {
        const changed = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (changed.count !== 1) throw new Error("STOCK_CONFLICT");
      }
      return tx.order.create({
        data: {
          invoiceNumber, userId: user.id, orderType: input.orderType, tableNumber: input.orderType === "DINE_IN" ? input.tableNumber : null,
          customerName: input.customerName || null, subtotal, tax, discount, grandTotal,
          paymentMethod: input.paymentMethod, amountPaid: input.paymentMethod === "CASH" ? input.amountPaid : grandTotal,
          changeAmount: input.paymentMethod === "CASH" ? input.amountPaid - grandTotal : 0,
          status: input.status, // Diubah agar membaca status yang dikirim dari front-end / default COMPLETED
          details: { create: input.items.map(item => { const p = productMap.get(item.productId)!; return { productId: p.id, unitPrice: Number(p.price), quantity: item.quantity, lineSubtotal: Number(p.price) * item.quantity, note: item.note || null }; }) }
        }, include: { details: { include: { product: true } }, user: { select: { fullName: true } } }
      });
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_CONFLICT") return NextResponse.json({ message: "Stok berubah saat transaksi diproses. Silakan coba lagi." }, { status: 409 });
    return NextResponse.json({ message: "Transaksi gagal disimpan." }, { status: 400 });
  }
}