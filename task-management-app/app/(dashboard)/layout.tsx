import { DashboardLayoutWrapper } from '@/components/layout/dashboard-layout-wrapper'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
}
