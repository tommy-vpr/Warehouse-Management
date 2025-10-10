"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Import your form pages
import SignIn from "@/app/auth/signin/page";
import SignUp from "@/app/auth/signup/page";
import { ArrowLeft } from "lucide-react";

const Page = () => {
  const [activeForm, setActiveForm] = useState<"signin" | "signup" | null>(
    null
  );

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-tr from-[#4802b8] to-[#160a2a] flex justify-center items-center overflow-hidden">
      {/* Logo */}
      <Image
        src={"/images/headquarter-logo.webp"}
        className="absolute top-4 right-8 invert"
        width={55}
        height={55}
        alt="HQ logo"
      />

      <div className="w-[90%] max-w-[1400px] flex items-center p-4">
        {/* Left Section with AnimatePresence */}
        <div className="p-8 w-1/3 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeForm === null && (
              <motion.div
                key="marketing"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col"
              >
                <h1 className="text-6xl text-gray-100 mb-12 font-semibold">
                  Warehouse Management System
                </h1>
                <p className="text-gray-200 mb-6">
                  Streamline your operations with our modern Warehouse
                  Management System. From real-time inventory tracking to
                  automated order fulfillment and smart reporting, manage your
                  entire supply chain in one powerful, easy-to-use platform.
                </p>

                <div className="w-full flex items-center gap-4">
                  <button
                    onClick={() => setActiveForm("signin")}
                    className="w-2/3 text-center py-2 px-6 rounded-4xl text-white font-semibold
                               bg-gradient-to-br from-violet-500 to-blue-500 
                               hover:-translate-y-0.5
                               hover:shadow-[0_0_20px_rgba(139,92,246,0.8)] transition-all duration-300 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setActiveForm("signup")}
                    className="w-2/3 text-center py-2 px-6 rounded-4xl text-white font-semibold
                               bg-gradient-to-br from-orange-400 to-yellow-400 
                               hover:-translate-y-0.5
                               hover:shadow-[0_0_20px_rgba(251,191,36,0.8)] transition-all duration-300 cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>
              </motion.div>
            )}

            {activeForm === "signin" && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col text-white"
              >
                <SignIn />
                <button
                  onClick={() => setActiveForm(null)}
                  className="mt-4 text-orange-400 text-sm hover:text-orange-300 cursor-pointer flex items-center gap-1 m-auto"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </motion.div>
            )}

            {activeForm === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col text-white"
              >
                <SignUp />
                <button
                  onClick={() => setActiveForm(null)}
                  className="mt-4 text-orange-400 text-sm hover:text-orange-300 cursor-pointer flex items-center gap-1 m-auto"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section */}
        <div className="relative flex-1 h-[80vh]">
          <Image
            src={"/images/warehouse-landing-banner-v2.webp"}
            alt="HQ warehouse management system"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
