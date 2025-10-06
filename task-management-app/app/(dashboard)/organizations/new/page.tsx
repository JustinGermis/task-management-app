import { CreateOrganizationForm } from '@/components/organizations/create-organization-form'

export default async function NewOrganizationPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <CreateOrganizationForm />
    </div>
  )
}