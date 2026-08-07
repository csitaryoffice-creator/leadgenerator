import { notFound } from "next/navigation";
import { BusinessDetail } from "@/components/business-detail";
import { requirePageUser } from "@/lib/auth";
import { getBusiness } from "@/lib/data/businesses";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await requirePageUser();
  const { id } = await params;
  const business = await getBusiness(supabase, user.id, id);

  if (!business) {
    notFound();
  }

  return <BusinessDetail business={business as any} />;
}
