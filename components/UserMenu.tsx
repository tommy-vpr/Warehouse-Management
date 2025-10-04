"use client";

import { useSession, signOut } from "next-auth/react";
import {
  User,
  Settings,
  LogOut,
  Shield,
  UserCog,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="outline" size="sm" disabled>
        <User className="w-4 h-4" />
      </Button>
    );
  }

  if (!session) {
    return (
      <Button variant="outline" size="sm">
        <User className="w-4 h-4" />
      </Button>
    );
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400";
      case "STAFF":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400";
      case "READONLY":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSignOut = () => {
    signOut({
      // callbackUrl: "/auth/signin",
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-zinc-800 dark:bg-gray-200 flex items-center justify-center">
            {session.user?.name ? (
              <span className="text-xs font-medium text-gray-200 dark:text-gray-800">
                {session.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-blue-600" />
            )}
          </div>
          {/* <div className="hidden md:block text-left">
            <div className="text-sm font-medium">
              {session.user?.name || "User"}
            </div>
            <div className="text-xs text-gray-500">{session.user?.email}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" /> */}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              {/* <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {session.user?.name ? (
                  <span className="text-sm font-medium text-blue-600">
                    {session.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                ) : (
                  <User className="w-5 h-5 text-blue-600" />
                )}
              </div> */}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {session.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
              </div>
            </div>

            {session.user?.role && (
              <Badge
                variant="secondary"
                className={`rounded-4xl text-[10px] w-fit ${getRoleBadgeColor(
                  session.user.role
                )}`}
              >
                <Shield className="w-3 h-3 mr-1" />
                {session.user.role}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="dark:bg-zinc-800" />

        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        {(session.user?.role === "ADMIN" ||
          session.user?.role === "MANAGER") && (
          <DropdownMenuItem>
            <UserCog className="mr-2 h-4 w-4" />
            <span>User Management</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer group"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4 group-hover:text-red-400 transition" />
          <span className="group-hover:text-red-400 transition">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
