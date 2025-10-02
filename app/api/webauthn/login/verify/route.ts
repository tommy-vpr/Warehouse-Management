import { NextResponse } from "next/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";

import { generateAuthenticationOptions } from "@simplewebauthn/server";

export async function POST(req: Request) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 400 });

  const credentials = await prisma.userCredential.findMany({
    where: { userId: user.id },
  });

  const options = await generateAuthenticationOptions({
    allowCredentials: credentials.map((c) => ({
      id: Buffer.from(c.credentialId, "base64url"),
      type: "public-key",
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
    userVerification: "preferred",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: options.challenge },
  });

  return NextResponse.json(options);
}
