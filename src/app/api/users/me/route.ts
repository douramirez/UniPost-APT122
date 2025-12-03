import { NextResponse } from "next/server";

export async function GET() {
  // Por ahora, solo algo de prueba:
  return NextResponse.json({ message: "users/me OK" });
}
