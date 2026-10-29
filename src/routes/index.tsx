import { createFileRoute } from "@tanstack/react-router";
import { LedgerPage } from "@/components/ledger/home";

export const Route = createFileRoute("/")({ component: LedgerPage });
