// app/api/email/testing/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Add GET handler for browser testing
export async function GET() {
  return NextResponse.json({
    message: "Email test endpoint",
    instructions: "Send a POST request with { email: 'your@email.com' }",
    example: {
      method: "POST",
      body: { email: "test@example.com" },
    },
  });
}

// POST handler for actual email sending
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address required" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Test Email from HQ WMS",
      html: `
        <h1>Hello from Resend!</h1>
        <p>Your email setup is working correctly.</p>
        <p>This is a test email from your WMS development environment.</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      data,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
