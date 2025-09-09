export function handleApiError(error: unknown): {
  message: string;
  status: number;
} {
  console.error("API Error:", error);

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("Unique constraint")) {
      return {
        message: "A record with this information already exists",
        status: 409,
      };
    }

    if (error.message.includes("Foreign key constraint")) {
      return {
        message: "Referenced record does not exist",
        status: 400,
      };
    }

    return {
      message: error.message,
      status: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    status: 500,
  };
}
