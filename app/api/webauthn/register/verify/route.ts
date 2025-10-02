import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, attResp } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 400 });

  if (!user.currentChallenge) {
    return NextResponse.json(
      { error: "No challenge stored for this user" },
      { status: 400 }
    );
  }

  const verification = await verifyRegistrationResponse({
    response: attResp,
    expectedChallenge: user.currentChallenge!,
    expectedRPID: process.env.WEBAUTHN_RPID!,
    expectedOrigin: process.env.WEBAUTHN_ORIGIN!,
  });
  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const {
    credentialPublicKey,
    credentialID,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo!;

  await prisma.userCredential.create({
    data: {
      userId: user.id,
      credentialId: Buffer.from(credentialID).toString("base64url"),
      publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: attResp.response.transports?.join(",") ?? null,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { currentChallenge: null },
  });

  return NextResponse.json({ success: true });
}
