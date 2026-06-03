import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import api from "@/lib/api";
import { BadgeDisplay, nameColorFromBadges } from "./BadgeIcon";
import { onUserUpdated } from "@/lib/userEvents";
import { isSupremeUsername } from "@/lib/identity";

interface Badge {
  id: string;
  name: string;
  icon: string;
  image?: string;
  color?: string;
}

interface OperatorProfile {
  id: string;
  name: string;
  username: string;
  role?: "admin" | "moderator" | "user";
  avatar?: string;
  bio?: string;
  status?: string;
  badges?: Badge[];
  isPublic?: boolean;
  accessCode?: string;
  createdAt?: string;
}

interface OperatorProfileCardProps {
  userId: string | null;
  onClose: () => void;
}

function permissionLabel(role?: string, badges?: { icon: string }[]): string {
  if (role === "admin") return "***";
  if (badges?.some(b => b.icon === "sys:developer")) return "DEVELOPER";
  if (role === "moderator") return "MODERADOR";
  if (badges?.some(b => b.icon === "sys:premium")) return "PREMIUM";
  return "USER";
}

function visibleProfileBadges(badges?: Badge[]): Badge[] {
  return badges || [];
}

export default function OperatorProfileCard({ userId, onClose }: OperatorProfileCardProps) {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(null);
    setLoading(true);
    api.get(`/users/${userId}/public`)
      .then((res) => {
        if (!cancelled) setProfile({ ...res.data, badges: res.data.badges || [] });
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return onUserUpdated<Partial<OperatorProfile>>((payload) => {
      if (payload.userId !== userId) return;
      setProfile((current) =>
        current
          ? { ...current, ...payload.user, badges: payload.user.badges || [] }
          : current
      );
      api.get(`/users/${userId}/public`)
        .then((res) => setProfile({ ...res.data, badges: res.data.badges || [] }))
        .catch(() => setProfile(null));
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, userId]);

  if (!userId) return null;

  const accessId = profile?.accessCode || "OH-000";
  const perm = profile ? (isSupremeUsername(profile.username) ? "CEO" : permissionLabel(profile.role, profile.badges)) : "USER";
  const badges = profile ? visibleProfileBadges(profile.badges) : [];

  return (
    <div className="op-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="op-card" role="dialog" aria-modal="true" aria-label="User profile">

        {/* Terminal window bar */}
        <div className="op-header">
          <div className="op-dots">
            <span /><span /><span />
          </div>
          <strong>OH-ACCESS</strong>
          <button className="op-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="op-loading"><span className="spin" /></div>
        ) : profile ? (
          <>
            {/* Body: photo LEFT + info RIGHT */}
            <div className="op-body">

              {/* ID-card style photo */}
              <div className="op-photo" data-role={profile.role ?? "user"}>
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.name} />
                  : profile.username.charAt(0).toUpperCase()
                }
              </div>

              {/* Right column */}
              <div className="op-info">
                <div className="op-command">
                  <span>$</span> outsidehub --peek
                </div>

                {/* Access mask pills */}
                <div className="op-access-mask">
                  {badges.map((badge) => (
                    <span key={badge.id} title={badge.name}>
                      <BadgeDisplay badge={badge} size={20} />
                    </span>
                  ))}
                </div>

                {/* Vault row */}
                <div className="op-vault-row">
                  <span>
                    USER
                    <b style={{ color: isSupremeUsername(profile.username) ? "#ef4444" : nameColorFromBadges(profile.badges) }}>{profile.username || profile.name}</b>
                  </span>
                  <span>
                    TYPE
                    <b style={{ color: isSupremeUsername(profile.username) ? "#ef4444" : "inherit" }}>{perm}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Navigate to public profile */}
            <button
              className="op-view-btn"
              onClick={() => { navigate(`/u/${profile.username}`); onClose(); }}
            >
              › ver perfil público
            </button>

            <strong className="op-corner-code">{accessId}</strong>

            {/* Progress bar */}
            <div className="op-progress" />
          </>
        ) : (
          <div className="op-loading">
            <p style={{ fontSize: 12 }}>Node unavailable</p>
          </div>
        )}
      </section>
    </div>
  );
}
