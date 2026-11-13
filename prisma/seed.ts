import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const cashierHash = await bcrypt.hash("kasir123", 12);
  await prisma.user.upsert({ where: { username: "admin" }, update: { passwordHash: adminHash, active: true }, create: { username: "admin", fullName: "Admin Kafe", passwordHash: adminHash, role: UserRole.ADMIN } });
  await prisma.user.upsert({ where: { username: "kasir" }, update: { passwordHash: cashierHash, active: true }, create: { username: "kasir", fullName: "Alya Putri", passwordHash: cashierHash, role: UserRole.CASHIER } });
  const categorySeeds = [
    { name: "Coffee", slug: "coffee" }, { name: "Non-Coffee", slug: "non-coffee" },
    { name: "Food", slug: "food" }, { name: "Pastry", slug: "pastry" }
  ];
  for (const c of categorySeeds) await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, active: true }, create: c });
  const categories = await prisma.category.findMany();
  const cat = (name: string) => categories.find(c => c.name === name)!.id;
  const products = [
    { code:"COF001", name:"Kopi Susu Gula Aren", categoryId:cat("Coffee"), price:24000, costPrice:9000, stock:35, minStock:8, unit:"cup" },
    { code:"COF002", name:"Americano", categoryId:cat("Coffee"), price:20000, costPrice:6000, stock:28, minStock:8, unit:"cup" },
    { code:"COF003", name:"Cafe Latte", categoryId:cat("Coffee"), price:27000, costPrice:11000, stock:18, minStock:6, unit:"cup" },
    { code:"COF004", name:"Cappuccino", categoryId:cat("Coffee"), price:26000, costPrice:10000, stock:3, minStock:6, unit:"cup" },
    { code:"NC001", name:"Matcha Latte", categoryId:cat("Non-Coffee"), price:28000, costPrice:12000, stock:14, minStock:5, unit:"cup" },
    { code:"NC002", name:"Chocolate", categoryId:cat("Non-Coffee"), price:25000, costPrice:10000, stock:12, minStock:5, unit:"cup" },
    { code:"FD001", name:"Chicken Sandwich", categoryId:cat("Food"), price:32000, costPrice:17000, stock:9, minStock:4, unit:"pcs" },
    { code:"FD002", name:"Nasi Ayam", categoryId:cat("Food"), price:38000, costPrice:22000, stock:2, minStock:4, unit:"porsi" },
    { code:"PA001", name:"Butter Croissant", categoryId:cat("Pastry"), price:18000, costPrice:8000, stock:11, minStock:4, unit:"pcs" },
    { code:"PA002", name:"Chocolate Cake", categoryId:cat("Pastry"), price:22000, costPrice:10000, stock:7, minStock:4, unit:"pcs" }
  ];
  for (const p of products) await prisma.product.upsert({ where: { code: p.code }, update: p, create: p });
  console.log("Seeder selesai. Akun: admin/admin123 dan kasir/kasir123");
}
main().finally(async () => prisma.$disconnect());
