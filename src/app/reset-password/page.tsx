import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordPage from "@/views/ResetPasswordPage";

export default function ResetPasswordRoute() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    >
      <ResetPasswordPage />
    </Suspense>
  );
}
