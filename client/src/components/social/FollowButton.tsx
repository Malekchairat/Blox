import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { UserPlus, UserCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface FollowButtonProps {
  associationId: number;
  initialFollowing?: boolean;
  isAuthenticated?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FollowButton({
  associationId,
  initialFollowing = false,
  isAuthenticated = false,
  variant = "default",
  size = "sm",
}: FollowButtonProps) {
  const { t } = useTranslation();
  const [following, setFollowing] = useState(initialFollowing);

  const toggleMutation = trpc.socialFollows.toggle.useMutation({
    onMutate: () => {
      setFollowing(prev => !prev);
    },
    onError: () => {
      setFollowing(prev => !prev);
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) return;
    toggleMutation.mutate({ associationId });
  };

  return (
    <Button
      variant={following ? "outline" : variant}
      size={size}
      onClick={handleClick}
      disabled={!isAuthenticated}
      className="gap-1.5"
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" />
          {t("social.following")}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {t("social.follow")}
        </>
      )}
    </Button>
  );
}
