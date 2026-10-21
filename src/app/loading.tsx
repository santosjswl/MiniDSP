"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";
import { Card, Loading } from "./components";
import { itemForPath, ITEM_LABELS } from "./workspace-sidebar";

export default function PageLoading() {
  const item = itemForPath(usePathname());
  return (
    <AppShell activeItem={item} title={ITEM_LABELS[item]}>
      <Card>
        <Loading label="Loading your workspace..." />
      </Card>
    </AppShell>
  );
}
