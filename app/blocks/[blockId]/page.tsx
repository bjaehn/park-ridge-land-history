import { redirect } from "next/navigation";

type Props = { params: { blockId: string } };

export default function BlockDetailPage({ params }: Props) {
  redirect(`/pin/${decodeURIComponent(params.blockId)}`);
}
