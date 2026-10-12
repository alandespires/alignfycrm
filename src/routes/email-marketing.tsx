import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/email-marketing")({
  beforeLoad: () => { throw redirect({ to: "/campanhas", replace: true }); },
});
