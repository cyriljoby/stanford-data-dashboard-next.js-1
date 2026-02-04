"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { actionFunction, actionReturn } from "@/utils/types";
import { useRouter } from "next/navigation";

const initialState: actionReturn = {
  message: "",
  errorMessage: false,
  redirect: "",
};

function FormContainer({
  action,
  children,
}: {
  action: actionFunction;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.redirect) {
      console.log("DEBUG FormContainer redirecting to:", state.redirect);
      router.push(state.redirect);
    }

    if (state.message) {
      if (state.errorMessage) {
        toast.error(state.message);
      } else {
        toast.success(state.message);
      }
    }
  }, [state]);
  return <form action={formAction}>{children}</form>;
}
export default FormContainer;
