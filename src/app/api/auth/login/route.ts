import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const user = await prisma.user.findFirst({
      where: { username: input.username, active: true },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return NextResponse.json(
        { message: "Username atau password tidak sesuai." },
        { status: 401 },
      );
    }
    await createSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error); // <-- Lihat ini di terminal VS Code
    return NextResponse.json(
      { message: "Data login tidak valid.", error: String(error) },
      { status: 400 },
    );
  }
}
