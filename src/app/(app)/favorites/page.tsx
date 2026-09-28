"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import PostCard from "@/components/post-card";
import { EmptyState } from "@/components/ui";
import { DEMO_POSTS } from "@/lib/demo-data";

export default function FavoritesPage() {
  const { t } = useI18n();
  const [favIds, setFavIds] = useState<string[]>(["p2", "p5"]);
  const posts = useMemo(() => DEMO_POSTS.filter((p) => favIds.includes(p.id)), [favIds]);

  return (
    <>
      <TopBar title={`❤️ ${t.nav.favorites}`} />
      <div className="px-4 py-4 grid gap-4">
        {posts.length === 0
          ? <EmptyState icon="💜" title={t.favoritesEmpty} />
          : posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </>
  );
}
