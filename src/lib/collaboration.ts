import type { Profile } from "./types";
export type CollaborationRequest = {
  id: string;
  project_id: string;
  sender_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};
export type ProjectInvitation = {
  id: string;
  project_id: string;
  invited_by: string;
  invitee_id: string;
  role: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  created_at: string;
};
export type ProjectSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  ownerId: string;
  public: boolean;
};
export type TeamMember = { project_id: string; user_id: string; role: string };
export type CollaborationWorkspace = {
  viewerId: string;
  requests: CollaborationRequest[];
  invitations: ProjectInvitation[];
  projects: ProjectSummary[];
  profiles: Profile[];
  memberships: TeamMember[];
};
export type CollaborationAction =
  | "request"
  | "respond_request"
  | "withdraw_request"
  | "invite"
  | "respond_invitation"
  | "revoke_invitation"
  | "remove_member"
  | "set_member_role";
export async function performCollaborationAction(
  action: CollaborationAction,
  target: string,
  body: Record<string, string> = {},
) {
  const response = await fetch("/api/collaboration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, target, body }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not save that change. Try again.");
  return result;
}
