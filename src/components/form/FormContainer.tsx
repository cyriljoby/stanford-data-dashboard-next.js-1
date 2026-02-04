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

  console.log("DEBUG FormContainer state:", state);

  useEffect(() => {
    console.log("DEBUG FormContainer useEffect triggered, state:", state);

    if (state.redirect) {
      console.log("DEBUG FormContainer redirecting to:", state.redirect);
      console.log("DEBUG FormContainer current location:", window.location.href);
      try {
        window.location.href = state.redirect;
        console.log("DEBUG FormContainer window.location.href set successfully");
      } catch (e) {
        console.error("DEBUG redirect error:", e);
      }
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
