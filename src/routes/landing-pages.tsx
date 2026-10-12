import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/landing-pages")({
  beforeLoad: () => { throw redirect({ to: "/campanhas", replace: true }); },
});
