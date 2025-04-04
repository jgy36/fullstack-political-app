/* eslint-disable @typescript-eslint/no-unused-vars */
// src/hooks/useCommunity.ts
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { 
  joinCommunity as joinCommunityAction, 
  leaveCommunity as leaveCommunityAction 
} from "@/redux/slices/communitySlice";
import { 
  getCommunityBySlug, 
  getCommunityPosts, 
  joinCommunity, 
  leaveCommunity,
  createCommunityPost 
} from "@/api/communities";
import useSWR from "swr";
import axios from "axios";
import { CommunityData, CommunityMembershipResponse } from "@/types/community";
import { PostType } from "@/types/post";

type UseCommunityReturn = {
  community: CommunityData | null;
  posts: PostType[];
  isLoading: boolean;
  error: string | null;
  isJoined: boolean;
  isNotificationsOn: boolean;
  memberCount: number;
  handleToggleMembership: () => Promise<void>;
  handleToggleNotifications: () => void;
  handlePostCreated: () => Promise<void>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

// SWR fetcher function for community data
const fetchCommunity = async (url: string): Promise<CommunityData> => {
  try {
    const response = await axios.get(url);
    const data = response.data as {
      id: string;
      name: string;
      description: string;
      members: number;
      created: string;
      rules?: string[];
      moderators?: string[];
      banner: string;
      color: string;
      isJoined: boolean;
      isNotificationsOn?: boolean;
    };
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      members: data.members,
      created: data.created,
      rules: data.rules || [], // Ensure rules is always an array
      moderators: data.moderators || [],
      banner: data.banner,
      color: data.color,
      isJoined: data.isJoined,
      isNotificationsOn: data.isNotificationsOn || false
    };
  } catch (error) {
    console.error(`Error fetching community:`, error);
    throw error;
  }
};

// SWR fetcher function for posts
const fetchPosts = async (url: string): Promise<PostType[]> => {
  try {
    const response = await axios.get(url);
    return response.data as PostType[];
  } catch (error) {
    console.error(`Error fetching posts:`, error);
    throw error;
  }
};

export const useCommunity = (
  communityId: string,
  initialCommunityData?: CommunityData,
  initialPosts?: PostType[],
  serverError?: string
): UseCommunityReturn => {
  // Component state
  const [community, setCommunity] = useState<CommunityData | null>(initialCommunityData || null);
  const [posts, setPosts] = useState<PostType[]>(initialPosts || []);
  const [isLoading, setIsLoading] = useState(!initialCommunityData);
  const [error, setError] = useState<string | null>(serverError || null);
  const [isJoined, setIsJoined] = useState(initialCommunityData?.isJoined || false);
  const [isNotificationsOn, setIsNotificationsOn] = useState(initialCommunityData?.isNotificationsOn || false);
  const [memberCount, setMemberCount] = useState(initialCommunityData?.members || 0);

  // Redux hooks
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.user);
  const isAuthenticated = !!currentUser.token;
  const joinedCommunityIds = useSelector((state: RootState) => state.communities.joinedCommunities);

  // SWR data fetching (only if communityId exists)
  const { data: swrCommunityData, error: swrError } = useSWR<CommunityData>(
    communityId ? `${API_BASE_URL}/communities/${communityId}` : null,
    communityId ? fetchCommunity : null,
    {
      fallbackData: initialCommunityData,
      revalidateOnFocus: false,
    }
  );

  // SWR for fetching posts
  const { data: swrPosts, mutate: mutatePosts } = useSWR<PostType[]>(
    communityId ? `${API_BASE_URL}/communities/${communityId}/posts` : null,
    communityId ? fetchPosts : null,
    {
      fallbackData: initialPosts,
      revalidateOnFocus: false,
    }
  );

  // Update state from SWR data when it changes
  useEffect(() => {
    if (swrCommunityData) {
      setCommunity(swrCommunityData);
      // Use Redux state as source of truth for joined status 
      setIsJoined(joinedCommunityIds.includes(swrCommunityData.id));
      setIsNotificationsOn(swrCommunityData.isNotificationsOn || false);
      setMemberCount(swrCommunityData.members || 0);
    }
    
    if (swrError) {
      setError("Failed to load community data");
    }
    
    setIsLoading(false);
  }, [swrCommunityData, swrError, joinedCommunityIds]);

  // Update posts from SWR data
  useEffect(() => {
    if (swrPosts) {
      setPosts(swrPosts);
    }
  }, [swrPosts]);

  // Fallback data loading when SSR data is not available
  useEffect(() => {
    // Only run if we have a valid ID and no server-side data
    if (!communityId || initialCommunityData) {
      return;
    }
    
    const loadCommunity = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if this community is in our joined list from Redux
        const isInJoinedList = joinedCommunityIds.includes(communityId);
        
        // Fetch community details
        const communityData = await getCommunityBySlug(communityId);
        
        if (!communityData) {
          throw new Error("Community not found");
        }
        
        // Convert to CommunityData type with defaults for optional fields
        const typedCommunity: CommunityData = {
          id: communityData.id,
          name: communityData.name,
          description: communityData.description,
          members: communityData.members,
          created: communityData.created,
          rules: communityData.rules || [], // Ensure rules is always an array
          moderators: communityData.moderators || [],
          banner: communityData.banner,
          color: communityData.color,
          isJoined: isInJoinedList,
          isNotificationsOn: communityData.isNotificationsOn || false
        };
        
        setCommunity(typedCommunity);
        setIsJoined(isInJoinedList);
        setIsNotificationsOn(typedCommunity.isNotificationsOn);
        setMemberCount(typedCommunity.members);
        
        // Fetch posts for this community
        try {
          const postsData = await getCommunityPosts(communityId);
          setPosts(postsData);
        } catch (postsErr) {
          console.warn("Error fetching posts, using empty array:", postsErr);
          setPosts([]);
        }
        
      } catch (err) {
        console.error("Error loading community:", err);
        setError("Failed to load community data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCommunity();
  }, [communityId, joinedCommunityIds, initialCommunityData]);

  // Handle joining/leaving the community
  const handleToggleMembership = async () => {
    if (!isAuthenticated || !community) return;
    
    // Optimistically update UI
    setIsJoined(!isJoined);
    
    // Update member count
    setMemberCount(prevCount => isJoined ? prevCount - 1 : prevCount + 1);
    
    try {
      let response: CommunityMembershipResponse;
      
      if (isJoined) {
        // Leave community
        response = await leaveCommunity(community.id);
        
        // Update Redux store if operation was successful
        if (response.success) {
          dispatch(leaveCommunityAction(community.id));
        }
      } else {
        // Join community
        response = await joinCommunity(community.id);
        
        // Update Redux store if operation was successful
        if (response.success) {
          dispatch(joinCommunityAction(community.id));
        }
      }
      
      if (!response.success) {
        // Revert if API call failed
        setIsJoined(!isJoined);
        setMemberCount(prevCount => isJoined ? prevCount + 1 : prevCount - 1);
      }
    } catch (error) {
      console.error("Error toggling community membership:", error);
      
      // Revert UI state on error
      setIsJoined(!isJoined);
      setMemberCount(prevCount => isJoined ? prevCount + 1 : prevCount - 1);
    }
  };

  // Toggle notifications
  const handleToggleNotifications = () => {
    setIsNotificationsOn(!isNotificationsOn);
    
    // In a real app, you'd make an API call here to update notification preferences
    // For now, we'll just toggle the state locally
  };

  // Refresh posts after creating a new one
  const handlePostCreated = async () => {
    if (!communityId) return;
    
    try {
      // Fetch the latest posts
      const freshPosts = await getCommunityPosts(communityId);
      setPosts(freshPosts);
      
      // Update SWR cache
      if (mutatePosts) {
        mutatePosts(freshPosts);
      }
    } catch (error) {
      console.error("Error refreshing posts:", error);
    }
  };

  return {
    community,
    posts,
    isLoading,
    error,
    isJoined,
    isNotificationsOn,
    memberCount,
    handleToggleMembership,
    handleToggleNotifications,
    handlePostCreated
  };
};