/* eslint-disable @typescript-eslint/no-unused-vars */
// src/api/users.ts - Updated with better error handling and localStorage syncing
import { apiClient, getErrorMessage } from "./apiClient";
import {
  UserProfile,
  UpdateUsernameRequest,
  UpdateUsernameResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "./types";
// Import directly from the types directory
import { FollowResponse, FollowUser } from "@/types/follow";
import { PostType } from "@/types/post";

/**
 * Get the current user's profile
 */
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const response = await apiClient.get<UserProfile>("/users/me", {
      withCredentials: true,
    });

    // Store user info in localStorage
    if (response.data && response.data.id) {
      const userId = String(response.data.id);
      localStorage.setItem("currentUserId", userId);

      if (response.data.username) {
        localStorage.setItem(`user_${userId}_username`, response.data.username);
      }

      if (response.data.email) {
        localStorage.setItem(`user_${userId}_email`, response.data.email);
      }

      if (response.data.displayName) {
        localStorage.setItem(
          `user_${userId}_displayName`,
          response.data.displayName
        );
      }

      if (response.data.bio) {
        localStorage.setItem(`user_${userId}_bio`, response.data.bio);
      }

      if (response.data.profileImageUrl) {
        localStorage.setItem(
          `user_${userId}_profileImageUrl`,
          response.data.profileImageUrl
        );
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

/**
 * Get a user's profile by username
 */
export const getUserProfile = async (
  username: string
): Promise<UserProfile | null> => {
  try {
    const response = await apiClient.get<UserProfile>(
      `/users/profile/${username}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
    return null;
  }
};

/**
 * Update the current user's username
 */
export const updateUsername = async (
  newUsername: string
): Promise<UpdateUsernameResponse> => {
  try {
    // Validate the username format on client-side
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      return {
        success: false,
        message:
          "Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens.",
      };
    }

    const request: UpdateUsernameRequest = { username: newUsername };
    const response = await apiClient.put<UpdateUsernameResponse>(
      "/users/update-username",
      request,
      {
        withCredentials: true,
      }
    );

    // If successful, update localStorage for better UX
    if (response.data.success) {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        localStorage.setItem(`user_${userId}_username`, newUsername);
      }

      // Dispatch custom event to update UI
      window.dispatchEvent(
        new CustomEvent("userProfileUpdated", {
          detail: { username: newUsername },
        })
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error updating username:", error);
    return { success: false, message: getErrorMessage(error) };
  }
};

/**
 * Update the current user's profile information
 */
export const updateProfile = async (profile: {
  displayName?: string;
  bio?: string;
  profileImage?: File;
}): Promise<UpdateProfileResponse> => {
  try {
    console.log("Updating profile with data:", profile);

    // Create FormData for file upload
    const formData = new FormData();

    if (profile.displayName !== undefined) {
      formData.append("displayName", profile.displayName);
    }

    if (profile.bio !== undefined) {
      formData.append("bio", profile.bio);
    }

    if (profile.profileImage) {
      formData.append("profileImage", profile.profileImage);
    }

    console.log("Sending profile update request...");

    // Use FormData for multipart/form-data request (necessary for file upload)
    const response = await apiClient.put<UpdateProfileResponse>(
      "/users/update-profile",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      }
    );

    console.log("Profile update response:", response.data);

    // Update localStorage for better UX
    if (response.data.success) {
      const userId = localStorage.getItem("currentUserId");

      if (userId) {
        if (profile.displayName !== undefined) {
          localStorage.setItem(
            `user_${userId}_displayName`,
            profile.displayName
          );
        }

        if (profile.bio !== undefined) {
          localStorage.setItem(`user_${userId}_bio`, profile.bio);
        }

        if (response.data.profileImageUrl) {
          localStorage.setItem(
            `user_${userId}_profileImageUrl`,
            response.data.profileImageUrl
          );
        }
      }

      // Also update the Redux store if possible
      try {
        // Create a global event to update profile state across the app
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("userProfileUpdated", {
              detail: response.data.user || {
                displayName: profile.displayName,
                bio: profile.bio,
                profileImageUrl: response.data.profileImageUrl,
              },
            })
          );
        }
      } catch (storeError) {
        console.error("Error updating Redux store:", storeError);
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);

    // Extract a meaningful error message without axios-specific code
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      // Try to get a message from any error object
      const errorObj = error as {
        message?: string;
        response?: {
          data?: {
            message?: string;
          };
          statusText?: string;
        };
        statusText?: string;
      };

      if (errorObj.message) {
        errorMessage = errorObj.message;
      } else if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      } else if (errorObj.response?.statusText) {
        errorMessage = errorObj.response.statusText;
      } else if (errorObj.statusText) {
        errorMessage = errorObj.statusText;
      }
    }

    return {
      success: false,
      message: `Profile update failed: ${errorMessage}`,
    };
  }
};

/**
 * Search for users
 */
export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  try {
    const response = await apiClient.get<UserProfile[]>(
      `/users/search?query=${encodeURIComponent(query)}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error searching users with query ${query}:`, error);
    return [];
  }
};

/**
 * Follow a user
 */
export const followUser = async (userId: number): Promise<FollowResponse> => {
  try {
    const response = await apiClient.post<FollowResponse>(
      `/follow/${userId}`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error following user ${userId}:`, error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (userId: number): Promise<FollowResponse> => {
  try {
    const response = await apiClient.delete<FollowResponse>(
      `/follow/${userId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error unfollowing user ${userId}:`, error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Get follow status and counts
 */
export const getFollowStatus = async (
  userId: number
): Promise<FollowResponse> => {
  try {
    const response = await apiClient.get<FollowResponse>(
      `/follow/status/${userId}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error getting follow status for user ${userId}:`, error);
    // Return a default value with the correct type
    return {
      isFollowing: false,
      followersCount: 0,
      followingCount: 0,
    };
  }
};

/**
 * Get a user's followers
 */
export const getUserFollowers = async (
  userId: number,
  page: number = 1
): Promise<FollowUser[]> => {
  try {
    const response = await apiClient.get<FollowUser[]>(
      `/follow/followers/${userId}?page=${page}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error getting followers for user ${userId}:`, error);
    return [];
  }
};

/**
 * Get users that a user follows
 */
export const getUserFollowing = async (
  userId: number,
  page: number = 1
): Promise<FollowUser[]> => {
  try {
    const response = await apiClient.get<FollowUser[]>(
      `/follow/following/${userId}?page=${page}`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error getting following for user ${userId}:`, error);
    return [];
  }
};

/**
 * Refresh the current user's profile data
 * Used after making changes to ensure all components show latest data
 */
export const refreshUserProfile = async (): Promise<boolean> => {
  try {
    console.log("Refreshing user profile data...");
    const response = await apiClient.get<UserProfile>("/users/me", {
      withCredentials: true,
      headers: {
        // Add cache-busting query parameter
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (response.data) {
      const userId = String(response.data.id);
      console.log("Received fresh profile data:", response.data);

      // Update local storage with updated data
      localStorage.setItem("currentUserId", userId);

      if (response.data.username) {
        localStorage.setItem(`user_${userId}_username`, response.data.username);
      }

      if (response.data.email) {
        localStorage.setItem(`user_${userId}_email`, response.data.email);
      }

      // Always update these fields, even with empty strings to ensure consistency
      localStorage.setItem(
        `user_${userId}_displayName`,
        response.data.displayName || ""
      );
      localStorage.setItem(`user_${userId}_bio`, response.data.bio || "");

      if (response.data.profileImageUrl) {
        localStorage.setItem(
          `user_${userId}_profileImageUrl`,
          response.data.profileImageUrl
        );
      }

      // Dispatch a custom event for components that need to update
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", { detail: response.data })
        );
      }

      console.log("Profile data refreshed successfully");
      return true;
    }

    console.log("Profile refresh failed - empty response data");
    return false;
  } catch (error) {
    console.error("Error refreshing user profile:", error);

    // Try to extract a meaningful error message
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Profile refresh failed: ${errorMessage}`);

    return false;
  }
};

export const getPostsByUsername = async (
  username: string
): Promise<PostType[]> => {
  try {
    // First get the user ID from the username
    const userResponse = await apiClient.get<any>(`/users/profile/${username}`);
    const userId = userResponse.data.id;

    if (!userId) {
      console.error(`Could not find user ID for username: ${username}`);
      return [];
    }

    // Then use the user ID to fetch posts
    const response = await apiClient.get<PostType[]>(`/posts/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts for user ${username}:`, error);
    return [];
  }
};
