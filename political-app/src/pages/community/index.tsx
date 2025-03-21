// pages/community/index.tsx - Complete updated page
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/layout/MainLayout";
import { 
  Users,
  Plus,
  TrendingUp
} from "lucide-react";
import { joinCommunity, leaveCommunity } from "@/redux/slices/communitySlice";
import SearchComponent from "@/components/search/SearchComponent";

interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  created: string;
  isJoined: boolean;
  color?: string;
  trending?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

const CommunitiesPage = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.user);
  const joinedCommunityIds = useSelector((state: RootState) => state.communities.joinedCommunities);
  const isAuthenticated = !!currentUser.token;

  useEffect(() => {
    const fetchCommunities = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get<Community[]>(`${API_BASE_URL}/communities`, {
          headers: currentUser.token ? { Authorization: `Bearer ${currentUser.token}` } : {}
        });
        
        // Mark top 2 communities as trending
        const communitiesWithTrending = response.data.map((community, index) => ({
          ...community,
          trending: index < 2, // Top 2 communities marked as trending
          // Set isJoined based on Redux state
          isJoined: joinedCommunityIds.includes(community.id)
        }));
        
        setCommunities(communitiesWithTrending);
        setFilteredCommunities(communitiesWithTrending);
      } catch (err) {
        console.error("Error fetching communities:", err);
        setError("Failed to load communities. Please try again later.");
        // No mock data fallback - we'll use real data from the backend
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCommunities();
  }, [currentUser.token, joinedCommunityIds]);

  const handleJoinCommunity = async (e: React.MouseEvent, communityId: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/community/${communityId}`)}`);
      return;
    }
    
    try {
      const community = communities.find(c => c.id === communityId);
      if (!community) return;
      
      // Update local state optimistically
      setCommunities(prevCommunities => 
        prevCommunities.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              isJoined: !c.isJoined,
              members: c.isJoined ? c.members - 1 : c.members + 1
            };
          }
          return c;
        })
      );
      
      // Also update filtered communities
      setFilteredCommunities(prevCommunities => 
        prevCommunities.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              isJoined: !c.isJoined,
              members: c.isJoined ? c.members - 1 : c.members + 1
            };
          }
          return c;
        })
      );
      
      if (community.isJoined) {
        // Leave community
        await axios.delete(`${API_BASE_URL}/communities/${communityId}/leave`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        
        // Update Redux state
        dispatch(leaveCommunity(communityId));
      } else {
        // Join community
        await axios.post(`${API_BASE_URL}/communities/${communityId}/join`, {}, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        
        // Update Redux state
        dispatch(joinCommunity(communityId));
      }
      
    } catch (error) {
      console.error("Error toggling community membership:", error);
      
      // Revert local state if API call fails
      setCommunities(prevCommunities => 
        prevCommunities.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              isJoined: !c.isJoined, // Revert back
              members: !c.isJoined ? c.members - 1 : c.members + 1 // Also revert
            };
          }
          return c;
        })
      );
      
      // Also revert filtered communities
      setFilteredCommunities(prevCommunities => 
        prevCommunities.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              isJoined: !c.isJoined, // Revert back
              members: !c.isJoined ? c.members - 1 : c.members + 1 // Also revert
            };
          }
          return c;
        })
      );
    }
  };

  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`);
  };

  // We don't need a separate handleSearch function since we're using
  // the SearchComponent which handles this functionality internally

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Loading communities...</p>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <Card className="shadow-md">
            <CardContent>
              <p className="text-destructive font-medium text-lg mb-2">Error</p>
              <p>{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Communities</h1>
            <p className="text-muted-foreground">Join discussions with like-minded individuals</p>
          </div>
          
          {/* Search and Create buttons - only render SearchComponent once */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-initial">
              {/* Use the improved SearchComponent */}
              <SearchComponent />
            </div>
            
            <Button onClick={() => router.push("/community/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
        
        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.length > 0 ? (
            filteredCommunities.map(community => (
              <Card 
                key={community.id} 
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4"
                style={{ borderLeftColor: community.color || 'var(--primary)' }}
                onClick={() => navigateToCommunity(community.id)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium mb-1 mr-2">{community.name}</h3>
                        {community.trending && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                            <TrendingUp className="h-3 w-3 mr-1" /> Trending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{community.description}</p>
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        <span>{community.members.toLocaleString()} members</span>
                      </div>
                    </div>
                    
                    <Button
                      variant={community.isJoined ? "outline" : "default"}
                      size="sm"
                      className={community.isJoined ? "border-primary/50" : ""}
                      onClick={(e) => handleJoinCommunity(e, community.id)}
                    >
                      {community.isJoined ? "Joined" : "Join"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Communities Found</h3>
              <p className="text-muted-foreground">
                There are no communities matching your search
              </p>
              <Button 
                onClick={() => router.push("/community/create")}
                className="mt-4"
              >
                Create a Community
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CommunitiesPage;