export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is intentionally left minimal to resolve a routing conflict.
  return <>{children}</>;
}
