import React from "react";

import { LoaderCircle } from "lucide-react";

const SpinningLoader = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <LoaderCircle className="animate-spin" />
    </div>
  );
};

export default SpinningLoader;
