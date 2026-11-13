import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(); end.setHours(23,59,59,999);
  const where: any = { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } };
  if (!["ADMIN","MANAGER"].includes(user.role)) where.userId = user.id;
  const [todayOrders, lowStock, recentOrders, products, allRecent] = await Promise.all([
    prisma.order.findMany({ where, select: { grandTotal: true } }),
    prisma.product.findMany({ where: { active: true, stock: { lte: 5 } }, include: { category: true }, orderBy: { stock: "asc" }, take: 8 }),
    prisma.order.findMany({ where: ["ADMIN","MANAGER"].includes(user.role) ? {} : { userId: user.id }, include: { user: { select: { fullName: true } }, details: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.product.findMany({ where: { active: true }, include: { orderItems: { where: { order: { status: { not: "CANCELLED" } } } } } }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now()-6*86400000) }, status: { not: "CANCELLED" } }, select: { grandTotal: true, createdAt: true } })
  ]);
  const best = products.map(p => ({ name: p.name, qty: p.orderItems.reduce((n,i)=>n+i.quantity,0) })).sort((a,b)=>b.qty-a.qty)[0];
  const chart = Array.from({length:7}, (_,i) => {
    const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()-(6-i));
    return { label: date.toLocaleDateString("id-ID",{weekday:"short"}), total: allRecent.filter(o=>new Date(o.createdAt).toDateString()===date.toDateString()).reduce((s,o)=>s+Number(o.grandTotal),0) };
  });
  return NextResponse.json({ totalRevenue: todayOrders.reduce((s,o)=>s+Number(o.grandTotal),0), orderCount: todayOrders.length, bestSeller: best?.name || "-", lowStockCount: lowStock.length, lowStock, recentOrders, chart });
}
