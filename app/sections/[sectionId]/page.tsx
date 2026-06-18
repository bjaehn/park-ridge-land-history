import { redirect } from "next/navigation";

type Props = { params: { sectionId: string } };

export default function SectionDetailPage({ params }: Props) {
  redirect(`/pin/${decodeURIComponent(params.sectionId)}`);
}
