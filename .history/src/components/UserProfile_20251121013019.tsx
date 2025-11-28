"use client";

import { useState } from 'react';
import Image from 'next/image';
import { User, Mail, MapPin, Calendar, Package, Users, Award, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  location?: string;
  memberSince: Date;
  bio?: string;
  stats: {
    poolsJoined: number;
    poolsCreated: number;
    totalOrders: number;
    totalSaved: number;
  };
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>;
}

interface UserProfileProps {
  userId: string;
  initialData?: UserProfileData;
  isOwnProfile?: boolean;
  className?: string;
}

export default function UserProfile({
  userId,
  initialData,
  isOwnProfile = false,
  className = '',
}: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData>(
    initialData || {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      memberSince: new Date(),
      stats: {
        poolsJoined: 24,
        poolsCreated: 5,
        totalOrders: 42,
        totalSaved: 1280,
      },
      badges: [],
    }
  );

  return (
    <div className={`${className}`}>
      {/* Profile header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-xl p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {profileData.avatar ? (
              <Image
                src={profileData.avatar}
                alt={profileData.name}
                width={120}
                height={120}
                className="rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-30 h-30 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <User className="w-16 h-16 text-orange-600" />
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{profileData.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{profileData.email}</span>
                  </div>
                  {profileData.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{profileData.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Joined {new Date(profileData.memberSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {isOwnProfile && (
                <Button
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>

            {profileData.bio && (
              <p className="mt-4 text-white/90 max-w-2xl">{profileData.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="bg-white border-x border-gray-200 px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-orange-600" />
              <span className="text-3xl font-bold text-gray-900">
                {profileData.stats.poolsJoined}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Pools Joined</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">
                {profileData.stats.poolsCreated}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Pools Created</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">
                {profileData.stats.totalOrders}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Total Orders</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-3xl font-bold text-gray-900">
                ${profileData.stats.totalSaved}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Total Saved</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      {profileData.badges.length > 0 && (
        <div className="bg-white border-x border-b border-gray-200 rounded-b-xl px-8 py-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {profileData.badges.map((badge) => (
              <div
                key={badge.id}
                className="group relative bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl px-4 py-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{badge.name}</p>
                    <p className="text-xs text-gray-600">{badge.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
