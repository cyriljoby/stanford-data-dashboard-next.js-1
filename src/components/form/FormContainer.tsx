"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { actionFunction, actionReturn } from "@/utils/types";
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

  useEffect(() => {
    if (state.redirect) {
      window.location.href = state.redirect;
      return;
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
