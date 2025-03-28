/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/feed/Post.tsx - Fixed version
import { useState } from "react";
import { PostType } from "@/types/post";
import { likePost } from "@/api/posts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useRouter } from "next/router";
import CommentModal from "@/components/comments/CommentModal";
import SaveButton from "@/components/feed/SaveButton";
import ShareButton from "@/components/feed/ShareButton";
import { PostProps } from "@/types/componentProps";

// Function to safely render content with clickable hashtags
const renderContentWithHashtags = (
  content: string,
  onHashtagClick: (hashtag: string) => void
) => {
  if (!content) return content;

  // Regular expression to match hashtags
  const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;

  // Split content by hashtags
  const parts = content.split(hashtagRegex);

  return parts.map((part, index) => {
    // Check if this part is a hashtag
    if (part.match(hashtagRegex)) {
      return (
        <span
          key={index}
          className="text-primary hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigating to post details
            onHashtagClick(part);
          }}
        >
          {part}
        </span>
      );
    }

    // Return regular text
    return <span key={index}>{part}</span>;
  });
};

// Helper function to safely get hashtags as an array of strings
const safeGetHashtags = (post: PostType): string[] => {
  if (!post.hashtags) return [];

  // If hashtags is already a string array, return it
  if (
    Array.isArray(post.hashtags) &&
    post.hashtags.every((tag) => typeof tag === "string")
  ) {
    return post.hashtags;
  }

  // If hashtags is an array but contains objects, extract the tag property
  if (Array.isArray(post.hashtags)) {
    return post.hashtags
      .map((tag) => {
        if (typeof tag === "string") return tag;
        if (
          tag &&
          typeof tag === "object" &&
          "tag" in (tag as Record<string, unknown>)
        ) {
          return (tag as Record<string, unknown>).tag as string;
        }
        return "";
      })
      .filter((tag) => tag !== "");
  }

  // If hashtags is a single object with a tag property
  if (
    post.hashtags &&
    typeof post.hashtags === "object" &&
    "tag" in post.hashtags
  ) {
    const tag = (post.hashtags as any).tag;
    return typeof tag === "string" ? [tag] : [];
  }

  // Fallback to empty array
  return [];
};

const Post: React.FC<PostProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
}) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommentModalOpen, setCommentModalOpen] = useState(false);

  // Function to handle hashtag click
  const handleHashtagClick = (hashtag: string) => {
    // Remove the # prefix for URL
    const tag = hashtag.startsWith("#") ? hashtag.substring(1) : hashtag;
    router.push(`/hashtag/${tag}`);
  };

  const handleLike = async () => {
    if (!user.token || isLiking) return;
    setIsLiking(true);

    try {
      const response = await likePost(post.id);

      // Toggle the liked state
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);

      // Update likes count - increment if liked, decrement if unliked
      setLikesCount((prevCount) =>
        newIsLiked ? prevCount + 1 : Math.max(0, prevCount - 1)
      );

      console.log("Like response:", response);
    } catch (error) {
      console.error("Error liking post:", error);
    }

    setIsLiking(false);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to post details
    router.push(`/profile/${post.author}`);
  };

  // Make sure post.author and post.content are strings, not objects
  const authorName =
    typeof post.author === "string"
      ? post.author
      : post.author &&
        typeof post.author === "object" &&
        "username" in (post.author as any)
      ? String((post.author as any).username)
      : "Unknown User";

  const postContent =
    typeof post.content === "string"
      ? post.content
      : post.content
      ? JSON.stringify(post.content)
      : "";

  // Safely get hashtags as an array of strings
  const safeHashtags = safeGetHashtags(post);

  return (
    <Card className="p-4 shadow-md border border-border transition-all hover:shadow-lg mb-4">
      {/* Post Content - Clickable to view full post */}
      <div
        onClick={() => router.push(`/post/${post.id}`)}
        className="cursor-pointer"
      >
        {/* Author info and community badge if available */}
        <div className="flex items-center mb-2 justify-between">
          <h3
            className="font-semibold text-lg hover:text-primary hover:underline"
            onClick={handleAuthorClick}
          >
            {authorName}
          </h3>

          {post.communityName && (
            <Badge
              variant="outline"
              className="ml-2 hover:bg-primary/10 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/community/${post.communityId}`);
              }}
            >
              {post.communityName}
            </Badge>
          )}
        </div>

        {/* Post content with clickable hashtags */}
        <p className="text-sm text-muted-foreground mt-1">
          {renderContentWithHashtags(postContent, handleHashtagClick)}
        </p>

        {/* Display hashtags as badges if available */}
        {safeHashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {safeHashtags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-primary/10 text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHashtagClick(tag);
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        {/* Like Button */}
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigating to post details
            handleLike();
          }}
          disabled={isLiking}
          className={`flex items-center gap-1 ${isLiked ? "text-red-500" : ""}`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          {likesCount}
        </Button>

        {/* Comment Button */}
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigating to post details
            setCommentModalOpen(true);
          }}
          className="flex items-center gap-1 hover:text-blue-500 transition-all"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentsCount || 0}
        </Button>

        {/* Save Button */}
        <SaveButton postId={post.id} isSaved={post.isSaved ?? false} />

        {/* Share Button */}
        <ShareButton postId={post.id} sharesCount={post.sharesCount ?? 0} />
      </div>

      {/* Comment Modal */}
      <CommentModal
        postId={post.id}
        isOpen={isCommentModalOpen}
        onClose={() => setCommentModalOpen(false)}
      />
    </Card>
  );
};

export default Post;
