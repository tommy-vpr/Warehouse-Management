// app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/users
 * Get users with optional filters
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const includeWorkload = searchParams.get("includeWorkload") === "true";
  const status = searchParams.get("status"); // 'active', 'idle', 'busy'

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        ...(includeWorkload && {
          assignedPickLists: {
            where: {
              status: {
                in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
              },
            },
            select: {
              id: true,
              batchNumber: true,
              status: true,
              totalItems: true,
              pickedItems: true,
            },
          },
          pickingOrders: {
            where: {
              status: {
                in: ["PICKING", "ALLOCATED"],
              },
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        }),
      },
      orderBy: {
        name: "asc",
      },
    });

    // Calculate workload if requested
    let usersWithWorkload = users;

    if (includeWorkload) {
      usersWithWorkload = users.map((user) => {
        const pickLists = (user as any).assignedPickLists || [];
        const remainingItems = pickLists.reduce(
          (sum: number, pl: any) => sum + (pl.totalItems - pl.pickedItems),
          0
        );

        const workloadStatus =
          remainingItems === 0
            ? "idle"
            : remainingItems < 50
            ? "light"
            : remainingItems < 150
            ? "moderate"
            : "heavy";

        return {
          ...user,
          workload: {
            activePickLists: pickLists.length,
            remainingItems,
            status: workloadStatus,
          },
        };
      });

      // Filter by status if requested
      if (status) {
        usersWithWorkload = usersWithWorkload.filter(
          (user: any) => user.workload?.status === status
        );
      }
    }

    return NextResponse.json(usersWithWorkload);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, role = "STAFF" } = body;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password (you should use bcrypt in production)
    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // Use hashedPassword in production
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
