import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 400 });

  const options = generateRegistrationOptions({
    rpName: "HQ Warehouse Management",
    rpID: process.env.WEBAUTHN_RPID!, // must match domain (localhost or CF tunnel)
    userID: user.id, // must be string
    userName: email,
    timeout: 60000,
    attestationType: "none",
  });

  // Save challenge to DB
  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: options.challenge },
  });

  return NextResponse.json(options);
}
