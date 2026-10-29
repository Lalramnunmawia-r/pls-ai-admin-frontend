"use client";

import { PageContainer, PageHeader } from "@/components/ui/layout";

/** Standard page frame: container + header. Kept for the non-Content pages. */
export function ModuleCard({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={description} actions={actions} />
      {children}
    </PageContainer>
  );
}
