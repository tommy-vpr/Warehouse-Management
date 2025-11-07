// app/dashboard/picking/progress/[id]/page.tsx
import PickListProgressView from "@/components/picking/Picklistprogressview";

export default function PickListProgressPage({
  params,
}: {
  params: { id: string };
}) {
  return <PickListProgressView pickListId={params.id} />;
}
